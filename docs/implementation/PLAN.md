# Implementation Plan — Multi-Agent Build

Tracks progress against `BUILDER.md`'s end goal, skipping the phase-by-phase
scaffolding. Checked off live as we build. Full plan/rationale:
see the conversation — this file is the tracker, not the essay.

**M1–M9: all done.** End-to-end path works: connect GitHub → pick a repo/
issue → agents research/plan (grounded in a deterministically-detected tech
stack) → you approve, reject-with-revision, or skip tests → they
code/test/self-correct → PR opens — watchable live in the browser, using
either the platform's models or your own API key. Everything below is
verified against real infra (Postgres/pgvector, a real LLM, a real
browser), not mocked. Not yet done: a live GitHub PR round-trip with a real
token/repo (the tools are verified, just not exercised end-to-end with
real GitHub write access), and BUILDER.md's later phases (evaluation,
observability, production deployment) — out of scope for this build.

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
- [x] `PostgresSaver` checkpointer (`app/agents/checkpointer.py`) — one
      `ConnectionPool` + `PostgresSaver`, its own tables
      (checkpoints/checkpoint_blobs/checkpoint_writes), independent of
      SQLModel's migrations (autogenerate wants to drop them since they're
      not in `SQLModel.metadata` — stripped that out of the migration, see
      its comment)
- [x] `human_approval` node: `interrupt({"plan": ..., "task": ...})` between
      planner and coder; conditional edge on resume — approved → coder,
      rejected *with feedback text* → back to `planner` to revise (not a
      dead end), rejected with no feedback → END (`app/agents/graph.py`).
      Feedback given alongside an *approval* flows into the coder's prompt
      as extra guidance instead. Frontend gained a feedback textarea in the
      approval panel for this — added after live testing showed a 7B local
      model's plan ignored the actual tech stack (proposed raw HTML/CSS/JS
      for a Vite+React repo) with no way to correct it short of restarting.
      Also tightened the researcher's prompt to require identifying the
      real stack (package.json/etc.) as the first line of its notes, and
      the planner's prompt to never contradict it.
- [x] `POST /agent/runs/{id}/approve` — resumes via `Command(resume=...)`,
      itself another SSE stream (same shape as `/stream`); `AgentRun` gains
      `status="awaiting_approval"` and a `pending_plan` JSON column so a
      page reload doesn't lose the pending plan
