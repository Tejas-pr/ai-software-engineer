# Known issues, gotchas and backlog

Verified against the code. Remove an entry in the same change that fixes it.

## Functional gaps

- **Cancel is not immediate.** The worker checks `run:{id}:cancelled`
  between stream events, so the current node (an LLM tool loop can take
  minutes) finishes first. The row is marked `failed` right away, though.
- **Shell escapes the sandbox.** File tools refuse paths outside the
  workspace, but `run_command` is `shell=True` with only a tiny blocklist;
  the coder can `cd ..` or run anything the API user can. Fine for local
  single-user use, not for multi-tenant hosting (needs a container per run).
- **Local models are unreliable at tool calling** (e.g. `qwen2.5-coder:7b`
  narrating a write instead of calling the tool, or looping on tool calls
  until LangGraph's 25-step recursion limit). Mitigated by
  `RobustChatOllama` and the coder's "must have a real diff" check; cloud
  models are far more reliable. `tests/test_m4_approval.py` runs the
  researcher on whatever model is configured and fails on such a loop.
- **The planner can still pick a non-terminating `test_command`** despite
  being told not to (no dev servers, watchers) — it's a prompt, not a check.
- **Embeddings use the platform Gemini key only**, never a user's BYOK key;
  without one they need Ollama's `nomic-embed-text`. A failed index is
  recorded on the project (`index_status = failed`, `index_error`) and
  shown in the UI; runs still work, search just finds nothing.
- **Members are added by GitHub username, not invited by email.** The
  person must have signed in once (that creates their account).
- **The usage panel counts runs, not tokens or cost** — token usage isn't
  recorded anywhere yet.
- **Org selection is per browser** (localStorage), not in the URL, so a
  shared link opens in whichever organization the viewer last picked.
- **No live coder view yet** — see `live-run-plan.md` item 4.

## Code-level gotchas

- **CORS has exactly one origin** (`FRONTEND_URL`, default
  `http://localhost:5173`). A dev server on another port gets CORS errors on
  every call — the app then behaves as signed out. (In the Docker + Caddy
  setup, web and API share a single origin, avoiding CORS issues entirely).
- **Rate limit: 300 requests / 60 s per client IP**, on every route. A
  dashboard page loads several lists at once; tests that hammer the API
  share the IP. The web app treats a failing `/me` as "signed out" only on
  a 401 — anything else (429, 5xx, network) is retried three times first.
- **Alembic autogenerate drops LangGraph's checkpoint tables.** Strip those
  operations from every generated migration.
- **No FK cascades.** Delete dependents in code before parents.
- **`updated_at` never changes** after insert — `TimestampModel` only sets
  it on creation.
- **`echo=True`** on the SQLAlchemy engine logs every query.
- **`OLLAMA_CODE_MODEL` / `OLLAMA_REASONING_MODEL`** in `config.py` are never
  read — one user-picked model drives every node.
- **`User.hashed_password` is unused** — accounts are GitHub OAuth-only.
  Refresh tokens are tracked in `refresh_tokens`, validated, rotated on refresh,
  and revoked on logout.
- **The pre-commit hook runs `git add .`**, so a hooked commit includes
  every pending change (see `conventions.md` → Commits).
- **`apps/api/.env.example` lists `TOKEN_ENCRYPTION_KEY` twice**, the first
  time with a value that isn't a valid Fernet key. Generate a real one.
- **`app/api/v1/chat.py` + `app/services/llm.py`** are a dev console the web
  app doesn't use; kept deliberately as the hand-written tool-loop
  reference (`explain.md`).
- **GitHub OAuth callback errors are raw JSON** on the API origin (no
  redirect back to the app with an error).

## Backlog

- Live coder view (`live-run-plan.md` item 4).
- Email invitations to organizations; per-organization (shared) API keys.
- Record token usage per run, so the dashboard can show cost.
- Organization slug in URLs (`/:org/...`) instead of per-browser selection.
- From `BUILDER.md`'s later phases: evaluation harness, observability,
  production deployment, sandboxed (containerized) execution.
