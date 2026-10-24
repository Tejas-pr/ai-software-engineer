# apps/api/app/services/projects.py
"""Removing a project and everything hanging off it — shared by
disconnecting one repo and deleting a whole organization."""

from sqlmodel import Session, select

from app.models.agent_run import AgentRun
from app.models.document_chunk import DocumentChunk
from app.models.project import Project
from app.services.workspace import delete_workspace, workspace_path


def delete_project(session: Session, project: Project) -> None:
    """Deletes the project's runs, chunks and row, then its workspace
    directory. Commits."""
    # Captured before delete: the ORM instance expires once its row (and
    # this session's transaction) is gone, so reading it after commit would
    # error.
    workspace_id = project.workspace_id

    # No FK cascade configured on these — clear dependents first or the
    # Project delete below hits a ForeignKeyViolation.
    for run in session.exec(
        select(AgentRun).where(AgentRun.project_id == project.id)
    ).all():
        session.delete(run)
    for chunk in session.exec(
        select(DocumentChunk).where(DocumentChunk.project_id == project.id)
    ).all():
        session.delete(chunk)

    session.delete(project)
    session.commit()

    delete_workspace(workspace_path(workspace_id))
