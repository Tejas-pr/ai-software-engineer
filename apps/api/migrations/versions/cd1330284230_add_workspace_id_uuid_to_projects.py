"""add workspace_id uuid to projects

Revision ID: cd1330284230
Revises: e1e32f449207
Create Date: 2026-08-24 12:01:10.423006

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'cd1330284230'
down_revision: Union[str, Sequence[str], None] = 'e1e32f449207'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# NOTE: autogenerate also proposed dropping checkpoints/checkpoint_blobs/
# checkpoint_writes/checkpoint_migrations — LangGraph's own tables (see
# app/agents/checkpointer.py), intentionally outside SQLModel.metadata.
# Stripped that out, same as migration f3e4d2f21f86/b0ea2f1959f6.


def upgrade() -> None:
    """Upgrade schema."""
    # server_default so existing project rows (which predate this column)
    # get a real, unique UUID immediately instead of violating the
    # following NOT NULL — gen_random_uuid() is built into Postgres core
    # (13+), no extension needed.
    op.add_column(
        'projects',
        sa.Column(
            'workspace_id',
            sa.Uuid(),
            nullable=False,
            server_default=sa.text('gen_random_uuid()'),
        ),
    )
    op.create_index(
        op.f('ix_projects_workspace_id'), 'projects', ['workspace_id'], unique=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_projects_workspace_id'), table_name='projects')
    op.drop_column('projects', 'workspace_id')
