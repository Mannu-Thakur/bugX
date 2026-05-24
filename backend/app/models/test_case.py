import uuid
from sqlalchemy import Column, Text, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class TestCase(Base):
    __tablename__ = "test_cases"
    __table_args__ = (UniqueConstraint("problem_id", "order_index", name="uq_test_cases_problem_order"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=False, index=True)
    input = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, nullable=False, default=False)
    order_index = Column(Integer, nullable=False)
    weight = Column(Integer, nullable=False, default=1)

    problem = relationship("Problem", back_populates="test_cases")
