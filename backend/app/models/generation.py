"""
SQLAlchemy models for image generations and history.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base


class Generation(Base):
    """Image generation record."""
    __tablename__ = "generations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Generation data
    preset_id = Column(Integer, ForeignKey("marketplace_listings.id"), nullable=True)
    fibo_json = Column(JSON, nullable=True)  # FIBO configuration JSON
    image_url = Column(String(1024), nullable=True)
    thumbnail_url = Column(String(1024), nullable=True)
    
    # Metadata
    prompt = Column(Text, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    credits_used = Column(Integer, default=1, nullable=False)
    
    # Status
    status = Column(String(50), default="pending", nullable=False)  # pending|processing|completed|failed
    error_message = Column(Text, nullable=True)
    
    # Marketplace attribution
    used_preset_name = Column(String(255), nullable=True)  # Name of preset used
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), index=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="generations")


class Preset(Base):
    """User-created lighting presets (can be published to marketplace)."""
    __tablename__ = "presets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    fibo_json = Column(JSON, nullable=False)  # FIBO configuration
    thumbnail_url = Column(String(1024), nullable=True)
    
    # Visibility
    is_public = Column(Boolean, default=False, nullable=False)
    is_marketplace_listing = Column(Boolean, default=False, nullable=False)  # Published to marketplace
    
    # Usage stats
    usage_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

