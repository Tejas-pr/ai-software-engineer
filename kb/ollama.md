# Local models with Ollama

Ollama lets every agent run on your own machine with no API key and no
quota. Any model name the LLM router doesn't recognise as Gemini, Claude or
GPT is sent to Ollama (`app/agents/llm.py` → `RobustChatOllama`).

## Setup

1. Install from <https://ollama.com/download> and start it
   (`ollama --version` to check). It listens on `http://localhost:11434`.
2. Pull a model that supports **tool calling** — the researcher and coder
   are tool loops, so a model without it can't work:

   ```bash
   ollama pull qwen3.5:9b          # current default in config.py
   ollama pull qwen2.5-coder:7b    # lighter; fits 16 GB RAM comfortably
   ollama pull nomic-embed-text    # embeddings, only if you have no GEMINI_API_KEY
   ```

3. `apps/api/.env`: `OLLAMA_BASE_URL=http://localhost:11434`.
   `OLLAMA_MODELS` is only a fallback list for when Ollama can't be reached.

## How the app uses it

- `GET /settings/available-models` asks Ollama for installed models
  (`/api/tags`) and keeps only those whose `/api/show` capabilities include
  `tools`. The project page's model picker shows them, flagging the one
  `recommend_coding_model()` prefers (qwen3.5 → qwen2.5-coder → codestral →
  deepseek-coder → …, largest installed variant first).
- One model drives every node of a run. (`OLLAMA_CODE_MODEL` and
  `OLLAMA_REASONING_MODEL` in `config.py` are not read anywhere.)
- `keep_alive="30m"` keeps the model loaded between calls; token counts are
  printed to the API's stdout.
- Embeddings use Ollama's `nomic-embed-text` (768-d) only when
  `GEMINI_API_KEY` is empty.

## What to expect

Small local models are noticeably less reliable than cloud models at
following the tool-calling protocol: they sometimes describe a file write
instead of calling `write_file_tool`. `RobustChatOllama` converts narrated
calls (`<tool_call>` tags, ```json blocks, bare JSON) into real ones, and
the coder node fails loudly if no file actually changed. If a run keeps
failing that way, switch to a cloud model.

Avoid reasoning models that emit `<think>` blocks (e.g. `deepseek-r1`) for
runs: the thinking text tends to break tool-call parsing.

## Quick check

```bash
curl http://localhost:11434/api/tags                      # installed models
curl http://localhost:11434/api/generate \
  -d '{"model":"qwen2.5-coder:7b","prompt":"say hi","stream":false}'
```
