# apps/api/app/api/v1/agent.py
"""Kicks off and streams a multi-agent run (M3's graph)."""

import asyncio
import json
import threading
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
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


def _run_graph_in_thread(
    run_id: int,
    project_id: int,
    task: str,
    model: str,
    queue: "asyncio.Queue[dict | None]",
    loop: asyncio.AbstractEventLoop,
) -> None:
    """Runs on a worker thread — the graph's sync LLM/tool calls would
    otherwise block the async event loop for the whole run."""

    def emit(item: dict | None) -> None:
        asyncio.run_coroutine_threadsafe(queue.put(item), loop)

    with Session(engine) as session:
        run = session.get(AgentRun, run_id)
        if run is None:
            return
        run.status = "running"
        session.add(run)
        session.commit()

        try:
            graph = compile_graph()
            config = {
                "configurable": {"thread_id": str(run_id)},
                "recursion_limit": 50,
            }
            initial_state = {
                "task": task,
                "project_id": project_id,
                "user_id": run.user_id,
                "workspace_path": str(workspace_path(project_id)),
                "model": model,
                "repair_attempts": 0,
            }
            accumulated: dict = {}
            for mode, payload in graph.stream(
                initial_state, config, stream_mode=["custom", "updates"]
            ):
                emit({"mode": mode, "payload": payload})
                if mode == "updates":
                    for node_update in payload.values():
                        accumulated.update(node_update)

            run.status = "completed"
            run.review_notes = accumulated.get("review_notes")
            run.pr_url = accumulated.get("pr_url")
        except Exception as e:  # noqa: BLE001
            run.status = "failed"
            run.error = str(e)
            emit({"mode": "error", "payload": str(e)})
        finally:
            session.add(run)
            session.commit()
            emit(None)  # sentinel: tells the SSE loop we're done


@router.get("/runs/{run_id}/stream")
async def stream_run(
    run_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
):
    """SSE stream of {agent, status, detail} events as the graph executes.

    Starts the graph the moment this connection opens (there's no separate
    "start" step) — simple, and matches how the frontend will use it: click
    Run, immediately open this stream.
    """
    run = _get_owned_run(run_id, current_user, session)
    if run.status != "pending":
        raise HTTPException(
            status_code=409, detail=f"Run is '{run.status}', cannot (re)start streaming"
        )

    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    thread = threading.Thread(
        target=_run_graph_in_thread,
        args=(run_id, run.project_id, run.task, run.model, queue, loop),
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
