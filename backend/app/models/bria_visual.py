"""
SQLAlchemy model for Bria Image Onboarding visual_id storage.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.db import Base


class BriaVisual(Base):
    """
    Stores mappings between visual_id (from Bria Image Onboarding API)
    and original image sources.
    """
    __tablename__ = "bria_visuals"
    
    id = Column(Integer, primary_key=True, index=True)
    visual_id = Column(String(100), unique=True, nullable=False, index=True)
    source = Column(String(50), nullable=False)  # 's3', 'url', 'org_key'
    
    # Image source information
    image_url = Column(Text, nullable=True)  # Public URL used at registration
    org_image_key = Column(String(500), nullable=True)  # Internal image ID
    s3_key = Column(String(500), nullable=True)  # S3 object key if uploaded to S3
    
    # Metadata
    is_private = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expire_at = Column(DateTime(timezone=True), nullable=True)  # Optional expiry
    removed = Column(Boolean, default=False, nullable=False)
    removed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Additional metadata (JSON field for flexibility)
    metadata = Column(JSON, nullable=True)
