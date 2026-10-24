# apps/api/app/api/v1/account.py
"""The signed-in user's own profile, and onboarding.

Onboarding is the required path from first sign-in to a usable app:
1. name an organization  (POST /account/onboarding/organization)
2. add an API key        (PUT /settings/api-keys/{provider}) — or choose
   local Ollama models when some are installed
3. finish                (POST /account/onboarding/complete)
Until step 3 succeeds `onboarded_at` stays null and the web app keeps the
user on /onboarding.
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, col, select

from app.api.deps import get_current_user
from app.api.v1.auth import UserPublic
from app.db import get_session
from app.models.organization import Organization, OrganizationMember
from app.models.user import User
from app.models.user_api_key import UserApiKey
from app.services.ollama import list_installed_tool_models
from app.services.organizations import create_organization

router = APIRouter(prefix="/account", tags=["account"])


class ProfileIn(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=80)


class OrganizationNameIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)


class CompleteIn(BaseModel):
    # Finish without a key of their own, running on local Ollama models.
    use_local_models: bool = False


@router.patch("/", response_model=UserPublic)
def update_profile(
    body: ProfileIn,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    current_user.display_name = body.display_name.strip()
    current_user.updated_at = datetime.now(UTC)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


def _personal_org(session: Session, user: User) -> Organization | None:
    return session.exec(
        select(Organization)
        .join(
            OrganizationMember,
            col(OrganizationMember.organization_id) == Organization.id,
        )
        .where(
            OrganizationMember.user_id == user.id,
            Organization.created_by == user.id,
            col(Organization.is_personal),
        )
    ).first()


@router.post("/onboarding/organization")
def onboarding_organization(
    body: OrganizationNameIn,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Step 1: creates the user's first (personal) organization — or renames
    it, if they come back to this step."""
    org = _personal_org(session, current_user)
    if org is None:
        org = create_organization(session, current_user, body.name, is_personal=True)
    else:
        org.name = body.name.strip()
        org.updated_at = datetime.now(UTC)
        session.add(org)
        session.commit()
        session.refresh(org)
    return org


@router.post("/onboarding/complete", response_model=UserPublic)
def onboarding_complete(
    body: CompleteIn,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Step 3: marks the user onboarded once the app is actually usable for
    them — they're in an organization and they have a model to run on."""
    if current_user.onboarded_at is not None:
        return current_user
    if _personal_org(session, current_user) is None:
        raise HTTPException(status_code=400, detail="Create your organization first")

    has_key = (
        session.exec(
            select(UserApiKey).where(UserApiKey.user_id == current_user.id)
        ).first()
        is not None
    )
    if not has_key:
        if not body.use_local_models:
            raise HTTPException(
                status_code=400,
                detail="Add an API key (Gemini, Claude or OpenAI) to continue",
            )
        if not list_installed_tool_models():
            raise HTTPException(
                status_code=400,
                detail="No local Ollama models are available — add an API key instead",
            )

    current_user.onboarded_at = datetime.now(UTC)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user
