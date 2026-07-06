import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    logo_light = Column(String(512), nullable=True)
    logo_dark = Column(String(512), nullable=True)
    brand_color = Column(String(20), nullable=True)

    problems = relationship("Problem", secondary="problem_companies", back_populates="companies")
