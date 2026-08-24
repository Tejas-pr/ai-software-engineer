# apps/api/app/api/v1/agent.py
"""Kicks off, streams, and (with M4) pauses/resumes a multi-agent run."""

import asyncio
import json
import threading
import time
from typing import Annotated, Any

import redis
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langgraph.types import Command
from pydantic import BaseModel
from sqlmodel import Session, col, select

from app.agents.graph import compile_graph
from app.api.deps import get_current_user
from app.config import settings
from app.db import engine, get_session
from app.models.agent_run import AgentRun
from app.models.project import Project
from app.models.user import User
from app.services.workspace import clone_repository, reset_workspace, workspace_path
from app.utils.crypto import decrypt_token

router = APIRouter(prefix="/agent", tags=["agent"])

DEFAULT_MODEL = "gemini-3.6-flash"

# Run-terminal statuses: once here, nothing more will ever be emitted for
# this run, so a reattached viewer's poll loop can stop.
TERMINAL_STATUSES = ("completed", "failed", "rejected")

# How long a run's durable event history survives in Redis after last
# being written to. Refreshed on every emit, so it only really applies to
# finished runs nobody has reattached to — keeps Redis from accumulating
# history forever (see `docs/live-run-plan.md`, item 2).
EVENTS_TTL_SECONDS = 3600

# How often a reattached viewer polls Redis for new events. Deliberately
# polling rather than Redis pub/sub: pub/sub delivers only to subscribers
# already listening when a message is published, so a SUBSCRIBE that races
# a LRANGE catch-up read either misses events published in between or
# double-delivers ones caught by both — avoidable, but only by threading a
# sequence number through every event. Polling a list is simpler and
# race-free at the cost of up to this much latency, which is fine for a
# progress feed.
ATTACH_POLL_SECONDS = 1.0


def _redis_events_key(run_id: int) -> str:
    return f"run:{run_id}:events"


def _sync_redis() -> redis.Redis:
    """A plain Redis client built straight from settings, for use on a
    worker thread. `app/redis_client.py`'s `get_redis` is a FastAPI
    dependency that requires a `Request`, which a background thread
    doesn't have — same reason `app/rate_limiter.py` can't be reused here
    either."""
    return redis.Redis(
        host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=settings.REDIS_DB
    )


class RunCreate(BaseModel):
    project_id: int
    task: str
    model: str = DEFAULT_MODEL
    skip_tests: bool = False


class ApproveRequest(BaseModel):
    approved: bool
    feedback: str | None = None


def _get_owned_run(run_id: int, current_user: User, session: Session) -> AgentRun:
    run = session.get(AgentRun, run_id)
    if run is None or run.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.post("/runs")
