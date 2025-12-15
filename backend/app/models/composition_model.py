# backend/app/models/composition_model.py
"""
SQLAlchemy model for composition suggestions.
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Text
from sqlalchemy.sql import func
from app.db import Base


class CompositionSuggestion(Base):
    __tablename__ = "composition_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), nullable=True, index=True)  # optional
    image_url = Column(Text, nullable=True)
    proposals = Column(JSON, nullable=False)  # JSON array of proposals
    selected = Column(JSON, nullable=True)  # selected crop details
    camera_adjustment = Column(JSON, nullable=True)  # camera adj returned by apply
    accepted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

