# apps/api/app/api/v1/agent.py
"""Kicks off, streams, and (with M4) pauses/resumes a multi-agent run."""

import asyncio
import json
import threading
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langgraph.types import Command
from pydantic import BaseModel
from sqlmodel import Session, col, select

from app.agents.graph import compile_graph
from app.api.deps import get_current_user
from app.db import engine, get_session
from app.models.agent_run import AgentRun
from app.models.project import Project
from app.models.user import User
from app.services.workspace import workspace_path

router = APIRouter(prefix="/agent", tags=["agent"])

DEFAULT_MODEL = "gemini-3.6-flash"


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
    graph_input: dict | Command,
    queue: "asyncio.Queue[dict | None]",
    loop: asyncio.AbstractEventLoop,
) -> None:
    """Runs on a worker thread — the graph's sync LLM/tool calls would
    otherwise block the async event loop for the whole run.

    `graph_input` is either the initial state dict (fresh run) or a
    `Command(resume=...)` (continuing a run paused at `human_approval`'s
    `interrupt()` — see app/agents/graph.py).
    """

    def emit(item: dict | None) -> None:
        asyncio.run_coroutine_threadsafe(queue.put(item), loop)

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
            accumulated: dict = {}
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
                if mode == "updates":
                    for node_update in payload.values():
                        accumulated.update(node_update)

            if not interrupted:
                if accumulated.get("approved") is False:
                    run.status = "rejected"
                else:
                    run.status = "completed"
                run.review_notes = accumulated.get("review_notes")
                run.pr_url = accumulated.get("pr_url")
        except Exception as e:  # noqa: BLE001
            message = _friendly_error(e)
            run.status = "failed"
            run.error = message
            emit({"mode": "error", "payload": message})
        finally:
            session.add(run)
            session.commit()
            emit(None)  # sentinel: tells the SSE loop we're done


def _start_stream(run_id: int, graph_input: dict | Command) -> StreamingResponse:
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

    async def event_generator():
        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item, default=str)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


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
    """
    run = _get_owned_run(run_id, current_user, session)
    if run.status != "pending":
        raise HTTPException(
            status_code=409, detail=f"Run is '{run.status}', cannot (re)start streaming"
        )

    graph_input: dict[str, Any] = {
        "task": run.task,
        "project_id": run.project_id,
        "user_id": run.user_id,
        "workspace_path": str(workspace_path(run.project_id)),
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
