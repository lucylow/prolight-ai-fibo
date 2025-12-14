# app/models/run.py
from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db import Base

class Run(Base):
    __tablename__ = "runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=True)
    creator_id = Column(UUID(as_uuid=True), nullable=True)
    intent = Column(String, nullable=False)   # e.g., "product_shot_edit"
    input = Column(JSON, nullable=True)       # original request payload
    plan = Column(JSON, nullable=True)        # planner output
    critique = Column(JSON, nullable=True)    # critic output
    exec_result = Column(JSON, nullable=True) # executor result
    state = Column(String, index=True, default="CREATED")  # CREATED, PLANNED, CRITIQUED, PROPOSED, EXECUTING, COMPLETED, FAILED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class Job(Base):
    __tablename__ = "jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id"), nullable=False, index=True)
    step = Column(String, nullable=False)           # planner, critic, executor.step_x
    op = Column(String, nullable=True)
    request_id = Column(String, nullable=True)      # bria request id if any
    status = Column(String, default="queued")       # queued, processing, completed, failed
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    result = Column(JSON, nullable=True)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Asset(Base):
    __tablename__ = "assets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id"), nullable=True, index=True)
    asset_id = Column(String, nullable=False, unique=True)   # bria asset id or s3 path
    source_url = Column(String, nullable=True)
    thumbnails = Column(JSON, nullable=True)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
