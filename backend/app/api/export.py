"""
Export endpoints - 16-bit HDR export and C2PA metadata.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
import os

from app.utils.hdr_export import convert_to_16bit_hdr, export_hdr_with_metadata
from app.utils.c2pa import create_c2pa_metadata
import time

logger = logging.getLogger(__name__)
router = APIRouter()


class ExportRequest(BaseModel):
    """Request for image export."""
    image_url: str
    fibo_json: Optional[Dict[str, Any]] = None
    format: str = "16bit_png"  # 16bit_png, 16bit_tiff, 8bit_png
    include_c2pa: bool = True


@router.post("/export/hdr")
async def export_hdr(request: ExportRequest):
    """
    Export image as 16-bit HDR format.
    
    Args:
        request: ExportRequest with image URL and options
        
    Returns:
        Export result with download URL
    """
    try:
        # Download image from URL
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(request.image_url)
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Image not found")
            
            # Save temporarily
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name
            
            try:
                # Convert to 16-bit HDR
                if request.format == "16bit_tiff":
                    output_path = tmp_path.replace(".png", "_16bit.tiff")
                else:
                    output_path = tmp_path.replace(".png", "_16bit.png")
                
                hdr_path = convert_to_16bit_hdr(tmp_path, output_path)
                
                # Add C2PA metadata if requested
                if request.include_c2pa and request.fibo_json:
                    c2pa_metadata = create_c2pa_metadata(
                        fibo_json=request.fibo_json,
                        generation_id=f"export_{int(time.time())}",
                        model_version="FIBO-v2.3"
                    )
                    from app.utils.c2pa import embed_c2pa_to_image
                    embed_c2pa_to_image(hdr_path, c2pa_metadata)
                
                # Return file path (in production, upload to S3/CDN and return URL)
                return {
                    "status": "success",
                    "format": request.format,
                    "file_path": hdr_path,
                    "download_url": f"/api/export/download/{os.path.basename(hdr_path)}",
                    "c2pa_included": request.include_c2pa
                }
            
            finally:
                # Cleanup temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
    
    except Exception as e:
        logger.error(f"HDR export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

