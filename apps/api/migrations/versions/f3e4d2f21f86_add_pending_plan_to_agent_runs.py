"""add pending_plan to agent_runs

Revision ID: f3e4d2f21f86
Revises: 6661ec770ad0
Create Date: 2026-08-22 08:01:59.386310

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f3e4d2f21f86'
down_revision: Union[str, Sequence[str], None] = '6661ec770ad0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# NOTE: autogenerate also proposed dropping checkpoints/checkpoint_blobs/
# checkpoint_writes/checkpoint_migrations — those are LangGraph's own
# tables, created and owned by PostgresSaver.setup() (app/agents/
# checkpointer.py), not by SQLModel/alembic. They're intentionally absent
# from SQLModel.metadata, so autogenerate always sees them as "extra" and
# wants to drop them. Stripped that out here; only the real schema change
# (agent_runs.pending_plan) is applied.


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('agent_runs', sa.Column('pending_plan', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('agent_runs', 'pending_plan')
