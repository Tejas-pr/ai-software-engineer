import uuid

from sqlalchemy import Column, Uuid
from sqlmodel import Field

from app.models.base import TimestampModel


class Project(TimestampModel, table=True):
    __tablename__ = "projects"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str = Field(index=True)
    github_url: str
    branch: str = Field(default="main")
    description: str | None = None

    # pending -> ready | failed, set once the initial clone finishes.
    status: str = Field(default="pending")

    # The workspace directory on disk is named by this, not `id` — an
    # unguessable, non-enumerable name for what's otherwise a plain
    # sequential integer (see app/services/workspace.py's workspace_path).
    workspace_id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(Uuid(as_uuid=True), nullable=False, unique=True, index=True),
    )
