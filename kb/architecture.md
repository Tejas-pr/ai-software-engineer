# Architecture

## System

```
Browser (React, :5173)
   │  cookies: access_token (path /), refresh_token (path /api/v1/accounts/auth)
   │  JSON over axios  ·  SSE via fetch() streaming
   ▼
FastAPI (:8000)  ── global Redis rate limit: 300 req / 60 s per client IP
   │               ── every response carries X-Built-By: Tejas-pr (…)
   ├── auth        GitHub OAuth, JWT cookies
   ├── account     profile, onboarding (organization → model → done)
   ├── orgs        organizations, members, dashboard overview
   ├── projects    clone + index repos (background task), issues, delete
   ├── agent       runs: create, stream (SSE), approve, retry, cancel; public catalog
   ├── settings    BYOK keys (verified with the provider), available models
   ├── github      list the user's repos
   └── chat/system dev-only console + health probes
        │
        │ worker thread per streamed run
        ▼
LangGraph StateGraph ── PostgresSaver checkpoints (thread_id = run id)
   researcher → planner → human_approval → coder ⇄ tester → reviewer → github
        │                                     │
        │ tools sandboxed to the project's    │ git + GitHub REST
        ▼ workspace dir                       ▼
apps/api/workspaces/<workspace_id>/      github.com (branch, push, PR)

Postgres + pgvector: users, organizations, organization_members, projects,
                     agent_runs, document_chunks, user_api_keys,
                     refresh_tokens, LangGraph checkpoint tables
Redis: rate limit counters, run event history, cancel flags
LLM providers: Gemini / Anthropic / OpenAI (cloud) · Ollama (local)
```

## Organizations and access

Everything a user works on belongs to an **organization**: projects (and
through them runs, chunks and workspaces). Access is by membership
(`organization_members`, role `owner` or `member`), checked on every
request by `app/services/organizations.py`:

- `require_membership(session, org_id, user, owner=False)` — 404 if the
  user isn't a member (the org "doesn't exist" for them), 403 if `owner=True`
  and they're only a member.
- `get_accessible_project(session, project_id, user)` — the project, if the
  user is a member of its organization; else 404. Runs are reached through
  their project the same way.

Members connect repos and run agents; owners also rename, add/remove
members, change roles and delete. Every user has one **personal**
organization (`is_personal`): it can't be deleted, left, or given members.
An organization always keeps at least one owner. **API keys belong to the
user**, not the organization — a run uses the key of whoever started it.

The web app keeps the selected organization in localStorage
(`ase:organization`) and scopes every list to it.

## Onboarding

New users can't reach the app until it's usable for them. `onboarded_at`
on `users` is null until then; `AppLayout` sends them to `/onboarding`:

1. **Organization** — `POST /account/onboarding/organization` creates their
   personal organization (renames it if they come back).
2. **Model access** — `PUT /settings/api-keys/{provider}` (the API checks
   the key with the provider before storing it), or choose local Ollama
   models, offered only when the API can reach Ollama and it has
   tool-capable models installed.
3. **First repository** — optional `POST /projects/`.

Then `POST /account/onboarding/complete` checks there's an organization and
a key (or `use_local_models` with Ollama really available), sets
`onboarded_at`, and the app opens on `/dashboard`. Users who existed before
organizations were added were backfilled as onboarded, each with a personal
organization holding their projects (migration `9a7c2e41d5b3`).

## The life of a run

1. **Sign in.** `GET /accounts/auth/github/login` redirects to GitHub with
   scopes `user:email repo`. GitHub calls back to
   `/accounts/auth/github/callback`; the API exchanges the code, fetches the
   profile and primary email, finds or creates the `User` (matched by
   `github_id`, else by email), **stores the GitHub token Fernet-encrypted**
   (refreshed on every login), sets the two JWT cookies and redirects to
   `FRONTEND_URL/login/callback`. The web app's callback page waits for
   `GET /me`, then navigates to the page the user originally wanted
   (sessionStorage) or `/dashboard` — which redirects to `/onboarding` if
   onboarding isn't finished. GitHub sign-in also stores the avatar and
   seeds the display name.
