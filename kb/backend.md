# Backend (`apps/api`)

FastAPI app, Python 3.13, run with `uv`. Entry point `app/main.py`. All
routes live under `/api/v1` except `GET /health`.

## Module map

| Path | Responsibility |
|------|----------------|
| `app/main.py` | Builds the app: Redis pool in `lifespan`, global `RateLimiter(300, 60)` dependency, CORS for `settings.FRONTEND_URL` only (credentials on), an `X-Built-By` header on every response, mounts every v1 router, `GET /health` (DB + Redis). |
| `app/attribution.py` | Author, author URL and repository URL — used by the API docs and the `X-Built-By` header (mirrored by the web app's `lib/common/attribution.ts`). |
| `app/config.py` | `Settings` (pydantic-settings, reads `apps/api/.env`, ignores unknown keys). Supports `RESTRICT_CLONE_RUN_PROJECT: bool` (guards repo clones and agent runs on low-resource demo instances) and comma-separated `FRONTEND_URL` origins. Production validator rejects localhost URLs, the default `JWT_SECRET`, and a missing `TOKEN_ENCRYPTION_KEY`. |
| `app/db.py` | Module-level `engine` (`echo=True` — every SQL statement is logged) and the `get_session` dependency. |
| `app/redis_client.py` | `get_redis` dependency over `app.state.redis_pool`. Needs a `Request`, so worker threads build their own client (`_sync_redis()` in `agent.py`). |
| `app/rate_limiter.py` | Fixed-window limiter: `INCR rate_limit:<ip>`, expire on first hit, 429 with `retry_after_seconds` past the limit. |
| `app/api/deps.py` | `get_current_user` (decodes the `access_token` cookie, `type == "access"`, looks the user up by email `sub`; 401 otherwise) and `get_github_token` (decrypted token; **400**, not 401, if missing — the user must sign in again to grant `repo`). |
| `app/api/v1/auth.py` | GitHub OAuth (stores avatar, seeds display name), cookies, refresh, logout, `/me`. |
| `app/api/v1/account.py` | Profile update and the onboarding steps. |
| `app/api/v1/organizations.py` | Organizations: list, create, rename, delete, members, overview stats. |
| `app/api/v1/projects.py` | Connect (clone, then index), list per organization, get, delete, re-index, issues. |
| `app/api/v1/agent.py` | Run lifecycle, SSE, reattach, approve, retry, cancel; the public agent catalog. The biggest file. |
| `app/api/v1/settings.py` | BYOK keys and the model-availability report. |
| `app/api/v1/github.py` | `GET /github/repos`. |
| `app/api/v1/chat.py` | Plain LLM chat (+ streaming) over the hand-written `services/llm.py`. Not used by the web app; kept as the "manual tool loop" reference. |
| `app/api/v1/system.py` | `GET /db-test`, `GET /redis-test` dev probes. |
| `app/agents/graph.py` | The LangGraph `StateGraph`: nodes, routing, `compile_graph()`. |
| `app/agents/catalog.py` | What each agent is, for the `/agents` page — tool names and limits read from the tool factories and graph constants. |
| `app/agents/state.py` | `AgentState` TypedDict, `Plan` / `PlanStep` Pydantic models. |
| `app/agents/tools.py` | LangChain `@tool` wrappers bound to one workspace; `search_codebase` (RAG). |
| `app/agents/github_tools.py` | Branch, commit + push (token injected per call, output redacted), create PR. |
| `app/agents/llm.py` | `get_chat_model(model, temperature, user_id)` provider adapter; `RobustChatOllama`. |
| `app/agents/checkpointer.py` | One `PostgresSaver` over a psycopg pool, `setup()` on first use. |
| `app/agents/tech_stack.py` | Deterministic stack detection from the workspace root's `package.json`, `pyproject.toml` / `requirements.txt`, `go.mod`, `composer.json`. |
| `app/rag/chunking.py` · `embeddings.py` · `ingestion.py` · `retrieval.py` | 60-line windows (10 overlap) → 768-d embeddings → `document_chunks` → cosine search top 8. |
| `app/services/workspace.py` | `workspace_path`, `clone_repository`, `reset_workspace`, `delete_workspace`. |
| `app/services/organizations.py` | `unique_slug`, `create_organization` (creator becomes owner), `require_membership`, `get_accessible_project` — the access checks. |
| `app/services/projects.py` | `delete_project`: runs, chunks, row, workspace (used by project and organization deletes). |
| `app/services/provider_keys.py` | `verify_provider_key`: one read-only "list models" call per provider before a BYOK key is stored. |
| `app/services/github_api.py` | `parse_github_url`, `list_user_repos` (50, by updated), `list_repo_issues` (50 open, PRs filtered out), headers. |
| `app/services/ollama.py` | `list_installed_tool_models()` (None when Ollama is unreachable), `settings_ollama_fallback()`, `recommend_coding_model()`. |
| `app/services/user_api_keys.py` | The one place a BYOK key is decrypted (just before the provider SDK gets it). |
| `app/services/llm.py` | Raw httpx Gemini/Ollama calls with hand-parsed tool calls — chat console only. |
| `app/tools/filesystem.py` · `terminal.py` | Primitive read/write/list/search and shell, each taking `workspace_root`. |
| `app/utils/crypto.py` | Fernet `encrypt_token` / `decrypt_token` (key from `TOKEN_ENCRYPTION_KEY`). |
| `app/utils/security.py` | JWT create/decode with a `type` claim (`access` / `refresh`). |

## Endpoints

All require the `access_token` cookie unless marked public. Errors are
FastAPI's `{"detail": ...}`.

### Auth — `/accounts/auth`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/github/login` | Public. 307 to GitHub authorize, scopes `user:email repo`. |
| GET | `/github/callback?code=` | Public. Code → token → profile + primary email → upsert user → store encrypted token → set cookies → 307 to `FRONTEND_URL/login/callback`. 400 JSON if GitHub returns no token or no primary email. |
| POST | `/refresh/` | Public (uses `refresh_token` cookie). Issues a fresh cookie pair. 401 if missing/invalid. |
| POST | `/logout/` | Public. Deletes both cookies. |
| GET | `/me/` | `{id, username, email, is_active, display_name, avatar_url, onboarded_at}`. |

Cookies: `access_token` (path `/`, `ACCESS_TOKEN_EXPIRE_MINUTES`, default
60) and `refresh_token` (path `/api/v1/accounts/auth`, 30 days). Both
`httponly`, `samesite=lax`, `secure` only when `ENVIRONMENT=production`.

### Account — `/account`

| Method | Path | Notes |
|--------|------|-------|
| PATCH | `/` | `{display_name}` → the user. |
| POST | `/onboarding/organization` | `{name}` → creates the user's personal organization (owner), or renames it if it exists. |
| POST | `/onboarding/complete` | `{use_local_models=false}` → sets `onboarded_at` and returns the user. 400 unless they have an organization **and** a stored API key — or `use_local_models` with Ollama reachable and tool-capable models installed. Idempotent once onboarded. |

### Organizations — `/orgs`

Every route requires membership (404 otherwise); "owner" routes 403 for members.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | The user's organizations, personal first: `{id, name, slug, is_personal, created_by, created_at, role, member_count, project_count}`. |
| POST | `/` | `{name}` → new organization, the user as owner. |
| GET | `/{id}` | One, with the user's role. |
| PATCH | `/{id}` | Owner. `{name}`. |
| DELETE | `/{id}` | Owner, not personal. Deletes every project (runs, chunks, workspaces), memberships, the org. 204. |
| GET | `/{id}/members` | `[{user_id, username, display_name, avatar_url, email, role, joined_at}]`. |
| POST | `/{id}/members` | Owner, not personal. `{username, role="member"}` — an existing user by GitHub login (case-insensitive); 404 if they've never signed in, 409 if already a member. |
| PATCH | `/{id}/members/{user_id}` | Owner. `{role}`; can't demote the last owner. |
| DELETE | `/{id}/members/{user_id}` | Owner removes anyone; anyone can remove themselves (leave); never the last owner. 204. |
| GET | `/{id}/overview` | Dashboard numbers: `projects {total, ready, pending, failed, indexed}`, `runs {total, by_status, active, success_rate (completed ÷ finished, or null), prs_opened}`, `daily` (30 days of `{date, runs, completed, failed}`), `recent_runs` (8, with `project_name`). |

### Projects — `/projects`

Access is through the project's organization (`get_accessible_project`).

| Method | Path | Notes |
|--------|------|-------|
| POST | `/` | `{organization_id, github_url, branch="main", name?, description?}`. Needs the GitHub token and membership. Upserts on `(organization_id, github_url)`, sets `pending`, clones then indexes in the background. Returns the project. |
| GET | `/?organization_id=` | The organization's projects, newest first. |
| GET | `/{id}` | One project. |
| DELETE | `/{id}` | 204. Owners, or the member who connected it. Deletes runs, chunks, the row, then the workspace directory. |
| POST | `/{id}/index` | 409 unless `ready`. Sets `index_status=indexing`, rebuilds in the background; returns `{"status": "indexing_started"}`. |
| GET | `/{id}/issues` | Open issues: `[{number, title, body, url, labels}]`. |

### Agent runs — `/agent`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/catalog` | **Public.** `{agents: [{id, name, role, description, kind, tools, limits, outputs}], approval_step, order}` — six agents plus the approval step, tools and limits read from the running code. |
| POST | `/runs` | `{project_id, task, model="gemini-3.6-flash", skip_tests=false}` → `AgentRun` (`pending`). 409 if the project isn't `ready`. |
| GET | `/runs?organization_id=&project_id?=&limit=200` | The organization's runs (optionally one project's), newest first, each with `project_name`. |
| GET | `/runs/{id}` | One run. |
| GET | `/runs/{id}/stream` | SSE. `pending` → reset workspace, start the graph. `running` / `awaiting_approval` → reattach (replay + poll Redis). Terminal → 409. |
| POST | `/runs/{id}/approve` | `{approved, feedback?}`. 409 unless `awaiting_approval`. SSE for the rest of the run. |
| POST | `/runs/{id}/retry` | 409 unless `failed`. Clears `error`, resumes from the checkpoint (input `None`). SSE. |
| POST | `/runs/{id}/cancel` | Sets the Redis cancel flag, pushes an error + end marker, marks the row `failed`. Returns the run. No-op on a terminal run. |

