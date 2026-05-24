import uuid
import enum
from sqlalchemy import Column, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class ArgStyleEnum(str, enum.Enum):
    kwargs = "kwargs"
    positional = "positional"
    single = "single"

class ProblemTemplate(Base):
    __tablename__ = "problem_templates"
    __table_args__ = (UniqueConstraint("problem_id", "language", name="uq_problem_template_lang"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=False)
    language = Column(String(20), nullable=False)
    template_code = Column(Text, nullable=False)
    function_name = Column(String(100), nullable=False)
    arg_style = Column(Enum(ArgStyleEnum, name="arg_style_enum", create_type=False), nullable=False)

    problem = relationship("Problem", back_populates="templates")
