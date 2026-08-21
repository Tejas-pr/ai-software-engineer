# apps/api/app/agents/state.py
"""
The graph's shared state (BUILDER.md Phase 8's example state, filled in).

Each node reads what it needs and returns a partial dict of updates —
LangGraph merges that into the state (see `graph.py`'s node functions).
`TypedDict` rather than a Pydantic model because this is exactly what
LangGraph's checkpointer expects to serialize to Postgres between steps.

Notably *not* one big shared chat history across every agent: each node
(researcher, coder) runs its own short-lived `create_react_agent` tool loop
internally and reports back a short text/structured result. A single
conversation stretching across five agents with five different tool sets
would blow the context window and blur who's responsible for what — plain
handoffs between specialists, per BUILDER's multi-agent rationale.
"""

from typing import TypedDict

from pydantic import BaseModel, Field


class PlanStep(BaseModel):
    description: str = Field(..., description="One concrete implementation step")
    files: list[str] = Field(
        default_factory=list, description="Files this step is expected to touch"
    )


class Plan(BaseModel):
    """Structured output the `planner` node asks the LLM for directly —
    no parsing free text, `with_structured_output()` guarantees this shape."""

    summary: str = Field(..., description="One-paragraph summary of the approach")
    steps: list[PlanStep]
    test_command: str = Field(
        ...,
        description="Shell command that verifies the change, e.g. 'pytest' or 'npm test'",
    )


class AgentState(TypedDict, total=False):
    # Set by the caller when the run starts.
    task: str
    project_id: int
    user_id: int
    workspace_path: str
    model: str

    # Filled in as the graph progresses.
    research_notes: str
    plan: dict  # Plan.model_dump()
    files_changed: list[str]
    test_output: str
    test_passed: bool
    repair_attempts: int
    review_notes: str
    approved: bool  # set by the human-in-the-loop node, M4
    pr_url: str  # set by the github node, M5
