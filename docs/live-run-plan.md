# Live agent-run plan: reattachable streams + live coder view

Continuation doc for a multi-part change to the agent-run system. Point a
new chat at this file to pick up where this session left off — read it in
full before touching code, it captures decisions/gotchas that aren't
otherwise written down anywhere.

## Original ask (4 parts)

1. Stop the workspace directory from filling up disk.
2. Runs that are still executing should be reattachable if you navigate
   away and come back (not lost).
3. Workspace directories should be named by an unguessable id, not the
   sequential project id.
4. An "open in new tab" view of the coder agent so you can watch it work
   live.

## Status: 1, 2, and 3 are DONE. 4 is NOT STARTED — this doc is its plan.

### Done — 1) Workspace cleanup
- `app/services/workspace.py`: added `reset_workspace(workspace_root, branch)`
  (git clean/checkout/fetch/reset --hard to a clean checkout) and
  `delete_workspace(workspace_root)`.
- `app/api/v1/agent.py`'s `stream_run` calls `reset_workspace` before every
  **new** run (never on `/approve`'s resume — that continues mid-run on
  purpose, resetting there would blow away the coder's in-progress work).
- `app/api/v1/projects.py`: added `DELETE /projects/{id}` — deletes
  dependent `AgentRun`/`DocumentChunk` rows (no FK cascade configured, so
  order matters), then the `Project` row, then the on-disk workspace via
  `delete_workspace`.

### Done — 3) UUID workspace ids
- `Project.workspace_id: uuid.UUID` (unique, indexed, `default_factory=uuid4`)
  added to `app/models/project.py`.
- Migration `migrations/versions/cd1330284230_add_workspace_id_uuid_to_projects.py`
  — uses `server_default=sa.text('gen_random_uuid()')` so existing rows
  backfill automatically (Postgres 13+ built-in, no extension). **Note:**
  autogenerate proposes dropping LangGraph's own `checkpoint*` tables every
  time (they're outside `SQLModel.metadata` — see `app/agents/checkpointer.py`)
  — strip that out of every future migration, same as this one and the two
  before it.
- `workspace_path()` / `clone_repository()` in `workspace.py` now take
  `workspace_id: uuid.UUID`, not `project_id: int`. All call sites updated
  (`projects.py`, `agent.py`).
- One-time manual fixup already done: renamed the one existing project's
  `workspaces/1/` dir to `workspaces/<its-new-uuid>/` so it kept working
  post-migration. Not needed again — new projects get it right from clone.

### Done — 2) Reattachable live stream

Implemented in `app/api/v1/agent.py`, mostly as planned but with one
deliberate deviation:

- `_run_graph_in_thread`'s `emit()` now also `RPUSH`es every event to
  `run:{run_id}:events` (JSON, `EXPIRE` refreshed to `EVENTS_TTL_SECONDS`
  = 3600 on each push). **Not** used for the `None` per-connection
  sentinel (that just means "this SSE connection ended", which also
  happens mid-run at a `human_approval` interrupt) — a separate
  `json.dumps(None)` "run truly finished" marker is pushed only in the
  `finally` block, and only when `run.status` has landed in
  `TERMINAL_STATUSES` (`completed`/`failed`/`rejected`). This distinction
  mattered: without it, a reattached viewer's stream would silently end
  the moment the run merely paused for approval, not when it actually
  finished.
- **Deviation from the original plan: polling instead of `PUBLISH`/`SUBSCRIBE`.**
  A late `SUBSCRIBE` racing the `LRANGE` catch-up read either misses
  events published in the gap or double-delivers ones caught by both —
  fixable, but only by threading a sequence number through every event.
  `_attach_stream_worker` instead just polls
  `LRANGE run:{run_id}:events {seen} -1` every `ATTACH_POLL_SECONDS`
  (1s), advancing `seen` by however many it got back each time. Simpler,
  race-free, costs up to ~1s of latency — fine for a progress feed. Falls
  back to checking the run's DB status when a poll comes back empty, so
  it doesn't spin forever on a run whose history predates/outlives its
  Redis TTL.
- `_sync_redis()` builds a plain `redis.Redis(host=..., port=..., db=...)`
  from `app.config.settings` for use inside worker threads (both the
  graph-running thread and the new attach-polling thread) — `get_redis`
  needs a `Request` a thread doesn't have, same reasoning as
  `app/rate_limiter.py`.
- `stream_run` branches on `run.status`: `pending` → old behavior
  (reset workspace, `_start_stream`); `running`/`awaiting_approval` →
  `_attach_stream(run_id)` (no new graph thread, just an observer);
  terminal → still 409, nothing left to stream.
- `approve_run` needed no changes — it already calls `_start_stream` →
  `_run_graph_in_thread`, so its resume thread writes to the same Redis
  key automatically and any viewer already attached keeps seeing events
  across the interrupt → approve → resume boundary.

**Verified against the real local Postgres + Redis** (not yet through an
actual HTTP round trip / live graph run, which needs a git repo + model
provider key — this drove the shipped `_attach_stream_worker`/
`_sync_redis`/`_redis_events_key` directly against a temporary `AgentRun`
row): catch-up replay of pre-seeded events, live events delivered while
attached, no false "done" while `status` sits at `awaiting_approval` (the
interrupt case), and the real finished-run sentinel correctly stopping
the poll loop and exiting the thread once `status` reaches `completed`.
All passed. Still worth doing once: a real run through the API, killing
the SSE connection mid-`running`, reopening `/stream` for the same
`run_id` from a fresh connection.

### NOT DONE — 4) New-tab live coder view

Depends on #2 (needs a reattachable stream to be useful from a fresh tab).

1. **Backend — per-file/command events.** `app/agents/tools.py`'s
   `make_workspace_tools`: add a `_emit("coder", "file", ...)`-style call
   (reuse the `get_stream_writer()` pattern already used in `graph.py`)
   inside `write_file_tool`, right before/after each write — include file
   path, line count, and ideally a diff against the previous content (read
   old content first; `write_file` currently just overwrites blind). Same
   for `run_command_tool` ("Running: npm install..."). `get_stream_writer()`
   is contextvar-based, so it's reachable from inside a tool call, not just
   a node — no graph-shape change needed.

   **Also fix while touching this:** `coder_node`'s `files_changed` return
   value (`graph.py`) is currently computed from the *plan's declared file
   list* (`sorted({f for s in plan["steps"] for f in s["files"]})`), not
   from confirmed successful writes — so the UI's "files changed" claim
   isn't proof anything landed on disk (found during this session's
   debugging: `qwen2.5-coder:7b` sometimes narrates a write without
   actually invoking `write_file_tool`, or the tool errors and the agent
   doesn't notice). Track real successful writes (collect them from
   `write_file_tool`'s own return values) and use that for `files_changed`
   instead.

2. **Frontend — accumulate instead of overwrite.** `ProjectDetail.tsx`
   currently does `nodeStates[agent] = { status, detail }` — a single
   string per agent, overwritten on every event
   (around `setNodeStates` in the SSE `onmessage`/event handler). Once the
   backend emits more granular per-file events, this alone makes the Coder
   card update live (cheap win, no other change). For an actual feed,
   change that agent's entry to an accumulating array instead of overwrite,
   render as a scrolling list.

3. **New route for the "open in new tab" ask**, e.g.
   `/projects/:id/runs/:runId/live` — a dedicated full-page view that opens
   its own `EventSource`/SSE connection to `/agent/runs/{runId}/stream`
   (now reattachable per #2) and renders the full accumulating event feed,
   not just the small card. Add an "open in new tab" button/icon next to
   the Coder card on the project page that does
   `window.open('/projects/'+id+'/runs/'+runId+'/live', '_blank')`.
   Optional v2: syntax-highlighted diff rendering per file instead of plain
   text.

## Other things worth knowing (found this session, not yet acted on)

- **The planner sometimes picks a non-terminating "test_command"** (e.g.
  `npm run dev`, which starts a dev server and never exits) for repos with
  no real test script — guaranteed 120s timeout regardless of whether the
  code is correct. Worth tightening the planner prompt (`graph.py`'s
  `planner_node` system message) to fall back to something that actually
  terminates (`npm run build` / `npm run lint`) when no `test` script
  exists in `package.json`.
- **Local Ollama models (`qwen2.5-coder:7b`) don't reliably follow the
  tool-calling protocol** — observed a coder step whose final message was
  raw tool-call JSON text instead of an actual invocation, and separately
  a `github` node update surfacing as `None` instead of `{}` in LangGraph's
  `stream_mode="updates"` (now guarded in `agent.py`, see git history —
  `if node_update: accumulated.update(node_update)`). Any other code that
  assumes an LLM/tool response is always well-formed is worth a second
  look given this model's behavior.
- Restart the `uv run uvicorn --reload` dev server after pulling this
  session's changes — the DB schema changed (migration `cd1330284230`).

## Relevant files
- `apps/api/app/api/v1/agent.py` — run lifecycle, SSE streaming, the emit/queue pattern.
- `apps/api/app/agents/graph.py` — the LangGraph node functions, `_emit`, `compile_graph`.
- `apps/api/app/agents/tools.py` — the coder's write/run tools (where per-file events attach).
- `apps/api/app/services/workspace.py` — clone/reset/delete, `workspace_path`.
- `apps/api/app/models/project.py` — `workspace_id`.
- `apps/api/app/redis_client.py`, `app/rate_limiter.py` — existing Redis usage patterns to follow.
- `apps/web/src/pages/ProjectDetail.tsx` — frontend run view, `nodeStates`, SSE handling.
