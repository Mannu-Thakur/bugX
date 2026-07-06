import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Boolean, Float, DateTime, Enum, ForeignKey, Index, Table, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class DifficultyEnum(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"

DIFFICULTY_POINTS = {
    "EASY": 3,
    "MEDIUM": 6,
    "HARD": 10
}


problem_tags = Table(
    "problem_tags",
    Base.metadata,
    Column("problem_id", UUID(as_uuid=True), ForeignKey("problems.id"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id"), primary_key=True),
)

user_problems = Table(
    "user_problems",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("problem_id", UUID(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
)

problem_companies = Table(
    "problem_companies",
    Base.metadata,
    Column("problem_id", UUID(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True, index=True),
    Column("company_id", UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True, index=True),
)

problem_topics = Table(
    "problem_topics",
    Base.metadata,
    Column("problem_id", UUID(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True, index=True),
    Column("topic_id", UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True, index=True),
)

class Problem(Base):
    __tablename__ = "problems"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(Enum(DifficultyEnum, name="difficulty_enum", create_type=False), nullable=False, index=True)
    time_limit_ms = Column(Integer, nullable=False, default=2000)
    memory_limit_kb = Column(Integer, nullable=False, default=262144)
    score_base = Column(Integer, nullable=False, default=100)
    runtime_bonus_max = Column(Integer, nullable=False, default=20)
    expected_complexity = Column(String(20), nullable=True)
    is_published = Column(Boolean, nullable=False, default=False)
    is_public = Column(Boolean, nullable=False, default=True, server_default=text('true'))
    acceptance_rate = Column(Float, nullable=True)
    hints = Column(Text, nullable=True)
    comparison_mode = Column(String(50), nullable=False, default="strict", server_default="strict")
    source = Column(String(100), nullable=True, default="local", index=True)
    external_problem_id = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=True, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_synced_at = Column(DateTime(timezone=True), nullable=True)

    tags = relationship("Tag", secondary=problem_tags, lazy="selectin")
    templates = relationship("ProblemTemplate", back_populates="problem", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan", order_by="TestCase.order_index")
    companies = relationship("Company", secondary=problem_companies, back_populates="problems", lazy="selectin")
    topics = relationship("Topic", secondary=problem_topics, back_populates="problems", lazy="selectin")

    @property
    def points(self) -> int:
        diff_str = self.difficulty.value if hasattr(self.difficulty, "value") else str(self.difficulty)
        return DIFFICULTY_POINTS.get(diff_str.upper(), 3)

