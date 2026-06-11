import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class BattlePlayer(Base):
    __tablename__ = "battle_players"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    battle_id = Column(UUID(as_uuid=True), ForeignKey("battles.id", ondelete="CASCADE"), nullable=False, index=True)
    player_index = Column(Integer, nullable=False)  # 0-based ordering
    username = Column(String(50), nullable=False)

    is_active = Column(Boolean, nullable=False, default=False)
    last_active = Column(DateTime(timezone=True), nullable=True)
    score = Column(Integer, nullable=False, default=0)
    solved = Column(Boolean, nullable=False, default=False)
    solved_at = Column(DateTime(timezone=True), nullable=True)
    attempts = Column(Integer, nullable=False, default=0)
    code = Column(Text, nullable=True)
    lang = Column(String(20), nullable=False, default="cpp")
