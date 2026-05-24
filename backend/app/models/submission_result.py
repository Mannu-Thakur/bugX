import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class SubmissionResult(Base):
    __tablename__ = "submission_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    test_case_id = Column(UUID(as_uuid=True), ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    passed = Column(Boolean, nullable=False)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    runtime_ms = Column(Integer, nullable=False)
    memory_kb = Column(Integer, nullable=False)

    submission = relationship("Submission", back_populates="results")

    __table_args__ = (
        UniqueConstraint('submission_id', 'test_case_id', name='uq_submission_results_submission_test'),
    )
