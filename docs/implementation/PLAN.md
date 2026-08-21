# Implementation Plan — Multi-Agent Build

Tracks progress against `BUILDER.md`'s end goal, skipping the phase-by-phase
scaffolding. Checked off live as we build. Full plan/rationale:
see the conversation — this file is the tracker, not the essay.

## M1 — Foundations
- [x] LangChain LLM adapter (`app/agents/llm.py`) — Gemini / Claude / GPT
      (cloud, needs API key) + Ollama (local, catch-all default). One
      `get_chat_model(name)` factory, every node depends only on
      `BaseChatModel`, so the model picker (M6) just swaps a string.
- [x] Sandboxed `workspace_root` for filesystem/terminal tools (fixes
      `Path.cwd()` hole) + per-project tool wrappers (`app/agents/tools.py`)
- [x] GitHub OAuth: request `repo` scope, encrypt + persist token on `User`
      (`app/utils/crypto.py`, migration `6f838019340d`)
- [x] `GET /github/repos` — list the user's repos from GitHub API
- [x] `Project` API: create (clones repo in the background via
      `app/services/workspace.py`), list, get (migration `c38e3cbf09d2`
      added `user_id`/`status`)
- [x] `GET /projects/{id}/issues` — list open GitHub issues for a project

  **Not yet verified live** — needs a real browser OAuth round-trip
  (log out, log back in to pick up the new `repo` scope, then hit
  `POST /projects`). Do this before M2.

## M2 — Codebase RAG
- [x] Chunker (`app/rag/chunking.py`) — fixed line windows, BUILDER's
      ignore/language lists
- [x] Embeddings (`app/rag/embeddings.py`) — Gemini `gemini-embedding-001`
      (truncated to 768 dims via `output_dimensionality`) or local Ollama
      `nomic-embed-text`, whichever's configured
- [x] Ingestion pipeline + `POST /projects/{id}/index`
- [x] pgvector cosine-distance retrieval + `search_codebase` LangChain tool
      (`app/agents/tools.py`)
- [x] Verified live: real ingest + real semantic search round-trip against
      Postgres/pgvector and Gemini (`tests/test_m2_rag.py`) — query about
      "token refresh" correctly ranks the auth chunk over the unrelated one

## M3 — LangGraph multi-agent graph
- [x] Graph state (`app/agents/state.py`) + structured `Plan` schema
- [x] Nodes: researcher (read-only), planner (structured output), coder
      (added a `write_file` tool — the original tool list had no way to
      actually write a file), tester, reviewer (`app/agents/graph.py`)
- [x] Repair loop (tester → coder, max 3 attempts)
- [x] Checkpointer: `MemorySaver` for now (proves the graph works within one
      run) — `PostgresSaver` deferred to M4, where cross-request durability
      actually starts mattering (the interrupt needs to survive between
      HTTP requests; nothing needs that yet)
- [x] Live per-agent status events (`get_stream_writer`, `stream_mode=
      ["custom","updates"]`)
- [x] `AgentRun` model + `POST /agent/runs`, `GET /agent/runs(/{id})`,
      `GET /agent/runs/{id}/stream` (SSE; runs the graph on a worker thread
      so a multi-minute run doesn't block the event loop)
- [x] **Verified live, real LLM, no mocks**
      (`tests/test_m3_graph.py`, gemini-3.6-flash, ~4.5 min): gave the graph
      a repo with a one-line bug (`add()` returning `a - b`) and a failing
      test. Researcher found it, planner wrote a fix plan + test command,
      coder rewrote the file, tester ran pytest, reviewer summarized —
      ended with the test passing and the bug actually fixed on disk.

## M4 — Human-in-the-loop
- [ ] `interrupt()` after planner
- [ ] Approve/reject API, resume via `Command`

## M5 — GitHub integration
- [x] create_branch / commit_and_push / create_pull_request tools
      (`app/agents/github_tools.py`)
- [x] Wired as graph's final node (`reviewer → github → END`) — skips
      opening a PR if tests didn't pass, so a failed run never gets pushed
- [x] Verified: branch creation against a real local git repo
      (`tests/test_m5_github_tools.py`). Push/PR-creation itself reuses the
      already-verified `github_api.py` request pattern (M1) and needs a real
      token + scratch repo to test live — **not exercised live this
      session**, do that first thing next time before trusting it in a demo.

## M6 — Frontend agent dashboard
- [ ] Repo picker (list of user's GitHub repos)
- [ ] Issue picker for selected repo (or freeform task input)
- [ ] Model picker (Gemini/Claude/GPT/local Ollama — whatever has a key
      configured server-side)
- [ ] Six live agent status boxes (SSE)
- [ ] Approval panel
- [ ] Run history + PR link

## M7 — Detailed explanation
- [x] Full technical explanation of everything built so far, resume/interview
      ready, no need to dig through code — `docs/explain.md`
- [x] Glossary of every AI term actually used in this system, tied back to
      where it shows up in the code — `docs/buzz.md`

## Not done this session (next session, with fresh budget)
- M4 — Human-in-the-loop approval gate
- M5 — GitHub PR tool (branch/commit/create_pull_request)
- M6 — Frontend dashboard (pickers, live agent boxes, approval panel)