2. **Connect a repo.** The connect dialog lists `GET /github/repos` minus
   already-connected ones. `POST /projects {organization_id, …}` upserts a
   `Project` row keyed by `(organization_id, github_url)`, status `pending`,
   and in a FastAPI `BackgroundTask` clones it (`git clone --depth 1
   --branch <branch>` with the token in the URL, into
   `workspaces/<workspace_id>/`). Status becomes `ready` or `failed` (error
   text goes in `description`). Reconnecting the same URL reuses the row —
   that is the Retry path. The pages poll while a clone or index is running.
3. **Index.** Right after a successful clone the same task chunks and
   embeds the workspace into `document_chunks` (`index_status`: `indexing` →
   `ready` | `failed`, with `indexed_at` / `index_error`). A failed index
   doesn't fail the project. `POST /projects/{id}/index` rebuilds it
   (Re-index in the repository menu).
4. **Create the run.** `POST /agent/runs {project_id, task, model,
   skip_tests}` inserts an `AgentRun` with status `pending`. Nothing executes
   yet. The project must be `ready` (else 409).
5. **Stream.** The client immediately opens `GET /agent/runs/{id}/stream`.
   For a `pending` run the API resets the workspace to a clean checkout of
   the branch (`git clean -fd`, fetch, `reset --hard origin/<branch>`;
   re-clones if the directory vanished), then starts the graph on a
   **daemon thread** and returns a `StreamingResponse` fed by an
   `asyncio.Queue` (the thread pushes with `run_coroutine_threadsafe`). The
   run row flips to `running`.
6. **Events.** The graph streams with `stream_mode=["custom", "updates"]`.
   Every node calls `_emit(agent, status, detail)`; each item is sent as an
   SSE frame `data: {"mode": ..., "payload": ...}\n\n` **and** appended to
   Redis `run:{id}:events` (TTL 1 h, refreshed on each push).
7. **Approval pause.** `human_approval_node` calls `interrupt({plan,
   task})`. The stream yields `__interrupt__`; the API sets status
   `awaiting_approval`, stores `pending_plan` on the row (so a page reload
   can show it), emits `{"mode": "interrupt", "payload": {plan, task}}` and
   ends this SSE response. The graph's state lives in the Postgres
   checkpoint.
8. **Decision.** `POST /agent/runs/{id}/approve {approved, feedback?}`
   resumes with `Command(resume=...)` on a new thread and is itself an SSE
   stream of the same shape:
   - approved → coder (feedback, if any, is passed to the coder as guidance)
   - not approved + feedback → planner revises → approval again
   - not approved, no feedback → graph ends, run `rejected`
9. **Code ⇄ test.** Coder edits files via tools, then must have produced a
   real diff (`git status --porcelain`) or the node raises. Tester runs the
   plan's `test_command` (300 s timeout); on failure it routes back to the
   coder with the output, up to `MAX_REPAIR_ATTEMPTS = 3`, then gives up to
   the reviewer. `skip_tests` makes the tester report a pass without running.
10. **Review + PR.** Reviewer writes `review_notes` (deterministic text, not
    an LLM). If tests passed, the github node creates branch
    `ai-agent/<task-slug>-<6 hex>`, commits as "AI Software Engineer",
    pushes with the user's token injected for that one command, and opens a
    PR against the project branch. `pr_url` is saved.
11. **Finish.** The run becomes `completed` (or `rejected`), `review_notes`
    and `pr_url` copied from the checkpointer's final state. A `null`
    marker is pushed to the Redis list so reattached viewers stop.

**Failure**: any exception marks the run `failed` with a shortened,
human-readable `error` (rate limits get a specific message) and emits
`{"mode": "error", "payload": message}`. **Retry** (`POST .../retry`)
resumes from the last checkpoint with `None` input, so only the node that
raised runs again; the workspace is not reset. **Cancel** (`POST
.../cancel`) sets `run:{id}:cancelled` in Redis and marks the row `failed`
("Run was stopped by user."); the worker checks the flag between stream
events. **Reattach**: opening `/stream` on a `running` or
`awaiting_approval` run replays the Redis list and polls it every 1 s. The
project page uses this to pick up a live run after a reload (or open the
one in `?run=<id>`).

