"""add skip_tests to agent_runs and user_api_keys table

Revision ID: b0ea2f1959f6
Revises: f3e4d2f21f86
Create Date: 2026-08-22 09:24:44.547126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'b0ea2f1959f6'
down_revision: Union[str, Sequence[str], None] = 'f3e4d2f21f86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# NOTE: autogenerate also proposed dropping checkpoints/checkpoint_blobs/
# checkpoint_writes/checkpoint_migrations — LangGraph's own tables (see
# app/agents/checkpointer.py), intentionally outside SQLModel.metadata.
# Stripped that out, same as migration f3e4d2f21f86.


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'user_api_keys',
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('provider', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('encrypted_key', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'provider'),
    )
    op.create_index(
        op.f('ix_user_api_keys_provider'), 'user_api_keys', ['provider'], unique=False
    )
    op.create_index(
        op.f('ix_user_api_keys_user_id'), 'user_api_keys', ['user_id'], unique=False
    )
    # server_default so existing agent_runs rows don't break the NOT NULL add.
    op.add_column(
        'agent_runs',
        sa.Column('skip_tests', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('agent_runs', 'skip_tests')
    op.drop_index(op.f('ix_user_api_keys_user_id'), table_name='user_api_keys')
    op.drop_index(op.f('ix_user_api_keys_provider'), table_name='user_api_keys')
    op.drop_table('user_api_keys')