### Settings — `/settings`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api-keys` | One entry per provider `gemini`/`claude`/`gpt`: `{provider, configured, masked_key ("••••••••ab12"), updated_at}`. |
| PUT | `/api-keys/{provider}` | `{api_key}` → verified with the provider (`verify_provider_key`; 400 if rejected, 502 if the provider can't be reached), then encrypt + upsert, and the cached model clients are cleared. 400 for an unknown provider. |
| DELETE | `/api-keys/{provider}` | Removes it (and clears cached clients). |
| GET | `/available-models` | `{user_providers, platform_providers, local_models: [{id, size_gb, parameter_size, family}], recommended_coding_model}`. Local models are queried live from Ollama (only ones with the `tools` capability); if Ollama is unreachable it falls back to the static `OLLAMA_MODELS` list, and `ollama_available` (true only when Ollama answered with tool-capable models) tells the two apart. The web app builds its model picker and the onboarding "use local models" option from this. |
| GET | `/resources` | Returns host telemetry (CPU count, architecture, accelerator Metal/CUDA, memory RAM, disk free/used, workspace folder bytes), Ollama daemon info (availability, version, warm loaded models with VRAM sizes), and persistent user limits (`UserResourceLimit`). |
| PUT | `/resources` | Updates user hardware limits: GPU layers `ollama_num_gpu`, threads `ollama_num_thread`, VRAM budget `ollama_vram_budget_gb`, keep-alive `ollama_keep_alive`, context window `max_context_window`, token budget `max_tokens_per_run`, timeout `max_run_timeout_seconds`, concurrent runs `max_concurrent_runs`, storage limit `workspace_storage_limit_gb`, auto-prune flag `auto_prune_workspaces`. Invalidates cached chat models. |
| POST | `/resources/prune-cache` | Reclaims host disk space by cleaning up orphan and stale workspace directories in `apps/api/workspaces/`. Returns `{pruned_runs_count, reclaimed_bytes, reclaimed_mb, workspaces_remaining_mb}`. |

### Other

`GET /github/repos` → `[{name (owner/repo), url, private, default_branch,
description}]`. `GET /config` (public) → `{restrict_clone_run_project: bool,
environment: str}`. `POST /chat/` and `POST /chat/stream` → dev console.
`GET /db-test`, `GET /redis-test`, `GET /health`.

## The agent graph (`app/agents/graph.py`)

```
researcher → planner → human_approval ─approved────────▶ coder → tester ─pass/give up─▶ reviewer → github → END
                ▲            │                              ▲        │
                └─feedback───┤                              └─fail───┘  (max 3 repairs)
                             └─rejected, no feedback──▶ END
```

Shared state is `AgentState` (`state.py`): input fields `task, project_id,
user_id, workspace_path, model, skip_tests, repair_attempts`; filled in
`research_notes, detected_stack, plan (Plan.model_dump()), plan_feedback,
approved, files_changed, test_output, test_passed, review_notes, pr_url`.
Each node returns a partial dict; there is no shared chat history between
agents — each runs its own short tool loop and hands back text.

| Node | What it does |
|------|--------------|
| `researcher` | `detect_tech_stack(workspace)` first (ground truth, not LLM). Then a `create_agent` ReAct loop with **read-only** tools (`read_file_tool`, `list_files_tool`, `search_code_tool`, `search_codebase`). Recursion limit 25, wall clock `AGENT_STEP_TIMEOUT_SECONDS` (600). On timeout it continues with a note instead of failing. |
| `planner` | One structured-output call → `Plan {summary, steps[{description, files}], test_command}`. Told the detected stack is ground truth, and that `test_command` must terminate (no dev servers or watchers; build/lint when there are no tests). If `plan_feedback` is set it revises the previous plan, then clears the feedback. |
| `human_approval` | `interrupt({plan, task})`. Resumed with `{approved, feedback}`. Re-runs from the top on resume (LangGraph replays the node), so its "running" event can appear twice. |
| `coder` | ReAct loop with read tools + `write_file_tool` + `run_command_tool`. Prompt includes the plan, the last test failure (on repairs) and any approver guidance. After it finishes: `git status --porcelain` must show changes, else `RuntimeError` (catches models that narrate a write without calling the tool). On timeout with changes on disk it proceeds. `files_changed` is the set of paths in that `git status --porcelain` output — what actually changed. |
| `tester` | `skip_tests` → pass without running. Else runs `plan.test_command` (300 s). Passed = output starts `Exit Code: 0` or the no-output success string. Failure increments `repair_attempts`. |
| `reviewer` | Deterministic summary string — no LLM call. |
| `github` | Skipped unless `test_passed`. Branch `ai-agent/<slug>-<hex6>`, `commit_and_push`, `create_pull_request` (via `asyncio.run` inside the worker thread). |

Routing: `_route_after_approval` (coder / planner / end) and
`_route_after_tester` (reviewer when passed or attempts ≥ 3, else coder).

`compile_graph()` compiles with the Postgres checkpointer; each run uses
`thread_id = str(run.id)`, `recursion_limit = 50`.

## Tools and the sandbox

`make_read_only_tools(ws)` / `make_workspace_tools(ws)` close over the
project's workspace path. Underneath (`app/tools/`):

- `read_file` / `write_file` / `list_files`: resolve the path and refuse
  anything outside `workspace_root`; refuse names containing `.env`;
  `list_files` skips dot-dirs, `node_modules`, `venv`, `dist`, `build`.
- `search_code`: plain substring search, max 50 hits, skips binaries.
- `run_command`: `subprocess.run(shell=True, cwd=workspace_root)`; blocks a
  few obviously destructive strings (`rm -rf /`, `mkfs`, …). Output format
  is one string: `Exit Code: N\nSTDOUT:\n…\nSTDERR:\n…`, or
  `Command executed successfully (Exit Code: N). No output.` Callers parse
  this string (`github_tools._stdout_of`). It never raises on non-zero exit.
  The shell can `cd` out of the workspace — the path checks only bind the
  file tools.

## LLM routing (`app/agents/llm.py`)

`get_chat_model(model, temperature=0.0, user_id=None)`, `lru_cache`d (the
cache is cleared whenever a user saves or removes a key):

| Model name | Provider | Key |
|------------|----------|-----|
| starts with `gemini` or in `GEMINI_MODELS` | `ChatGoogleGenerativeAI` | user's `gemini` key, else `GEMINI_API_KEY` |
| starts with `claude` or in `ANTHROPIC_MODELS` | `ChatAnthropic` | user's `claude` key, else `ANTHROPIC_API_KEY` |
| starts with `gpt` or in `OPENAI_MODELS` | `ChatOpenAI` | user's `gpt` key, else `OPENAI_API_KEY` |
| anything else | `RobustChatOllama` at `OLLAMA_BASE_URL`, `keep_alive=30m` | none |

No key available → `ValueError` telling the user to add one in Settings.
`RobustChatOllama` turns tool calls a local model *narrates* (in
`<tool_call>` tags, ```json blocks or bare JSON) into real `tool_calls`, and
prints Ollama token counts to stdout.

## RAG

- Chunking: walk the workspace, skip `node_modules`, `.git`, `dist`,
  `build`, `coverage`, venvs, `__pycache__`, dot-dirs and `.env*`; keep
  `.ts .tsx .js .jsx .py .json .md .yaml .yml .sql`; 60-line windows,
  10-line overlap.
- Embeddings: Gemini `gemini-embedding-001` truncated to 768 dims if
  `GEMINI_API_KEY` is set (platform key, not BYOK), else Ollama
  `nomic-embed-text` (768).
- Ingestion replaces a project's chunks wholesale, embedding in batches of
  100.
- Retrieval: `ORDER BY embedding <=> query LIMIT 8` in Postgres.

## Security notes

- GitHub tokens and BYOK keys: Fernet-encrypted at rest, decrypted only at
  the point of use, never returned to the client (masked preview only).
- Tokens in git URLs: injected per command, never written to git config;
  all git output that could contain `x-access-token:…@` is redacted before
  it can reach `AgentRun.error`.
- Commit messages come from user/issue text → always `shlex.quote`d.
- JWT `type` claim stops a refresh token being replayed as an access token.
- Workspace directories are UUID-named, not sequential ids.

## Tests (`apps/api/tests`)

`test_m1_foundations` (sandbox, crypto, GitHub URL parsing),
`test_m2_rag`, `test_m3_graph` (real LLM fixes a real bug end to end —
skipped without a model key), `test_m4_approval` (interrupt/resume across
two compiled graphs via the Postgres checkpoint), `test_m5_github_tools`,
`test_m8_byok`, `test_tech_stack`, `test_agent_error_handling`,
`test_organizations` (membership-scoped access, owner rules, onboarding
gates, rejected keys never stored — via `TestClient` with
`get_current_user` overridden). Run from
`apps/api`: `uv run pytest`. Several need the compose Postgres and Redis up.
