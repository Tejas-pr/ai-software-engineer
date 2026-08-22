# apps/api/app/agents/graph.py
"""
The multi-agent graph:

  researcher -> planner -> human_approval -> coder -> tester
                                 |                        ^  |
                              (reject)                    '--(fail, retry)
                                 |                             |
                                 v                         reviewer -> github -> END
                                END

This *is* BUILDER.md Phase 8/9's diagram — one process, one StateGraph,
nodes as plain functions (not separate services: there's no benefit to
running "the planner" as its own microservice here, per BUILDER's "don't
create agents for their own sake").

Checkpointer: `PostgresSaver` (`app/agents/checkpointer.py`). This is what
makes `human_approval`'s `interrupt()` actually work — the request that
hits the interrupt ends, and the approval click is a genuinely separate
HTTP request (maybe served by a different thread, maybe minutes later).
Only a checkpoint persisted outside process memory survives that gap.
"""

import re
import uuid
from pathlib import Path
from typing import cast

from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from langgraph.graph import END, StateGraph
from langgraph.types import interrupt
from sqlmodel import Session

from app.agents.checkpointer import get_checkpointer
from app.agents.github_tools import commit_and_push, create_branch, create_pull_request
from app.agents.llm import get_chat_model
from app.agents.state import AgentState, Plan
from app.agents.tech_stack import detect_tech_stack
from app.agents.tools import (
    make_read_only_tools,
    make_search_codebase_tool,
    make_workspace_tools,
)
from app.db import engine
from app.models.project import Project
from app.models.user import User
from app.services.github_api import parse_github_url
from app.tools.terminal import run_command
from app.utils.crypto import decrypt_token

MAX_REPAIR_ATTEMPTS = 3
AGENT_LOOP_STEP_LIMIT = 25  # guards against a runaway tool-calling loop


def _emit(agent: str, status: str, detail: str = "") -> None:
    """Report this node's status to whoever is streaming the run (M6's boxes)."""
    get_stream_writer()({"agent": agent, "status": status, "detail": detail})


def researcher_node(state: AgentState) -> dict:
    _emit("researcher", "running", "Exploring the repository...")
    workspace = Path(state["workspace_path"])

    # Detected with code, not asked of the LLM: a small model will sometimes
    # skip reading package.json (or misread it) and confidently report the
    # wrong framework. A manifest parser can't hallucinate — hand it the
    # fact instead of hoping it discovers the fact correctly.
    detected_stack = detect_tech_stack(workspace)

    tools = make_read_only_tools(workspace) + [
        make_search_codebase_tool(state["project_id"])
    ]
    agent = create_agent(
        get_chat_model(state["model"], user_id=state.get("user_id")),
        tools,
        system_prompt=(
            "You are a research agent. You only have read-only tools; you "
            "never modify files. Investigate the repo enough to brief a planner. "
            "You will be given the project's tech stack as a verified fact — "
            "never contradict it or substitute a generic guess."
        ),
    )
    result = agent.invoke(
        {
            "messages": [
                HumanMessage(
                    f"Verified tech stack (from the project's own manifest file — "
                    f"treat this as ground truth): {detected_stack}\n\n"
                    f"Task: {state['task']}\n\n"
                    "Explore the repository (list files, search code, read the "
                    "relevant ones) and summarize: the project's structure, "
                    "conventions, and exactly which files/areas this task will touch. "
                    "Start your summary by restating the verified tech stack above."
                ),
            ]
        },
        {"recursion_limit": AGENT_LOOP_STEP_LIMIT},
    )
    notes = result["messages"][-1].content
    _emit("researcher", "done", notes[:200])
    return {"research_notes": notes, "detected_stack": detected_stack}


