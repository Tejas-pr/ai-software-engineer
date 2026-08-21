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
