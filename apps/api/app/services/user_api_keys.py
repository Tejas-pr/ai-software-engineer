# apps/api/app/services/user_api_keys.py
"""Looks up a user's own BYOK provider key — the one place it gets
decrypted, right before handing it to `get_chat_model()`."""

from sqlmodel import Session, select

from app.db import engine
from app.models.user_api_key import UserApiKey
from app.utils.crypto import decrypt_token


def get_user_api_key(user_id: int, provider: str) -> str | None:
    with Session(engine) as session:
        row = session.exec(
            select(UserApiKey).where(
                UserApiKey.user_id == user_id, UserApiKey.provider == provider
            )
        ).first()
    return decrypt_token(row.encrypted_key) if row else None
