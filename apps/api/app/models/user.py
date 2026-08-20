from sqlmodel import Field

from app.models.base import TimestampModel


class User(TimestampModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)

    # Optional password so OAuth-only users can register without one
    hashed_password: str | None = Field(default=None)

    # OAuth Provider IDs
    github_id: int | None = Field(default=None, unique=True, index=True)

    # Roles and Permissions
    is_active: bool = Field(default=True)
