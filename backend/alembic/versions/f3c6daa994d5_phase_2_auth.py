"""Phase 2 Auth

Revision ID: f3c6daa994d5
Revises: 20260525_0001
Create Date: 2026-05-25 04:30:08.493219
"""

from alembic import op
import sqlalchemy as sa



revision = 'f3c6daa994d5'
down_revision = '20260525_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE roleenum AS ENUM ('USER', 'ADMIN')")
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('USER', 'ADMIN', name='roleenum'), nullable=False),
        sa.Column('avatar_url', sa.String(length=512), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    op.create_table(
        'user_stats',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('total_solved', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('easy_solved', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('medium_solved', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('hard_solved', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('total_score', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('current_streak', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('best_streak', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('last_active_date', sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )


def downgrade() -> None:
    op.drop_table('user_stats')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.execute("DROP TYPE roleenum")
