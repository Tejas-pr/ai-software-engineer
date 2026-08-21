"""
M3 smoke test: the full researcher -> planner -> coder -> tester -> reviewer
graph, run for real against a tiny broken repo, on a real LLM. This is the
single most important check in the whole project — it proves the agent can
actually read code, plan, edit a file, run tests, and (if needed) retry.

Slow and costs a few LLM calls on purpose. Skips without a configured model.
"""

from pathlib import Path

import pytest

from app.agents.graph import compile_graph
from app.config import settings

pytestmark = pytest.mark.skipif(
    not settings.GEMINI_API_KEY, reason="no LLM provider configured"
)

TEST_MODEL = "gemini-3.6-flash"


def test_graph_fixes_a_bug_and_passes_tests(tmp_path: Path):
    (tmp_path / "calc.py").write_text("def add(a, b):\n    return a - b\n")
    (tmp_path / "test_calc.py").write_text(
        "from calc import add\n\n\ndef test_add():\n    assert add(2, 3) == 5\n"
    )

    graph = compile_graph()
    config = {"configurable": {"thread_id": "test-m3-run"}, "recursion_limit": 50}

    final_state = graph.invoke(
        {
            "task": (
                "calc.py has a bug: add(a, b) returns a - b instead of a + b. "
                "Fix it so test_calc.py passes."
            ),
            "project_id": 0,
            "workspace_path": str(tmp_path),
            "model": TEST_MODEL,
            "repair_attempts": 0,
        },
        config,
    )

    assert final_state["test_passed"] is True
    assert "a + b" in (tmp_path / "calc.py").read_text() or "a+b" in (
        tmp_path / "calc.py"
    ).read_text().replace(" ", "")
    assert final_state["review_notes"]
