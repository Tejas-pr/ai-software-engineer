# apps/api/app/api/v1/settings.py
"""User-supplied LLM provider keys (BYOK). Write-only from the API's
perspective — GET returns a masked preview, never the plaintext, after
the initial save."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.agents.llm import KNOWN_PROVIDERS, get_chat_model
from app.api.deps import get_current_user
from app.db import get_session
from app.models.user import User
from app.models.user_api_key import UserApiKey
from app.services.provider_keys import (
    InvalidKeyError,
    KeyCheckUnavailableError,
    verify_provider_key,
)
from app.services.resources import (
    get_ollama_hardware_info,
    get_or_create_user_resource_limits,
    get_system_telemetry,
    prune_workspaces_storage,
)
from app.utils.crypto import decrypt_token, encrypt_token

router = APIRouter(prefix="/settings", tags=["settings"])


class ApiKeyIn(BaseModel):
    api_key: str = Field(..., min_length=1)


class ResourceLimitsIn(BaseModel):
    ollama_num_gpu: int = Field(default=99, ge=0, le=128)
    ollama_num_thread: int = Field(default=8, ge=1, le=128)
    ollama_vram_budget_gb: float = Field(default=16.0, ge=1.0, le=512.0)
    ollama_keep_alive: str = Field(default="30m")
    max_context_window: int = Field(default=32768, ge=2048, le=262144)
    max_tokens_per_run: int = Field(default=100000, ge=5000, le=2000000)
    max_run_timeout_seconds: int = Field(default=600, ge=60, le=7200)
    max_concurrent_runs: int = Field(default=2, ge=1, le=16)
    workspace_storage_limit_gb: float = Field(default=20.0, ge=1.0, le=1000.0)
    auto_prune_workspaces: bool = Field(default=True)


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
    - ``local_models``: Ollama models actually installed on this machine
      right now (queried live from Ollama, not the static `.env` list —
      see `app/services/ollama.py`), always available, no key required.
    - ``recommended_coding_model``: whichever installed local model is the
      best fit for the Coder step specifically, or null if none are
      installed / Ollama isn't reachable.

    The frontend uses this to:
    1. Show a toggle (my key vs platform).
    2. Filter the model picker to only reachable models.
    3. Populate the local-model dropdown and flag the recommended one.
    """
    from app.agents.llm import _PROVIDERS
    from app.config import settings as app_settings
    from app.services.ollama import (
        list_installed_tool_models,
        recommend_coding_model,
        settings_ollama_fallback,
    )

    rows = session.exec(
        select(UserApiKey).where(UserApiKey.user_id == current_user.id)
    ).all()
    user_providers = {row.provider for row in rows}

    platform_providers = {
        prefix
        for prefix, _, key_setting in _PROVIDERS
        if getattr(app_settings, key_setting, "")
    }

    installed = list_installed_tool_models()
    local_models = installed if installed is not None else settings_ollama_fallback()

    return {
        "user_providers": sorted(user_providers),
        "platform_providers": sorted(platform_providers),
        "local_models": local_models,
        # True only when Ollama answered and has tool-capable models
        # installed — `local_models` above may be the static fallback list.
        "ollama_available": bool(installed),
        "recommended_coding_model": recommend_coding_model(local_models),
    }


@router.put("/api-keys/{provider}")
def set_api_key(
    provider: str,
    body: ApiKeyIn,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    _require_known_provider(provider)
    api_key = body.api_key.strip()
    try:
        verify_provider_key(provider, api_key)
    except InvalidKeyError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except KeyCheckUnavailableError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't reach {provider} to check the key — try again in a moment.",
        ) from e
    # current_user.id is `int | None` in SQLModel's type system (pre-insert
    # rows), but authenticated users are always persisted — assert to narrow.
    assert current_user.id is not None
    existing = session.exec(
        select(UserApiKey).where(
            UserApiKey.user_id == current_user.id, UserApiKey.provider == provider
        )
    ).first()

    encrypted = encrypt_token(api_key)
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
    # Cached clients hold the key they were built with
    get_chat_model.cache_clear()
    return {"provider": provider, "configured": True, "masked_key": _mask(api_key)}


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
        get_chat_model.cache_clear()
    return {"provider": provider, "configured": False}


@router.get("/resources")
def get_resource_settings(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Returns host hardware telemetry, Ollama daemon status, and user resource limits."""
    assert current_user.id is not None
    telemetry = get_system_telemetry()
    ollama_info = get_ollama_hardware_info()
    limits = get_or_create_user_resource_limits(session, current_user.id)

    return {
        "telemetry": telemetry,
        "ollama": ollama_info,
        "limits": {
            "ollama_num_gpu": limits.ollama_num_gpu,
            "ollama_num_thread": limits.ollama_num_thread,
            "ollama_vram_budget_gb": limits.ollama_vram_budget_gb,
            "ollama_keep_alive": limits.ollama_keep_alive,
            "max_context_window": limits.max_context_window,
            "max_tokens_per_run": limits.max_tokens_per_run,
            "max_run_timeout_seconds": limits.max_run_timeout_seconds,
            "max_concurrent_runs": limits.max_concurrent_runs,
            "workspace_storage_limit_gb": limits.workspace_storage_limit_gb,
            "auto_prune_workspaces": limits.auto_prune_workspaces,
        },
    }


@router.put("/resources")
def update_resource_settings(
    body: ResourceLimitsIn,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Updates user hardware limits and model guardrails."""
    assert current_user.id is not None
    limits = get_or_create_user_resource_limits(session, current_user.id)

    limits.ollama_num_gpu = body.ollama_num_gpu
    limits.ollama_num_thread = body.ollama_num_thread
    limits.ollama_vram_budget_gb = body.ollama_vram_budget_gb
    limits.ollama_keep_alive = body.ollama_keep_alive
    limits.max_context_window = body.max_context_window
    limits.max_tokens_per_run = body.max_tokens_per_run
    limits.max_run_timeout_seconds = body.max_run_timeout_seconds
    limits.max_concurrent_runs = body.max_concurrent_runs
    limits.workspace_storage_limit_gb = body.workspace_storage_limit_gb
    limits.auto_prune_workspaces = body.auto_prune_workspaces

    session.add(limits)
    session.commit()
    session.refresh(limits)
    get_chat_model.cache_clear()

    return {
        "ollama_num_gpu": limits.ollama_num_gpu,
        "ollama_num_thread": limits.ollama_num_thread,
        "ollama_vram_budget_gb": limits.ollama_vram_budget_gb,
        "ollama_keep_alive": limits.ollama_keep_alive,
        "max_context_window": limits.max_context_window,
        "max_tokens_per_run": limits.max_tokens_per_run,
        "max_run_timeout_seconds": limits.max_run_timeout_seconds,
        "max_concurrent_runs": limits.max_concurrent_runs,
        "workspace_storage_limit_gb": limits.workspace_storage_limit_gb,
        "auto_prune_workspaces": limits.auto_prune_workspaces,
    }


@router.post("/resources/prune-cache")
def prune_storage_cache(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Reclaims disk space by pruning temporary and orphan workspace files."""
    assert current_user.id is not None
    return prune_workspaces_storage()
