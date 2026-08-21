# apps/api/app/agents/llm.py
"""
LangChain chat model factory.

`app/services/llm.py` calls Gemini and Ollama's HTTP APIs directly and hand-
parses each provider's own tool-call shape. Here we get the same two
providers behind LangChain's `BaseChatModel` interface instead: one
`.bind_tools()`, one `.invoke()`/`.astream()`, regardless of provider. That
uniformity is what lets `langgraph.prebuilt.create_react_agent` (used in
`app/agents/graph.py`) run a tool-calling loop without us writing it by hand
again for the agent graph.
"""

from functools import lru_cache

from langchain_anthropic import ChatAnthropic
from langchain_core.language_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

from app.config import settings

# Model name -> (provider check, builder). Checked in order; first match
# wins. Ollama has no prefix check — it's the catch-all for local dev, since
# local model names (e.g. "qwen2.5-coder:7b") don't follow a shared pattern.
_PROVIDERS: list[tuple[str, list[str], str]] = [
    ("gemini", settings.GEMINI_MODELS, "GEMINI_API_KEY"),
    ("claude", settings.ANTHROPIC_MODELS, "ANTHROPIC_API_KEY"),
    ("gpt", settings.OPENAI_MODELS, "OPENAI_API_KEY"),
]


@lru_cache(maxsize=16)
def get_chat_model(model: str, temperature: float = 0.0) -> BaseChatModel:
    """Return a LangChain chat model for `model`, routed by provider.

    This is the adapter: every node in the agent graph talks to
    `BaseChatModel` and never touches a provider SDK directly, so swapping
    Gemini for Claude/GPT/a local Ollama model is a matter of changing the
    `model` string the user picked — no other code changes.

    Cached per (model, temperature) pair so repeated calls within a run reuse
    the same client instead of reconnecting.
    """
    model_lower = model.lower()

    for prefix, known_models, key_setting in _PROVIDERS:
        if model_lower.startswith(prefix) or model in known_models:
            api_key = getattr(settings, key_setting)
            if not api_key:
                raise ValueError(f"{key_setting} is not configured in settings.")
            if prefix == "gemini":
                return ChatGoogleGenerativeAI(
                    model=model, api_key=api_key, temperature=temperature
                )
            if prefix == "claude":
                return ChatAnthropic(  # type: ignore[call-arg]
                    model=model, api_key=api_key, temperature=temperature
                )
            return ChatOpenAI(model=model, api_key=api_key, temperature=temperature)

    # Catch-all: local Ollama model.
    return ChatOllama(
        model=model,
        base_url=settings.OLLAMA_BASE_URL,
        temperature=temperature,
        keep_alive="30m",
    )
