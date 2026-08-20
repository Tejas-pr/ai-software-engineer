from sqlmodel import Field, SQLModel


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id")  # Link to the projects table
    title: str = Field(index=True)
    status: str = Field(
        default="pending"
    )  # pending, planning, running, completed, failed
    plan: str | None = None  # Markdown plan string
    logs: str | None = None  # Process output logs or error tracebacks
