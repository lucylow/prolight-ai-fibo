"""
Vehicle Shot Editing API Routes
Handles vehicle-specific product shot editing operations using Bria APIs.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.bria_vehicle_service import (
    BriaVehicleShotService,
    PlacementType,
    GenerationMode,
    EffectType,
    HarmonizationPreset,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class VehicleShotRequest(BaseModel):
    """Request to generate a vehicle shot."""
    image_url: str = Field(..., description="URL of the vehicle image")
    scene_description: str = Field(..., description="Text description of the scene")
    placement_type: str = Field(default="automatic", description="Placement type")
    num_results: int = Field(default=4, ge=1, le=10)
    mode: str = Field(default="fast", description="Generation mode")
    optimize_description: bool = Field(default=True)
    exclude_elements: Optional[str] = None
    sync: bool = Field(default=False)
    shot_size: Optional[List[int]] = None
    aspect_ratio: Optional[str] = None
    content_moderation: bool = Field(default=False)


class EnhancementRequest(BaseModel):
    """Request for complete vehicle enhancement workflow."""
    image_url: str = Field(..., description="URL of the vehicle image")
    scene_description: str = Field(..., description="Text description of the scene")
    include_reflections: bool = Field(default=True)
    include_tire_refinement: bool = Field(default=True)
    effects: Optional[List[str]] = None
    harmonization_preset: Optional[str] = None


class EffectRequest(BaseModel):
    """Request to apply a visual effect."""
    image_url: str = Field(..., description="URL of the vehicle image")
    effect: str = Field(..., description="Effect type (dust, snow, fog, light_leaks, lens_flare)")
    layers: bool = Field(default=False)
    seed: Optional[int] = None


class HarmonizationRequest(BaseModel):
    """Request to apply harmonization preset."""
    image_url: str = Field(..., description="URL of the vehicle image")
    preset: str = Field(..., description="Preset (warm-day, cold-day, warm-night, cold-night)")


class SegmentationRequest(BaseModel):
    """Request to segment vehicle."""
    image_url: str = Field(..., description="URL of the vehicle image")


# ============================================================================
# Helper Functions
# ============================================================================

def get_bria_api_token() -> str:
    """Get Bria API token from settings."""
    # Try different environment variable names
    token = (
        settings.BRIA_API_TOKEN or
        settings.BRIA_API_KEY or
        settings.FIBO_API_KEY
    )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="BRIA_API_TOKEN not configured. Please set BRIA_API_TOKEN, BRIA_API_KEY, or FIBO_API_KEY in environment variables."
        )
    return token


# ============================================================================
# Vehicle Shot Endpoints
# ============================================================================

@router.post("/vehicle-shot")
async def generate_vehicle_shot(request: VehicleShotRequest):
    """Generate vehicle shot with text description."""
    try:
        api_token = get_bria_api_token()
        service = BriaVehicleShotService(api_token)
        
        result = await service.generate_vehicle_shot_by_text(
            image_url=request.image_url,
            scene_description=request.scene_description,
            placement_type=PlacementType(request.placement_type),
            num_results=request.num_results,
            mode=GenerationMode(request.mode),
            optimize_description=request.optimize_description,
            exclude_elements=request.exclude_elements,
            sync=request.sync,
            shot_size=request.shot_size,
            aspect_ratio=request.aspect_ratio,
            content_moderation=request.content_moderation,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error generating vehicle shot: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/vehicle-shot/segment")
async def segment_vehicle(request: SegmentationRequest):
    """Segment vehicle into components."""
    try:
        api_token = get_bria_api_token()
        service = BriaVehicleShotService(api_token)
        
        masks = await service.segment_vehicle(request.image_url)
        return {"success": True, "data": masks.__dict__}
    except Exception as e:
        logger.error(f"Error segmenting vehicle: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/vehicle-shot/apply-effect")
async def apply_effect(request: EffectRequest):
    """Apply visual effects to vehicle image."""
    try:
        api_token = get_bria_api_token()
        service = BriaVehicleShotService(api_token)
        
        result = await service.apply_effect(
            image_url=request.image_url,
            effect=EffectType(request.effect),
            layers=request.layers,
            seed=request.seed,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error applying effect: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/vehicle-shot/harmonize")
async def harmonize(request: HarmonizationRequest):
    """Apply harmonization preset to vehicle image."""
    try:
        api_token = get_bria_api_token()
        service = BriaVehicleShotService(api_token)
        
        result = await service.harmonize_image(
            image_url=request.image_url,
            preset=HarmonizationPreset(request.preset),
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error harmonizing image: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/vehicle-shot/complete-enhancement")
async def complete_enhancement(request: EnhancementRequest):
    """Complete vehicle enhancement workflow."""
    try:
        api_token = get_bria_api_token()
        service = BriaVehicleShotService(api_token)
        
        effects = [EffectType(e) for e in request.effects] if request.effects else None
        harmonization_preset = (
            HarmonizationPreset(request.harmonization_preset)
            if request.harmonization_preset
            else None
        )
        
        result = await service.complete_vehicle_enhancement(
            image_url=request.image_url,
            scene_description=request.scene_description,
            include_reflections=request.include_reflections,
            include_tire_refinement=request.include_tire_refinement,
            effects=effects,
            harmonization_preset=harmonization_preset,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in complete enhancement: {e}")
        raise HTTPException(status_code=400, detail=str(e))