def planner_node(state: AgentState) -> dict:
    _emit("planner", "running", "Writing the implementation plan...")
    model = get_chat_model(
        state["model"], user_id=state.get("user_id")
    ).with_structured_output(Plan)

    stack_line = f"Verified tech stack: {state.get('detected_stack', '(unknown)')}\n\n"
    feedback = state.get("plan_feedback")
    if feedback:
        user_prompt = (
            f"{stack_line}Task: {state['task']}\n\n"
            f"Research notes:\n{state['research_notes']}\n\n"
            f"Your previous plan was rejected. Revise it based on this feedback:\n"
            f"{feedback}\n\nPrevious plan summary: {state['plan']['summary']}"
        )
    else:
        user_prompt = (
            f"{stack_line}Task: {state['task']}\n\n"
            f"Research notes:\n{state['research_notes']}"
        )

    messages = [
        SystemMessage(
            "You are a planning agent for a software engineering task. Produce "
            "a concrete, minimal plan — the smallest set of steps that "
            "actually implements the task, plus the shell command that "
            "verifies it (run from the repo root). The plan MUST match the "
            "verified tech stack you're given — never introduce a different "
            "language or framework (e.g. don't write raw .html/.css/.js files "
            "for a React project; write components in the project's own "
            "existing style instead). The verified tech stack line is ground "
            "truth from the project's own manifest file — trust it over "
            "anything the research notes say, if they ever disagree."
        ),
        HumanMessage(user_prompt),
    ]
    # with_structured_output()'s return type is broadened to `BaseModel | dict`
    # to cover callers that pass a TypedDict schema instead of a Pydantic
    # model; ours is always `Plan`, so narrow it back explicitly.
    plan = cast(Plan, model.invoke(messages))
    _emit("planner", "done", plan.summary[:200])
    # Clear plan_feedback once consumed — a later rejection sets it fresh.
    return {"plan": plan.model_dump(), "plan_feedback": None}


def human_approval_node(state: AgentState) -> dict:
    """Pauses the graph until a human resumes it via `POST /agent/runs/{id}/approve`.

    `interrupt()` suspends execution right here — the whole function reruns
    from the top when resumed (confirmed empirically; LangGraph replays the
    node, it doesn't resume mid-function), so the "running" status may fire
    twice for one approval. Harmless: the second run's `interrupt()` call
    returns instantly with the resume value instead of pausing again,
    because the checkpoint already has an answer for this interrupt point.
    """
    _emit("human_approval", "running", "Waiting for approval of the plan...")
    decision = interrupt({"plan": state["plan"], "task": state["task"]})
    if isinstance(decision, dict):
        approved = bool(decision.get("approved"))
        feedback = decision.get("feedback") or None
    else:
        approved, feedback = bool(decision), None

    if approved:
        _emit("human_approval", "done", "Approved")
    elif feedback:
        _emit("human_approval", "done", f"Changes requested: {feedback[:150]}")
    else:
        _emit("human_approval", "done", "Rejected")
    return {"approved": approved, "plan_feedback": feedback}


def coder_node(state: AgentState) -> dict:
    _emit("coder", "running", "Implementing the plan...")
    workspace = Path(state["workspace_path"])
    tools = make_workspace_tools(workspace)
    agent = create_agent(
        get_chat_model(state["model"], user_id=state.get("user_id")),
        tools,
        system_prompt=(
            "You are a coding agent. Use read_file_tool/list_files_tool to "
            "look before you write, then make the change with "
            "write_file_tool (always write the file's full new content). "
            "Use run_command_tool for anything else you need (installing "
            "deps, running a formatter, etc.)."
        ),
    )

    repair_note = ""
    if state.get("test_output") and not state.get("test_passed", True):
        repair_note = (
            f"\n\nThe previous attempt's tests FAILED. Fix the code. Test output:\n"
            f"{state['test_output']}"
        )

    # A note left alongside an *approval* (as opposed to a rejection, which
    # the planner already consumed and cleared before coder ever runs).
    approval_note = ""
    if state.get("plan_feedback"):
        approval_note = (
            f"\n\nAdditional guidance from the approver: {state['plan_feedback']}"
        )

    plan = state["plan"]
    steps_text = "\n".join(f"- {s['description']}" for s in plan["steps"])
    result = agent.invoke(
        {
            "messages": [
                HumanMessage(
                    f"Task: {state['task']}\n\nPlan:\n{plan['summary']}\n{steps_text}"
                    f"{repair_note}{approval_note}"
                ),
            ]
        },
        {"recursion_limit": AGENT_LOOP_STEP_LIMIT},
    )
    summary = result["messages"][-1].content
    _emit("coder", "done", summary[:200])
    files_changed = sorted({f for s in plan["steps"] for f in s["files"]})
    return {"files_changed": files_changed}


