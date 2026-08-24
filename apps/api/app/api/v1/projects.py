from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_github_token
from app.db import get_session
from app.models.agent_run import AgentRun
from app.models.document_chunk import DocumentChunk
from app.models.project import Project
from app.models.user import User
from app.rag.ingestion import ingest_project
from app.services.github_api import list_repo_issues, parse_github_url
from app.services.workspace import clone_repository, delete_workspace, workspace_path

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    github_url: str = Field(..., description="e.g. https://github.com/owner/repo")
    branch: str = "main"
    name: str | None = Field(default=None, description="Defaults to 'owner/repo'")
    description: str | None = None


def _clone_and_update_status(
    project_id: int, github_url: str, branch: str, token: str
) -> None:
    """Runs in the background after the API has already responded."""
    from app.db import engine  # local import: background task builds its own session

    with Session(engine) as session:
        project = session.get(Project, project_id)
        if project is None:
            return
        try:
            clone_repository(github_url, branch, token, project.workspace_id)
            project.status = "ready"
        except Exception as e:  # noqa: BLE001
            project.status = "failed"
            project.description = f"Clone failed: {e!s}"
        session.add(project)
        session.commit()


@router.post("/")
def create_project(
    body: ProjectCreate,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    token: Annotated[str, Depends(get_github_token)],
    session: Session = Depends(get_session),
):
    """Connects a GitHub repo — clones it in the background.

    Reuses the existing `Project` row for this (user, github_url) if one
    already exists, instead of creating a duplicate every time the same
    repo is connected again. This doubles as the retry path: reconnecting
    a previously-failed clone (e.g. the repo was empty and has since had a
    commit pushed to it) just re-clones onto the same row.
    """
    assert current_user.id is not None  # authenticated users are always persisted
    owner, repo = parse_github_url(body.github_url)
    statement = select(Project).where(
        Project.user_id == current_user.id, Project.github_url == body.github_url
    )
    project = session.exec(statement).first()

    if project is None:
        project = Project(user_id=current_user.id, github_url=body.github_url)

    project.name = body.name or f"{owner}/{repo}"
    project.branch = body.branch
    project.description = body.description
    project.status = "pending"

    session.add(project)
    session.commit()
    session.refresh(project)
    assert project.id is not None  # set by the DB on commit, above

    background_tasks.add_task(
        _clone_and_update_status, project.id, body.github_url, body.branch, token
    )
    return project


@router.get("/")
def list_projects(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    statement = select(Project).where(Project.user_id == current_user.id)
    return session.exec(statement).all()


def _get_owned_project(
    project_id: int, current_user: User, session: Session
) -> Project:
    project = session.get(Project, project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}")
def get_project(
    project_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    return _get_owned_project(project_id, current_user, session)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Disconnects a project: deletes its DB rows and its cloned workspace
    on disk. The workspace directory is otherwise reused forever across
    runs (see `workspace.py`) — this is the only point it's actually
    removed, so disconnected projects don't just sit there filling up disk.
    """
    project = _get_owned_project(project_id, current_user, session)
    # Captured before delete: the ORM instance expires once its row (and
    # this session's transaction) is gone, so reading it after commit would
    # error.
    workspace_id = project.workspace_id

    # No FK cascade configured on these — clear dependents first or the
    # Project delete below hits a ForeignKeyViolation.
    for run in session.exec(
        select(AgentRun).where(AgentRun.project_id == project_id)
    ).all():
        session.delete(run)
    for chunk in session.exec(
        select(DocumentChunk).where(DocumentChunk.project_id == project_id)
    ).all():
        session.delete(chunk)

    session.delete(project)
    session.commit()

    delete_workspace(workspace_path(workspace_id))


def _index_project(project_id: int) -> None:
    """Runs in the background after the API has already responded."""
    from app.db import engine  # local import: background task builds its own session

    with Session(engine) as session:
        project = session.get(Project, project_id)
        if project is None or project.status != "ready":
            return
        ingest_project(session, project_id, workspace_path(project.workspace_id))


@router.post("/{project_id}/index")
def index_project(
    project_id: int,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """(Re)index the project's workspace for semantic search. Requires the clone to be done."""
    project = _get_owned_project(project_id, current_user, session)
    if project.status != "ready":
        raise HTTPException(
            status_code=409,
            detail=f"Project is '{project.status}', not ready to index yet",
        )
    background_tasks.add_task(_index_project, project_id)
    return {"status": "indexing_started"}


@router.get("/{project_id}/issues")
async def get_project_issues(
    project_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    token: Annotated[str, Depends(get_github_token)],
    session: Session = Depends(get_session),
):
    """Open GitHub issues for this project's repo — feeds the issue picker."""
    project = _get_owned_project(project_id, current_user, session)
    owner, repo = parse_github_url(project.github_url)
    issues = await list_repo_issues(token, owner, repo)
    return [
        {
            "number": issue["number"],
            "title": issue["title"],
            "body": issue.get("body"),
            "url": issue["html_url"],
            "labels": [label["name"] for label in issue.get("labels", [])],
        }
        for issue in issues
    ]
