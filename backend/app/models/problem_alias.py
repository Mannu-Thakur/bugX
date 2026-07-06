from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base

class ProblemAlias(Base):
    __tablename__ = "problem_aliases"

    id = Column(Integer, primary_key=True, index=True)
    normalized_query = Column(String(512), unique=True, index=True, nullable=False)
    canonical_slug = Column(String(256), nullable=False)
    source = Column(String(50), nullable=False)
    aliases = Column(Text, default="[]")  # JSON list of raw queries mapped here
    hit_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