def tester_node(state: AgentState) -> dict:
    if state.get("skip_tests"):
        _emit("tester", "done", "Skipped — testing turned off for this run.")
        return {
            "test_output": "Skipped by user.",
            "test_passed": True,
            "repair_attempts": state.get("repair_attempts", 0),
        }

    _emit("tester", "running", f"Running: {state['plan']['test_command']}")
    workspace = Path(state["workspace_path"])
    output = run_command(
        state["plan"]["test_command"], workspace_root=workspace, timeout=120.0
    )
    passed = (
        output.startswith("Exit Code: 0") or "Command executed successfully" in output
    )
    attempts = state.get("repair_attempts", 0) + (0 if passed else 1)
    _emit("tester", "done" if passed else "error", output[:300])
    return {"test_output": output, "test_passed": passed, "repair_attempts": attempts}


def reviewer_node(state: AgentState) -> dict:
    _emit("reviewer", "running", "Reviewing the result...")
    if state.get("test_passed"):
        notes = (
            f"Tests passed after {state.get('repair_attempts', 0)} repair attempt(s). "
            f"Files changed: {', '.join(state.get('files_changed', [])) or '(none reported)'}"
        )
    else:
        notes = (
            f"Gave up after {state.get('repair_attempts', 0)} repair attempts — "
            f"tests still failing:\n{state.get('test_output', '')[:500]}"
        )
    _emit("reviewer", "done", notes[:200])
    return {"review_notes": notes}


def github_node(state: AgentState) -> dict:
    """Opens the PR — only if tests actually passed. A failed run gets
    reported by the reviewer, not silently pushed."""
    if not state.get("test_passed"):
        _emit("github", "done", "Skipped — tests did not pass.")
        return {}

    _emit("github", "running", "Opening pull request...")
    with Session(engine) as session:
        project = session.get(Project, state["project_id"])
        user = session.get(User, state["user_id"])
    if project is None or user is None or not user.github_access_token:
        _emit("github", "error", "Missing project/user/token for PR creation.")
        return {}
    token = decrypt_token(user.github_access_token)
    owner, repo = parse_github_url(project.github_url)

    slug = re.sub(r"[^a-z0-9]+", "-", state["task"].lower())[:40].strip("-")
    branch_name = f"ai-agent/{slug}-{uuid.uuid4().hex[:6]}"
    workspace = Path(state["workspace_path"])

    create_branch(workspace, branch_name)
    commit_and_push(workspace, branch_name, f"AI agent: {state['task'][:72]}", token)

    import asyncio

    pr_url = asyncio.run(
        create_pull_request(
            token,
            owner,
            repo,
            head_branch=branch_name,
            base_branch=project.branch,
            title=f"AI agent: {state['task'][:72]}",
            body=state.get("review_notes", "") + f"\n\nTask: {state['task']}",
        )
    )
    _emit("github", "done", pr_url)
    return {"pr_url": pr_url}


def _route_after_tester(state: AgentState) -> str:
    if state.get("test_passed"):
        return "reviewer"
    if state.get("repair_attempts", 0) >= MAX_REPAIR_ATTEMPTS:
        return "reviewer"  # stop retrying; reviewer reports the failure
    return "coder"


def _route_after_approval(state: AgentState) -> str:
    if state.get("approved"):
        return "coder"
    if state.get("plan_feedback"):
        return "planner"  # revise and re-ask, rather than dead-ending the run
    return "end"


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    graph.add_node("researcher", researcher_node)
    graph.add_node("planner", planner_node)
    graph.add_node("human_approval", human_approval_node)
    graph.add_node("coder", coder_node)
    graph.add_node("tester", tester_node)
    graph.add_node("reviewer", reviewer_node)
    graph.add_node("github", github_node)

    graph.set_entry_point("researcher")
    graph.add_edge("researcher", "planner")
    graph.add_edge("planner", "human_approval")
    graph.add_conditional_edges(
        "human_approval",
        _route_after_approval,
        {"coder": "coder", "planner": "planner", "end": END},
    )
    graph.add_edge("coder", "tester")
    graph.add_conditional_edges(
        "tester", _route_after_tester, {"coder": "coder", "reviewer": "reviewer"}
    )
    graph.add_edge("reviewer", "github")
    graph.add_edge("github", END)
    return graph


def compile_graph():
    return build_graph().compile(checkpointer=get_checkpointer())
