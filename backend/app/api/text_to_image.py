"""
Text-to-Image Generation API endpoints with deterministic generation,
caching, job queue, and SSE status updates.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, AsyncGenerator
from datetime import datetime
import uuid
import secrets
import logging
import json
import asyncio
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.image_generation import ImageJob, Artifact
from app.services.prompt_cache import compute_prompt_hash, lookup_cache, store_cache
from app.services.cost_estimator import estimate_cost
from app.clients.bria_client import BriaClient

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class GuidanceImage(BaseModel):
    """Guidance image configuration."""
    url: str = Field(..., description="URL of guidance image")
    role: str = Field("reference", description="Role: reference, style, texture")


class ControlNetConfig(BaseModel):
    """ControlNet configuration."""
    name: str = Field(..., description="ControlNet name (e.g., canny, depth, recoloring)")
    weight: float = Field(0.8, ge=0.0, le=1.0, description="ControlNet weight (0-1)")
    mask_url: Optional[str] = Field(None, description="Optional mask URL")


class TextToImageRequest(BaseModel):
    """Request for text-to-image generation."""
    prompt: Optional[str] = Field(None, description="Free text prompt")
    fibo_json: Optional[Dict[str, Any]] = Field(None, description="Optional structured FIBO JSON override")
    model: str = Field("bria-fibo-v1", description="Model identifier")
    seed: Optional[int] = Field(None, description="Optional seed for determinism")
    guidance_images: Optional[List[GuidanceImage]] = Field(None, description="Guidance images")
    controlnet: Optional[ControlNetConfig] = Field(None, description="ControlNet configuration")
    width: int = Field(1024, ge=256, le=4096, description="Image width")
    height: int = Field(1024, ge=256, le=4096, description="Image height")
    num_variants: int = Field(1, ge=1, le=10, description="Number of variants to generate")
    refine_mode: str = Field("generate", description="Mode: generate, refine, inspire")
    meta: Optional[Dict[str, Any]] = Field(None, description="Metadata: user_id, tags, priority")


class TextToImageResponse(BaseModel):
    """Response from text-to-image generation request."""
    request_id: str
    run_id: str
    seed: int
    model_version: str
    queued_at: datetime
    est_cost_cents: int
    sse_token: str
    cached_hit: bool = False
    cached_artifact_id: Optional[str] = None


class ArtifactInfo(BaseModel):
    """Artifact information."""
    id: str
    url: str
    thumb_url: Optional[str]
    width: int
    height: int
    variant_index: int
    evaluator_score: Optional[float]
    semantic_score: Optional[float]
    perceptual_score: Optional[float]
    meta: Optional[Dict[str, Any]]


class StatusResponse(BaseModel):
    """Status response for a generation run."""
    run_id: str
    status: str
    progress_percent: int
    step: Optional[str]
    message: Optional[str]
    artifacts: List[ArtifactInfo]
    cached_hit: bool
    seed: Optional[int]
    model_version: Optional[str]
    cost_cents: Optional[int]


class PresignRequest(BaseModel):
    """Request for presigned upload URL."""
    filename: str
    content_type: str = Field("image/png", description="Content type")
    purpose: str = Field("guidance", description="Purpose: guidance, mask, etc.")


class PresignResponse(BaseModel):
    """Response with presigned upload URL."""
    upload_url: str
    public_url: str
    key: str
    method: str = "PUT"


# ============================================================================
# Dependencies
# ============================================================================

def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/generate/text-to-image", response_model=TextToImageResponse)
async def create_text_to_image_job(
    request: TextToImageRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new text-to-image generation job.
    
    Supports deterministic generation with seed management, prompt caching,
    guidance images, and ControlNet configuration.
    """
    try:
        # Generate IDs
        request_id = f"req_{uuid.uuid4().hex[:16]}"
        run_id = f"run_{uuid.uuid4().hex[:16]}"
        sse_token = secrets.token_urlsafe(32)
        
        # Generate seed if not provided
        seed = request.seed
        if seed is None:
            import random
            seed = random.randint(1, 2**31 - 1)
        
        # Compute prompt hash
        prompt_hash = compute_prompt_hash(
            prompt_text=request.prompt,
            fibo_json=request.fibo_json,
            model_version=request.model,
            width=request.width,
            height=request.height,
            seed=seed
        )
        
        # Check cache (if seed matches or was provided)
        cached_result = None
        if request.seed is not None:  # Only check cache if seed was explicitly provided
            cached_result = lookup_cache(
                db=db,
                prompt_hash=prompt_hash,
                model_version=request.model,
                seed=seed,
                width=request.width,
                height=request.height
            )
        
        # Estimate cost
        est_cost = estimate_cost(
            num_variants=request.num_variants,
            width=request.width,
            height=request.height,
            model_version=request.model,
            has_controlnet=request.controlnet is not None,
            num_guidance_images=len(request.guidance_images or [])
        )
        
        # Prepare guidance images JSON
        guidance_images_json = None
        if request.guidance_images:
            guidance_images_json = [{"url": g.url, "role": g.role} for g in request.guidance_images]
        
        # Prepare ControlNet config JSON
        controlnet_json = None
        if request.controlnet:
            controlnet_json = {
                "name": request.controlnet.name,
                "weight": request.controlnet.weight,
                "mask_url": request.controlnet.mask_url
            }
        
        # Create job record
        if cached_result:
            # Cache hit - return cached artifact immediately
            job = ImageJob(
                request_id=request_id,
                run_id=run_id,
                prompt_text=request.prompt,
                prompt_hash=prompt_hash,
                fibo_json=request.fibo_json,
                model_version=request.model,
                seed=seed,
                status="completed",  # Already cached
                cost_cents=0,  # No cost for cache hit
                cost_estimate_cents=est_cost,
                width=request.width,
                height=request.height,
                num_variants=request.num_variants,
                guidance_images=guidance_images_json,
                controlnet_config=controlnet_json,
                refine_mode=request.refine_mode,
                meta=request.meta,
                sse_token=sse_token,
                cached_hit=True
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            
            return TextToImageResponse(
                request_id=request_id,
                run_id=run_id,
                seed=seed,
                model_version=request.model,
                queued_at=datetime.utcnow(),
                est_cost_cents=0,
                sse_token=sse_token,
                cached_hit=True,
                cached_artifact_id=cached_result["artifact_id"]
            )
        else:
            # Cache miss - create job for processing
            job = ImageJob(
                user_id=request.meta.get("user_id") if request.meta else None,
                request_id=request_id,
                run_id=run_id,
                prompt_text=request.prompt,
                prompt_hash=prompt_hash,
                fibo_json=request.fibo_json,
                model_version=request.model,
                seed=seed,
                status="queued",
                cost_estimate_cents=est_cost,
                width=request.width,
                height=request.height,
                num_variants=request.num_variants,
                guidance_images=guidance_images_json,
                controlnet_config=controlnet_json,
                refine_mode=request.refine_mode,
                meta=request.meta,
                sse_token=sse_token,
                cached_hit=False
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            
            # TODO: Enqueue job to worker queue (BullMQ/Redis)
            # For now, we'll just return the job info
            # In production, this would trigger async processing
            
            return TextToImageResponse(
                request_id=request_id,
                run_id=run_id,
                seed=seed,
                model_version=request.model,
                queued_at=job.created_at,
                est_cost_cents=est_cost,
                sse_token=sse_token,
                cached_hit=False
            )
    
    except Exception as e:
        logger.error(f"Error creating text-to-image job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{run_id}", response_model=StatusResponse)
async def get_status(
    run_id: str,
    db: Session = Depends(get_db)
):
    """Get status of a generation run."""
    job = db.query(ImageJob).filter(ImageJob.run_id == run_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Fetch artifacts
    artifacts = db.query(Artifact).filter(Artifact.job_id == job.id).all()
    
    # Determine progress
    progress_map = {
        "queued": 10,
        "processing": 30,
        "generating": 60,
        "evaluating": 80,
        "uploading": 90,
        "completed": 100,
        "failed": 0,
        "cancelled": 0
    }
    progress = progress_map.get(job.status, 0)
    
    artifact_infos = [
        ArtifactInfo(
            id=str(art.id),
            url=art.url,
            thumb_url=art.thumb_url,
            width=art.width,
            height=art.height,
            variant_index=art.variant_index,
            evaluator_score=art.evaluator_score,
            semantic_score=art.semantic_score,
            perceptual_score=art.perceptual_score,
            meta=art.meta
        )
        for art in artifacts
    ]
    
    return StatusResponse(
        run_id=job.run_id,
        status=job.status,
        progress_percent=progress,
        step=job.status,
        message=f"Status: {job.status}",
        artifacts=artifact_infos,
        cached_hit=job.cached_hit,
        seed=job.seed,
        model_version=job.model_version,
        cost_cents=job.cost_cents
    )


@router.post("/uploads/presign", response_model=PresignResponse)
async def presign_upload(
    request: PresignRequest
):
    """
    Generate presigned URL for guidance image upload.
    
    Returns a presigned PUT URL for uploading guidance images to S3/MinIO.
    """
    try:
        # Import S3 client (reuse from s3.py)
        from app.api.s3 import s3, S3_BUCKET, S3_REGION
        
        if not S3_BUCKET or not s3:
            raise HTTPException(status_code=500, detail="S3 not configured")
        
        # Generate unique key
        import time
        timestamp = int(time.time())
        key = f"prolight/guidance/{timestamp}_{request.filename.replace(' ', '_')}"
        
        # Generate presigned PUT URL
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": key,
                "ContentType": request.content_type
            },
            ExpiresIn=900,  # 15 minutes
            HttpMethod="PUT"
        )
        
        # Construct public URL
        public_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{key}"
        
        return PresignResponse(
            upload_url=upload_url,
            public_url=public_url,
            key=key,
            method="PUT"
        )
    
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cache/lookup")
async def lookup_prompt_cache(
    prompt_hash: str = Query(..., description="Prompt hash"),
    model_version: str = Query(..., description="Model version"),
    seed: Optional[int] = Query(None, description="Seed"),
    width: int = Query(1024, description="Width"),
    height: int = Query(1024, description="Height"),
    db: Session = Depends(get_db)
):
    """Look up cached artifact for prompt hash."""
    result = lookup_cache(
        db=db,
        prompt_hash=prompt_hash,
        model_version=model_version,
        seed=seed,
        width=width,
        height=height
    )
    
    if result:
        return {"cache_hit": True, **result}
    else:
        return {"cache_hit": False}


@router.get("/status/stream/{run_id}")
async def stream_status(
    run_id: str,
    token: str = Query(..., description="SSE token for authentication"),
    db: Session = Depends(get_db)
):
    """
    Stream real-time status updates via Server-Sent Events (SSE).
    
    Events:
    - progress: Progress updates with percent and step
    - log: Log messages
    - variant: Variant-specific progress
    - artifact: Artifact ready
    - final: Final status (completed/failed)
    """
    # Verify token
    job = db.query(ImageJob).filter(
        ImageJob.run_id == run_id,
        ImageJob.sse_token == token
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Run not found or invalid token")
    
    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events for status updates."""
        last_status = None
        last_artifact_count = 0
        
        try:
            while True:
                # Query latest status
                job = db.query(ImageJob).filter(ImageJob.run_id == run_id).first()
                if not job:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Job not found'})}\n\n"
                    break
                
                # Check if status changed
                if job.status != last_status:
                    # Send progress event
                    progress_map = {
                        "queued": 10,
                        "processing": 30,
                        "generating": 60,
                        "evaluating": 80,
                        "uploading": 90,
                        "completed": 100,
                        "failed": 0,
                        "cancelled": 0
                    }
                    progress = progress_map.get(job.status, 0)
                    
                    event = {
                        "type": "progress",
                        "run_id": run_id,
                        "percent": progress,
                        "step": job.status,
                        "message": f"Status: {job.status}",
                        "payload": {}
                    }
                    yield f"data: {json.dumps(event)}\n\n"
                    last_status = job.status
                
                # Check for new artifacts
                artifacts = db.query(Artifact).filter(Artifact.job_id == job.id).all()
                if len(artifacts) > last_artifact_count:
                    new_artifacts = artifacts[last_artifact_count:]
                    for art in new_artifacts:
                        artifact_event = {
                            "type": "artifact",
                            "run_id": run_id,
                            "step": "upload",
                            "message": "Artifact ready",
                            "payload": {
                                "artifacts": [{
                                    "id": str(art.id),
                                    "url": art.url,
                                    "thumb_url": art.thumb_url,
                                    "width": art.width,
                                    "height": art.height,
                                    "variant_index": art.variant_index,
                                    "evaluator_score": art.evaluator_score,
                                    "semantic_score": art.semantic_score,
                                    "perceptual_score": art.perceptual_score,
                                    "meta": art.meta
                                }]
                            }
                        }
                        yield f"data: {json.dumps(artifact_event)}\n\n"
                    last_artifact_count = len(artifacts)
                
                # Check if completed or failed
                if job.status in ["completed", "failed", "cancelled"]:
                    final_event = {
                        "type": "final",
                        "run_id": run_id,
                        "status": job.status,
                        "message": f"Job {job.status}",
                        "payload": {
                            "cost_cents": job.cost_cents,
                            "cached_hit": job.cached_hit
                        }
                    }
                    yield f"data: {json.dumps(final_event)}\n\n"
                    break
                
                # Wait before next poll
                await asyncio.sleep(2)
        
        except Exception as e:
            logger.error(f"Error in SSE stream: {e}", exc_info=True)
            error_event = {
                "type": "error",
                "message": str(e)
            }
            yield f"data: {json.dumps(error_event)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

