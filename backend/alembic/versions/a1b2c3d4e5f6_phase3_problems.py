"""Phase 3 — Problems, Tags, Templates, Test Cases

Revision ID: a1b2c3d4e5f6
Revises: f3c6daa994d5
Create Date: 2026-05-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'f3c6daa994d5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enums
    op.execute("CREATE TYPE difficulty_enum AS ENUM ('EASY', 'MEDIUM', 'HARD')")
    op.execute("CREATE TYPE arg_style_enum AS ENUM ('kwargs', 'positional', 'single')")

    # Tags
    op.create_table(
        'tags',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )

    # Problems
    op.create_table(
        'problems',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('difficulty', sa.Enum('EASY', 'MEDIUM', 'HARD', name='difficulty_enum', create_type=False), nullable=False),
        sa.Column('time_limit_ms', sa.Integer(), nullable=False, server_default=sa.text('2000')),
        sa.Column('memory_limit_kb', sa.Integer(), nullable=False, server_default=sa.text('262144')),
        sa.Column('score_base', sa.Integer(), nullable=False, server_default=sa.text('100')),
        sa.Column('runtime_bonus_max', sa.Integer(), nullable=False, server_default=sa.text('20')),
        sa.Column('expected_complexity', sa.String(length=20), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('acceptance_rate', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )

    # Problem ↔ Tag join table
    op.create_table(
        'problem_tags',
        sa.Column('problem_id', sa.UUID(), nullable=False),
        sa.Column('tag_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id']),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id']),
        sa.PrimaryKeyConstraint('problem_id', 'tag_id'),
    )

    # Problem Templates
    op.create_table(
        'problem_templates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('problem_id', sa.UUID(), nullable=False),
        sa.Column('language', sa.String(length=20), nullable=False),
        sa.Column('template_code', sa.Text(), nullable=False),
        sa.Column('function_name', sa.String(length=100), nullable=False),
        sa.Column('arg_style', sa.Enum('kwargs', 'positional', 'single', name='arg_style_enum', create_type=False), nullable=False),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('problem_id', 'language', name='uq_problem_template_lang'),
    )

    # Test Cases
    op.create_table(
        'test_cases',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('problem_id', sa.UUID(), nullable=False),
        sa.Column('input', sa.Text(), nullable=False),
        sa.Column('expected_output', sa.Text(), nullable=False),
        sa.Column('is_sample', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('weight', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('problem_id', 'order_index', name='uq_test_cases_problem_order'),
    )
    op.create_index('ix_test_cases_problem_id', 'test_cases', ['problem_id'])


def downgrade() -> None:
    op.drop_index('ix_test_cases_problem_id', table_name='test_cases')
    op.drop_table('test_cases')
    op.drop_table('problem_templates')
    op.drop_table('problem_tags')
    op.drop_table('problems')
    op.drop_table('tags')
    op.execute("DROP TYPE arg_style_enum")
    op.execute("DROP TYPE difficulty_enum")
