"""
Generate endpoint - Create images from lighting setups using FIBO.
Implements VLM + lighting override workflow for precise control.
"""

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from settings import settings
from clients.bria_client import (
    BriaClient,
    BriaAuthError,
    BriaRateLimitError,
    BriaAPIError
)
from utils.lighting_mapper import lights_to_fibo_lighting


logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class LightPosition(BaseModel):
    """3D position of a light."""
    x: float
    y: float
    z: float


class Light(BaseModel):
    """Light definition."""
    id: str = Field(..., description="Light identifier (key, fill, rim, etc.)")
    type: str = Field(default="directional", description="Light type")
    position: LightPosition
    intensity: float = Field(default=0.8, ge=0.0, le=1.0)
    color_temperature: int = Field(default=5600, ge=1000, le=10000)
    softness: float = Field(default=0.5, ge=0.0, le=1.0)
    enabled: bool = Field(default=True)


class GenerateRequest(BaseModel):
    """Request to generate an image with lighting control."""
    scene_prompt: str = Field(..., description="Natural language scene description")
    lights: List[Light] = Field(..., description="List of 3D light definitions")
    subject_options: Optional[Dict[str, Any]] = Field(default=None, description="Optional subject parameters")
    num_results: int = Field(default=1, ge=1, le=4)
    sync: bool = Field(default=True, description="Wait for completion")


class GenerateResponse(BaseModel):
    """Response from image generation."""
    ok: bool
    request_id: Optional[str] = None
    status: str
    image_url: Optional[str] = None
    structured_prompt: Optional[Dict[str, Any]] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


# ============================================================================
# Generate Endpoint
# ============================================================================

@router.post("/generate", response_model=GenerateResponse)
async def generate_image(request: GenerateRequest):
    """
    Generate an image from a scene prompt and 3D lighting setup.
    
    This endpoint implements the ProLight AI core workflow:
    1. Accept scene description and 3D light positions
    2. Convert lights to FIBO lighting structure
    3. Use VLM to generate base structured prompt
    4. Override lighting section with precise 3D-mapped values
    5. Generate final image with FIBO
    
    Args:
        request: GenerateRequest with scene_prompt and lights
        
    Returns:
        GenerateResponse with image_url and metadata
    """
    try:
        # Validate request
        if not request.lights:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one light must be provided"
            )
        
        # Convert lights to FIBO lighting structure
        lights_data = [light.dict() for light in request.lights]
        fibo_lighting = lights_to_fibo_lighting(lights_data)
        
        logger.info(f"Converted {len(request.lights)} lights to FIBO lighting structure")
        logger.debug(f"FIBO lighting: {fibo_lighting}")
        
        # Check if we're using mock mode
        if settings.USE_MOCK_FIBO:
            # Return mock response
            return GenerateResponse(
                ok=True,
                status="completed",
                image_url="https://via.placeholder.com/2048x2048?text=ProLight+AI+Mock",
                structured_prompt=fibo_lighting,
                meta={
                    "mode": "mock",
                    "scene_prompt": request.scene_prompt,
                    "num_lights": len(request.lights)
                }
            )
        
        # Use real Bria client
        try:
            api_token = settings.bria_token()
        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(e)
            )
        
        async with BriaClient(
            api_token=api_token,
            base_url=settings.BRIA_API_URL
        ) as client:
            try:
                # Generate image with VLM + lighting override
                result = await client.generate_from_vlm(
                    scene_prompt=request.scene_prompt,
                    lighting_override=fibo_lighting,
                    num_results=request.num_results,
                    sync=request.sync
                )
                
                # Handle async vs sync response
                if request.sync:
                    # Sync response includes image_url
                    return GenerateResponse(
                        ok=True,
                        status="completed",
                        image_url=result.get("result", {}).get("image_url"),
                        structured_prompt=result.get("structured_prompt"),
                        meta={
                            "seed": result.get("result", {}).get("seed"),
                            "prompt": result.get("result", {}).get("prompt"),
                            "refined_prompt": result.get("result", {}).get("refined_prompt")
                        }
                    )
                else:
                    # Async response includes request_id and status_url
                    return GenerateResponse(
                        ok=True,
                        status="in_progress",
                        request_id=result.get("request_id"),
                        structured_prompt=result.get("structured_prompt"),
                        meta={
                            "status_url": result.get("status_url")
                        }
                    )
            
            except BriaAuthError as e:
                logger.error(f"Bria auth error: {e}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=str(e)
                )
            
            except BriaRateLimitError as e:
                logger.warning(f"Bria rate limit: {e}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=str(e)
                )
            
            except BriaAPIError as e:
                logger.error(f"Bria API error: {e}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"FIBO API error: {str(e)}"
                )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in generate_image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


@router.get("/status/{request_id}")
async def get_generation_status(request_id: str):
    """
    Get status of an async generation job.

    In development and test environments we avoid making real outbound calls
    when `settings.USE_MOCK_FIBO` is enabled, and instead return a deterministic
    mock payload. This keeps tests fast and ensures they do not depend on
    external network availability while still exercising the FastAPI routing
    and response handling.
    """
    # Short-circuit in mock mode to prevent external API calls during tests.
    if getattr(settings, "USE_MOCK_FIBO", False):
        logger.info(f"Returning mock generation status for request_id={request_id}")
        return {
            "status": "COMPLETED",
            "result": {
                "image_url": f"https://example.com/result.png"
            }
        }

    try:
        api_token = settings.bria_token()
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
    
    async with BriaClient(
        api_token=api_token,
        base_url=settings.BRIA_API_URL
    ) as client:
        try:
            result = await client.get_job_status(request_id)
            return result
        except BriaAPIError as e:
            logger.error(f"Error fetching status: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(e)
            )