- [x] **Verified live, no mocks, genuinely cross-process**: two completely
      separate `compile_graph()` calls per test — the only thing linking
      them is the Postgres checkpoint, exactly the real pause-then-later-
      HTTP-request scenario (`tests/test_m4_approval.py`). Confirmed: reject
      leaves the repo untouched and ends the graph at `human_approval`;
      approve resumes correctly into `coder` and the rest of the pipeline.
      (Used local Ollama for this one — Gemini's free-tier daily quota ran
      out mid-session from earlier test runs.)

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
- [x] Two-page flow (restructured after live user testing — see below),
      replacing the old chat-console `Dashboard.tsx` entirely (deleted,
      along with the now-orphaned `chat.api.ts`):
      - `RepoList.tsx` (`/`, the post-login landing page) — every connected
        repo with its status; `ready` gets an "Open" button straight to its
        detail page, `failed` gets a "Retry" button right there; a
        "+ Connect a GitHub repo" section lists not-yet-connected repos
        from `GET /github/repos`
      - `ProjectDetail.tsx` (`/projects/{id}`) — everything scoped to one
        repo: issue/task picker (with a manual "Refresh issues" link — no
        full-page reload needed to see a just-pushed issue), model picker,
        the live status boxes, approval panel, and that project's own run
        history (not everyone's)
      No new UI library — reused the existing card/select styling verbatim.
- [x] Model picker — Gemini/Claude/GPT/local Ollama
- [x] Live status boxes, one per actual graph node (7: researcher, planner,
      human_approval, coder, tester, reviewer, github — not the 6 guessed
      before M4 added the approval node), driven by a small SSE frame
      parser (`readAgentStream` in `agent.api.ts`) reused for both the
      initial stream and the resumed-after-approval stream
- [x] Approval panel: renders the interrupted plan (summary/steps/test
      command), Approve/Reject call `POST /agent/runs/{id}/approve`, whose
      response is itself another SSE stream consumed the same way
- [x] Run history + PR link (now filtered to the current project)
- [x] **Verified live in a real browser** (Playwright, headless Chromium —
      `chromium-cli` wasn't available in this environment): real backend +
      real frontend dev servers, a seeded session (no signup endpoint
      exists — GitHub-OAuth-only — so a JWT was minted directly against a
      throwaway DB user for this check, then deleted). Confirmed: page
      renders with zero console errors; a real API failure (missing GitHub
      token) surfaces as a visible error banner, not a silent no-op; a
      mocked SSE stream (no LLM calls) confirmed status dots react
      correctly (green=done, pulsing=running) and the approval panel
      renders the plan with working Approve/Reject buttons.

**Bugs found from the user's own live testing session (not from
automated checks) and fixed on the spot:**
1. Connecting a repo failed silently on error (e.g. no GitHub token) — no
   feedback at all. Now surfaces the backend's actual error message.
2. `git clone` on a genuinely empty repo (zero commits) failed with a raw,
   confusing git error. `app/services/workspace.py` now detects that
   specific case and says so plainly: "this repo may be empty — push at
   least one commit first."
3. The frontend was double-prefixing that same error ("Clone failed: Clone
   failed: ...") — it re-added a prefix the backend's message already had.
4. **The real structural one**: `POST /projects` created a brand-new row
   every time the same repo was connected again (e.g. retrying after
   fixing an empty repo), so the picker filled up with duplicates of the
   same failed repo with no way to retry any of them. Fixed at the root:
   the endpoint now looks up an existing `(user, github_url)` row first and
   reuses it — connecting an already-connected repo re-clones onto the same
   row instead of duplicating it, which is also what makes the "Retry"
   button possible in the first place.
5. A failed run (e.g. a Gemini 429 rate-limit) dumped the entire raw
   provider exception — a multi-hundred-character dict literal — straight
   into the UI, twice (once live, once in the final result). Added
   `_friendly_error()` in `app/api/v1/agent.py`: detects rate-limit errors
   specifically (free-tier quota is what you'll hit most) and gives a
   short, actionable message pointing at the model picker's local Ollama
   option instead; caps any other error's length. Deduped the double
   display on the frontend too.

## M7 — Detailed explanation
- [x] Full technical explanation of everything built so far, resume/interview
      ready, no need to dig through code — `docs/explain.md`
- [x] Glossary of every AI term actually used in this system, tied back to
      where it shows up in the code — `docs/buzz.md`

## M8 — User-supplied API keys (BYOK)
- [x] `UserApiKey(user_id, provider, encrypted_key)` — one row per provider
      per user, encrypted with the same `Fernet` setup already used for the
      GitHub token (`app/utils/crypto.py`), not a new mechanism
- [x] `get_chat_model()` resolves: the user's own key first, falls back to
      the platform's `.env` key if unset — nothing breaks for anyone who
      never touches Settings; local Ollama stays keyless regardless.
      Every graph node now passes `user_id=state.get("user_id")`.
- [x] `GET/PUT/DELETE /api/v1/settings/api-keys/{provider}` — `GET` returns
      a masked value only (`••••••••ab12`), never plaintext, after saving
- [x] `/settings` page — one row per provider, add/update/remove, linked
      from the repo list header
- [x] Verified live, real Postgres, no mocks (`tests/test_m8_byok.py`):
      with no user key stored, `get_chat_model()` resolves the platform's
      `.env` key; after storing an encrypted user key, the *same call*
      resolves that instead — confirmed by inspecting the actual
      `ChatGoogleGenerativeAI` client's key, not just that no exception was
      thrown. Second test: full encrypt → store → decrypt round-trip
      against real Postgres. Also verified in a real browser: saved a key,
      got the masked `••••••••EFGH` preview back, Remove button appeared.

## M9 — Fixes and refinements from live testing (post-M6)
Found by actually using the app, not by automated checks — logged here
since they didn't fit cleanly under an earlier milestone.
- [x] **Real hallucination, not a repo mismatch**: the researcher agent
      (local 7B model) reported "Nuxt.js + Vue 3" for a repo whose
      `package.json` is plainly React + Vite — confirmed by pulling the
      actual file. Root-caused to: small models unreliably call/read tools
      when summarizing. Fixed properly: `app/agents/tech_stack.py`
      deterministically parses package.json/pyproject.toml/etc. in plain
      Python (can't hallucinate) and hands the fact to researcher *and*
      planner as ground truth they're told to trust over their own
      impression — works regardless of model size. Verified against the
      real repo's actual `package.json` and with unit tests
      (`tests/test_tech_stack.py`).
- [x] **Reject now takes feedback and revises, instead of dead-ending**:
      `human_approval` routes a rejection *with* feedback text back to
      `planner` (not `coder`) to produce a revised plan and re-pause for
      approval; feedback left alongside an *approval* flows to `coder` as
      extra guidance instead. Frontend gained a feedback textarea in the
      approval panel. Verified live with a real revise-then-approve loop
      (`tests/test_m4_approval.py::test_reject_with_feedback_loops_back_to_planner`).
- [x] **Skip tests**: a run can opt out of the `tester` step entirely (a
      checkbox on the run form) — added after a planner picked a
      long-running dev-server command as its "test", hanging for the full
      120s timeout on 3 repair attempts (~6 minutes wasted). Skipping
      treats the step as trivially passed and proceeds straight to review.
- [x] **Info tooltips**: an "i" next to each of the 7 agent boxes explains
      what it actually does (native `title` attribute, no new dependency).
- [x] Friendlier provider errors (see M6's bug list above) also apply here
      — `_friendly_error()` in `app/api/v1/agent.py`.