def create_run(
    body: RunCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    project = session.get(Project, body.project_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "ready":
        raise HTTPException(
            status_code=409, detail=f"Project is '{project.status}', not ready to run"
        )
    assert project.id is not None  # committed rows always have one
    assert current_user.id is not None  # authenticated users are always persisted

    run = AgentRun(
        project_id=project.id,
        user_id=current_user.id,
        task=body.task,
        model=body.model,
        skip_tests=body.skip_tests,
        status="pending",
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


@router.get("/runs")
def list_runs(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    statement = (
        select(AgentRun)
        .where(AgentRun.user_id == current_user.id)
        .order_by(col(AgentRun.created_at).desc())
    )
    return session.exec(statement).all()


@router.get("/runs/{run_id}")
def get_run(
    run_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    return _get_owned_run(run_id, current_user, session)


MAX_ERROR_LENGTH = 300


def _friendly_error(exc: Exception) -> str:
    """Provider errors (Gemini/Claude/GPT/Ollama) come back as long,
    provider-specific exception dumps — the raw `str()` of a Gemini 429 is
    a multi-hundred-character dict literal. Detect the common, actionable
    case (rate limiting — the free tier is what most people hit here) and
    give a short, useful message; otherwise just cap the length so a run's
    `error` field never becomes an unreadable wall of text.
    """
    text = str(exc)
    status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    is_rate_limit = (
        status_code in (429, "429")
        or "RESOURCE_EXHAUSTED" in text
        or "rate limit" in text.lower()
    )
    if is_rate_limit:
        return (
            "Rate limit hit on the model provider (likely the free-tier quota). "
            "Wait a bit and retry, or pick a different model — including a local "
            "Ollama model, which has no quota — from the model picker."
        )
    if len(text) > MAX_ERROR_LENGTH:
        return text[:MAX_ERROR_LENGTH] + "..."
    return text


def _run_graph_in_thread(
    run_id: int,
    graph_input: dict | Command | None,
    queue: "asyncio.Queue[dict | None]",
    loop: asyncio.AbstractEventLoop,
) -> None:
    """Runs on a worker thread — the graph's sync LLM/tool calls would
    otherwise block the async event loop for the whole run.

    `graph_input` is one of three things:
    - the initial state dict (fresh run)
    - a `Command(resume=...)` (continuing a run paused at `human_approval`'s
      `interrupt()` — see app/agents/graph.py)
    - `None` (retry: resume from wherever the Postgres-backed checkpointer
      last left off for this run's thread_id, e.g. after a node raised —
      see `retry_run`)
    """

    redis_client = _sync_redis()
    events_key = _redis_events_key(run_id)

    def emit(item: dict | None) -> None:
        # Always feed this connection's own local queue — it's the fast
        # path for whoever started/resumed the run and is watching it live.
        asyncio.run_coroutine_threadsafe(queue.put(item), loop)
        # `None` here just means "this HTTP connection's SSE stream is
        # over" (also true mid-run, at a `human_approval` interrupt) — it
        # is NOT the same as "this run is finished". Only real events go
        # into the durable/fan-out history; the run-is-finished marker for
        # reattached viewers is written separately below, once the run's
        # actual terminal status is known.
        if item is not None:
            redis_client.rpush(events_key, json.dumps(item, default=str))
            redis_client.expire(events_key, EVENTS_TTL_SECONDS)

    with Session(engine) as session:
        run = session.get(AgentRun, run_id)
        if run is None:
            return
        run.status = "running"
        run.pending_plan = None
        session.add(run)
        session.commit()

        try:
            graph = compile_graph()
            config = {
                "configurable": {"thread_id": str(run_id)},
                "recursion_limit": 50,
            }
            interrupted = False
            for mode, payload in graph.stream(
                graph_input, config, stream_mode=["custom", "updates"]
            ):
                if mode == "updates" and "__interrupt__" in payload:
                    interrupted = True
                    interrupt_value = payload["__interrupt__"][0].value
                    run.status = "awaiting_approval"
                    run.pending_plan = interrupt_value.get("plan")
                    emit({"mode": "interrupt", "payload": interrupt_value})
                    break
                emit({"mode": mode, "payload": payload})

            if not interrupted:
                # Pulled from the checkpointer's own merged state rather
                # than accumulated from this call's stream of "updates"
                # events: on a `retry_run` resume, nodes that already
                # completed in an *earlier* `.stream()` call (before the
                # one that raised) don't get their updates re-emitted here
                # — only the node(s) that actually (re-)run this time do.
                # `get_state` reflects everything ever committed for this
                # thread_id, regardless of how many separate calls it took.
                final_state = graph.get_state(config).values
                if final_state.get("approved") is False:
                    run.status = "rejected"
                else:
                    run.status = "completed"
                run.review_notes = final_state.get("review_notes")
                run.pr_url = final_state.get("pr_url")
        except Exception as e:  # noqa: BLE001
            message = _friendly_error(e)
            run.status = "failed"
            run.error = message
            emit({"mode": "error", "payload": message})
        finally:
            session.add(run)
            session.commit()
            if run.status in TERMINAL_STATUSES:
                # The run itself is done (not just this connection) — tell
                # any reattached/polling viewers to stop waiting too.
                redis_client.rpush(events_key, json.dumps(None))
                redis_client.expire(events_key, EVENTS_TTL_SECONDS)
            emit(None)  # sentinel: tells this connection's SSE loop we're done
            redis_client.close()


def _sse_from_queue(queue: "asyncio.Queue[dict | None]"):
    """Shared SSE body for both a freshly-started run and a reattached
    one — both ultimately just drain a local asyncio.Queue fed by a worker
    thread."""

    async def event_generator():
        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item, default=str)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def _start_stream(run_id: int, graph_input: dict | Command | None) -> StreamingResponse:
    """Shared by /stream (fresh run) and /approve (resume): starts the graph
    on a worker thread and bridges its events back as SSE."""
    queue: asyncio.Queue[dict | None] = asyncio.Queue()
    loop = asyncio.get_event_loop()

    thread = threading.Thread(
        target=_run_graph_in_thread,
        args=(run_id, graph_input, queue, loop),
        daemon=True,
    )
    thread.start()

    return _sse_from_queue(queue)


def _attach_stream_worker(
    run_id: int, queue: "asyncio.Queue[dict | None]", loop: asyncio.AbstractEventLoop
) -> None:
    """Reattaches to a run already executing on some other (or the same,
    since-disconnected) worker thread. Replays everything durably recorded
    in Redis so far, then polls for anything new until the run reaches a
    terminal status. See `ATTACH_POLL_SECONDS` for why this polls instead
    of subscribing."""

    def emit(item: dict | None) -> None:
        asyncio.run_coroutine_threadsafe(queue.put(item), loop)

    redis_client = _sync_redis()
    events_key = _redis_events_key(run_id)
    try:
        seen = 0
        while True:
            for raw in redis_client.lrange(events_key, seen, -1):
                seen += 1
                item = json.loads(raw)
                emit(item)
                if item is None:  # the run-finished marker, see emit() above
                    return
            time.sleep(ATTACH_POLL_SECONDS)
            # Nothing new since the last poll — fall back to the DB status.
            # Covers a run that finished (or was never streamed through
            # this path at all) before its Redis history existed or after
            # it expired, so we don't poll forever.
            with Session(engine) as session:
                run = session.get(AgentRun, run_id)
                if run is None or run.status not in ("running", "awaiting_approval"):
                    emit(None)
                    return
    finally:
        redis_client.close()


def _attach_stream(run_id: int) -> StreamingResponse:
    """Like `_start_stream`, but for a run that's already in flight — no
    new graph thread, just an observer."""
    queue: asyncio.Queue[dict | None] = asyncio.Queue()
    loop = asyncio.get_event_loop()

    thread = threading.Thread(
        target=_attach_stream_worker, args=(run_id, queue, loop), daemon=True
    )
    thread.start()

    return _sse_from_queue(queue)


@router.get("/runs/{run_id}/stream")
async def stream_run(
    run_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """SSE stream of {agent, status, detail} events as the graph executes.

    Starts the graph the moment this connection opens (there's no separate
    "start" step) — simple, and matches how the frontend will use it: click
    Run, immediately open this stream. Ends either when the graph finishes,
    or when it pauses at `human_approval` — the client sees a `mode:
    "interrupt"` event and should show the approve/reject panel, then call
    `POST /runs/{id}/approve` (a second SSE stream) to continue.

    A run that's already `running`/`awaiting_approval` (e.g. you navigated
    away and came back, or opened the run in a second tab) reattaches
    instead of 409-ing: the graph keeps executing server-side independent
    of any one HTTP connection, so this replays its history from Redis and
    keeps streaming rather than starting a second, competing graph thread.
    Only a genuinely new (`pending`) run starts one; only a `completed`/
    `failed`/`rejected` run has nothing left to stream and still 409s.
    """
    run = _get_owned_run(run_id, current_user, session)

    if run.status in ("running", "awaiting_approval"):
        return _attach_stream(run_id)

    if run.status != "pending":
        raise HTTPException(
            status_code=409, detail=f"Run is '{run.status}', cannot (re)start streaming"
        )

    # Reused workspace, fresh run: reset to a clean checkout of the
    # project's branch first, so a previous run's half-written files (or a
    # stray local branch left over from a github_node PR attempt) don't
    # leak into this one. Only done here (a genuinely new run) — never on
    # /approve's resume, which continues mid-run against files the coder
    # has already written this run.
    project = session.get(Project, run.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    ws_path = workspace_path(project.workspace_id)
    try:
        if ws_path.exists():
            reset_workspace(ws_path, project.branch)
        else:
            # `reset_workspace` itself just no-ops on a missing directory
            # ("caller's clone step handles this case") — but nothing
            # actually re-clones here normally, since a `ready` project is
            # assumed to already have its one-time clone from
            # connect/reconnect (`projects.py`). If that clone is gone —
            # e.g. the workspace volume didn't survive an environment
            # reset even though the DB row did — self-heal by re-cloning,
            # rather than silently running the whole graph against a
            # nonexistent directory and having it surface many steps later
            # as an opaque "No such file or directory" deep in a tool call.
            if not current_user.github_access_token:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "This project's workspace is missing on disk and there's "
                        "no GitHub token on file to re-clone it — log out and back "
                        "in with GitHub, then try again."
                    ),
                )
            clone_repository(
                project.github_url,
                project.branch,
                decrypt_token(current_user.github_access_token),
                project.workspace_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to prepare workspace before run: {e!s}"
        ) from e

    graph_input: dict[str, Any] = {
        "task": run.task,
        "project_id": run.project_id,
        "user_id": run.user_id,
        "workspace_path": str(workspace_path(project.workspace_id)),
        "model": run.model,
        "skip_tests": run.skip_tests,
        "repair_attempts": 0,
    }
    return _start_stream(run_id, graph_input)


@router.post("/runs/{run_id}/approve")
async def approve_run(
    run_id: int,
    body: ApproveRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Resumes a run paused at `human_approval`. Another SSE stream, same
    event shape as GET /stream, covering execution from here to the end."""
    run = _get_owned_run(run_id, current_user, session)
    if run.status != "awaiting_approval":
        raise HTTPException(
            status_code=409, detail=f"Run is '{run.status}', nothing to approve"
        )

    resume_value = {"approved": body.approved, "feedback": body.feedback}
    return _start_stream(run_id, Command(resume=resume_value))


@router.post("/runs/{run_id}/retry")
async def retry_run(
    run_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """Retries a `failed` run from wherever it actually stopped, instead of
    restarting the whole pipeline. LangGraph's checkpointer (Postgres, see
    app/agents/checkpointer.py) persists state after every node that
    *completes* — a node that raised never got that far, so the last
    checkpoint is whatever the previous node left behind, with the failed
    node still the next thing due to run. Passing `None` as the graph
    input resumes from exactly that point and re-executes only the node
    that didn't finish (e.g. everything through Reviewer stays untouched;
    only github_node runs again). Another SSE stream, same event shape as
    GET /stream.

    Deliberately does NOT reset the workspace (unlike a fresh /stream) —
    the whole point is to keep whatever the coder already built and
    committed, not throw it away."""
    run = _get_owned_run(run_id, current_user, session)
    if run.status != "failed":
        raise HTTPException(
            status_code=409, detail=f"Run is '{run.status}', nothing to retry"
        )
    run.error = None
    session.add(run)
    session.commit()
    return _start_stream(run_id, None)
