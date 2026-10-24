# Backend (`apps/api`)

FastAPI app, Python 3.13, run with `uv`. Entry point `app/main.py`. All
routes live under `/api/v1` except `GET /health`.

## Module map

| Path | Responsibility |
|------|----------------|
| `app/main.py` | Builds the app: Redis pool in `lifespan`, global `RateLimiter(60, 60)` dependency, CORS for `settings.FRONTEND_URL` only (credentials on), mounts every v1 router, `GET /health` (DB + Redis). |
| `app/config.py` | `Settings` (pydantic-settings, reads `apps/api/.env`, ignores unknown keys). Production validator rejects localhost URLs, the default `JWT_SECRET`, and a missing `TOKEN_ENCRYPTION_KEY`. |
| `app/db.py` | Module-level `engine` (`echo=True` — every SQL statement is logged) and the `get_session` dependency. |
| `app/redis_client.py` | `get_redis` dependency over `app.state.redis_pool`. Needs a `Request`, so worker threads build their own client (`_sync_redis()` in `agent.py`). |
| `app/rate_limiter.py` | Fixed-window limiter: `INCR rate_limit:<ip>`, expire on first hit, 429 with `retry_after_seconds` past the limit. |
| `app/api/deps.py` | `get_current_user` (decodes the `access_token` cookie, `type == "access"`, looks the user up by email `sub`; 401 otherwise) and `get_github_token` (decrypted token; **400**, not 401, if missing — the user must sign in again to grant `repo`). |
| `app/api/v1/auth.py` | GitHub OAuth, cookies, refresh, logout, `/me`. |
| `app/api/v1/projects.py` | Connect (clone), list, get, delete, index, issues. |
| `app/api/v1/agent.py` | Run lifecycle, SSE, reattach, approve, retry, cancel. The biggest file. |
| `app/api/v1/settings.py` | BYOK keys and the model-availability report. |
| `app/api/v1/github.py` | `GET /github/repos`. |
| `app/api/v1/chat.py` | Plain LLM chat (+ streaming) over the hand-written `services/llm.py`. Not used by the web app; kept as the "manual tool loop" reference. |
| `app/api/v1/system.py` | `GET /db-test`, `GET /redis-test` dev probes. |
| `app/agents/graph.py` | The LangGraph `StateGraph`: nodes, routing, `compile_graph()`. |
| `app/agents/state.py` | `AgentState` TypedDict, `Plan` / `PlanStep` Pydantic models. |
| `app/agents/tools.py` | LangChain `@tool` wrappers bound to one workspace; `search_codebase` (RAG). |
| `app/agents/github_tools.py` | Branch, commit + push (token injected per call, output redacted), create PR. |
| `app/agents/llm.py` | `get_chat_model(model, temperature, user_id)` provider adapter; `RobustChatOllama`. |
| `app/agents/checkpointer.py` | One `PostgresSaver` over a psycopg pool, `setup()` on first use. |
| `app/agents/tech_stack.py` | Deterministic stack detection from the workspace root's `package.json`, `pyproject.toml` / `requirements.txt`, `go.mod`, `composer.json`. |
| `app/rag/chunking.py` · `embeddings.py` · `ingestion.py` · `retrieval.py` | 60-line windows (10 overlap) → 768-d embeddings → `document_chunks` → cosine search top 8. |
| `app/services/workspace.py` | `workspace_path`, `clone_repository`, `reset_workspace`, `delete_workspace`. |
| `app/services/github_api.py` | `parse_github_url`, `list_user_repos` (50, by updated), `list_repo_issues` (50 open, PRs filtered out), headers. |
| `app/services/ollama.py` | Lists locally installed models that report the `tools` capability; recommends a coding model. |
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
| GET | `/me/` | `{id, username, email, is_active}`. |

Cookies: `access_token` (path `/`, `ACCESS_TOKEN_EXPIRE_MINUTES`, default
60) and `refresh_token` (path `/api/v1/accounts/auth`, 30 days). Both
`httponly`, `samesite=lax`, `secure` only when `ENVIRONMENT=production`.

### Projects — `/projects`

| Method | Path | Notes |
|--------|------|-------|
| POST | `/` | `{github_url, branch="main", name?, description?}`. Needs the GitHub token. Upserts on `(user, github_url)`, sets `pending`, clones in the background. Returns the project. |
| GET | `/` | The user's projects. |
| GET | `/{id}` | One project (404 if not the user's). |
| DELETE | `/{id}` | 204. Deletes runs, chunks, the row, then the workspace directory. |
| POST | `/{id}/index` | 409 unless `ready`. Background (re)index; returns `{"status": "indexing_started"}`. |
| GET | `/{id}/issues` | Open issues: `[{number, title, body, url, labels}]`. |

### Agent runs — `/agent`

| Method | Path | Notes |
|--------|------|-------|
| POST | `/runs` | `{project_id, task, model="gemini-3.6-flash", skip_tests=false}` → `AgentRun` (`pending`). 409 if the project isn't `ready`. |
| GET | `/runs` | All the user's runs, newest first. |
| GET | `/runs/{id}` | One run. |
| GET | `/runs/{id}/stream` | SSE. `pending` → reset workspace, start the graph. `running` / `awaiting_approval` → reattach (replay + poll Redis). Terminal → 409. |
| POST | `/runs/{id}/approve` | `{approved, feedback?}`. 409 unless `awaiting_approval`. SSE for the rest of the run. |
| POST | `/runs/{id}/retry` | 409 unless `failed`. Clears `error`, resumes from the checkpoint (input `None`). SSE. |
| POST | `/runs/{id}/cancel` | Sets the Redis cancel flag, pushes an error + end marker, marks the row `failed`. Returns the run. No-op on a terminal run. |

### Settings — `/settings`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api-keys` | One entry per provider `gemini`/`claude`/`gpt`: `{provider, configured, masked_key ("••••••••ab12"), updated_at}`. |
| PUT | `/api-keys/{provider}` | `{api_key}` → encrypt + upsert. 400 for an unknown provider. |
| DELETE | `/api-keys/{provider}` | Removes it. |
| GET | `/available-models` | `{user_providers, platform_providers, local_models: [{id, size_gb, parameter_size, family}], recommended_coding_model}`. Local models are queried live from Ollama (only ones with the `tools` capability); if Ollama is unreachable it falls back to the static `OLLAMA_MODELS` list. The web app builds its model picker from this. |

### Other

`GET /github/repos` → `[{name (owner/repo), url, private, default_branch,
description}]`. `POST /chat/` and `POST /chat/stream` → dev console.
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
| `planner` | One structured-output call → `Plan {summary, steps[{description, files}], test_command}`. Told the detected stack is ground truth. If `plan_feedback` is set it revises the previous plan, then clears the feedback. |
| `human_approval` | `interrupt({plan, task})`. Resumed with `{approved, feedback}`. Re-runs from the top on resume (LangGraph replays the node), so its "running" event can appear twice. |
| `coder` | ReAct loop with read tools + `write_file_tool` + `run_command_tool`. Prompt includes the plan, the last test failure (on repairs) and any approver guidance. After it finishes: `git status --porcelain` must show changes, else `RuntimeError` (catches models that narrate a write without calling the tool). On timeout with changes on disk it proceeds. `files_changed` is taken from the **plan's** file lists, not observed writes. |
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

`get_chat_model(model, temperature=0.0, user_id=None)`, `lru_cache`d:

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
`test_m8_byok`, `test_tech_stack`, `test_agent_error_handling`. Run from
`apps/api`: `uv run pytest`. Several need the compose Postgres and Redis up.
