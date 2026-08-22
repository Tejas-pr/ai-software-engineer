"""
M4 smoke test: the human-approval interrupt actually pauses and durably
resumes — verified with two fully separate `compile_graph()` calls per
scenario (each `compile_graph()` builds a fresh in-process graph object;
the only thing carrying state between them is the Postgres checkpoint,
which is exactly the cross-request scenario the real API relies on).

Uses local Ollama, not Gemini — free to run repeatedly, and this test only
needs to prove the *routing* (reject -> untouched repo & graph ends at
human_approval; approve -> execution reaches coder), not coding quality.
M3's test already proves a capable model completes the full loop.
"""

from pathlib import Path

import httpx
import pytest
from langgraph.types import Command

from app.agents.graph import compile_graph
from app.config import settings


def _ollama_reachable() -> bool:
    try:
        return (
            httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=2.0).status_code
            == 200
        )
    except httpx.HTTPError:
        return False


pytestmark = pytest.mark.skipif(not _ollama_reachable(), reason="Ollama not reachable")

TEST_MODEL = "qwen2.5-coder:7b"


def _write_buggy_repo(tmp_path: Path) -> None:
    (tmp_path / "calc.py").write_text("def add(a, b):\n    return a - b\n")
    (tmp_path / "test_calc.py").write_text(
        "from calc import add\n\n\ndef test_add():\n    assert add(2, 3) == 5\n"
    )


def _initial_state(tmp_path: Path) -> dict:
    return {
        "task": "Fix the bug in calc.py: add(a,b) should return a+b, not a-b.",
        "project_id": 0,
        "user_id": 0,
        "workspace_path": str(tmp_path),
        "model": TEST_MODEL,
        "repair_attempts": 0,
    }


def test_graph_pauses_at_human_approval_with_the_plan(tmp_path: Path):
    _write_buggy_repo(tmp_path)
    graph = compile_graph()
    config = {"configurable": {"thread_id": "test-m4-pause"}, "recursion_limit": 50}

    interrupted_payload = None
    for mode, payload in graph.stream(
        _initial_state(tmp_path), config, stream_mode=["updates"]
    ):
        if mode == "updates" and "__interrupt__" in payload:
            interrupted_payload = payload["__interrupt__"][0].value

    assert interrupted_payload is not None
    assert "plan" in interrupted_payload
    assert interrupted_payload["plan"]["steps"]  # a real, non-empty plan

    state = graph.get_state(config)
    assert state.next == ("human_approval",)  # paused exactly here, nowhere else


def test_reject_ends_the_run_without_touching_files(tmp_path: Path):
    _write_buggy_repo(tmp_path)
    original = (tmp_path / "calc.py").read_text()

    graph = compile_graph()
    config = {"configurable": {"thread_id": "test-m4-reject"}, "recursion_limit": 50}

    for _ in graph.stream(_initial_state(tmp_path), config, stream_mode=["updates"]):
        pass  # run to the interrupt

    # A brand-new compiled graph object — nothing but the Postgres checkpoint
    # ties this call to the one above. This is the cross-request scenario.
    resumed_graph = compile_graph()
    events = list(
        resumed_graph.stream(
            Command(resume={"approved": False}), config, stream_mode=["updates"]
        )
    )

    assert events == [
        ("updates", {"human_approval": {"approved": False, "plan_feedback": None}})
    ]
    assert (tmp_path / "calc.py").read_text() == original  # coder never ran
    final = resumed_graph.get_state(config)
    assert final.next == ()  # graph reached END, not stuck or looping


def test_approve_resumes_into_the_coder(tmp_path: Path):
    _write_buggy_repo(tmp_path)
    graph = compile_graph()
    config = {"configurable": {"thread_id": "test-m4-approve"}, "recursion_limit": 50}

    for _ in graph.stream(_initial_state(tmp_path), config, stream_mode=["updates"]):
        pass  # run to the interrupt

    resumed_graph = compile_graph()
    nodes_reached = []
    for mode, payload in resumed_graph.stream(
        Command(resume={"approved": True}), config, stream_mode=["updates"]
    ):
        if mode == "updates":
            nodes_reached.extend(payload.keys())

    # Approval routed to coder (and on through the pipeline) — this is the
    # mechanism under test, independent of whether the 7B model's fix works.
    assert "coder" in nodes_reached
    assert "human_approval" in nodes_reached


def test_reject_with_feedback_loops_back_to_planner(tmp_path: Path):
    """Rejecting *with* feedback text should revise the plan and re-pause
    for approval again — not end the run like a plain reject does."""
    _write_buggy_repo(tmp_path)
    graph = compile_graph()
    config = {"configurable": {"thread_id": "test-m4-revise"}, "recursion_limit": 50}

    for _ in graph.stream(_initial_state(tmp_path), config, stream_mode=["updates"]):
        pass  # run to the first interrupt

    resumed_graph = compile_graph()
    nodes_reached = []
    interrupted_again = False
    for mode, payload in resumed_graph.stream(
        Command(resume={"approved": False, "feedback": "Use a different approach."}),
        config,
        stream_mode=["updates"],
    ):
        if mode == "updates" and "__interrupt__" in payload:
            interrupted_again = True
            break
        if mode == "updates":
            nodes_reached.extend(payload.keys())

    assert "planner" in nodes_reached  # revised, not just ended
    assert "coder" not in nodes_reached  # never proceeded without approval
    assert interrupted_again  # paused again for the revised plan
    assert resumed_graph.get_state(config).next == ("human_approval",)
