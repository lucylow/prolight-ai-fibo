# backend/app/schemas_compose.py
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple, Dict, Any

class LightPatch(BaseModel):
    id: str
    intensity: Optional[float]
    kelvin: Optional[int]

class CameraAdjustment(BaseModel):
    fov: Optional[float]
    pan: Optional[float]   # yaw, degrees
    tilt: Optional[float]  # pitch, degrees
    note: Optional[str] = None

class CropProposal(BaseModel):
    x: int
    y: int
    width: int
    height: int
    score: float
    aspect: str

class AnalyzeResponse(BaseModel):
    width: int
    height: int
    centroid: Tuple[float, float]
    proposals: List[CropProposal]
    rule_of_thirds: Dict[str, Tuple[float, float]]  # the three intersections

class AnalyzeRequest(BaseModel):
    image_url: Optional[str] = None
    # if image is uploaded, endpoint will accept UploadFile
    aspect_ratios: Optional[List[str]] = Field(default_factory=lambda: ["1:1", "4:5", "3:2", "16:9"])
    target_coverage: Optional[float] = 0.6  # percent of min dimension crop should cover
    n_proposals: Optional[int] = 3

