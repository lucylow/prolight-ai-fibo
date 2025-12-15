"""
Image Onboarding API endpoints for Bria Image Onboarding integration.
Allows registering images with Bria to get visual_id for AI Search and Image Editing.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List, AsyncGenerator
from datetime import datetime, timedelta
import logging

from app.db import SessionLocal
from app.models.bria_visual import BriaVisual
from app.clients.bria_client import BriaClient
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class RegisterImageRequest(BaseModel):
    """Request model for registering an image."""
    image_url: Optional[HttpUrl] = Field(None, description="Public URL of the image")
    org_image_key: Optional[str] = Field(None, description="Internal image ID")
    is_private: bool = Field(True, description="Private to organization (default: true)")
    expire_hours: Optional[int] = Field(None, description="Optional expiry in hours")


class RegisterImageResponse(BaseModel):
    """Response model for image registration."""
    visual_id: str
    image_url: Optional[str] = None
    org_image_key: Optional[str] = None
    is_private: bool
    created_at: str


class RemoveImageRequest(BaseModel):
    """Request model for removing an image."""
    visual_id: str
    delete_s3: bool = Field(False, description="Also delete from S3 if applicable")


class VisualListItem(BaseModel):
    """Model for visual list items."""
    id: int
    visual_id: str
    source: str
    image_url: Optional[str] = None
    org_image_key: Optional[str] = None
    s3_key: Optional[str] = None
    is_private: bool
    created_at: str
    expire_at: Optional[str] = None
    removed: bool

    class Config:
        from_attributes = True


# ============================================================================
# Dependency: Get DB Session
# ============================================================================

def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# Dependency: Get Bria Client
# ============================================================================

async def get_bria_client() -> AsyncGenerator[BriaClient, None]:
    """Get Bria client instance using async context manager."""
    token = settings.bria_token()
    if not token:
        raise HTTPException(
            status_code=500,
            detail="Bria API token not configured. Set BRIA_API_TOKEN in environment."
        )
    async with BriaClient(api_token=token) as client:
        yield client


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/image/register", response_model=RegisterImageResponse)
async def register_image(
    request: RegisterImageRequest,
    db = Depends(get_db),
    bria_client: BriaClient = Depends(get_bria_client)
):
    """
    Register an image with Bria Image Onboarding API.
    
    Returns a visual_id needed for AI Search and Image Editing endpoints.
    Supports registration by public URL or internal org_image_key.
    """
    try:
        # Validate input
        if not request.image_url and not request.org_image_key:
            raise HTTPException(
                status_code=400,
                detail="Either image_url or org_image_key must be provided"
            )
        
        # Register with Bria
        result = await bria_client.register_image(
            image_url=str(request.image_url) if request.image_url else None,
            org_image_key=request.org_image_key,
            is_private=request.is_private
        )
        
        visual_id = result.get("visual_id")
        if not visual_id:
            raise HTTPException(
                status_code=500,
                detail="Bria returned no visual_id",
                headers={"X-Bria-Response": str(result)}
            )
        
        # Calculate expiry if provided
        expire_at = None
        if request.expire_hours:
            expire_at = datetime.utcnow() + timedelta(hours=request.expire_hours)
        
        # Save mapping to database
        visual_record = BriaVisual(
            visual_id=visual_id,
            source="url" if request.image_url else "org_key",
            image_url=str(request.image_url) if request.image_url else None,
            org_image_key=request.org_image_key,
            is_private=request.is_private,
            expire_at=expire_at
        )
        db.add(visual_record)
        db.commit()
        db.refresh(visual_record)
        
        logger.info(f"Registered image with visual_id: {visual_id}")
        
        return RegisterImageResponse(
            visual_id=visual_id,
            image_url=str(request.image_url) if request.image_url else None,
            org_image_key=request.org_image_key,
            is_private=request.is_private,
            created_at=visual_record.created_at.isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image/register-s3-url", response_model=RegisterImageResponse)
async def register_s3_url(
    request: RegisterImageRequest,
    db = Depends(get_db),
    bria_client: BriaClient = Depends(get_bria_client)
):
    """
    Register an existing S3 URL with Bria Image Onboarding.
    
    Use this after uploading to S3 (e.g., via presigned URL).
    """
    if not request.image_url:
        raise HTTPException(
            status_code=400,
            detail="image_url is required for S3 URL registration"
        )
    
    # Extract S3 key from URL if possible (for metadata)
    s3_key = None
    image_url_str = str(request.image_url)
    if "s3" in image_url_str.lower() or ".amazonaws.com" in image_url_str:
        # Try to extract key from URL
        parts = image_url_str.split("/")
        if len(parts) > 3:
            s3_key = "/".join(parts[3:])
    
    try:
        result = await bria_client.register_image(
            image_url=image_url_str,
            is_private=request.is_private
        )
        
        visual_id = result.get("visual_id")
        if not visual_id:
            raise HTTPException(
                status_code=500,
                detail="Bria returned no visual_id"
            )
        
        expire_at = None
        if request.expire_hours:
            expire_at = datetime.utcnow() + timedelta(hours=request.expire_hours)
        
        visual_record = BriaVisual(
            visual_id=visual_id,
            source="s3",
            image_url=image_url_str,
            s3_key=s3_key,
            is_private=request.is_private,
            expire_at=expire_at
        )
        db.add(visual_record)
        db.commit()
        db.refresh(visual_record)
        
        return RegisterImageResponse(
            visual_id=visual_id,
            image_url=image_url_str,
            is_private=request.is_private,
            created_at=visual_record.created_at.isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering S3 URL: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image/remove")
async def remove_image(
    request: RemoveImageRequest,
    db = Depends(get_db),
    bria_client: BriaClient = Depends(get_bria_client)
):
    """
    Remove an image from your organization's Bria gallery.
    
    Optionally deletes the S3 object if the image was uploaded to S3.
    """
    try:
        # Call Bria remove endpoint
        await bria_client.remove_image(request.visual_id)
        
        # Update local database record
        visual_record = db.query(BriaVisual).filter(
            BriaVisual.visual_id == request.visual_id
        ).first()
        
        if visual_record:
            visual_record.removed = True
            visual_record.removed_at = datetime.utcnow()
            
            # Optionally delete from S3
            if request.delete_s3 and visual_record.s3_key:
                try:
                    import boto3
                    import os
                    s3_client = boto3.client(
                        "s3",
                        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                        region_name=os.getenv("S3_REGION", "us-east-1")
                    )
                    s3_client.delete_object(
                        Bucket=os.getenv("S3_BUCKET"),
                        Key=visual_record.s3_key
                    )
                    logger.info(f"Deleted S3 object: {visual_record.s3_key}")
                except Exception as s3_err:
                    logger.warning(f"Failed to delete S3 object: {s3_err}")
            
            db.commit()
        
        return {"ok": True, "visual_id": request.visual_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/image/list", response_model=List[VisualListItem])
async def list_images(
    db = Depends(get_db),
    removed: Optional[bool] = None
):
    """
    List all registered images (visual_id mappings).
    
    Args:
        removed: Filter by removed status (None = all, True = removed only, False = active only)
    """
    try:
        query = db.query(BriaVisual)
        
        if removed is not None:
            query = query.filter(BriaVisual.removed == removed)
        
        visuals = query.order_by(BriaVisual.created_at.desc()).all()
        
        return [
            VisualListItem(
                id=v.id,
                visual_id=v.visual_id,
                source=v.source,
                image_url=v.image_url,
                org_image_key=v.org_image_key,
                s3_key=v.s3_key,
                is_private=v.is_private,
                created_at=v.created_at.isoformat(),
                expire_at=v.expire_at.isoformat() if v.expire_at else None,
                removed=v.removed
            )
            for v in visuals
        ]
    except Exception as e:
        logger.error(f"Error listing images: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

