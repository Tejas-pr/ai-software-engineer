from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.db import get_session
from app.models.user import User
from app.utils.crypto import decrypt_token
from app.utils.security import decode_token


def get_access_token_from_cookie(request: Request) -> str | None:
    return request.cookies.get("access_token")


def get_current_user(
    token: Annotated[str | None, Depends(get_access_token_from_cookie)] = None,
    session: Annotated[Session | None, Depends(get_session)] = None,
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    if not token or session is None:
        raise credentials_exception

    payload = decode_token(token, "access")
    if payload is None:
        raise credentials_exception

    email: str | None = payload.get("sub")
    if email is None:
        raise credentials_exception

    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()
    if user is None:
        raise credentials_exception

    return user


def get_github_token(
    current_user: Annotated[User, Depends(get_current_user)],
) -> str:
    """Decrypt and return the current user's GitHub access token.

    Raises 400 (not 401 — the user *is* authenticated) if they signed up
    before the `repo` scope was requested and need to log in again to grant it.
    """
    if not current_user.github_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GitHub token on file — please log out and log back in with GitHub.",
        )
    return decrypt_token(current_user.github_access_token)
