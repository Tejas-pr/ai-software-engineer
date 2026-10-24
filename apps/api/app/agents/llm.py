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

import json
import logging
import re
import uuid
from functools import lru_cache
from typing import Any

from langchain_anthropic import ChatAnthropic
from langchain_core.callbacks import (
    AsyncCallbackManagerForLLMRun,
    CallbackManagerForLLMRun,
)
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, ToolCall
from langchain_core.outputs import ChatResult
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

from app.config import settings
from app.services.user_api_keys import get_user_api_key

logger = logging.getLogger(__name__)


def _extract_fallback_tool_calls(text: str) -> list[ToolCall]:
    """Extract tool calls from plain text/markdown when a local model narrates

    a tool call instead of emitting a native tool_calls structure.
    """
    tool_calls: list[ToolCall] = []

    # 1. Look for <tool_call> tags
    tag_matches = re.findall(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", text, re.DOTALL)
    if tag_matches:
        for m in tag_matches:
            try:
                d = json.loads(m)
                if isinstance(d, dict) and "name" in d:
                    args = d.get("arguments", {})
                    if isinstance(args, str):
                        args = json.loads(args)
                    tool_calls.append(
                        ToolCall(
                            name=d["name"],
                            args=args,
                            id=f"call_{uuid.uuid4().hex[:8]}",
                            type="tool_call",
                        )
                    )
            except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                continue
        if tool_calls:
            return tool_calls

    # 2. Look for ```json ... ``` code blocks
    code_blocks = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if code_blocks:
        for m in code_blocks:
            try:
                d = json.loads(m)
                if isinstance(d, dict) and "name" in d:
                    args = d.get("arguments", {})
                    if isinstance(args, str):
                        args = json.loads(args)
                    tool_calls.append(
                        ToolCall(
                            name=d["name"],
                            args=args,
                            id=f"call_{uuid.uuid4().hex[:8]}",
                            type="tool_call",
                        )
                    )
            except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                continue
        if tool_calls:
            return tool_calls

    # 3. Look for direct JSON object
    trimmed = text.strip()
    if trimmed.startswith("{") and trimmed.endswith("}"):
        try:
            d = json.loads(trimmed)
            if isinstance(d, dict) and "name" in d:
                args = d.get("arguments", {})
                if isinstance(args, str):
                    args = json.loads(args)
                tool_calls.append(
                    ToolCall(
                        name=d["name"],
                        args=args,
                        id=f"call_{uuid.uuid4().hex[:8]}",
                        type="tool_call",
                    )
                )
        except (json.JSONDecodeError, KeyError, TypeError, ValueError):
            pass

    return tool_calls


def _patch_chat_result(result: ChatResult) -> ChatResult:
    for gen in result.generations:
        msg = gen.message

        # Print Ollama token usage in color
        gen_info = gen.generation_info or {}
        resp_meta = getattr(msg, "response_metadata", {}) or {}
        prompt_eval_count = gen_info.get(
            "prompt_eval_count", resp_meta.get("prompt_eval_count")
        )
        eval_count = gen_info.get("eval_count", resp_meta.get("eval_count"))

        if prompt_eval_count is not None or eval_count is not None:
            # Bold Cyan for Prompt Tokens, Bold Green for Response Tokens
            print(f"\033[1;36mPrompt Tokens: {prompt_eval_count}\033[0m")
            print(f"\033[1;32mResponse Tokens: {eval_count}\033[0m")

        if isinstance(msg, AIMessage) and not msg.tool_calls and msg.content:
            extracted = _extract_fallback_tool_calls(
                msg.content if isinstance(msg.content, str) else str(msg.content)
            )
            if extracted:
                msg.tool_calls = extracted
    return result


class RobustChatOllama(ChatOllama):
    """Subclass of ChatOllama that intercepts and converts narrated tool calls

    (e.g. ```json { "name": "...", "arguments": ... } ```) into native ToolCalls.
    This resolves the common reliability gap with local models like Qwen Coder.
    """

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        res = super()._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
        return _patch_chat_result(res)

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: AsyncCallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        res = await super()._agenerate(
            messages, stop=stop, run_manager=run_manager, **kwargs
        )
        return _patch_chat_result(res)


# Model name -> (provider check, builder). Checked in order; first match
# wins. Ollama has no prefix check — it's the catch-all for local dev, since
# local model names (e.g. "qwen2.5-coder:7b") don't follow a shared pattern.
_PROVIDERS: list[tuple[str, list[str], str]] = [
    ("gemini", settings.GEMINI_MODELS, "GEMINI_API_KEY"),
    ("claude", settings.ANTHROPIC_MODELS, "ANTHROPIC_API_KEY"),
    ("gpt", settings.OPENAI_MODELS, "OPENAI_API_KEY"),
]

# The BYOK-able providers (Settings page) — Ollama is deliberately absent,
# it's always local/keyless.
KNOWN_PROVIDERS = tuple(prefix for prefix, _, _ in _PROVIDERS)


@lru_cache(maxsize=64)
def get_chat_model(
    model: str, temperature: float = 0.0, user_id: int | None = None
) -> BaseChatModel:
    """Return a LangChain chat model for `model`, routed by provider.

    This is the adapter: every node in the agent graph talks to
    `BaseChatModel` and never touches a provider SDK directly, so swapping
    Gemini for Claude/GPT/a local Ollama model is a matter of changing the
    `model` string the user picked — no other code changes.

    Key resolution: the user's own BYOK key (Settings page) first, falling
    back to the platform's `.env` key if they haven't set one — nothing
    breaks for anyone who never touches Settings.

    Cached per (model, temperature, user_id) so repeated calls within a run
    reuse the same client instead of reconnecting.
    """
    model_lower = model.lower()

    for prefix, known_models, key_setting in _PROVIDERS:
        if model_lower.startswith(prefix) or model in known_models:
            user_key = get_user_api_key(user_id, prefix) if user_id else None
            api_key: str = user_key or getattr(settings, key_setting)
            if not api_key:
                raise ValueError(
                    f"No {prefix} API key available — add your own on the Settings "
                    f"page, or configure {key_setting} on the server."
                )
            if prefix == "gemini":
                return ChatGoogleGenerativeAI(
                    model=model, api_key=api_key, temperature=temperature
                )
            if prefix == "claude":
                return ChatAnthropic(  # type: ignore[call-arg]
                    model=model,
                    api_key=api_key,  # type: ignore[arg-type]
                    temperature=temperature,
                )
            return ChatOpenAI(
                model=model,
                api_key=api_key,  # type: ignore[arg-type]
                temperature=temperature,
            )

    # Catch-all: local Ollama model wrapped with RobustChatOllama.
    ollama_kwargs: dict[str, Any] = {
        "model": model,
        "base_url": settings.OLLAMA_BASE_URL,
        "temperature": temperature,
        "keep_alive": "30m",
    }
    if user_id:
        try:
            from sqlalchemy.exc import SQLAlchemyError
            from sqlmodel import Session, select

            from app.db import engine
            from app.models.user_resource_limit import UserResourceLimit

            with Session(engine) as session:
                limits = session.exec(
                    select(UserResourceLimit).where(
                        UserResourceLimit.user_id == user_id
                    )
                ).first()
                if limits:
                    ollama_kwargs["num_gpu"] = limits.ollama_num_gpu
                    ollama_kwargs["num_thread"] = limits.ollama_num_thread
                    ollama_kwargs["num_ctx"] = limits.max_context_window
                    ollama_kwargs["keep_alive"] = limits.ollama_keep_alive
        except (SQLAlchemyError, OSError):
            logger.warning("Could not read user resource limits for user %s", user_id)

    return RobustChatOllama(**ollama_kwargs)
