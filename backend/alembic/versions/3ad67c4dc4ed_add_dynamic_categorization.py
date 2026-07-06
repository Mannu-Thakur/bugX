"""add_dynamic_categorization

Revision ID: 3ad67c4dc4ed
Revises: c3d4e5f6a7b8
Create Date: 2026-07-04 10:31:29.775878
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '3ad67c4dc4ed'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create Companies table
    op.create_table(
        'companies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('logo_light', sa.String(length=512), nullable=True),
        sa.Column('logo_dark', sa.String(length=512), nullable=True),
        sa.Column('brand_color', sa.String(length=20), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_companies_slug', 'companies', ['slug'], unique=True)

    # 2. Create Topics table
    op.create_table(
        'topics',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_topics_slug', 'topics', ['slug'], unique=True)

    # 3. Create problem_companies association table
    op.create_table(
        'problem_companies',
        sa.Column('problem_id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('problem_id', 'company_id')
    )
    op.create_index('ix_problem_companies_problem_id', 'problem_companies', ['problem_id'], unique=False)
    op.create_index('ix_problem_companies_company_id', 'problem_companies', ['company_id'], unique=False)

    # 4. Create problem_topics association table
    op.create_table(
        'problem_topics',
        sa.Column('problem_id', sa.UUID(), nullable=False),
        sa.Column('topic_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('problem_id', 'topic_id')
    )
    op.create_index('ix_problem_topics_problem_id', 'problem_topics', ['problem_id'], unique=False)
    op.create_index('ix_problem_topics_topic_id', 'problem_topics', ['topic_id'], unique=False)

    # 5. Create Bookmarks table
    op.create_table(
        'bookmarks',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('problem_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'problem_id', name='uq_bookmark_user_problem')
    )
    op.create_index('idx_bookmark_user_id', 'bookmarks', ['user_id'], unique=False)
    op.create_index('idx_bookmark_problem_id', 'bookmarks', ['problem_id'], unique=False)

    # 6. Create UserProblemProgress table
    op.create_table(
        'user_problem_progress',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('problem_id', sa.UUID(), nullable=False),
        sa.Column('solved', sa.Boolean(), nullable=False),
        sa.Column('solved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('attempt_count', sa.Integer(), nullable=False),
        sa.Column('best_submission_id', sa.UUID(), nullable=True),
        sa.Column('best_score', sa.Integer(), nullable=False),
        sa.Column('last_attempted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['best_submission_id'], ['submissions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'problem_id', name='uq_user_problem_progress')
    )
    op.create_index('idx_user_progress_user_id', 'user_problem_progress', ['user_id'], unique=False)
    op.create_index('idx_user_progress_problem_id', 'user_problem_progress', ['problem_id'], unique=False)

    # 7. Alter problem_aliases
    op.alter_column('problem_aliases', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.alter_column('problem_aliases', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)

    # 8. Alter problems (add source, external_problem_id, updated_at, last_synced_at)
    op.add_column('problems', sa.Column('source', sa.String(length=100), nullable=True))
    op.add_column('problems', sa.Column('external_problem_id', sa.String(length=200), nullable=True))
    op.add_column('problems', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('problems', sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True))
    op.drop_constraint('problems_slug_key', 'problems', type_='unique')
    op.create_index(op.f('ix_problems_created_at'), 'problems', ['created_at'], unique=False)
    op.create_index(op.f('ix_problems_difficulty'), 'problems', ['difficulty'], unique=False)
    op.create_index(op.f('ix_problems_slug'), 'problems', ['slug'], unique=True)
    op.create_index(op.f('ix_problems_source'), 'problems', ['source'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_problems_source'), table_name='problems')
    op.drop_index(op.f('ix_problems_slug'), table_name='problems')
    op.drop_index(op.f('ix_problems_difficulty'), table_name='problems')
    op.drop_index(op.f('ix_problems_created_at'), table_name='problems')
    op.create_unique_constraint('problems_slug_key', 'problems', ['slug'])
    op.drop_column('problems', 'last_synced_at')
    op.drop_column('problems', 'updated_at')
    op.drop_column('problems', 'external_problem_id')
    op.drop_column('problems', 'source')

    op.alter_column('problem_aliases', 'updated_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('problem_aliases', 'created_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)

    op.drop_index('idx_user_progress_problem_id', table_name='user_problem_progress')
    op.drop_index('idx_user_progress_user_id', table_name='user_problem_progress')
    op.drop_table('user_problem_progress')

    op.drop_index('idx_bookmark_problem_id', table_name='bookmarks')
    op.drop_index('idx_bookmark_user_id', table_name='bookmarks')
    op.drop_table('bookmarks')

    op.drop_index('ix_problem_topics_topic_id', table_name='problem_topics')
    op.drop_index('ix_problem_topics_problem_id', table_name='problem_topics')
    op.drop_table('problem_topics')

    op.drop_index('ix_problem_companies_company_id', table_name='problem_companies')
    op.drop_index('ix_problem_companies_problem_id', table_name='problem_companies')
    op.drop_table('problem_companies')

    op.drop_index('ix_topics_slug', table_name='topics')
    op.drop_table('topics')

    op.drop_index('ix_companies_slug', table_name='companies')
    op.drop_table('companies')

