"""
FIBO JSON Schema Pydantic Models
Generated from official Bria-AI/FIBO schema or fallback definitions.

This module provides type-safe models for FIBO JSON prompts.
Run scripts/gen_pydantic_from_schema.sh to regenerate from official schema.
"""

from pydantic import BaseModel, Field, field_validator, conlist, confloat, conint
from typing import List, Dict, Any, Optional, Literal, Union
from enum import Enum


# ============================================================================
# Enums for FIBO types
# ============================================================================

class LightType(str, Enum):
    """Light source types."""
    POINT = "point"
    DIRECTIONAL = "directional"
    AREA = "area"
    SPOT = "spot"
    STRIP = "strip"


class ColorSpace(str, Enum):
    """Color space options."""
    SRGB = "sRGB"
    ACESCG = "ACEScg"
    REC709 = "Rec709"
    P3 = "P3"


class ShotType(str, Enum):
    """Camera shot types."""
    CLOSE_UP = "close-up"
    MEDIUM = "medium"
    WIDE = "wide"
    EXTREME_CLOSE_UP = "extreme close-up"
    FULL_SHOT = "full shot"


# ============================================================================
# Camera Models
# ============================================================================

class Camera(BaseModel):
    """Camera parameters for FIBO."""
    fov: confloat(ge=1.0, le=160.0) = Field(
        default=50.0,
        description="Field of view in degrees (1-160)"
    )
    aperture: Optional[Union[float, str]] = Field(
        default=2.8,
        description="Aperture value (f-number) or string like 'f/2.8'"
    )
    focus_distance_m: Optional[confloat(ge=0.1)] = Field(
        default=1.0,
        description="Focus distance in meters"
    )
    pitch: Optional[confloat(ge=-90.0, le=90.0)] = Field(
        default=0.0,
        description="Camera pitch in degrees (-90 to 90)"
    )
    yaw: Optional[confloat(ge=-180.0, le=180.0)] = Field(
        default=0.0,
        description="Camera yaw in degrees (-180 to 180)"
    )
    roll: Optional[confloat(ge=-180.0, le=180.0)] = Field(
        default=0.0,
        description="Camera roll in degrees (-180 to 180)"
    )
    seed: Optional[int] = Field(
        default=None,
        description="Random seed for deterministic generation"
    )
    shot_type: Optional[ShotType] = Field(
        default=None,
        description="Type of camera shot"
    )
    camera_angle: Optional[str] = Field(
        default=None,
        description="Camera angle description"
    )
    lens_type: Optional[str] = Field(
        default=None,
        description="Lens type (e.g., '85mm', '100mm Macro')"
    )

    @field_validator('aperture', mode='before')
    @classmethod
    def parse_aperture(cls, v):
        """Parse aperture string to float if needed."""
        if isinstance(v, str):
            # Extract number from "f/2.8" format
            if v.startswith('f/'):
                return float(v[2:])
            return float(v)
        return v

# ============================================================================
# Lighting Models
# ============================================================================

class Light(BaseModel):
    """Individual light source definition."""
    type: LightType = Field(
        default=LightType.AREA,
        description="Type of light source"
    )
    position: Optional[conlist(float, min_length=3, max_length=3)] = Field(
        default=[0.0, 1.0, 1.0],
        description="3D position [x, y, z]"
    )
    direction: Optional[Union[str, conlist(float, min_length=3, max_length=3)]] = Field(
        default=None,
        description="Direction as string (e.g., 'front-left') or vector [x, y, z]"
    )
    intensity: confloat(ge=0.0, le=2.0) = Field(
        default=1.0,
        description="Light intensity (0.0 to 2.0)"
    )
    color_temperature: conint(ge=1000, le=20000) = Field(
        default=5600,
        description="Color temperature in Kelvin (1000-20000)"
    )
    softness: confloat(ge=0.0, le=1.0) = Field(
        default=0.5,
        description="Light softness (0.0 = hard, 1.0 = very soft)"
    )
    enabled: bool = Field(
        default=True,
        description="Whether the light is enabled"
    )
    distance: Optional[float] = Field(
        default=None,
        description="Distance from subject (for some light types)"
    )
    id: Optional[str] = Field(
        default=None,
        description="Light identifier"
    )


class Lighting(BaseModel):
    """Lighting configuration with multiple light sources."""
    main_light: Optional[Light] = Field(
        default=None,
        description="Main/key light"
    )
    fill_light: Optional[Light] = Field(
        default=None,
        description="Fill light"
    )
    rim_light: Optional[Light] = Field(
        default=None,
        description="Rim/back light"
    )
    lighting_style: Optional[str] = Field(
        default=None,
        description="Lighting style name (e.g., 'butterfly', 'three-point')"
    )
    ambient_light: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Ambient light configuration"
    )


