from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlmodel import Session, SQLModel, select

from app.api.deps import get_current_user
from app.config import settings
from app.db import get_session
from app.models.user import User
from app.utils.crypto import encrypt_token
from app.utils.security import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/accounts/auth", tags=["auth"])

# Only send the cookie over HTTPS once we're actually deployed behind one.
COOKIE_SECURE = settings.ENVIRONMENT.lower() == "production"
AUTH_PATH = "/api/v1/accounts/auth"


class UserPublic(SQLModel):
    """What we're willing to hand back to the client — never hashed_password."""

    id: int
    username: str
    email: str
    is_active: bool


def _set_auth_cookies(response: Response, user: User) -> None:
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    # Scoped to the auth routes only — no reason for every API call to carry it.
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=AUTH_PATH,
    )


@router.get("/github/login")
def github_login():
    """Redirects the user to GitHub's authorization page."""
    github_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.GITHUB_REDIRECT_URI}"
        # `repo` is required later to clone private repos, create branches,
        # commit, and open PRs on the user's behalf (see app/agents/github_tools.py).
        f"&scope=user:email repo"
    )
    return RedirectResponse(github_url)


@router.get("/github/callback")
async def github_callback(code: str, session: Session = Depends(get_session)):
    """Receives the callback from GitHub, exchanges code for token, syncs user, and issues auth cookies."""
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
        else:
            # Create a brand new user
            db_user = User(
                username=username,
                email=primary_email,
                github_id=github_id,
            )

    # Every login carries a fresh GitHub token (scope may have just changed,
    # or the old one may have been revoked) — always store the latest one.
    db_user.github_access_token = encrypt_token(github_token)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    # 5. Issue auth cookies and redirect back to the frontend — no token in the URL.
    redirect = RedirectResponse(f"{settings.FRONTEND_URL}/login/callback")
    _set_auth_cookies(redirect, db_user)
    return redirect


@router.post("/refresh/")
def refresh(
    request: Request, response: Response, session: Session = Depends(get_session)
):
    """Reads the refresh cookie and issues a fresh access (+ refresh) cookie pair."""
    token = request.cookies.get("refresh_token")
    unauthorized = HTTPException(
        status_code=401, detail="Invalid or expired refresh token"
    )

    if not token:
        raise unauthorized

    payload = decode_token(token, "refresh")
    if payload is None:
        raise unauthorized

    user = session.exec(select(User).where(User.email == payload.get("sub"))).first()
    if user is None:
        raise unauthorized

    _set_auth_cookies(response, user)
    return {"status": "ok"}


@router.post("/logout/")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path=AUTH_PATH)
    return {"status": "ok"}


@router.get("/me/", response_model=UserPublic)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user
