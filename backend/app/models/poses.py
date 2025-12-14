# backend/app/models/poses.py
"""
SQLAlchemy models for photographer poses.
"""
from sqlalchemy import Column, Integer, String, JSON, TIMESTAMP, func
from app.db import Base

class PhotographerPose(Base):
    __tablename__ = "poses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    camera_json = Column(JSON, nullable=False)  # store camera state
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    owner_id = Column(String(100), nullable=True)  # optional user id
