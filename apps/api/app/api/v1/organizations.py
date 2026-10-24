# apps/api/app/api/v1/organizations.py
"""Organizations: the workspaces projects and runs belong to — list,
create, rename, delete, members, and the dashboard overview."""

from datetime import UTC, date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, col, func, select

from app.api.deps import get_current_user
from app.db import get_session
from app.models.agent_run import AgentRun
from app.models.organization import ROLES, Organization, OrganizationMember
from app.models.project import Project
from app.models.user import User
from app.services.organizations import create_organization, require_membership
from app.services.projects import delete_project

router = APIRouter(prefix="/orgs", tags=["organizations"])

OVERVIEW_DAYS = 30
RECENT_RUNS = 8


class OrganizationIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)


class MemberIn(BaseModel):
    username: str = Field(..., min_length=1, description="GitHub login")
    role: str = "member"


class RoleIn(BaseModel):
    role: str


def _require_role(role: str) -> None:
    if role not in ROLES:
        raise HTTPException(
            status_code=400, detail=f"Role must be one of: {', '.join(ROLES)}"
        )


def _get_org(session: Session, organization_id: int) -> Organization:
    org = session.get(Organization, organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


def _org_summary(session: Session, org: Organization, role: str) -> dict:
    member_count = session.exec(
        select(func.count()).where(OrganizationMember.organization_id == org.id)
    ).one()
    project_count = session.exec(
        select(func.count()).where(Project.organization_id == org.id)
    ).one()
    return {
        **org.model_dump(),
        "role": role,
        "member_count": member_count,
        "project_count": project_count,
    }


def _owner_count(session: Session, organization_id: int) -> int:
    return session.exec(
        select(func.count()).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.role == "owner",
        )
    ).one()


@router.get("/")
def list_organizations(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Every organization the user belongs to, personal one first."""
    rows = session.exec(
        select(Organization, OrganizationMember.role)
        .join(
            OrganizationMember,
            col(OrganizationMember.organization_id) == Organization.id,
        )
        .where(OrganizationMember.user_id == current_user.id)
        .order_by(col(Organization.is_personal).desc(), col(Organization.name))
    ).all()
    return [_org_summary(session, org, role) for org, role in rows]


@router.post("/")
def create_org(
    body: OrganizationIn,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    org = create_organization(session, current_user, body.name)
    return _org_summary(session, org, "owner")


@router.get("/{organization_id}")
def get_org(
    organization_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    membership = require_membership(session, organization_id, current_user)
    return _org_summary(session, _get_org(session, organization_id), membership.role)


@router.patch("/{organization_id}")
def rename_org(
    organization_id: int,
    body: OrganizationIn,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    require_membership(session, organization_id, current_user, owner=True)
    org = _get_org(session, organization_id)
    org.name = body.name.strip()
    org.updated_at = datetime.now(UTC)
    session.add(org)
    session.commit()
    session.refresh(org)
    return _org_summary(session, org, "owner")


@router.delete("/{organization_id}", status_code=204)
def delete_org(
    organization_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Deletes the organization with all its projects, runs, indexes and
    workspaces. Owners only; a personal organization can't be deleted."""
    require_membership(session, organization_id, current_user, owner=True)
    org = _get_org(session, organization_id)
    if org.is_personal:
        raise HTTPException(
            status_code=400, detail="Your personal organization can't be deleted"
        )
    for project in session.exec(
        select(Project).where(Project.organization_id == organization_id)
    ).all():
        delete_project(session, project)
    for member in session.exec(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id
        )
    ).all():
        session.delete(member)
    session.delete(org)
    session.commit()


