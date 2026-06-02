import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class SubmissionStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    ACCEPTED = "ACCEPTED"
    SAMPLE_PASSED = "SAMPLE_PASSED"
    WRONG_ANSWER = "WRONG_ANSWER"
    TIME_LIMIT = "TIME_LIMIT"
    RUNTIME_ERROR = "RUNTIME_ERROR"
    COMPILE_ERROR = "COMPILE_ERROR"
    MEMORY_LIMIT = "MEMORY_LIMIT"


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(20), nullable=False)
    source_code = Column(Text, nullable=False)
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.PENDING, nullable=False)
    passed_count = Column(Integer, default=0, nullable=False)
    total_count = Column(Integer, default=0, nullable=False)
    passed_weight = Column(Integer, default=0, nullable=False)
    total_weight = Column(Integer, default=0, nullable=False)
    score = Column(Integer, default=0, nullable=False)
    runtime_ms = Column(Integer, nullable=True)
    memory_kb = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    run_samples_only = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    results = relationship("SubmissionResult", back_populates="submission", cascade="all, delete-orphan")
    problem = relationship("Problem", lazy="selectin")

    @property
    def problem_slug(self) -> str | None:
        return self.problem.slug if self.problem else None

    @property
    def problem_title(self) -> str | None:
        return self.problem.title if self.problem else None

    __table_args__ = (
        Index('idx_submissions_user_problem', 'user_id', 'problem_id'),
        Index('idx_submissions_problem_status', 'problem_id', 'status'),
        # Note: partial index for qualifying submissions cannot be fully expressed in declarative easily without dialect-specific constructs,
        # but we can add the generic ones.
    )
