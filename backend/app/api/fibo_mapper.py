"""
FIBO Mapper API - UI to FIBO JSON conversion and validation endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from app.ui_mapping import ui_to_fibo_json, fibo_json_to_ui
from app.models_fibo import FiboPrompt

logger = logging.getLogger(__name__)
router = APIRouter()


class UIState(BaseModel):
    """UI state from frontend."""
    subject: Optional[str] = Field(None, description="Subject description")
    subject_text: Optional[str] = Field(None, description="Alternative subject field")
    camera: Dict[str, Any] = Field(default_factory=dict, description="Camera settings")
    lights: List[Dict[str, Any]] = Field(default_factory=list, description="Light sources")
    render: Dict[str, Any] = Field(default_factory=dict, description="Render settings")
    preset_name: Optional[str] = Field(None, description="Preset name")
    seed: Optional[int] = Field(None, description="Random seed")


class FIBOMapResponse(BaseModel):
    """Response from UI to FIBO mapping."""
    fibo_json: Dict[str, Any] = Field(..., description="Validated FIBO JSON")
    generation_id: Optional[str] = Field(None, description="Generation ID")
    validated: bool = Field(True, description="Whether validation passed")
    errors: List[str] = Field(default_factory=list, description="Validation errors")


@router.post("/map-ui-to-fibo", response_model=FIBOMapResponse)
async def map_ui_to_fibo(ui: UIState):
    """
    Convert UI sliders and controls → validated FIBO JSON.
    
    This endpoint takes the frontend UI state (sliders, 3D positions, etc.)
    and converts it to the exact FIBO JSON schema required for generation.
    
    Args:
        ui: UIState with camera, lights, render settings
        
    Returns:
        FIBOMapResponse with validated FIBO JSON
    """
    try:
        # Convert UI state to dict
        ui_dict = ui.model_dump(exclude_none=True)
        
        # Use existing UI mapping function
        fibo_json = ui_to_fibo_json(ui_dict)
        
        # Generate ID
        generation_id = f"pro_{int(datetime.utcnow().timestamp())}"
        fibo_json["generation_id"] = generation_id
        fibo_json["model_version"] = "FIBO-v2.3"
        
        # Validate with Pydantic
        errors = []
        try:
            validated_prompt = FiboPrompt(**fibo_json)
            fibo_json = validated_prompt.to_dict()
        except Exception as e:
            errors.append(f"Validation warning: {str(e)}")
            logger.warning(f"FIBO validation warning: {e}")
        
        # Add metadata
        if "meta" not in fibo_json:
            fibo_json["meta"] = {}
        fibo_json["meta"].update({
            "preset": ui.preset_name or "custom",
            "c2pa": True,
            "client": "ProLight AI",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return FIBOMapResponse(
            fibo_json=fibo_json,
            generation_id=generation_id,
            validated=len(errors) == 0,
            errors=errors
        )
    
    except Exception as e:
        logger.error(f"UI to FIBO mapping error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fibo-to-ui")
async def fibo_to_ui(fibo_json: Dict[str, Any]):
    """
    Convert FIBO JSON back to UI state format.
    
    Useful for loading presets or editing existing prompts.
    
    Args:
        fibo_json: FIBO JSON prompt structure
        
    Returns:
        UI state format
    """
    try:
        ui_state = fibo_json_to_ui(fibo_json)
        return {"ui_state": ui_state}
    
    except Exception as e:
        logger.error(f"FIBO to UI mapping error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-fibo")
async def validate_fibo(fibo_json: Dict[str, Any]):
    """
    Validate FIBO JSON against Pydantic schema.
    
    Args:
        fibo_json: FIBO JSON to validate
        
    Returns:
        Validation result
    """
    try:
        validated_prompt = FiboPrompt(**fibo_json)
        return {
            "valid": True,
            "fibo_json": validated_prompt.to_dict(),
            "errors": []
        }
    except Exception as e:
        return {
            "valid": False,
            "errors": [str(e)],
            "fibo_json": None
        }

