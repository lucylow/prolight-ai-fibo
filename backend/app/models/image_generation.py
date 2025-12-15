"""
Database models for image generation jobs, artifacts, cache, and evaluations.
"""
from sqlalchemy import (
    Column, String, Text, DateTime, Integer, Float, Boolean,
    ForeignKey, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db import Base


class ImageJob(Base):
    """Tracks image generation jobs with prompt, seed, and model version."""
    __tablename__ = "image_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=True, index=True)
    request_id = Column(String(255), nullable=True, unique=True, index=True)
    run_id = Column(String(255), nullable=False, unique=True, index=True)
    prompt_text = Column(Text, nullable=True)
    prompt_hash = Column(String(64), nullable=False, index=True)  # SHA256 hex
    fibo_json = Column(JSON, nullable=True)
    model_version = Column(String(50), nullable=False, index=True)
    seed = Column(Integer, nullable=True, index=True)
    status = Column(String(50), nullable=False, default="queued", index=True)  # queued, processing, generating, evaluating, uploading, completed, failed, cancelled
    cost_cents = Column(Integer, nullable=True)
    cost_estimate_cents = Column(Integer, nullable=True)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    num_variants = Column(Integer, nullable=False, default=1)
    guidance_images = Column(JSON, nullable=True)  # [{url, role}]
    controlnet_config = Column(JSON, nullable=True)  # {name, weight, mask_url}
    refine_mode = Column(String(50), nullable=True)
    meta = Column(JSON, nullable=True)  # {tags, priority, user_id}
    sse_token = Column(String(255), nullable=True)
    cached_hit = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class Artifact(Base):
    """Stores generated image artifacts with URLs and metadata."""
    __tablename__ = "artifacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("image_jobs.id"), nullable=False, index=True)
    variant_index = Column(Integer, nullable=False, default=0)
    url = Column(String(1024), nullable=False)
    thumb_url = Column(String(1024), nullable=True)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    size_bytes = Column(Integer, nullable=True)
    mime = Column(String(100), nullable=True, default="image/png")
    meta = Column(JSON, nullable=True)  # {seed, model_version, generation_params}
    evaluator_score = Column(Float, nullable=True, index=True)  # Combined score
    semantic_score = Column(Float, nullable=True)  # CLIP similarity
    perceptual_score = Column(Float, nullable=True)  # LPIPS distance (lower is better)
    is_primary = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class PromptCache(Base):
    """Content-addressable cache for prompt hashes."""
    __tablename__ = "prompt_cache"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prompt_hash = Column(String(64), nullable=False, unique=True, index=True)
    model_version = Column(String(50), nullable=False, index=True)
    seed = Column(Integer, nullable=True, index=True)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    artifact_id = Column(UUID(as_uuid=True), ForeignKey("artifacts.id"), nullable=False)
    hit_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Composite index for fast lookups
    __table_args__ = (
        Index('idx_prompt_cache_lookup', 'prompt_hash', 'model_version', 'seed', 'width', 'height'),
    )


class Evaluation(Base):
    """Stores CLIP embeddings and LPIPS scores for artifacts."""
    __tablename__ = "evaluations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    artifact_id = Column(UUID(as_uuid=True), ForeignKey("artifacts.id"), nullable=False, unique=True, index=True)
    clip_embedding = Column(JSON, nullable=True)  # Vector stored as JSON array
    lpips_value = Column(Float, nullable=True)
    semantic_score = Column(Float, nullable=True, index=True)
    perceptual_score = Column(Float, nullable=True, index=True)
    reference_artifact_id = Column(UUID(as_uuid=True), ForeignKey("artifacts.id"), nullable=True)  # For comparison
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

