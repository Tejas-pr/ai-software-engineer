# apps/api/app/models/agent_run.py
from sqlmodel import Field

from app.models.base import TimestampModel


class AgentRun(TimestampModel, table=True):
    """One task -> graph execution. `id` doubles as the LangGraph thread_id
    (see app/agents/graph.py's checkpointer), so a run's checkpoint history
    is always addressable by this row's id — no separate id to keep in sync.
    """

    __tablename__ = "agent_runs"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    task: str
    model: str

    # pending -> running -> (awaiting_approval -> running) -> completed | failed | rejected
    status: str = Field(default="pending", index=True)
    review_notes: str | None = None
    pr_url: str | None = None
    error: str | None = None
