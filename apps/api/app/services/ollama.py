# apps/api/app/services/ollama.py
"""Queries the local Ollama daemon for whatever models are actually pulled
on this machine, instead of trusting `Settings.OLLAMA_MODELS` — a static
`.env` list that goes stale the moment someone runs `ollama pull`/`ollama
rm` and never updates it."""

import httpx

from app.config import settings

# Ordered by general coding-benchmark reputation, but weighted toward
# *reliable tool-calling* specifically — the failure mode actually hit on
# this project (qwen2.5-coder:7b narrating a file write instead of calling
# `write_file_tool`, leaving the coder step a silent no-op). A model that
# writes great code but won't reliably invoke the write tool is worse than
# a slightly weaker one that does. Larger installed variants of the same
# family are preferred over smaller ones — see `recommend_coding_model`.
_CODING_MODEL_PRIORITY = [
    "qwen2.5-coder",
    "codestral",
    "deepseek-coder",
    "codellama",
    "starcoder2",
    "deepseek-r1",  # strong general reasoning; usable but not code-specialized
    "llama3",
]


def _param_count_b(parameter_size: str | None) -> float:
    """'14.8B' -> 14.8, None/'' -> 0 — for sorting variants of one family
    by size, not for display."""
    if not parameter_size:
        return 0.0
    try:
        return float(parameter_size.rstrip("Bb"))
    except ValueError:
        return 0.0


def _supports_tools(client: httpx.Client, name: str) -> bool:
    """`/api/tags` doesn't say whether a model can actually do tool-calling
    — only `/api/show`'s `capabilities` list does. Confirmed empirically
    against a real dev machine's 9 installed non-cloud models: only the
    qwen2.5-coder family had `"tools"` — codellama, codestral, starcoder2,
    deepseek-coder, deepseek-r1, and plain llama3 all didn't, despite
    several of those being marketed as "coding" models. Selecting one of
    those isn't a degraded option here, it's a guaranteed, immediate 400
    from Ollama ("model X does not support tools") the moment it's used,
    since every node in this app's agent graph is a tool-calling agent."""
    try:
        response = client.post("/api/show", json={"name": name}, timeout=3.0)
        response.raise_for_status()
        return "tools" in response.json().get("capabilities", [])
    except (httpx.HTTPError, ValueError):
        # Can't confirm it — err toward not listing it, consistent with
        # the reasoning above (a false negative just hides one model from
        # the picker; a false positive sends the user into a guaranteed
        # failure).
        return False


def list_local_ollama_models() -> list[dict]:
    """Hits Ollama's own `GET /api/tags`, keeping only models confirmed
    (via `_supports_tools`) to support tool-calling. Falls back to the
    static `OLLAMA_MODELS` config list (as bare, size-less, unfiltered
    entries) if the Ollama daemon isn't reachable at all, so the model
    picker degrades gracefully instead of the whole endpoint erroring out
    — that fallback can't be capability-checked, so it may include models
    that don't actually support tools."""
    try:
        with httpx.Client(base_url=settings.OLLAMA_BASE_URL, timeout=3.0) as client:
            response = client.get("/api/tags")
            response.raise_for_status()
            raw_models = response.json().get("models", [])

            models = []
            for m in raw_models:
                name = m.get("name") or m.get("model")
                if not name:
                    continue
                # Ollama's "cloud models" (`:cloud` suffix, a `remote_host`
                # field) proxy to a hosted API rather than running on this
                # machine — excluded since the entire point of surfacing
                # "local" models here is no network dependency and no
                # usage limits/cost, which a cloud model would silently
                # reintroduce.
                if m.get("remote_host") or name.endswith(":cloud"):
                    continue
                if not _supports_tools(client, name):
                    continue
                details = m.get("details", {})
                models.append(
                    {
                        "id": name,
                        "size_gb": round(m["size"] / 1e9, 1) if m.get("size") else None,
                        "parameter_size": details.get("parameter_size"),
                        "family": details.get("family"),
                    }
                )
    except (httpx.HTTPError, ValueError):
        return [
            {"id": m, "size_gb": None, "parameter_size": None, "family": None}
            for m in settings.OLLAMA_MODELS
        ]
    return sorted(models, key=lambda m: m["id"])


def recommend_coding_model(models: list[dict]) -> str | None:
    """Picks the best-suited *installed* model for the Coder step, per
    `_CODING_MODEL_PRIORITY`, preferring the largest installed variant
    within whichever family wins. Falls back to whatever's installed if
    nothing matches a known coding-oriented family."""
    by_family: dict[str, list[dict]] = {}
    for m in models:
        family = m["id"].split(":")[0]
        by_family.setdefault(family, []).append(m)

    for family in _CODING_MODEL_PRIORITY:
        candidates = by_family.get(family)
        if candidates:
            candidates.sort(
                key=lambda m: _param_count_b(m["parameter_size"]), reverse=True
            )
            return candidates[0]["id"]
    return models[0]["id"] if models else None
