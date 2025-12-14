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
