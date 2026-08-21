import json
from collections.abc import AsyncGenerator
from typing import Any

import httpx

from app.config import settings
from app.tools.definitions import ALL_TOOLS

# Local CPU inference can legitimately take minutes for a long prompt/response
# (no GPU on this machine). Only bound the connect phase; let reads run long
# rather than timing out mid-generation. Gemini keeps a normal fixed timeout
# since it's a fast cloud call.
OLLAMA_TIMEOUT = httpx.Timeout(connect=10.0, read=None, write=30.0, pool=10.0)

# Keep the model resident in memory between requests so we don't pay the
# multi-second reload cost (observed ~4s just to load a 7B model) on every
# single chat turn.
OLLAMA_KEEP_ALIVE = "30m"


async def generate_chat_response(
    model: str,
    messages: list[dict],
    system_instruction: str | None = None,
    temperature: float = 0.7,
) -> str:
    """
    Unified chat generator that routes requests to either Gemini (cloud) or Ollama (local).

    messages format:
    [
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi"}
    ]
    """

    # Check if the model is a Gemini model (or starts with gemini)
    is_gemini = model.lower().startswith("gemini") or model in settings.GEMINI_MODELS

    if is_gemini:
        return await _generate_gemini(model, messages, system_instruction, temperature)
    else:
        return await _generate_ollama(model, messages, system_instruction, temperature)


