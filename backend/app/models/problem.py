import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Boolean, Float, DateTime, Enum, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class DifficultyEnum(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"

problem_tags = Table(
    "problem_tags",
    Base.metadata,
    Column("problem_id", UUID(as_uuid=True), ForeignKey("problems.id"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id"), primary_key=True),
)

class Problem(Base):
    __tablename__ = "problems"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(Enum(DifficultyEnum, name="difficulty_enum", create_type=False), nullable=False)
    time_limit_ms = Column(Integer, nullable=False, default=2000)
    memory_limit_kb = Column(Integer, nullable=False, default=262144)
    score_base = Column(Integer, nullable=False, default=100)
    runtime_bonus_max = Column(Integer, nullable=False, default=20)
    expected_complexity = Column(String(20), nullable=True)
    is_published = Column(Boolean, nullable=False, default=False)
    acceptance_rate = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    tags = relationship("Tag", secondary=problem_tags, lazy="selectin")
    templates = relationship("ProblemTemplate", back_populates="problem", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan", order_by="TestCase.order_index")