## SSE event shapes

| `mode` | `payload` | Meaning |
|--------|-----------|---------|
| `custom` | `{agent, status, detail}` — status `running` / `done` / `error` | A node's progress. `agent` ∈ researcher, planner, human_approval, coder, tester, reviewer, github |
| `updates` | `{<node>: <state delta>}` | LangGraph's per-node state update |
| `interrupt` | `{plan, task}` | Paused for approval; show the plan |
| `error` | string | The run failed or was cancelled |

The client parses frames with `readAgentStream` (`apps/web/src/api/agent.api.ts`).

## Status machines

```
Project:  pending ──clone ok──▶ ready
             └────clone err──▶ failed  (reconnect → pending again)

Index:    none ─clone ok─▶ indexing ──▶ ready | failed   (re-index → indexing)

User:     onboarded_at null ──onboarding complete──▶ set

AgentRun: pending ─stream─▶ running ─interrupt─▶ awaiting_approval ─approve─▶ running
                               │                        │
                               ├──▶ completed           └─reject─▶ rejected
                               └──▶ failed ─retry─▶ running
          cancel: any non-terminal → failed
          terminal: completed, failed, rejected
```

## Data model (Postgres)

All tables except LangGraph's and `document_chunks`' vector column come from
`app/models/`. Every SQLModel table extends `TimestampModel`
(`created_at`, `updated_at`, UTC; `updated_at` is **not** auto-bumped on
update).

| Table | Columns that matter |
|-------|---------------------|
| `users` | `id`, `username` (unique, GitHub login), `email` (unique — the JWT `sub`), `github_id` (unique), `github_access_token` (Fernet ciphertext), `display_name`, `avatar_url`, `onboarded_at`, `hashed_password` (unused, OAuth only), `is_active` |
| `organizations` | `id`, `name`, `slug` (unique), `is_personal`, `created_by` → users |
| `organization_members` | `organization_id`, `user_id`, `role` (`owner` / `member`); unique `(organization_id, user_id)` |
| `projects` | `id`, `organization_id` → organizations, `user_id` (who connected it), `name` (default `owner/repo`), `github_url`, `branch` (default `main`), `description` (also holds clone errors), `status`, `index_status`, `indexed_at`, `index_error`, `workspace_id` (UUID, unique — the workspace directory name) |
| `agent_runs` | `id` (= LangGraph `thread_id`), `project_id`, `user_id`, `task`, `model`, `skip_tests`, `status`, `pending_plan` (JSON), `review_notes`, `pr_url`, `error` |
| `document_chunks` | `project_id`, `file_path`, `language`, `chunk_index`, `start_line`, `end_line`, `content`, `embedding vector(768)` |
| `user_api_keys` | `user_id`, `provider` (`gemini` / `claude` / `gpt`), `encrypted_key`; unique `(user_id, provider)` |
| `refresh_tokens` | Exists, **unused** — refresh tokens are stateless JWTs |
| `checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations` | Owned by LangGraph's `PostgresSaver.setup()`; outside Alembic |

No foreign key cascades: deleting a project deletes its runs and chunks in
code first (`app/services/projects.py`'s `delete_project`, also used when
an organization is deleted).

## Redis keys

| Key | Type | Written by | TTL |
|-----|------|-----------|-----|
| `rate_limit:<client ip>` | counter (limit 300) | `RateLimiter` dependency on every request | 60 s window |
| `run:<id>:events` | list of JSON events, `null` = run finished | graph worker thread, cancel | 3600 s, refreshed per push |
| `run:<id>:cancelled` | `"1"` | `POST /agent/runs/{id}/cancel` | 3600 s |

## Filesystem

`WORKSPACES_ROOT` (default `apps/api/workspaces`) holds one shallow clone
per project, named by `workspace_id`. It is reused across runs (reset before
each new run) and deleted only when the project is deleted. Agent tools are
confined to it: paths that resolve outside are refused, `.env*` files can't
be read, and the shell runs with `cwd` set to it.