async def _generate_gemini(
    model: str,
    messages: list[dict],
    system_instruction: str | None = None,
    temperature: float = 0.7,
) -> str:
    """Call Google's Gemini API directly via HTTP, handling tools."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in settings.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"

    # 1. Map unified history to Gemini's format (including prior tool calls/responses)
    contents: list[dict[str, Any]] = []
    for msg in messages:
        role = msg["role"]
        if role == "assistant":
            role = "model"

        if role == "model" and msg.get("tool_calls"):
            # Format prior model tool calls
            parts: list[dict[str, Any]] = []
            for tc in msg["tool_calls"]:
                parts.append({"functionCall": {"name": tc["name"], "args": tc["args"]}})
            contents.append({"role": "model", "parts": parts})
        elif role == "tool":
            # Format prior tool execution results (must have role="user" in Gemini)
            contents.append(
                {
                    "role": "user",
                    "parts": [
                        {
                            "functionResponse": {
                                "name": msg["name"],
                                "response": {"output": msg["content"]},
                            }
                        }
                    ],
                }
            )
        else:
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    payload: dict[str, Any] = {
        "contents": contents,
        "generationConfig": {"temperature": temperature},
        # Pass the tool schemas so Gemini knows it can call them
        "tools": [{"functionDeclarations": [tool["function"] for tool in ALL_TOOLS]}],
    }

    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)

        if response.status_code != 200:
            raise RuntimeError(
                f"Gemini API request failed with status {response.status_code}: {response.text}"
            )

        data = response.json()
        try:
            candidate = data["candidates"][0]
            content = candidate.get("content", {})
            parts = content.get("parts", [{}])

            # --- TOOL INVOCATION CHECK ---
            function_call = parts[0].get("functionCall")
            if function_call:
                from app.tools.filesystem import read_file

                func_name = function_call["name"]
                arguments = function_call["args"]

                if func_name == "read_file":
                    # A. Execute the Python tool
                    result = read_file(arguments["file_path"])

                    # B. Add the model's call request to history
                    messages.append(
                        {
                            "role": "assistant",
                            "content": "",
                            "tool_calls": [{"name": func_name, "args": arguments}],
                        }
                    )
                    # C. Add the tool response to history
                    messages.append(
                        {"role": "tool", "content": result, "name": func_name}
                    )

                    # D. Call again recursively with updated history to get final text
                    return await generate_chat_response(
                        model=model,
                        messages=messages,
                        system_instruction=system_instruction,
                        temperature=temperature,
                    )

            # If no tool was called, return the text
            return parts[0]["text"]
        except (KeyError, IndexError) as e:
            raise RuntimeError(
                f"Unexpected response structure from Gemini API: {data}"
            ) from e


# apps/api/app/services/llm.py


async def _generate_ollama(
    model: str,
    messages: list[dict],
    system_instruction: str | None = None,
    temperature: float = 0.7,
) -> str:
    """Call the local Ollama API directly via HTTP, handling tools."""
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat"

    # 1. Map unified history to Ollama's format (including prior tool calls/responses)
    ollama_messages: list[dict[str, Any]] = []
    if system_instruction:
        ollama_messages.append({"role": "system", "content": system_instruction})

    for msg in messages:
        role = msg["role"]
        if role == "assistant" and msg.get("tool_calls"):
            ollama_messages.append(
                {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [
                        {"function": {"name": tc["name"], "arguments": tc["args"]}}
                        for tc in msg["tool_calls"]
                    ],
                }
            )
        elif role == "tool":
            ollama_messages.append({"role": "tool", "content": msg["content"]})
        else:
            ollama_messages.append({"role": role, "content": msg["content"]})

    payload: dict[str, Any] = {
        "model": model,
        "messages": ollama_messages,
        "options": {"temperature": temperature},
        "tools": ALL_TOOLS,  # Pass the tool schemas to Ollama
        "stream": False,
        "keep_alive": OLLAMA_KEEP_ALIVE,
    }

    async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
        response = await client.post(url, json=payload)

        if response.status_code != 200:
            raise RuntimeError(
                f"Ollama API request failed with status {response.status_code}: {response.text}"
            )

        data = response.json()
        try:
            message = data.get("message", {})
            tool_calls = message.get("tool_calls")

            # --- TOOL INVOCATION CHECK ---
            if tool_calls:
                from app.tools.filesystem import read_file

                for tool_call in tool_calls:
                    func_name = tool_call["function"]["name"]
                    arguments = tool_call["function"]["arguments"]

                    if func_name == "read_file":
                        # A. Execute the Python tool
                        result = read_file(arguments["file_path"])

                        # B. Add the model's call request to history
                        messages.append(
                            {
                                "role": "assistant",
                                "content": message.get("content", ""),
                                "tool_calls": [{"name": func_name, "args": arguments}],
                            }
                        )
                        # C. Add the tool response to history
                        messages.append(
                            {"role": "tool", "content": result, "name": func_name}
                        )

                        # D. Call again recursively with updated history to get final text
                        return await generate_chat_response(
                            model=model,
                            messages=messages,
                            system_instruction=system_instruction,
                            temperature=temperature,
                        )

            # If no tool was called, return the text content
            return message["content"]
        except KeyError as e:
            raise RuntimeError(
                f"Unexpected response structure from Ollama API: {data}"
            ) from e


async def generate_chat_stream(
    model: str,
    messages: list[dict],
    system_instruction: str | None = None,
    temperature: float = 0.7,
) -> AsyncGenerator[str]:
    """Unified generator that yields chunks from Gemini or Ollama."""
    is_gemini = model.lower().startswith("gemini") or model in settings.GEMINI_MODELS

    if is_gemini:
        async for chunk in _stream_gemini(
            model, messages, system_instruction, temperature
        ):
            yield chunk
    else:
        async for chunk in _stream_ollama(
            model, messages, system_instruction, temperature
        ):
            yield chunk


async def _stream_gemini(
    model: str,
    messages: list[dict],
    system_instruction: str | None = None,
    temperature: float = 0.7,
) -> AsyncGenerator[str]:
    """Stream chunks from Google Gemini API directly."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in settings.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={settings.GEMINI_API_KEY}"

    contents = []
    for msg in messages:
        role = msg["role"]
        if role == "assistant":
            role = "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    payload: dict[str, Any] = {
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }

    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    async with httpx.AsyncClient(timeout=60.0) as client, client.stream(
        "POST", url, json=payload
    ) as response:
        if response.status_code != 200:
            error_body = await response.aread()
            raise RuntimeError(
                f"Gemini API stream failed with status {response.status_code}: {error_body.decode()}"
            )

        async for line in response.aiter_lines():
            if line.startswith("data: "):
                json_str = line[len("data: ") :].strip()
                if not json_str:
                    continue
                try:
                    data = json.loads(json_str)
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    if text:
                        yield text
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue


async def _stream_ollama(
    model: str,
    messages: list[dict],
    system_instruction: str | None = None,
    temperature: float = 0.7,
) -> AsyncGenerator[str]:
    """Stream chunks from local Ollama API directly."""
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat"

    ollama_messages = []
    if system_instruction:
        ollama_messages.append({"role": "system", "content": system_instruction})

    for msg in messages:
        ollama_messages.append({"role": msg["role"], "content": msg["content"]})

    payload: dict[str, Any] = {
        "model": model,
        "messages": ollama_messages,
        "options": {"temperature": temperature},
        "stream": True,
        "keep_alive": OLLAMA_KEEP_ALIVE,
    }

    async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client, client.stream(
        "POST", url, json=payload
    ) as response:
        if response.status_code != 200:
            error_body = await response.aread()
            raise RuntimeError(
                f"Ollama API stream failed with status {response.status_code}: {error_body.decode()}"
            )

        async for line in response.aiter_lines():
            if line:
                try:
                    data = json.loads(line)
                    content = data.get("message", {}).get("content", "")
                    if content:
                        yield content
                except json.JSONDecodeError:
                    continue
