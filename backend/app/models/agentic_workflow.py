"""
Database models for agentic workflow orchestration.
Defines tables for runs, jobs, assets, and usage tracking.
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Float, Boolean, 
    ForeignKey, JSON, Enum as SQLEnum
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class RunState(str, enum.Enum):
    """Run state enumeration."""
    CREATED = "created"
    PLANNING = "planning"
    PLANNED = "planned"
    CRITIQUING = "critiquing"
    PROPOSED = "proposed"  # HITL required
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobState(str, enum.Enum):
    """Job state enumeration."""
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobOperation(str, enum.Enum):
    """Job operation types."""
    IMAGE_ONBOARD = "image_onboard"
    IMAGE_EDIT = "image_edit"
    IMAGE_GENERATE = "image_generate"
    VIDEO_EDIT = "video_edit"
    TAILORED_GENERATE = "tailored_generate"
    ADS_GENERATE = "ads_generate"
    PRODUCT_SHOT_EDIT = "product_shot_edit"
    STATUS_POLL = "status_poll"


class Run(Base):
    """Run record - represents a complete agentic workflow execution."""
    __tablename__ = "runs"
    
    id = Column(String(36), primary_key=True)  # UUID
    tenant_id = Column(String(36), nullable=False, index=True)
    state = Column(SQLEnum(RunState), default=RunState.CREATED, nullable=False, index=True)
    
    # Intent and input
    intent = Column(String(200), nullable=False)  # e.g., "edit_product_shot", "generate_ads"
    input_asset_urls = Column(JSON)  # List of input asset URLs
    constraints = Column(JSON)  # User constraints (cost limits, formats, etc.)
    
    # Agent outputs
    plan_json = Column(JSON)  # Planner output
    critique_json = Column(JSON)  # Critic output
    exec_result_json = Column(JSON)  # Executor final result
    
    # Metadata
    metadata = Column(JSON)  # Additional metadata (human_approved, etc.)
    error_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime)
    
    # Relationships
    jobs = relationship("Job", back_populates="run", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="run", cascade="all, delete-orphan")
    usage_records = relationship("UsageRecord", back_populates="run", cascade="all, delete-orphan")


class Job(Base):
    """Job record - represents a single step in a run."""
    __tablename__ = "jobs"
    
    id = Column(String(36), primary_key=True)  # UUID
    run_id = Column(String(36), ForeignKey("runs.id"), nullable=False, index=True)
    parent_job_id = Column(String(36), ForeignKey("jobs.id"), nullable=True)  # For child jobs
    
    # Operation details
    op = Column(SQLEnum(JobOperation), nullable=False, index=True)
    state = Column(SQLEnum(JobState), default=JobState.PENDING, nullable=False, index=True)
    
    # Request tracking
    request_id = Column(String(200))  # Internal request ID
    bria_request_id = Column(String(200), index=True)  # Bria API request ID
    
    # Parameters and results
    params = Column(JSON)  # Operation parameters
    result = Column(JSON)  # Operation result
    error = Column(Text)
    
    # Progress tracking
    progress = Column(Integer, default=0)  # 0-100
    message = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    run = relationship("Run", back_populates="jobs")
    parent_job = relationship("Job", remote_side=[id], backref="child_jobs")


class Asset(Base):
    """Asset record - stores generated/processed assets."""
    __tablename__ = "assets"
    
    id = Column(String(36), primary_key=True)  # UUID
    run_id = Column(String(36), ForeignKey("runs.id"), nullable=False, index=True)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=True, index=True)
    
    # Asset details
    asset_id = Column(String(200))  # Bria asset ID (if onboarded)
    source_url = Column(String(1000))  # Original source URL
    output_url = Column(String(1000))  # Generated/processed output URL
    thumbnails = Column(JSON)  # Thumbnail URLs
    s3_path = Column(String(500))  # S3 storage path
    
    # Metadata
    metadata = Column(JSON)  # Asset metadata (tags, AOVs, etc.)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    run = relationship("Run", back_populates="assets")


class UsageRecord(Base):
    """Usage record - tracks billing and quota usage."""
    __tablename__ = "usage_records"
    
    id = Column(String(36), primary_key=True)  # UUID
    tenant_id = Column(String(36), nullable=False, index=True)
    run_id = Column(String(36), ForeignKey("runs.id"), nullable=True, index=True)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=True, index=True)
    
    # Usage details
    feature_key = Column(String(100), nullable=False, index=True)  # e.g., "image_generate", "video_edit"
    units = Column(Float, nullable=False)  # Usage units (credits, API calls, etc.)
    cost_usd = Column(Float, default=0.0)  # Cost in USD
    
    # Metadata
    metadata = Column(JSON)  # Additional usage metadata
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    run = relationship("Run", back_populates="usage_records")

