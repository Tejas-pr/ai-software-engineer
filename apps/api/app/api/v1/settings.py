# apps/api/app/api/v1/settings.py
"""User-supplied LLM provider keys (BYOK). Write-only from the API's
perspective — GET returns a masked preview, never the plaintext, after
the initial save."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.agents.llm import KNOWN_PROVIDERS
from app.api.deps import get_current_user
from app.db import get_session
from app.models.user import User
from app.models.user_api_key import UserApiKey
from app.utils.crypto import decrypt_token, encrypt_token

router = APIRouter(prefix="/settings", tags=["settings"])


class ApiKeyIn(BaseModel):
    api_key: str = Field(..., min_length=1)


def _mask(plaintext_len_hint: str) -> str:
    """Never reversible, never stored — just a UI cue like GitHub's own
    `ghp_****ab12` token display. Shows only the last 4 characters."""
    tail = (
        plaintext_len_hint[-4:] if len(plaintext_len_hint) >= 4 else plaintext_len_hint
    )
    return f"{'•' * 8}{tail}"


def _require_known_provider(provider: str) -> None:
    if provider not in KNOWN_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown provider '{provider}'. Must be one of: {', '.join(KNOWN_PROVIDERS)}.",
        )


@router.get("/api-keys")
def list_api_keys(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(UserApiKey).where(UserApiKey.user_id == current_user.id)
    ).all()
    # Masking needs the plaintext momentarily — decrypt just to build the
    # preview string, never send it further than this response.
    by_provider = {row.provider: row for row in rows}
    return [
        {
            "provider": provider,
            "configured": provider in by_provider,
            "masked_key": _mask(decrypt_token(by_provider[provider].encrypted_key))
            if provider in by_provider
            else None,
            "updated_at": by_provider[provider].updated_at
            if provider in by_provider
            else None,
        }
        for provider in KNOWN_PROVIDERS
    ]


@router.get("/available-models")
def get_available_models(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Returns which model groups are available, split by key source.

    - ``user_providers``: providers where the user has a BYOK key stored.
    - ``platform_providers``: providers where a platform .env key is configured.
    - ``local_models``: Ollama models (always available, no key required).

    The frontend uses this to:
    1. Show a toggle (my key vs platform).
    2. Filter the model picker to only reachable models.
    """
    from app.agents.llm import _PROVIDERS
    from app.config import settings as app_settings

    rows = session.exec(
        select(UserApiKey).where(UserApiKey.user_id == current_user.id)
    ).all()
    user_providers = {row.provider for row in rows}

    platform_providers = {
        prefix
        for prefix, _, key_setting in _PROVIDERS
        if getattr(app_settings, key_setting, "")
    }

    return {
        "user_providers": sorted(user_providers),
        "platform_providers": sorted(platform_providers),
        "local_models": app_settings.OLLAMA_MODELS,
    }


@router.put("/api-keys/{provider}")
def set_api_key(
    provider: str,
    body: ApiKeyIn,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    _require_known_provider(provider)
    # current_user.id is `int | None` in SQLModel's type system (pre-insert
    # rows), but authenticated users are always persisted — assert to narrow.
    assert current_user.id is not None
    existing = session.exec(
        select(UserApiKey).where(
            UserApiKey.user_id == current_user.id, UserApiKey.provider == provider
        )
    ).first()

    encrypted = encrypt_token(body.api_key)
    if existing:
        existing.encrypted_key = encrypted
        session.add(existing)
    else:
        session.add(
            UserApiKey(
                user_id=current_user.id, provider=provider, encrypted_key=encrypted
            )
        )
    session.commit()
    return {"provider": provider, "configured": True, "masked_key": _mask(body.api_key)}


@router.delete("/api-keys/{provider}")
def delete_api_key(
    provider: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    _require_known_provider(provider)
    existing = session.exec(
        select(UserApiKey).where(
            UserApiKey.user_id == current_user.id, UserApiKey.provider == provider
        )
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
    return {"provider": provider, "configured": False}
