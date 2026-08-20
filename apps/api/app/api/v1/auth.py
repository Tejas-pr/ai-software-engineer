from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.config import settings
from app.db import get_session
from app.models.user import User
from app.utils.security import create_access_token

router = APIRouter(prefix="/accounts/auth", tags=["auth"])


@router.get("/github/login")
def github_login():
    """Redirects the user to GitHub's authorization page."""
    github_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.GITHUB_REDIRECT_URI}"
        f"&scope=user:email"
    )
    return RedirectResponse(github_url)


@router.get("/github/callback")
async def github_callback(code: str, session: Session = Depends(get_session)):
    """Receives the callback from GitHub, exchanges code for token, syncs user, and issues a JWT."""
    async with httpx.AsyncClient() as client:
        # 1. Exchange auth code for GitHub access token
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_response.json()
        github_token = token_data.get("access_token")
        if not github_token:
            raise HTTPException(
                status_code=400, detail="Failed to retrieve access token from GitHub"
            )

        # 2. Get user profile from GitHub
        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {github_token}"},
        )
        github_user = user_response.json()
        github_id = github_user.get("id")
        username = github_user.get("login")

        # 3. Get user emails (in case email is set to private)
        emails_response = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"token {github_token}"},
        )
        emails = emails_response.json()
        primary_email = next((e["email"] for e in emails if e.get("primary")), None)
        if not primary_email:
            raise HTTPException(
                status_code=400, detail="Primary email not found on GitHub profile"
            )

    # 4. Find or Create the User in your Database
    statement = select(User).where(User.github_id == github_id)
    db_user = session.exec(statement).first()

    if not db_user:
        # Check if a user with this email already exists
        statement = select(User).where(User.email == primary_email)
        db_user = session.exec(statement).first()

        if db_user:
            # Link existing user account to GitHub
            db_user.github_id = github_id
            session.add(db_user)
            session.commit()
            session.refresh(db_user)
        else:
            # Create a brand new user
            db_user = User(
                username=username,
                email=primary_email,
                github_id=github_id,
            )
            session.add(db_user)
            session.commit()
            session.refresh(db_user)

    # 5. Create app JWT access token
    app_token = create_access_token(data={"sub": db_user.email})

    # 6. Redirect back to frontend callback page with the token
    redirect_url = f"{settings.FRONTEND_URL}/login/callback?token={app_token}"
    return RedirectResponse(redirect_url)


@router.get("/me/", response_model=User)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
