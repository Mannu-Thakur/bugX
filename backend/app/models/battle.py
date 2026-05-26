import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Battle(Base):
    __tablename__ = "battles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player1_username = Column(String(50), nullable=False)
    player2_username = Column(String(50), nullable=False)
    
    # Active statuses
    player1_active = Column(Boolean, nullable=False, default=False)
    player2_active = Column(Boolean, nullable=False, default=False)
    player1_last_active = Column(DateTime(timezone=True), nullable=True)
    player2_last_active = Column(DateTime(timezone=True), nullable=True)
    
    # Battle Configuration
    time_limit = Column(Integer, nullable=False, default=15)
    problem_source = Column(String(20), nullable=False, default="catalog")
    selected_slug = Column(String(100), nullable=True)
    custom_problem = Column(Text, nullable=True)  # JSON text representing CustomProblem
    
    # State synchronization
    p1_score = Column(Integer, nullable=False, default=0)
    p2_score = Column(Integer, nullable=False, default=0)
    p1_solved = Column(Boolean, nullable=False, default=False)
    p2_solved = Column(Boolean, nullable=False, default=False)
    p1_attempts = Column(Integer, nullable=False, default=0)
    p2_attempts = Column(Integer, nullable=False, default=0)
    p1_code = Column(Text, nullable=True)
    p2_code = Column(Text, nullable=True)
    p1_lang = Column(String(20), nullable=False, default="cpp")
    p2_lang = Column(String(20), nullable=False, default="cpp")
    
    status = Column(String(20), nullable=False, default="pending")  # pending, active, finished
    start_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
