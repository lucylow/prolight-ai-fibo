"""
S3 presigned URL endpoint for resume uploads.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import boto3
import os
import time

router = APIRouter()

S3_BUCKET = os.getenv("S3_BUCKET")
S3_REGION = os.getenv("S3_REGION", "us-east-1")

# Initialize S3 client if credentials are available
s3 = None
if os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"):
    s3 = boto3.client(
        "s3",
        region_name=S3_REGION,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


class PresignIn(BaseModel):
    filename: str
    content_type: str


class ImagePresignIn(BaseModel):
    """Request model for image presigned URL (for Image Onboarding)."""
    filename: str
    content_type: str = "image/jpeg"  # Default to JPEG
    make_public: bool = False  # Whether to make the object public


@router.post("/s3/presign")
def presign(data: PresignIn):
    """Generate presigned URL for S3 upload."""
    if not S3_BUCKET:
        raise HTTPException(status_code=500, detail="S3 not configured")
    
    if not s3:
        raise HTTPException(status_code=500, detail="AWS credentials not configured")
    
    # Generate unique key
    timestamp = int(time.time())
    key = f"uploads/resumes/{timestamp}_{data.filename}"
    
    try:
        url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": key,
                "ContentType": data.content_type
            },
            ExpiresIn=900,  # 15 minutes
            HttpMethod="PUT"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Presign failed: {str(e)}")
    
    # Construct public URL (adjust based on your S3 bucket configuration)
    public_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{key}"
    
    return {
        "upload_url": url,
        "key": key,
        "public_url": public_url
    }


@router.get("/s3/presign-get")
def presign_get(key: str = None):
    """Generate presigned GET URL for S3 object (for Bria to fetch videos)."""
    from fastapi import Query
    
    if not S3_BUCKET:
        raise HTTPException(status_code=500, detail="S3 not configured")
    
    if not s3:
        raise HTTPException(status_code=500, detail="AWS credentials not configured")
    
    if not key:
        raise HTTPException(status_code=400, detail="key query parameter required")
    
    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": key
            },
            ExpiresIn=3600,  # 1 hour - enough time for Bria to fetch
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Presign failed: {str(e)}")
    
    return {
        "url": url,
        "key": key
    }


@router.post("/s3/presign-image")
def presign_image(data: ImagePresignIn):
    """
    Generate presigned URL for image upload (for Bria Image Onboarding).
    
    Use this to upload images to S3, then register the public URL with Bria.
    """
    if not S3_BUCKET:
        raise HTTPException(status_code=500, detail="S3 not configured")
    
    if not s3:
        raise HTTPException(status_code=500, detail="AWS credentials not configured")
    
    # Validate content type
    valid_types = ["image/jpeg", "image/jpg", "image/png"]
    if data.content_type.lower() not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Generate unique key for image uploads
    timestamp = int(time.time())
    key = f"uploads/images/{timestamp}_{data.filename}"
    
    params = {
        "Bucket": S3_BUCKET,
        "Key": key,
        "ContentType": data.content_type
    }
    
    # Set ACL if public
    if data.make_public:
        params["ACL"] = "public-read"
    
    try:
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params=params,
            ExpiresIn=900,  # 15 minutes
            HttpMethod="PUT"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Presign failed: {str(e)}")
    
    # Construct public URL
    public_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{key}"
    
    return {
        "upload_url": upload_url,
        "key": key,
        "public_url": public_url,
        "content_type": data.content_type
    }


@router.post("/s3/presign-get")
def presign_get(key: str = None):
    """Generate presigned GET URL for S3 object (for Bria to fetch videos)."""
    from fastapi import Query
    
    key = Query(None, description="S3 object key")
    
    if not S3_BUCKET:
        raise HTTPException(status_code=500, detail="S3 not configured")
    
    if not s3:
        raise HTTPException(status_code=500, detail="AWS credentials not configured")
    
    if not key:
        raise HTTPException(status_code=400, detail="key parameter required")
    
    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": key
            },
            ExpiresIn=3600,  # 1 hour - enough time for Bria to fetch
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Presign failed: {str(e)}")
    
    return {
        "url": url,
        "key": key
    }
