# apps/api/app/models/user_resource_limit.py
from sqlmodel import Field

from app.models.base import TimestampModel


class UserResourceLimit(TimestampModel, table=True):
    """User-configured hardware limits and guardrails for local Ollama and
    agent execution."""

    __tablename__ = "user_resource_limits"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)

    # Local Ollama / Hardware acceleration limits
    ollama_num_gpu: int = Field(default=99)  # 0 = CPU only, 99 = full GPU offload
    ollama_num_thread: int = Field(default=8)  # generation thread pool
    ollama_vram_budget_gb: float = Field(default=16.0)
    ollama_keep_alive: str = Field(default="30m")

    # Token & Context limits
    max_context_window: int = Field(default=32768)
    max_tokens_per_run: int = Field(default=100000)

    # Execution limits
    max_run_timeout_seconds: int = Field(default=600)
    max_concurrent_runs: int = Field(default=2)

    # Storage limits
    workspace_storage_limit_gb: float = Field(default=20.0)
    auto_prune_workspaces: bool = Field(default=True)
