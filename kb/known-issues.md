# Known issues, gotchas and backlog

Verified against the code. Remove an entry in the same change that fixes it.

## Functional gaps

- **Repos are never indexed.** `POST /projects/{id}/index` exists and
  works, but nothing calls it — not the clone task, not the web app. So
  `document_chunks` stays empty and the researcher's `search_codebase`
  always answers "No relevant code found." Fix: index at the end of
  `_clone_and_update_status` (or call the endpoint when a project turns
  `ready`), and re-index after merged changes.
- **The web app doesn't reattach to an in-flight run.** The API supports it
  (`GET /stream` on a `running` / `awaiting_approval` run replays and
  polls Redis), but the project page only streams runs it starts itself.
  After a reload the run shows in history but the live boxes don't resume.
- **Cancel is not immediate.** The worker checks `run:{id}:cancelled`
  between stream events, so the current node (an LLM tool loop can take
  minutes) finishes first. The row is marked `failed` right away, though.
- **`files_changed` comes from the plan**, not from writes that actually
  happened (`coder_node`). The UI and PR body can name files that weren't
  touched.
- **Changing a BYOK key needs an API restart.** `get_chat_model` is
  `lru_cache`d per `(model, temperature, user_id)` and resolves the key
  inside, so the old key stays in the cached client.
- **Shell escapes the sandbox.** File tools refuse paths outside the
  workspace, but `run_command` is `shell=True` with only a tiny blocklist;
  the coder can `cd ..` or run anything the API user can. Fine for local
  single-user use, not for multi-tenant hosting (needs a container per run).
- **Planner can pick a non-terminating `test_command`** (e.g. `npm run
  dev`) for repos without tests → guaranteed timeout. The prompt should
  steer to `build`/`lint` when there's no test script.
- **Local models are unreliable at tool calling** (e.g. `qwen2.5-coder:7b`
  narrating a write instead of calling the tool). Mitigated by
  `RobustChatOllama` and the coder's "must have a real diff" check; cloud
  models are far more reliable.
- **Embeddings use the platform Gemini key only**, never a user's BYOK key.
- **No live coder view yet** — see `live-run-plan.md` item 4.

## Code-level gotchas

- **CORS has exactly one origin** (`FRONTEND_URL`, default
  `http://localhost:5173`). A dev server on another port gets CORS errors on
  every call — the app then behaves as signed out.
- **Alembic autogenerate drops LangGraph's checkpoint tables.** Strip those
  operations from every generated migration.
- **No FK cascades.** Delete dependents in code before parents.
- **`updated_at` never changes** after insert — `TimestampModel` only sets
  it on creation.
- **`echo=True`** on the SQLAlchemy engine logs every query.
- **`OLLAMA_CODE_MODEL` / `OLLAMA_REASONING_MODEL`** in `config.py` are never
  read — one user-picked model drives every node.
- **`refresh_tokens` table and `User.hashed_password` are unused** —
  refresh tokens are stateless JWTs and accounts are GitHub-only. Logout
  can't revoke an issued refresh token.
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

Requested by the owner, not started:

- **Organizations and a Vercel-style dashboard.** Onboarding flow;
  multiple organizations per user and an org switcher; a sidebar dashboard
  (projects overview, activity, usage); profile page; settings — all
  backed by real tables and endpoints. Open questions to settle first:
  real teams with invites and roles, or just grouping; migrate existing
  projects/keys into an auto-created personal org vs. mandatory onboarding;
  which usage numbers to show (runs per day, success rate, tokens if
  recorded). Moves `projects`, `agent_runs` and `user_api_keys` from
  user-owned to org-owned. The ported `ApplicationTable`, `ApplicationTabs`,
  `ApplicationCard`, `ApplicationPopup` and date pickers are meant for this.
- Live coder view (`live-run-plan.md` item 4).
- From `BUILDER.md`'s later phases: evaluation harness, observability,
  production deployment, sandboxed (containerized) execution.