@router.get("/{organization_id}/members")
def list_members(
    organization_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    require_membership(session, organization_id, current_user)
    rows = session.exec(
        select(OrganizationMember, User)
        .join(User, col(User.id) == OrganizationMember.user_id)
        .where(OrganizationMember.organization_id == organization_id)
        .order_by(col(OrganizationMember.created_at))
    ).all()
    return [
        {
            "user_id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "email": user.email,
            "role": member.role,
            "joined_at": member.created_at,
        }
        for member, user in rows
    ]


@router.post("/{organization_id}/members")
def add_member(
    organization_id: int,
    body: MemberIn,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Adds an existing user by GitHub login. They need to have signed in
    once (that's what creates their account)."""
    require_membership(session, organization_id, current_user, owner=True)
    _require_role(body.role)
    if _get_org(session, organization_id).is_personal:
        raise HTTPException(
            status_code=400,
            detail="A personal organization is just you — create a team organization to add people",
        )
    user = session.exec(
        select(User).where(func.lower(User.username) == body.username.strip().lower())
    ).first()
    if user is None or user.id is None:
        raise HTTPException(
            status_code=404,
            detail=f"No account for '{body.username}' yet — they need to sign in with GitHub once first.",
        )
    existing = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user.id,
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409, detail=f"{user.username} is already a member"
        )
    session.add(
        OrganizationMember(
            organization_id=organization_id, user_id=user.id, role=body.role
        )
    )
    session.commit()
    return {"user_id": user.id, "username": user.username, "role": body.role}


@router.patch("/{organization_id}/members/{user_id}")
def change_role(
    organization_id: int,
    user_id: int,
    body: RoleIn,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    require_membership(session, organization_id, current_user, owner=True)
    _require_role(body.role)
    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
        )
    ).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if (
        member.role == "owner"
        and body.role != "owner"
        and _owner_count(session, organization_id) == 1
    ):
        raise HTTPException(
            status_code=400, detail="An organization needs at least one owner"
        )
    member.role = body.role
    session.add(member)
    session.commit()
    return {"user_id": user_id, "role": member.role}


@router.delete("/{organization_id}/members/{user_id}", status_code=204)
def remove_member(
    organization_id: int,
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Owners remove anyone; anyone can remove themselves (leave). The last
    owner can't go."""
    require_membership(
        session, organization_id, current_user, owner=user_id != current_user.id
    )
    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
        )
    ).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner" and _owner_count(session, organization_id) == 1:
        raise HTTPException(
            status_code=400,
            detail="The last owner can't leave — make someone else an owner first",
        )
    session.delete(member)
    session.commit()


@router.get("/{organization_id}/overview")
def overview(
    organization_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """The dashboard's numbers, all computed from real rows: projects by
    status, runs by status, success rate, PRs opened, a 30-day daily run
    series and the most recent runs."""
    require_membership(session, organization_id, current_user)

    projects = session.exec(
        select(Project).where(Project.organization_id == organization_id)
    ).all()
    runs = session.exec(
        select(AgentRun, Project.name)
        .join(Project, col(Project.id) == AgentRun.project_id)
        .where(Project.organization_id == organization_id)
        .order_by(col(AgentRun.created_at).desc())
    ).all()

    by_status: dict[str, int] = {}
    for run, _ in runs:
        by_status[run.status] = by_status.get(run.status, 0) + 1
    finished = sum(by_status.get(s, 0) for s in ("completed", "failed", "rejected"))

    today = datetime.now(UTC).date()
    start = today - timedelta(days=OVERVIEW_DAYS - 1)
    daily: dict[date, dict[str, int]] = {
        start + timedelta(days=i): {"runs": 0, "completed": 0, "failed": 0}
        for i in range(OVERVIEW_DAYS)
    }
    for run, _ in runs:
        day = run.created_at.date()
        if day in daily:
            daily[day]["runs"] += 1
            if run.status in ("completed", "failed"):
                daily[day][run.status] += 1

    return {
        "projects": {
            "total": len(projects),
            "ready": sum(p.status == "ready" for p in projects),
            "pending": sum(p.status == "pending" for p in projects),
            "failed": sum(p.status == "failed" for p in projects),
            "indexed": sum(p.index_status == "ready" for p in projects),
        },
        "runs": {
            "total": len(runs),
            "by_status": by_status,
            "active": by_status.get("running", 0)
            + by_status.get("awaiting_approval", 0),
            "success_rate": (by_status.get("completed", 0) / finished)
            if finished
            else None,
            "prs_opened": sum(1 for run, _ in runs if run.pr_url),
        },
        "daily": [{"date": day.isoformat(), **counts} for day, counts in daily.items()],
        "recent_runs": [
            {**run.model_dump(), "project_name": name}
            for run, name in runs[:RECENT_RUNS]
        ],
    }
