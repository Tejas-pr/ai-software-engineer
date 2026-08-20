from sqlmodel import Field

from app.models.base import TimestampModel


class Project(TimestampModel, table=True):
    __tablename__ = "projects"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    github_url: str
    branch: str = Field(default="main")
    description: str | None = None
