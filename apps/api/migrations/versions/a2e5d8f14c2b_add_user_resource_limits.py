"""add user_resource_limits table

Revision ID: a2e5d8f14c2b
Revises: 9a7c2e41d5b3
Create Date: 2026-10-24 19:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'a2e5d8f14c2b'
down_revision: Union[str, Sequence[str], None] = '9a7c2e41d5b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_resource_limits',
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('ollama_num_gpu', sa.Integer(), nullable=False, server_default='99'),
        sa.Column('ollama_num_thread', sa.Integer(), nullable=False, server_default='8'),
        sa.Column('ollama_vram_budget_gb', sa.Float(), nullable=False, server_default='16.0'),
        sa.Column('ollama_keep_alive', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='30m'),
        sa.Column('max_context_window', sa.Integer(), nullable=False, server_default='32768'),
        sa.Column('max_tokens_per_run', sa.Integer(), nullable=False, server_default='100000'),
        sa.Column('max_run_timeout_seconds', sa.Integer(), nullable=False, server_default='600'),
        sa.Column('max_concurrent_runs', sa.Integer(), nullable=False, server_default='2'),
        sa.Column('workspace_storage_limit_gb', sa.Float(), nullable=False, server_default='20.0'),
        sa.Column('auto_prune_workspaces', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_resource_limits_user_id'), 'user_resource_limits', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_resource_limits_user_id'), table_name='user_resource_limits')
    op.drop_table('user_resource_limits')

