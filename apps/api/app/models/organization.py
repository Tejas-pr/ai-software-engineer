# apps/api/app/models/organization.py
from sqlalchemy import UniqueConstraint
from sqlmodel import Field

from app.models.base import TimestampModel

# Owners manage the organization itself (rename, members, delete); members
# work inside it (connect repos, run agents). Checked by
# `app/services/organizations.py`'s `require_membership`.
ROLES = ("owner", "member")


class Organization(TimestampModel, table=True):
    """The workspace projects and runs belong to. Every user gets a
    personal one (created by the migration that introduced organizations,
    or by onboarding for new users) and can create or join more."""

    __tablename__ = "organizations"

    id: int | None = Field(default=None, primary_key=True)
    name: str
    # URL-safe, unique across all organizations (see `unique_slug`).
    slug: str = Field(unique=True, index=True)
    # The automatically created one-person workspace; can't be deleted.
    is_personal: bool = Field(default=False)
    created_by: int = Field(foreign_key="users.id", index=True)


class OrganizationMember(TimestampModel, table=True):
    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    id: int | None = Field(default=None, primary_key=True)
    organization_id: int = Field(foreign_key="organizations.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    role: str = Field(default="member")
