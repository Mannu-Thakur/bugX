"""Add user_problems and is_public column

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop user_problems if it already exists to prevent duplicate table error
    op.execute("DROP TABLE IF EXISTS user_problems")

    # Add is_public column to problems table, defaulting to true
    op.add_column(
        'problems',
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.text('true'))
    )

    # Create user_problems association table
    op.create_table(
        'user_problems',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('problem_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'problem_id')
    )


def downgrade() -> None:
    op.drop_table('user_problems')
    op.drop_column('problems', 'is_public')
