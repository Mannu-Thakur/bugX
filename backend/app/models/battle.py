import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Battle(Base):
    __tablename__ = "battles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    host_username = Column(String(50), nullable=False)
    max_players = Column(Integer, nullable=False, default=2)

    time_limit = Column(Integer, nullable=False, default=15)
    problem_source = Column(String(20), nullable=False, default="catalog")
    selected_slug = Column(String(100), nullable=True)
    custom_problem = Column(Text, nullable=True)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id", ondelete="SET NULL"), nullable=True)
    selected_slugs = Column(Text, nullable=True)
    custom_problems = Column(Text, nullable=True)
    problem_ids = Column(Text, nullable=True)

    status = Column(String(20), nullable=False, default="pending")
    start_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    players = relationship("BattlePlayer", backref="battle", lazy="selectin", cascade="all, delete-orphan", order_by="BattlePlayer.player_index")
    problem = relationship("Problem", lazy="selectin")


class BattleHistory(Base):
    __tablename__ = "battle_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    battle_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    problem_title = Column(String(200), nullable=True)
    participants = Column(Text, nullable=True)  # JSON-serialized list of usernames
    winner = Column(String(50), nullable=True)   # Winner username, or "Tie Match"
    final_scores = Column(Text, nullable=True)   # JSON-serialized dict (username -> score)
    problems_solved = Column(Text, nullable=True) # JSON-serialized dict (username -> solved bool)
    points_earned = Column(Text, nullable=True)   # JSON-serialized dict (username -> points earned)
    attempts = Column(Text, nullable=True)        # JSON-serialized dict (username -> attempts)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Integer, nullable=True)     # in seconds
    status = Column(String(20), nullable=False, default="finished")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
