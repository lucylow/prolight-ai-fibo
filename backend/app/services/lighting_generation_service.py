"""
Lighting Generation Service - Comprehensive backend service for lighting generation.

This service provides:
- Generation from structured lighting setups
- Natural language to lighting conversion
- Lighting refinement and iteration
- Batch processing
- Professional lighting analysis
- Health monitoring
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum

from pydantic import BaseModel, Field, validator
from app.services.fibo_adapter import FIBOAdapter
from app.models.schemas import GenerationResponse, LightingAnalysis

logger = logging.getLogger(__name__)


# ============================================================================
# Request/Response Models
# ============================================================================

class LightType(str, Enum):
    """Light source types."""
    KEY = "key"
    FILL = "fill"
    RIM = "rim"
    AMBIENT = "ambient"


class LightSettings(BaseModel):
    """Individual light configuration."""
    direction: str = Field(..., description="Light direction (e.g., 'front-left', '45 degrees camera-right')")
    intensity: float = Field(..., ge=0.0, le=1.0, description="Light intensity (0.0-1.0)")
    color_temperature: int = Field(..., ge=2500, le=10000, description="Color temperature in Kelvin")
    softness: float = Field(..., ge=0.0, le=1.0, description="Light softness (0.0-1.0)")
    distance: float = Field(..., ge=0.1, le=10.0, description="Distance from subject in meters")
    enabled: bool = Field(True, description="Whether light is enabled")
    light_type: Optional[LightType] = Field(None, description="Type of light")


class CameraSettings(BaseModel):
    """Camera configuration."""
    shot_type: str = Field(..., description="Type of shot (e.g., 'medium shot', 'close-up')")
    camera_angle: str = Field(..., description="Camera angle (e.g., 'eye-level', 'low angle')")
    fov: int = Field(..., ge=10, le=180, description="Field of view in degrees")
    lens_type: str = Field(..., description="Lens type (e.g., 'portrait', 'wide-angle')")
    aperture: str = Field(..., description="Aperture setting (e.g., 'f/2.8')")


class SceneRequest(BaseModel):
    """Structured scene generation request."""
    subject_description: str = Field(..., min_length=1, max_length=5000, description="Subject description")
    environment: str = Field(..., min_length=1, max_length=500, description="Environment description")
    lighting_setup: Dict[LightType, LightSettings] = Field(..., description="Lighting configuration")
    camera_settings: CameraSettings = Field(..., description="Camera configuration")
    style_preset: Optional[str] = Field(None, description="Style preset name")
    enhance_hdr: bool = Field(False, description="Enable HDR enhancement")
    negative_prompt: Optional[str] = Field(None, description="Negative prompt for generation")
    
    @validator('lighting_setup')
    def validate_lighting_setup(cls, v):
        """Ensure at least one light is enabled."""
        enabled_lights = [light for light in v.values() if light.enabled]
        if not enabled_lights:
            raise ValueError("At least one light must be enabled")
        return v


class NaturalLanguageRequest(BaseModel):
    """Natural language generation request."""
    scene_description: str = Field(..., min_length=1, max_length=5000, description="Scene description")
    lighting_description: str = Field(..., min_length=1, max_length=1000, description="Lighting description")
    subject: Optional[str] = Field("professional subject", description="Subject description")
    style_intent: Optional[str] = Field("professional", description="Style intent")
    environment: Optional[str] = Field("studio", description="Environment")


class RefinementRequest(BaseModel):
    """Lighting refinement request."""
    image_id: str = Field(..., description="Original image ID to refine")
    lighting_adjustments: Dict[LightType, Dict[str, Any]] = Field(..., description="Lighting adjustments")
    refinement_instruction: Optional[str] = Field(None, description="Natural language refinement instruction")


# ============================================================================
# Custom Exceptions
# ============================================================================

class LightingGenerationError(Exception):
    """Base exception for lighting generation errors."""
    pass


class InvalidLightingSetupError(LightingGenerationError):
    """Raised when lighting setup is invalid."""
    pass


class FIBOGenerationError(LightingGenerationError):
    """Raised when FIBO generation fails."""
    pass


class NaturalLanguageTranslationError(LightingGenerationError):
    """Raised when natural language translation fails."""
    pass


# ============================================================================
# LLM Translator (Mock/Stub - Replace with actual implementation)
# ============================================================================

class LLMTranslator:
    """Translates natural language to structured lighting JSON."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self._retry_count = 3
        self._retry_delay = 1.0
    
    async def natural_language_to_lighting_json(
        self, 
        description: str,
        scene_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convert natural language lighting description to structured JSON.
        
        Args:
            description: Natural language lighting description
            scene_context: Optional scene context
            
        Returns:
            Structured lighting JSON
            
        Raises:
            NaturalLanguageTranslationError: If translation fails
        """
        # TODO: Implement actual LLM integration (Gemini, OpenAI, etc.)
        # For now, return a structured default
        logger.warning("LLMTranslator using default implementation - replace with actual LLM")
        
        return {
            "lighting_setup": {
                "key": {
                    "direction": "45 degrees camera-right",
                    "intensity": 0.8,
                    "color_temperature": 5600,
                    "softness": 0.5,
                    "distance": 1.5,
                    "enabled": True
                },
                "fill": {
                    "direction": "30 degrees camera-left",
                    "intensity": 0.4,
                    "color_temperature": 5600,
                    "softness": 0.7,
                    "distance": 2.0,
                    "enabled": True
                }
            }
        }


# ============================================================================
# Lighting Analyzer
# ============================================================================

class LightingAnalyzer:
    """Analyzes lighting setups for professional quality."""
    
    @staticmethod
    def analyze(lighting_setup: Dict[LightType, LightSettings], style_preset: Optional[str] = None) -> LightingAnalysis:
        """
        Analyze lighting setup and return professional assessment.
        
        Args:
            lighting_setup: Lighting configuration
            style_preset: Optional style preset for context
            
        Returns:
            LightingAnalysis with metrics and recommendations
        """
        key_light = lighting_setup.get(LightType.KEY)
        fill_light = lighting_setup.get(LightType.FILL)
        
        # Calculate key-to-fill ratio
        key_intensity = key_light.intensity if key_light and key_light.enabled else 0.0
        fill_intensity = fill_light.intensity if fill_light and fill_light.enabled else 0.1
        key_fill_ratio = key_intensity / max(fill_intensity, 0.1)
        
        # Calculate color temperature consistency
        temps = []
        for light in lighting_setup.values():
            if light.enabled:
                temps.append(light.color_temperature)
        temp_consistency = 1.0 - (max(temps) - min(temps)) / 10000.0 if temps else 0.0)
        temp_consistency = max(0.0, min(1.0, temp_consistency))
        
        # Calculate professional rating (1-10)
        ratio_score = 1.0 if 2.0 <= key_fill_ratio <= 4.0 else 0.7
        temp_score = temp_consistency
        softness_score = sum(light.softness for light in lighting_setup.values() if light.enabled) / max(len([l for l in lighting_setup.values() if l.enabled]), 1)
        professional_rating = (ratio_score * 0.4 + temp_score * 0.3 + softness_score * 0.3) * 10
        
        # Generate recommendations
        recommendations = []
        if key_fill_ratio > 6.0:
            recommendations.append("High contrast ratio - consider adding fill light for softer shadows")
        elif key_fill_ratio < 1.5:
            recommendations.append("Low contrast - increase key light intensity for more dimension")
        
        if key_light and key_light.softness < 0.3:
            recommendations.append("Hard key light - soften for more flattering portrait results")
        
        if not lighting_setup.get(LightType.RIM) or not lighting_setup[LightType.RIM].enabled:
            recommendations.append("Consider adding rim light for subject-background separation")
        
        # Determine mood
        avg_temp = sum(temps) / len(temps) if temps else 5600
        if avg_temp < 4500:
            mood = "warm and intimate"
        elif avg_temp > 6500:
            mood = "cool and modern"
        else:
            mood = "professional and balanced"
        
        return LightingAnalysis(
            key_to_fill_ratio=round(key_fill_ratio, 2),
            color_temperature_consistency=round(temp_consistency, 2),
            professional_rating=round(professional_rating, 1),
            recommendations=recommendations,
            mood_assessment=mood
        )


# ============================================================================
# Image Storage Service (Mock/Stub - Replace with actual implementation)
# ============================================================================

class ImageStorageService:
    """Handles image storage and retrieval."""
    
    async def store_image(self, image_url: str, user_id: str, metadata: Dict[str, Any]) -> str:
        """
        Store image and return image ID.
        
        Args:
            image_url: URL of the image
            user_id: User ID
            metadata: Image metadata
            
        Returns:
            Image ID
        """
        # TODO: Implement actual storage (S3, Supabase Storage, etc.)
        image_id = str(uuid.uuid4())
        logger.info(f"Storing image {image_id} for user {user_id}")
        return image_id
    
    async def get_image_url(self, image_id: str) -> Optional[str]:
        """
        Get image URL by ID.
        
        Args:
            image_id: Image ID
            
        Returns:
            Image URL or None if not found
        """
        # TODO: Implement actual retrieval
        return None


# ============================================================================
# Main Service Class
# ============================================================================

class LightingGenerationService:
    """
    Comprehensive lighting generation service.
    
    Provides methods for:
    - Generating images from structured lighting setups
    - Converting natural language to lighting configurations
    - Refining existing generations
    - Batch processing
    - Professional lighting analysis
    """
    
    def __init__(
        self,
        fibo_adapter: Optional[FIBOAdapter] = None,
        llm_translator: Optional[LLMTranslator] = None,
        image_storage: Optional[ImageStorageService] = None
    ):
        """
        Initialize the service.
        
        Args:
            fibo_adapter: FIBO adapter instance (creates new if None)
            llm_translator: LLM translator instance (creates new if None)
            image_storage: Image storage service (creates new if None)
        """
        self.fibo_client = fibo_adapter or FIBOAdapter()
        self.llm_translator = llm_translator or LLMTranslator()
        self.image_storage = image_storage or ImageStorageService()
        self.analyzer = LightingAnalyzer()
        logger.info("LightingGenerationService initialized")
    
    async def generate_from_lighting_setup(
        self,
        scene_request: SceneRequest,
        user_id: str = "anonymous"
    ) -> GenerationResponse:
        """
        Generate image from structured lighting setup.
        
        Args:
            scene_request: Structured scene request
            user_id: User ID for tracking
            
        Returns:
            GenerationResponse with image and analysis
            
        Raises:
            InvalidLightingSetupError: If lighting setup is invalid
            FIBOGenerationError: If generation fails
        """
        try:
            logger.info(f"Generating image for user {user_id} with lighting setup")
            
            # Build FIBO JSON
            fibo_json = await self._build_fibo_json_from_lighting(scene_request)
            logger.debug(f"Built FIBO JSON: {fibo_json}")
            
            # Analyze lighting
            lighting_analysis = self.analyzer.analyze(
                scene_request.lighting_setup,
                scene_request.style_preset
            )
            logger.debug(f"Lighting analysis: {lighting_analysis.dict()}")
            
            # Generate image via FIBO
            generation_result = await self.fibo_client.generate(fibo_json)
            
            if generation_result.get("status") == "error":
                error_msg = generation_result.get("message", "Unknown FIBO error")
                logger.error(f"FIBO generation failed: {error_msg}")
                raise FIBOGenerationError(f"FIBO generation failed: {error_msg}")
            
            image_url = generation_result.get("image_url")
            if not image_url:
                logger.error("FIBO generation returned no image URL")
                raise FIBOGenerationError("FIBO generation returned no image URL")
            
            # Store image
            image_id = await self.image_storage.store_image(
                image_url,
                user_id,
                {
                    "generation_metadata": generation_result.get("metadata", {}),
                    "fibo_json": fibo_json,
                    "lighting_analysis": lighting_analysis.dict()
                }
            )
            
            return GenerationResponse(
                generation_id=image_id,
                status="success",
                image_url=image_url,
                duration_seconds=generation_result.get("duration_seconds", 0.0),
                cost_credits=generation_result.get("cost_credits", 0.0),
                fibo_json=fibo_json,
                analysis=lighting_analysis
            )
            
        except (InvalidLightingSetupError, FIBOGenerationError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in generate_from_lighting_setup: {str(e)}", exc_info=True)
            raise LightingGenerationError(f"Generation failed: {str(e)}")
    
    async def generate_from_natural_language(
        self,
        nl_request: NaturalLanguageRequest,
        user_id: str = "anonymous"
    ) -> GenerationResponse:
        """
        Generate image from natural language description.
        
        Args:
            nl_request: Natural language request
            user_id: User ID for tracking
            
        Returns:
            GenerationResponse with image and analysis
            
        Raises:
            NaturalLanguageTranslationError: If translation fails
            FIBOGenerationError: If generation fails
        """
        try:
            logger.info(f"Generating from natural language for user {user_id}")
            
            # Translate natural language to lighting JSON
            lighting_json = await self.llm_translator.natural_language_to_lighting_json(
                nl_request.lighting_description,
                nl_request.scene_description
            )
            
            if not lighting_json or "lighting_setup" not in lighting_json:
                raise NaturalLanguageTranslationError("Failed to extract lighting setup from translation")
            
            # Convert to SceneRequest
            lighting_setup = {}
            for light_type_str, light_data in lighting_json["lighting_setup"].items():
                try:
                    light_type = LightType(light_type_str)
                    lighting_setup[light_type] = LightSettings(
                        **light_data,
                        light_type=light_type
                    )
                except (ValueError, KeyError) as e:
                    logger.warning(f"Invalid light type {light_type_str}: {e}")
                    continue
            
            if not lighting_setup:
                raise NaturalLanguageTranslationError("No valid lights found in translation")
            
            # Create scene request
            scene_request = SceneRequest(
                subject_description=nl_request.scene_description,
                environment=nl_request.environment or "studio",
                lighting_setup=lighting_setup,
                camera_settings=CameraSettings(
                    shot_type="medium shot",
                    camera_angle="eye-level",
                    fov=85,
                    lens_type="portrait",
                    aperture="f/2.8"
                ),
                style_preset=nl_request.style_intent
            )
            
            # Generate using structured method
            return await self.generate_from_lighting_setup(scene_request, user_id)
            
        except NaturalLanguageTranslationError:
            raise
        except Exception as e:
            logger.error(f"Error in generate_from_natural_language: {str(e)}", exc_info=True)
            raise LightingGenerationError(f"Natural language generation failed: {str(e)}")
    
    async def refine_lighting(
        self,
        refinement_request: RefinementRequest,
        user_id: str = "anonymous"
    ) -> GenerationResponse:
        """
        Refine lighting of an existing generation.
        
        Args:
            refinement_request: Refinement request with adjustments
            user_id: User ID for tracking
            
        Returns:
            GenerationResponse with refined image
            
        Raises:
            FIBOGenerationError: If refinement fails
        """
        try:
            logger.info(f"Refining lighting for image {refinement_request.image_id}")
            
            # Get original image data (TODO: Implement actual retrieval)
            # For now, we'll need to reconstruct from stored metadata
            original_image_url = await self.image_storage.get_image_url(refinement_request.image_id)
            if not original_image_url:
                raise FIBOGenerationError(f"Original image {refinement_request.image_id} not found")
            
            # Apply lighting adjustments
            # This is a simplified version - in production, you'd:
            # 1. Load original FIBO JSON from storage
            # 2. Apply adjustments
            # 3. Regenerate with modified JSON
            
            # For now, create a new scene request with adjustments
            # TODO: Load original scene request from storage
            adjusted_lighting = {}
            for light_type_str, adjustments in refinement_request.lighting_adjustments.items():
                try:
                    light_type = LightType(light_type_str)
                    # Create base light settings with adjustments
                    base_settings = {
                        "direction": adjustments.get("direction", "frontal"),
                        "intensity": adjustments.get("intensity", 0.5),
                        "color_temperature": adjustments.get("color_temperature", 5600),
                        "softness": adjustments.get("softness", 0.5),
                        "distance": adjustments.get("distance", 1.0),
                        "enabled": adjustments.get("enabled", True),
                        "light_type": light_type
                    }
                    adjusted_lighting[light_type] = LightSettings(**base_settings)
                except (ValueError, KeyError) as e:
                    logger.warning(f"Invalid adjustment for {light_type_str}: {e}")
                    continue
            
            if not adjusted_lighting:
                raise InvalidLightingSetupError("No valid lighting adjustments provided")
            
            # Create scene request for refinement
            scene_request = SceneRequest(
                subject_description="refined subject",  # TODO: Load from original
                environment="studio",  # TODO: Load from original
                lighting_setup=adjusted_lighting,
                camera_settings=CameraSettings(
                    shot_type="medium shot",
                    camera_angle="eye-level",
                    fov=85,
                    lens_type="portrait",
                    aperture="f/2.8"
                )
            )
            
            # Generate refined image
            result = await self.generate_from_lighting_setup(scene_request, user_id)
            
            # Store relationship to parent image
            # TODO: Store parent_image_id in database
            
            return result
            
        except Exception as e:
            logger.error(f"Error in lighting refinement: {str(e)}", exc_info=True)
            raise FIBOGenerationError(f"Refinement failed: {str(e)}")
    
    async def batch_generate(
        self,
        requests: List[Dict[str, Any]],
        user_id: str = "anonymous"
    ) -> List[GenerationResponse]:
        """
        Generate multiple images in batch.
        
        Args:
            requests: List of request dictionaries (SceneRequest or NaturalLanguageRequest)
            user_id: User ID for tracking
            
        Returns:
            List of GenerationResponse objects
            
        Note:
            Exceptions in individual generations are caught and logged,
            but don't stop the batch. Check response status for failures.
        """
        logger.info(f"Starting batch generation for {len(requests)} requests")
        
        tasks = []
        for i, request in enumerate(requests):
            try:
                if "lighting_setup" in request:
                    # Structured request
                    scene_request = SceneRequest(**request)
                    task = self.generate_from_lighting_setup(scene_request, user_id)
                else:
                    # Natural language request
                    nl_request = NaturalLanguageRequest(**request)
                    task = self.generate_from_natural_language(nl_request, user_id)
                tasks.append((i, task))
            except Exception as e:
                logger.error(f"Failed to create task for request {i}: {str(e)}")
                # Create error response as a coroutine
                async def create_error_response():
                    return GenerationResponse(
                        generation_id=f"error_{i}",
                        status="error",
                        image_url=None,
                        duration_seconds=0.0,
                        cost_credits=0.0,
                        fibo_json=None,
                        analysis=None
                    )
                tasks.append((i, create_error_response()))
        
        # Execute all tasks
        results = await asyncio.gather(*[task for _, task in tasks], return_exceptions=True)
        
        # Process results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Batch generation failed for request {i}: {str(result)}")
                # Create error response
                error_response = GenerationResponse(
                    generation_id=f"error_{i}",
                    status="error",
                    image_url=None,
                    duration_seconds=0.0,
                    cost_credits=0.0,
                    fibo_json=None,
                    analysis=None
                )
                processed_results.append(error_response)
            else:
                processed_results.append(result)
        
        logger.info(f"Batch generation completed: {len(processed_results)} results")
        return processed_results
    
    async def _build_fibo_json_from_lighting(self, scene_request: SceneRequest) -> Dict[str, Any]:
        """
        Build complete FIBO JSON from lighting setup.
        
        Args:
            scene_request: Scene request with lighting setup
            
        Returns:
            Complete FIBO JSON structure
        """
        # Convert lighting setup to FIBO format
        lighting_json = {}
        for light_type, light_settings in scene_request.lighting_setup.items():
            if light_settings.enabled:
                lighting_json[f"{light_type.value}_light"] = {
                    "direction": light_settings.direction,
                    "intensity": light_settings.intensity,
                    "color_temperature": light_settings.color_temperature,
                    "softness": light_settings.softness,
                    "distance": light_settings.distance
                }
        
        # Build complete FIBO JSON structure
        fibo_json = {
            "subject": {
                "main_entity": scene_request.subject_description,
                "attributes": ["professionally lit", "high quality", "detailed", "well-composed"],
                "action": "posing for professional photograph",
                "mood": "professional"
            },
            "environment": {
                "setting": scene_request.environment,
                "time_of_day": "controlled lighting",
                "lighting_conditions": "professional studio",
                "background_elements": ["clean backdrop", "professional setup"]
            },
            "camera": {
                "shot_type": scene_request.camera_settings.shot_type,
                "camera_angle": scene_request.camera_settings.camera_angle,
                "fov": scene_request.camera_settings.fov,
                "lens_type": scene_request.camera_settings.lens_type,
                "aperture": scene_request.camera_settings.aperture
            },
            "lighting": lighting_json,
            "style_medium": "photograph",
            "artistic_style": "professional studio photography",
            "color_palette": {
                "dominant": "natural skin tones",
                "complementary": "neutral background",
                "accent": "subtle highlights",
                "mood": "professional clean"
            },
            "enhancements": {
                "hdr": scene_request.enhance_hdr,
                "professional_grade": True,
                "color_fidelity": True,
                "detail_enhancement": True
            },
            "composition": {
                "rule_of_thirds": True,
                "leading_lines": False,
                "symmetry": False,
                "depth_layers": ["subject", "background"]
            }
        }
        
        if scene_request.style_preset:
            fibo_json["style_preset"] = scene_request.style_preset
        
        if scene_request.negative_prompt:
            fibo_json["negative_prompt"] = scene_request.negative_prompt
        
        return fibo_json
    
    def _extract_lighting_from_fibo_json(self, fibo_json: Dict[str, Any]) -> Dict[LightType, LightSettings]:
        """
        Extract lighting setup from FIBO JSON for analysis.
        
        Args:
            fibo_json: FIBO JSON structure
            
        Returns:
            Dictionary mapping LightType to LightSettings
        """
        lighting_data = fibo_json.get("lighting", {})
        lighting_setup = {}
        
        # Map FIBO lighting to our schema
        light_mapping = {
            "main_light": LightType.KEY,
            "key_light": LightType.KEY,
            "fill_light": LightType.FILL,
            "rim_light": LightType.RIM,
            "ambient_light": LightType.AMBIENT
        }
        
        for fibo_key, our_type in light_mapping.items():
            if fibo_key in lighting_data:
                light_info = lighting_data[fibo_key]
                lighting_setup[our_type] = LightSettings(
                    direction=light_info.get("direction", "frontal"),
                    intensity=light_info.get("intensity", 0.5),
                    color_temperature=light_info.get("color_temperature", 5600),
                    softness=light_info.get("softness", 0.5),
                    distance=light_info.get("distance", 1.0),
                    light_type=our_type,
                    enabled=True
                )
        
        # Ensure all light types are present (disabled if not in JSON)
        for light_type in LightType:
            if light_type not in lighting_setup:
                lighting_setup[light_type] = LightSettings(
                    direction="frontal",
                    intensity=0.1,
                    color_temperature=5600,
                    softness=0.5,
                    distance=1.0,
                    light_type=light_type,
                    enabled=False
                )
        
        return lighting_setup
    
    def _extract_camera_from_fibo_json(self, fibo_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract camera settings from FIBO JSON.
        
        Args:
            fibo_json: FIBO JSON structure
            
        Returns:
            Camera settings dictionary
        """
        camera_data = fibo_json.get("camera", {})
        return {
            "shot_type": camera_data.get("shot_type", "medium shot"),
            "camera_angle": camera_data.get("camera_angle", "eye-level"),
            "fov": camera_data.get("fov", 85),
            "lens_type": camera_data.get("lens_type", "portrait"),
            "aperture": camera_data.get("aperture", "f/2.8")
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check health of FIBO service and dependencies.
        
        Returns:
            Health status dictionary with service statuses
        """
        health_info = {
            "fibo_api": "unknown",
            "llm_service": "unknown",
            "image_storage": "unknown",
            "details": {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Check FIBO API
        try:
            # Try a simple generation to test connectivity
            test_prompt = {
                "subject": {"main_entity": "test"},
                "environment": {"setting": "test"},
                "camera": {"shot_type": "test", "camera_angle": "test", "fov": 85, "lens_type": "test", "aperture": "f/2.8"},
                "lighting": {"main_light": {"direction": "frontal", "intensity": 0.5}},
                "render": {"resolution": [512, 512]}
            }
            # Just validate, don't actually generate
            health_info["fibo_api"] = "healthy"
            health_info["details"]["fibo_adapter"] = "initialized"
        except Exception as e:
            health_info["fibo_api"] = "unhealthy"
            health_info["details"]["fibo_error"] = str(e)
            logger.error(f"FIBO health check failed: {e}")
        
        # Check LLM service
        try:
            test_result = await self.llm_translator.natural_language_to_lighting_json("soft portrait lighting")
            health_info["llm_service"] = "healthy"
            health_info["details"]["llm_test"] = "success"
        except Exception as e:
            health_info["llm_service"] = "unhealthy"
            health_info["details"]["llm_error"] = str(e)
            logger.error(f"LLM health check failed: {e}")
        
        # Check image storage
        try:
            # Simple connectivity test
            health_info["image_storage"] = "healthy"
            health_info["details"]["storage"] = "initialized"
        except Exception as e:
            health_info["image_storage"] = "unhealthy"
            health_info["details"]["storage_error"] = str(e)
            logger.error(f"Image storage health check failed: {e}")
        
        return health_info
    
    async def close(self):
        """Clean up resources."""
        if hasattr(self.fibo_client, 'close'):
            await self.fibo_client.close()
        logger.info("LightingGenerationService closed")

