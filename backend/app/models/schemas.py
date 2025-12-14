"""
Pydantic models and schemas for ProLight AI API.
Defines request/response structures and validation rules.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from enum import Enum


# ============================================================================
# FIBO Domain Models
# ============================================================================

class LightType(str, Enum):
    """Types of light sources."""
    AREA = "area"
    POINT = "point"
    DIRECTIONAL = "directional"
    SPOT = "spot"


class ColorSpace(str, Enum):
    """Supported color spaces."""
    SRGB = "sRGB"
    ACESCG = "ACEScg"
    LINEAR = "linear"


class FIBOLight(BaseModel):
    """Individual light source configuration."""
    type: LightType = Field(..., description="Type of light source")
    direction: str = Field(..., description="Light direction description")
    position: List[float] = Field(..., description="XYZ position coordinates")
    intensity: float = Field(..., ge=0, le=2.0, description="Light intensity (0-2)")
    color_temperature: int = Field(..., ge=2500, le=10000, description="Color temperature in Kelvin")
    softness: float = Field(..., ge=0, le=1.0, description="Light softness (0-1)")
    enabled: bool = Field(True, description="Whether light is enabled")
    distance: float = Field(..., ge=0.1, description="Distance from subject")
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "area",
                "direction": "45 degrees camera-right and above",
                "position": [0.7, 1.2, 0.8],
                "intensity": 1.0,
                "color_temperature": 5600,
                "softness": 0.4,
                "enabled": True,
                "distance": 1.5
            }
        }


class FIBOLighting(BaseModel):
    """Complete lighting setup."""
    main_light: FIBOLight = Field(..., description="Key/main light")
    fill_light: Optional[FIBOLight] = Field(None, description="Fill light")
    rim_light: Optional[FIBOLight] = Field(None, description="Rim/back light")
    ambient_light: Optional[Dict[str, Any]] = Field(None, description="Ambient light settings")
    lighting_style: str = Field("classical portrait", description="Lighting style name")


class FIBOCamera(BaseModel):
    """Camera configuration."""
    shot_type: str = Field(..., description="Type of shot")
    camera_angle: str = Field(..., description="Camera angle description")
    fov: int = Field(..., ge=10, le=180, description="Field of view in degrees")
    lens_type: str = Field(..., description="Lens type")
    aperture: str = Field(..., description="Aperture setting")
    focus_distance_m: float = Field(..., ge=0.1, description="Focus distance in meters")
    pitch: float = Field(0, ge=-90, le=90, description="Pitch angle in degrees")
    yaw: float = Field(0, ge=-180, le=180, description="Yaw angle in degrees")
    roll: float = Field(0, ge=-180, le=180, description="Roll angle in degrees")
    seed: int = Field(..., description="Random seed for reproducibility")


class FIBOSubject(BaseModel):
    """Subject description."""
    main_entity: str = Field(..., description="Main subject")
    attributes: str = Field(..., description="Subject attributes")
    action: str = Field(..., description="What the subject is doing")
    emotion: Optional[str] = Field(None, description="Emotional state")


class FIBOEnvironment(BaseModel):
    """Environment/scene description."""
    setting: str = Field(..., description="Scene setting")
    time_of_day: str = Field(..., description="Time of day")
    weather: str = Field(..., description="Weather conditions")
    interior_style: Optional[str] = Field(None, description="Interior style if applicable")


class FIBORender(BaseModel):
    """Render settings."""
    resolution: List[int] = Field(..., description="Resolution [width, height]")
    color_space: ColorSpace = Field(ColorSpace.ACESCG, description="Color space")
    bit_depth: int = Field(16, description="Bit depth")
    aov: List[str] = Field(default_factory=lambda: ["beauty", "diffuse", "specular", "depth"])
    samples: int = Field(40, ge=10, le=200, description="Render samples")
    denoiser: str = Field("automatic", description="Denoiser type")


class FIBOEnhancements(BaseModel):
    """Post-processing enhancements."""
    hdr: bool = Field(True, description="Enable HDR")
    professional_grade: bool = Field(True, description="Professional grade processing")
    color_fidelity: bool = Field(True, description="Color fidelity enhancement")
    contrast_enhance: float = Field(0.15, ge=0, le=1.0, description="Contrast enhancement")


class FIBOPrompt(BaseModel):
    """Complete FIBO JSON prompt structure."""
    subject: FIBOSubject
    environment: FIBOEnvironment
    camera: FIBOCamera
    lighting: FIBOLighting
    render: FIBORender
    enhancements: Optional[FIBOEnhancements] = None
    style_parameters: Optional[Dict[str, Any]] = None
    materials: Optional[Dict[str, Any]] = None
    meta: Optional[Dict[str, Any]] = None


# ============================================================================
# API Request Models
# ============================================================================

class GenerateRequest(BaseModel):
    """Request to generate an image."""
    scene_description: str = Field(..., description="Description of the scene")
    lighting_setup: Dict[str, Any] = Field(..., description="Lighting configuration")
    camera_settings: Optional[Dict[str, Any]] = Field(None, description="Camera settings")
    render_settings: Optional[Dict[str, Any]] = Field(None, description="Render settings")
    use_mock: bool = Field(True, description="Use mock FIBO API for testing")


class RefineRequest(BaseModel):
    """Request to refine a generation."""
    generation_id: str = Field(..., description="ID of generation to refine")
    instruction: str = Field(..., description="Refinement instruction")
    locked_fields: Optional[List[str]] = Field(None, description="Fields to keep locked")


class BatchGenerateRequest(BaseModel):
    """Request for batch generation."""
    items: List[Dict[str, Any]] = Field(..., description="Items to generate")
    preset_name: Optional[str] = Field(None, description="Preset to use")
    total_count: int = Field(..., ge=1, le=100, description="Total items to generate")


class PresetRequest(BaseModel):
    """Request for preset operations."""
    category: Optional[str] = Field(None, description="Filter by category")
    search: Optional[str] = Field(None, description="Search term")


class AnalysisRequest(BaseModel):
    """Request for lighting analysis."""
    lighting_setup: Dict[str, Any] = Field(..., description="Lighting to analyze")
    image_url: Optional[str] = Field(None, description="Generated image URL")


# ============================================================================
# API Response Models
# ============================================================================

class LightingAnalysis(BaseModel):
    """Lighting analysis results."""
    key_to_fill_ratio: float = Field(..., description="Key to fill light ratio")
    color_temperature_consistency: float = Field(..., description="Color temperature consistency score")
    professional_rating: float = Field(..., ge=1, le=10, description="Professional rating 1-10")
    recommendations: List[str] = Field(default_factory=list, description="Improvement recommendations")
    mood_assessment: str = Field(..., description="Mood assessment")


class GenerationResponse(BaseModel):
    """Response from generation request."""
    generation_id: str = Field(..., description="Unique generation ID")
    status: str = Field(..., description="Generation status")
    image_url: Optional[str] = Field(None, description="Generated image URL")
    duration_seconds: float = Field(..., description="Generation duration")
    cost_credits: float = Field(..., description="Credits used")
    fibo_json: Optional[Dict[str, Any]] = Field(None, description="FIBO JSON used")
    analysis: Optional[LightingAnalysis] = Field(None, description="Lighting analysis")


class PresetResponse(BaseModel):
    """Single preset response."""
    preset_id: str
    name: str
    category: str
    description: str
    lighting_config: Dict[str, Any]
    ideal_for: List[str]


class PresetListResponse(BaseModel):
    """List of presets response."""
    presets: List[PresetResponse]
    total: int
    page: int
    page_size: int


class HistoryItem(BaseModel):
    """Single history item."""
    generation_id: str
    timestamp: str
    scene_description: str
    image_url: str
    cost_credits: float
    preset_used: Optional[str] = None


class HistoryResponse(BaseModel):
    """Generation history response."""
    items: List[HistoryItem]
    total: int
    page: int
    page_size: int


class BatchJobResponse(BaseModel):
    """Batch job response."""
    batch_id: str
    status: str
    items_total: int
    items_completed: int
    total_cost: float
    created_at: str
    results: Optional[List[GenerationResponse]] = None


class ErrorResponse(BaseModel):
    """Error response."""
    status: str = "error"
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str
    timestamp: str


# ============================================================================
# Payment & Billing Models
# ============================================================================

class CreateCheckoutSessionRequest(BaseModel):
    """Request to create a Stripe checkout session."""
    priceId: str = Field(..., description="Stripe price ID")
    successUrl: str = Field(..., description="URL to redirect on success")
    cancelUrl: str = Field(..., description="URL to redirect on cancel")
    coupon: Optional[str] = Field(None, description="Optional coupon code")
    mode: str = Field("subscription", description="Payment mode: subscription or payment")


class CheckoutSessionResponse(BaseModel):
    """Response from checkout session creation."""
    id: str
    url: str


class CreatePortalSessionRequest(BaseModel):
    """Request to create a billing portal session."""
    customerId: str = Field(..., description="Stripe customer ID")
    returnUrl: str = Field(..., description="URL to return to after portal")


class PortalSessionResponse(BaseModel):
    """Response from portal session creation."""
    url: str


class InvoiceResponse(BaseModel):
    """Invoice information."""
    id: str
    amount_paid: int
    currency: str
    status: str
    hosted_invoice_url: str
    period_start: int
    period_end: int
    created: int


class InvoiceListResponse(BaseModel):
    """List of invoices."""
    invoices: List[InvoiceResponse]
    total: int


class RefundRequest(BaseModel):
    """Request to create a refund."""
    charge_id: str = Field(..., description="Stripe charge ID")
    amount_cents: Optional[int] = Field(None, description="Amount in cents (None for full refund)")
    reason: Optional[str] = Field(None, description="Refund reason")


class RefundResponse(BaseModel):
    """Refund response."""
    id: str
    amount: int
    currency: str
    status: str
    charge: str
