# apps/api/app/agents/catalog.py
"""What each agent in the graph is, for the public /agents page.

Tool names and limits are read from the code that actually runs (the tool
factories, graph.py's constants, settings), so the page can't drift from
the graph. The prose is the only hand-written part — keep it in step with
the node functions in graph.py.
"""

from pathlib import Path

from app.agents.graph import AGENT_LOOP_STEP_LIMIT, MAX_REPAIR_ATTEMPTS
from app.agents.tools import (
    AGENT_COMMAND_TIMEOUT,
    make_read_only_tools,
    make_search_codebase_tool,
    make_workspace_tools,
)
from app.config import settings


def _tool_names(tools: list) -> list[str]:
    return [t.name for t in tools]


def agent_catalog() -> list[dict]:
    # The factories only close over the path; nothing is touched on disk.
    placeholder = Path(".")
    read_only = _tool_names(make_read_only_tools(placeholder))
    read_write = _tool_names(make_workspace_tools(placeholder))
    rag = make_search_codebase_tool(0).name
    step_timeout = settings.AGENT_STEP_TIMEOUT_SECONDS

    return [
        {
            "id": "researcher",
            "name": "Researcher",
            "role": "Reads the repository and briefs the planner.",
            "description": (
                "Starts from the project's tech stack, parsed from its manifest "
                "files by code rather than guessed by the model, then explores "
                "the repo with read-only tools — listing, text search, reading "
                "files and semantic search over the indexed codebase — and "
                "writes a brief: structure, conventions, and exactly which "
                "files the task will touch. It cannot modify anything."
            ),
            "kind": "Tool-calling agent (ReAct loop)",
            "tools": [*read_only, rag],
            "limits": [
                f"{AGENT_LOOP_STEP_LIMIT} tool-loop steps",
                f"{step_timeout} s wall clock — on timeout it hands over what it has",
            ],
            "outputs": "Research notes and the detected tech stack",
        },
        {
            "id": "planner",
            "name": "Planner",
            "role": "Turns the brief into a concrete, minimal plan.",
            "description": (
                "One structured-output call: a summary, steps with the files "
                "each one touches, and a shell command that verifies the "
                "change. It must stay within the detected stack. When you ask "
                "for changes it revises its previous plan with your feedback."
            ),
            "kind": "Structured output (no tools)",
            "tools": [],
            "limits": ["Plan schema enforced: summary, steps, test_command"],
            "outputs": "A plan you approve, revise or reject",
        },
        {
            "id": "coder",
            "name": "Coder",
            "role": "Implements the approved plan in the real repository.",
            "description": (
                "Looks before it writes, then edits files in the project's "
                "isolated workspace and can run shell commands there. After "
                "it finishes the workspace must show a real diff — a model "
                "that only describes a change fails the step. On a test "
                "failure it is called again with the failing output."
            ),
            "kind": "Tool-calling agent (ReAct loop)",
            "tools": read_write,
            "limits": [
                f"{AGENT_LOOP_STEP_LIMIT} tool-loop steps",
                f"{step_timeout} s wall clock",
                f"{int(AGENT_COMMAND_TIMEOUT)} s per shell command",
                "File access confined to the project workspace; .env files refused",
            ],
            "outputs": "Changed files in the workspace",
        },
        {
            "id": "tester",
            "name": "Tester",
            "role": "Runs the plan's test command and judges the result.",
            "description": (
                "Executes the verification command inside the workspace and "
                "checks its exit code. A failure sends the work back to the "
                f"coder, up to {MAX_REPAIR_ATTEMPTS} repair attempts, before "
                "the run gives up honestly. Can be switched off per run."
            ),
            "kind": "Deterministic step (no LLM)",
            "tools": [],
            "limits": [
                f"{int(AGENT_COMMAND_TIMEOUT)} s per test run",
                f"{MAX_REPAIR_ATTEMPTS} repair attempts",
            ],
            "outputs": "Test output and pass / fail",
        },
        {
            "id": "reviewer",
            "name": "Reviewer",
            "role": "Summarises what happened for the pull request.",
            "description": (
                "Writes the review notes: which files changed, how many "
                "repair attempts it took, and — if the tests never passed — "
                "the failing output, so a failed run is reported rather than "
                "pushed."
            ),
            "kind": "Deterministic step (no LLM)",
            "tools": [],
            "limits": [],
            "outputs": "Review notes (also the PR description)",
        },
        {
            "id": "github",
            "name": "GitHub",
            "role": "Opens the pull request — only if the tests passed.",
            "description": (
                "Creates a fresh ai-agent/… branch, commits as “AI Software "
                "Engineer”, pushes with your GitHub token injected for that "
                "one command (never stored in the repo), and opens a pull "
                "request against the project's branch. Merging stays yours."
            ),
            "kind": "Deterministic step (git + GitHub API)",
            "tools": ["git branch / commit / push", "GitHub pull request API"],
            "limits": ["Skipped when tests did not pass"],
            "outputs": "A pull request URL",
        },
    ]


# The step between planner and coder that is a person, not an agent.
APPROVAL_STEP = {
    "id": "human_approval",
    "name": "You",
    "role": "Approve, revise or reject the plan before any code is written.",
}
