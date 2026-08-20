from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.db import get_session
from app.models.user import User
from app.utils.security import decode_access_token

# Looks for "Authorization: Bearer <JWT>" header
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="api/v1/accounts/auth/github/login", auto_error=False
)


def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
    session: Annotated[Session | None, Depends(get_session)] = None,
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token or session is None:
        raise credentials_exception

    payload = decode_access_token(token)
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