# ============================================================================
# Subject and Environment Models
# ============================================================================

class Subject(BaseModel):
    """Subject/entity description."""
    main_entity: Optional[str] = Field(
        default=None,
        description="Main subject entity"
    )
    mainEntity: Optional[str] = Field(
        default=None,
        description="Alternative camelCase field name"
    )
    attributes: Optional[str] = Field(
        default=None,
        description="Subject attributes"
    )
    action: Optional[str] = Field(
        default=None,
        description="Action or pose"
    )
    emotion: Optional[str] = Field(
        default=None,
        description="Emotional quality"
    )


class Environment(BaseModel):
    """Environment/scene description."""
    setting: Optional[str] = Field(
        default=None,
        description="Setting description"
    )
    time_of_day: Optional[str] = Field(
        default=None,
        description="Time of day"
    )
    timeOfDay: Optional[str] = Field(
        default=None,
        description="Alternative camelCase field name"
    )
    weather: Optional[str] = Field(
        default=None,
        description="Weather conditions"
    )
    interior_style: Optional[str] = Field(
        default=None,
        description="Interior style"
    )
    interiorStyle: Optional[str] = Field(
        default=None,
        description="Alternative camelCase field name"
    )


# ============================================================================
# Render Models
# ============================================================================

class Render(BaseModel):
    """Render/output parameters."""
    resolution: conlist(int, min_length=2, max_length=2) = Field(
        default=[1024, 1024],
        description="Output resolution [width, height]"
    )
    bit_depth: Optional[int] = Field(
        default=8,
        description="Bit depth (8, 16, 32)"
    )
    bitDepth: Optional[int] = Field(
        default=None,
        description="Alternative camelCase field name"
    )
    color_space: Optional[ColorSpace] = Field(
        default=ColorSpace.SRGB,
        description="Color space"
    )
    colorSpace: Optional[str] = Field(
        default=None,
        description="Alternative camelCase field name"
    )
    aov: Optional[List[str]] = Field(
        default=["beauty"],
        description="Arbitrary output variables (render passes)"
    )
    samples: Optional[int] = Field(
        default=40,
        description="Number of samples for rendering"
    )


# ============================================================================
# Main FIBO Prompt Model
# ============================================================================

class FiboPrompt(BaseModel):
    """
    Complete FIBO JSON prompt structure.
    
    This is the canonical format expected by Bria-AI/FIBO model.
    All fields are optional to allow partial prompts, but subject and lighting
    are typically required for meaningful generation.
    """
    subject: Union[Subject, Dict[str, Any]] = Field(
        default_factory=dict,
        description="Subject/entity description"
    )
    environment: Optional[Union[Environment, Dict[str, Any]]] = Field(
        default=None,
        description="Environment/scene description"
    )
    camera: Camera = Field(
        default_factory=Camera,
        description="Camera parameters"
    )
    lighting: Union[Lighting, Dict[str, Any]] = Field(
        default_factory=dict,
        description="Lighting configuration"
    )
    materials: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Material properties"
    )
    render: Render = Field(
        default_factory=Render,
        description="Render/output parameters"
    )
    post: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Post-processing parameters"
    )
    enhancements: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Enhancement options (HDR, etc.)"
    )
    meta: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Metadata (client, version, etc.)"
    )

    class Config:
        """Pydantic configuration."""
        extra = "allow"  # Allow extra fields for forward compatibility
        use_enum_values = True
        json_encoders = {
            # Custom encoders if needed
        }

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, handling nested models."""
        return self.model_dump(exclude_none=True, mode='json')

    def validate_lighting(self) -> bool:
        """Validate that at least one light is configured."""
        if isinstance(self.lighting, dict):
            return bool(self.lighting.get("main_light") or self.lighting.get("mainLight"))
        elif isinstance(self.lighting, Lighting):
            return self.lighting.main_light is not None
        return False


# ============================================================================
# Convenience Functions
# ============================================================================

def create_default_fibo_prompt(
    subject_text: str = "product",
    resolution: List[int] = [1024, 1024]
) -> FiboPrompt:
    """Create a default FIBO prompt with minimal required fields."""
    return FiboPrompt(
        subject={"main_entity": subject_text},
        camera=Camera(fov=50.0, aperture=2.8),
        lighting={
            "main_light": {
                "type": "area",
                "direction": "front-left",
                "intensity": 0.8,
                "color_temperature": 5600,
                "softness": 0.3
            }
        },
        render=Render(resolution=resolution)
    )


