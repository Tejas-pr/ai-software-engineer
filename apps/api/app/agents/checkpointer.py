# apps/api/app/agents/checkpointer.py
"""
The Postgres-backed checkpointer — this is what actually makes the human
approval interrupt (M4) work. `interrupt()` pauses graph execution and
raises control back to the caller; resuming later means whichever process
picks it up needs to see the exact same paused state. A checkpointer that
only lives in one Python process's memory (`MemorySaver`, used through M3)
can't do that — the HTTP request that hits the interrupt ends, and the
approval click is a *separate* request, possibly served by a different
thread or even after a server restart. Persisting checkpoints to the same
Postgres instance everything else already uses is what bridges that gap.

One pool, one `PostgresSaver`, created once at import time (same pattern as
`app/db.py`'s module-level `engine`) and reused by every graph run.
"""

from functools import lru_cache

from langgraph.checkpoint.postgres import PostgresSaver
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import settings

# LangGraph's checkpointer wants a plain psycopg DSN; SQLAlchemy's
# `DATABASE_URL` carries a `+psycopg` driver suffix psycopg itself doesn't
# understand.
_PG_DSN = settings.DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")


@lru_cache(maxsize=1)
def get_checkpointer() -> PostgresSaver:
    pool = ConnectionPool(
        conninfo=_PG_DSN,
        max_size=5,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
        open=True,
    )
    # mypy can't infer the pool's row type from the `row_factory` kwarg
    # buried in `kwargs=`; runtime-correct (verified: checkpoints round-trip).
    checkpointer = PostgresSaver(pool)  # type: ignore[arg-type]
    checkpointer.setup()  # idempotent: creates its tables if they don't exist yet
    return checkpointer
