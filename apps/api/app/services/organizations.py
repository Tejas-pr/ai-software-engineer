# apps/api/app/services/organizations.py
"""Organizations: creation, slugs and the membership checks every
org-scoped route goes through."""

import re

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.organization import Organization, OrganizationMember
from app.models.project import Project
from app.models.user import User


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:48] or "org"


def unique_slug(session: Session, name: str) -> str:
    """`name` as a slug, suffixed -2, -3, … until no organization has it."""
    base = _slugify(name)
    slug, n = base, 1
    while session.exec(select(Organization).where(Organization.slug == slug)).first():
        n += 1
        slug = f"{base}-{n}"
    return slug


def create_organization(
    session: Session, user: User, name: str, *, is_personal: bool = False
) -> Organization:
    """Creates the organization with `user` as its owner. Commits."""
    assert user.id is not None  # authenticated users are always persisted
    org = Organization(
        name=name.strip(),
        slug=unique_slug(session, name),
        is_personal=is_personal,
        created_by=user.id,
    )
    session.add(org)
    session.flush()
    assert org.id is not None  # assigned by the flush above
    session.add(
        OrganizationMember(organization_id=org.id, user_id=user.id, role="owner")
    )
    session.commit()
    session.refresh(org)
    return org


def require_membership(
    session: Session, organization_id: int, user: User, *, owner: bool = False
) -> OrganizationMember:
    """The user's membership, or 404 (the organization doesn't exist *for
    them*). `owner=True` additionally requires the owner role (403)."""
    membership = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user.id,
        )
    ).first()
    if membership is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    if owner and membership.role != "owner":
        raise HTTPException(
            status_code=403, detail="Only an owner of this organization can do that"
        )
    return membership


def get_accessible_project(session: Session, project_id: int, user: User) -> Project:
    """A project the user can work on: they belong to its organization."""
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        require_membership(session, project.organization_id, user)
    except HTTPException:
        raise HTTPException(status_code=404, detail="Project not found") from None
    return project
