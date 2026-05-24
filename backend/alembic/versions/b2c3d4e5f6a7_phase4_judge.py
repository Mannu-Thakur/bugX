"""Phase 4 — Submissions, Submission Results

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Submission status enum — includes SAMPLE_PASSED per spec
    op.execute(
        "CREATE TYPE submission_status AS ENUM ("
        "'PENDING', 'RUNNING', 'ACCEPTED', 'SAMPLE_PASSED', "
        "'WRONG_ANSWER', 'TIME_LIMIT', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'MEMORY_LIMIT')"
    )

    op.create_table(
        'submissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('problem_id', sa.UUID(), nullable=False),
        sa.Column('language', sa.String(length=20), nullable=False),
        sa.Column('source_code', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum(
            'PENDING', 'RUNNING', 'ACCEPTED', 'SAMPLE_PASSED',
            'WRONG_ANSWER', 'TIME_LIMIT', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'MEMORY_LIMIT',
            name='submission_status', create_type=False
        ), nullable=False, server_default='PENDING'),
        sa.Column('passed_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('total_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('passed_weight', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('total_weight', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('score', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('runtime_ms', sa.Integer(), nullable=True),
        sa.Column('memory_kb', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('run_samples_only', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_submissions_user_id', 'submissions', ['user_id'])
    op.create_index('ix_submissions_problem_id', 'submissions', ['problem_id'])
    op.create_index('ix_submissions_created_at', 'submissions', ['created_at'])
    op.create_index('idx_submissions_user_problem', 'submissions', ['user_id', 'problem_id'])
    op.create_index('idx_submissions_problem_status', 'submissions', ['problem_id', 'status'])

    op.create_table(
        'submission_results',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('submission_id', sa.UUID(), nullable=False),
        sa.Column('test_case_id', sa.UUID(), nullable=False),
        sa.Column('passed', sa.Boolean(), nullable=False),
        sa.Column('stdout', sa.Text(), nullable=True),
        sa.Column('stderr', sa.Text(), nullable=True),
        sa.Column('runtime_ms', sa.Integer(), nullable=False),
        sa.Column('memory_kb', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['test_case_id'], ['test_cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('submission_id', 'test_case_id', name='uq_submission_results_submission_test'),
    )


def downgrade() -> None:
    op.drop_table('submission_results')
    op.drop_index('idx_submissions_problem_status', table_name='submissions')
    op.drop_index('idx_submissions_user_problem', table_name='submissions')
    op.drop_index('ix_submissions_created_at', table_name='submissions')
    op.drop_index('ix_submissions_problem_id', table_name='submissions')
    op.drop_index('ix_submissions_user_id', table_name='submissions')
    op.drop_table('submissions')
    op.execute("DROP TYPE submission_status")
