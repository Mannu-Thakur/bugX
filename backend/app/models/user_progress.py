import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, ForeignKey, Boolean, Integer, DateTime, String, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserProblemProgress(Base):
    __tablename__ = "user_problem_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    solved = Column(Boolean, default=False, nullable=False)
    solved_at = Column(DateTime(timezone=True), nullable=True)
    attempt_count = Column(Integer, default=0, nullable=False)
    best_submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="SET NULL"), nullable=True)
    best_score = Column(Integer, default=0, nullable=False)
    last_attempted_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")
    problem = relationship("Problem")
    best_submission = relationship("Submission", foreign_keys=[best_submission_id])

    __table_args__ = (
        UniqueConstraint("user_id", "problem_id", name="uq_user_problem_progress"),
        Index("idx_user_progress_user_id", "user_id"),
        Index("idx_user_progress_problem_id", "problem_id"),
    )

class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")
    problem = relationship("Problem")

    __table_args__ = (
        UniqueConstraint("user_id", "problem_id", name="uq_bookmark_user_problem"),
        Index("idx_bookmark_user_id", "user_id"),
        Index("idx_bookmark_problem_id", "problem_id"),
    )
