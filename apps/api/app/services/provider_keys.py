# apps/api/app/services/provider_keys.py
"""Checks a BYOK key against its provider before it's stored, so a typo is
caught on the settings/onboarding form — not as a failed run minutes later.

One cheap, read-only call per provider (list models); no tokens are spent.
"""

import httpx

_TIMEOUT = 10.0


class InvalidKeyError(ValueError):
    """The provider rejected the key."""


class KeyCheckUnavailableError(RuntimeError):
    """The provider couldn't be reached to check the key."""


def _request(provider: str, key: str) -> httpx.Request:
    if provider == "gemini":
        return httpx.Request(
            "GET",
            "https://generativelanguage.googleapis.com/v1beta/models",
            params={"pageSize": 1},
            headers={"x-goog-api-key": key},
        )
    if provider == "claude":
        return httpx.Request(
            "GET",
            "https://api.anthropic.com/v1/models",
            params={"limit": 1},
            headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
        )
    if provider == "gpt":
        return httpx.Request(
            "GET",
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {key}"},
        )
    raise ValueError(f"Unknown provider '{provider}'")


def verify_provider_key(provider: str, key: str) -> None:
    """Returns if the provider accepts `key`; raises `InvalidKeyError` if it
    doesn't, `KeyCheckUnavailableError` if we couldn't find out."""
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.send(_request(provider, key))
    except httpx.HTTPError as e:
        raise KeyCheckUnavailableError(str(e)) from e
    if response.status_code in (400, 401, 403):
        raise InvalidKeyError(
            f"The {provider} API rejected this key ({response.status_code})."
        )
    if response.status_code >= 500 or response.status_code == 429:
        # Down or rate limited: says nothing about the key itself.
        raise KeyCheckUnavailableError(f"HTTP {response.status_code}")
    if response.status_code >= 300:
        raise InvalidKeyError(
            f"Unexpected response from {provider} ({response.status_code})."
        )
