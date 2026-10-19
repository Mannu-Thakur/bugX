"""add authoritative battle forfeit state

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-10-19 00:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "h8i9j0k1l2m3"
down_revision = "g7h8i9j0k1l2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "battle_players",
        sa.Column("forfeited", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("battle_players", "forfeited")
