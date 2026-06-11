import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime
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

    status = Column(String(20), nullable=False, default="pending")
    start_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    players = relationship("BattlePlayer", backref="battle", lazy="selectin", cascade="all, delete-orphan", order_by="BattlePlayer.player_index")
