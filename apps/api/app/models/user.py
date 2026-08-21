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

    # Encrypted GitHub access token (Fernet, see app/utils/crypto.py). Needed
    # to call the GitHub API on the user's behalf later (list repos, clone
    # private repos, open PRs) — never store it in plaintext.
    github_access_token: str | None = Field(default=None)

    # Roles and Permissions
    is_active: bool = Field(default=True)
