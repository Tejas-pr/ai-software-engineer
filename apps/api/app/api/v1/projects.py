from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, col, select

from app.api.deps import get_current_user, get_github_token
from app.config import settings
from app.db import get_session
from app.models.project import Project
from app.models.user import User
from app.rag.ingestion import ingest_project
from app.services.github_api import list_repo_issues, parse_github_url
from app.services.organizations import get_accessible_project, require_membership
from app.services.projects import delete_project as delete_project_and_data
from app.services.workspace import clone_repository, workspace_path

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    organization_id: int
    github_url: str = Field(..., description="e.g. https://github.com/owner/repo")
    branch: str = "main"
    name: str | None = Field(default=None, description="Defaults to 'owner/repo'")
    description: str | None = None


MAX_INDEX_ERROR_LENGTH = 300


def _index_workspace(session: Session, project: Project) -> None:
    """(Re)builds the project's semantic-search index, recording the outcome
    on the row. Never raises: a failed index (no embeddings provider
    reachable, say) mustn't fail the clone — runs still work, the
    researcher's `search_codebase` just finds nothing."""
    assert project.id is not None
    project.index_status = "indexing"
    project.index_error = None
    session.add(project)
    session.commit()
    try:
        ingest_project(session, project.id, workspace_path(project.workspace_id))
        project.index_status = "ready"
        project.indexed_at = datetime.now(UTC)
    except Exception as e:  # noqa: BLE001
        session.rollback()
        project.index_status = "failed"
        project.index_error = str(e)[:MAX_INDEX_ERROR_LENGTH]
    session.add(project)
    session.commit()


def _clone_and_update_status(
    project_id: int, github_url: str, branch: str, token: str
) -> None:
    """Runs in the background after the API has already responded: clone,
    then index, so a connected repo is searchable without anyone asking."""
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

        if project.status == "ready":
            _index_workspace(session, project)


@router.post("/")
def create_project(
    body: ProjectCreate,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    token: Annotated[str, Depends(get_github_token)],
    session: Session = Depends(get_session),
):
    """Connects a GitHub repo to an organization — clones it (then indexes
    it) in the background.

    Reuses the existing `Project` row for this (organization, github_url) if
    one already exists, instead of creating a duplicate every time the same
    repo is connected again. This doubles as the retry path: reconnecting
    a previously-failed clone (e.g. the repo was empty and has since had a
    commit pushed to it) just re-clones onto the same row.
    """
    if settings.RESTRICT_CLONE_RUN_PROJECT:
        raise HTTPException(
            status_code=403,
            detail=(
                "Repository cloning is restricted on this demo instance to prevent resource exhaustion. "
                "Please clone the project to run locally or check the GitHub video walkthrough."
            ),
        )
    assert current_user.id is not None  # authenticated users are always persisted
    require_membership(session, body.organization_id, current_user)
    owner, repo = parse_github_url(body.github_url)
    statement = select(Project).where(
        Project.organization_id == body.organization_id,
        Project.github_url == body.github_url,
    )
    project = session.exec(statement).first()

    if project is None:
        project = Project(
            organization_id=body.organization_id,
            user_id=current_user.id,
            github_url=body.github_url,
        )

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
    organization_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """The organization's projects, newest first."""
    require_membership(session, organization_id, current_user)
    statement = (
        select(Project)
        .where(Project.organization_id == organization_id)
        .order_by(col(Project.created_at).desc())
    )
    return session.exec(statement).all()


@router.get("/{project_id}")
def get_project(
    project_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    return get_accessible_project(session, project_id, current_user)


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

    Allowed for the organization's owners and whoever connected the repo.
    """
    project = get_accessible_project(session, project_id, current_user)
    if project.user_id != current_user.id:
        require_membership(session, project.organization_id, current_user, owner=True)
    delete_project_and_data(session, project)


def _index_project(project_id: int) -> None:
    """Runs in the background after the API has already responded."""
    from app.db import engine  # local import: background task builds its own session

    with Session(engine) as session:
        project = session.get(Project, project_id)
        if project is None or project.status != "ready":
            return
        _index_workspace(session, project)


@router.post("/{project_id}/index")
def index_project(
    project_id: int,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """(Re)index the project's workspace for semantic search. Requires the clone to be done."""
    project = get_accessible_project(session, project_id, current_user)
    if project.status != "ready":
        raise HTTPException(
            status_code=409,
            detail=f"Project is '{project.status}', not ready to index yet",
        )
    project.index_status = "indexing"
    session.add(project)
    session.commit()
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
    project = get_accessible_project(session, project_id, current_user)
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
