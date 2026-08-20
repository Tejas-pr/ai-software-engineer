from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.db import get_session
from app.models.user import User
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
