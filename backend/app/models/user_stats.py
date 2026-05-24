from sqlalchemy import Column, Date, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserStats(Base):
    __tablename__ = "user_stats"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    total_solved = Column(Integer, default=0, nullable=False)
    easy_solved = Column(Integer, default=0, nullable=False)
    medium_solved = Column(Integer, default=0, nullable=False)
    hard_solved = Column(Integer, default=0, nullable=False)
    total_score = Column(Integer, default=0, nullable=False)
    current_streak = Column(Integer, default=0, nullable=False)
    best_streak = Column(Integer, default=0, nullable=False)
    last_active_date = Column(Date, nullable=True)

    user = relationship("User", back_populates="stats")
