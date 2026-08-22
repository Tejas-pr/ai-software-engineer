# apps/api/app/models/agent_run.py
from typing import Any

from sqlalchemy import JSON, Column
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
    skip_tests: bool = Field(default=False)

    # pending -> running -> (awaiting_approval -> running) -> completed | failed | rejected
    status: str = Field(default="pending", index=True)
    # The plan waiting on human approval — set when status flips to
    # "awaiting_approval", so it survives a page reload (the graph's own
    # in-flight state doesn't outlive the interrupted request).
    pending_plan: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    review_notes: str | None = None
    pr_url: str | None = None
    error: str | None = None
