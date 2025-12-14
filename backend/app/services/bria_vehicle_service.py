"""
Bria Product Shot Editing API Service - Vehicle-Specific Operations
Handles vehicle shot generation, segmentation, reflections, tire refinement, effects, and harmonization.
"""

import logging
from typing import Optional, Dict, Any, List
from enum import Enum
import httpx
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class PlacementType(str, Enum):
    ORIGINAL = "original"
    AUTOMATIC = "automatic"
    MANUAL_PLACEMENT = "manual_placement"
    CUSTOM_COORDINATES = "custom_coordinates"
    MANUAL_PADDING = "manual_padding"
    AUTOMATIC_ASPECT_RATIO = "automatic_aspect_ratio"


class GenerationMode(str, Enum):
    BASE = "base"
    HIGH_CONTROL = "high_control"
    FAST = "fast"


class EffectType(str, Enum):
    DUST = "dust"
    SNOW = "snow"
    FOG = "fog"
    LIGHT_LEAKS = "light_leaks"
    LENS_FLARE = "lens_flare"


class HarmonizationPreset(str, Enum):
    WARM_DAY = "warm-day"
    COLD_DAY = "cold-day"
    WARM_NIGHT = "warm-night"
    COLD_NIGHT = "cold-night"


@dataclass
class SegmentationMasks:
    windshield: Optional[str] = None
    rear_window: Optional[str] = None
    side_windows: Optional[str] = None
    body: Optional[str] = None
    wheels: Optional[str] = None
    hubcap: Optional[str] = None
    tires: Optional[str] = None


class BriaVehicleShotService:
    """Service for Bria vehicle-specific product shot editing APIs."""
    
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.base_url = "https://engine.prod.bria-api.com/v1"
        self.headers = {
            "api_token": api_token,
            "Content-Type": "application/json",
        }
    
    async def generate_vehicle_shot_by_text(
        self,
        image_url: str,
        scene_description: str,
        placement_type: PlacementType = PlacementType.AUTOMATIC,
        num_results: int = 4,
        mode: GenerationMode = GenerationMode.FAST,
        optimize_description: bool = True,
        exclude_elements: Optional[str] = None,
        sync: bool = False,
        shot_size: Optional[List[int]] = None,
        aspect_ratio: Optional[str] = None,
        foreground_image_size: Optional[List[int]] = None,
        foreground_image_location: Optional[List[int]] = None,
        padding_values: Optional[List[int]] = None,
        manual_placement_selection: Optional[List[str]] = None,
        content_moderation: bool = False,
    ) -> Dict[str, Any]:
        """
        Generate vehicle shots by text description.
        Creates enriched automotive product shots with realistic environments.
        """
        payload = {
            "image_url": image_url,
            "scene_description": scene_description,
            "placement_type": placement_type.value,
            "num_results": num_results,
            "mode": mode.value,
            "optimize_description": optimize_description,
            "sync": sync,
            "shot_size": shot_size or [1000, 1000],
            "content_moderation": content_moderation,
        }
        
        if exclude_elements:
            payload["exclude_elements"] = exclude_elements
        if aspect_ratio:
            payload["aspect_ratio"] = aspect_ratio
        if foreground_image_size:
            payload["foreground_image_size"] = foreground_image_size
        if foreground_image_location:
            payload["foreground_image_location"] = foreground_image_location
        if padding_values:
            payload["padding_values"] = padding_values
        if manual_placement_selection:
            payload["manual_placement_selection"] = manual_placement_selection
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/product/vehicle/shot_by_text",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()
    
    async def segment_vehicle(self, image_url: str) -> SegmentationMasks:
        """
        Generate segmentation masks for vehicle parts.
        Returns binary masks for windows, wheels, body, and other components.
        """
        payload = {"image_url": image_url}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/product/vehicle/segment",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            data = response.json()
            return SegmentationMasks(**data)
    
    async def generate_reflections(
        self,
        image_url: str,
        masks: SegmentationMasks,
        layers: bool = False,
        seed: Optional[int] = None,
        content_moderation: bool = False,
    ) -> Dict[str, Any]:
        """
        Generate realistic reflections on vehicle surfaces.
        Applies reflections to glass, metal, and glossy surfaces.
        """
        masks_dict = {
            "windshield": masks.windshield,
            "rear_window": masks.rear_window,
            "side_windows": masks.side_windows,
            "body": masks.body,
            "wheels": masks.wheels,
        }
        masks_dict = {k: v for k, v in masks_dict.items() if v}
        
        payload = {
            "image_url": image_url,
            "masks": masks_dict,
            "layers": layers,
            "content_moderation": content_moderation,
        }
        if seed is not None:
            payload["seed"] = seed
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/product/vehicle/generate_reflections",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()
    
    async def refine_tires(
        self,
        image_url: str,
        tires_mask: Optional[str] = None,
        wheels_mask: Optional[str] = None,
        hubcap_mask: Optional[str] = None,
        layers: bool = False,
        content_moderation: bool = False,
    ) -> Dict[str, Any]:
        """
        Refine tire appearance with realistic textures.
        Adds textures for snow, mud, grass surfaces.
        """
        masks_dict = {}
        if tires_mask:
            masks_dict["tires"] = tires_mask
        if wheels_mask:
            masks_dict["wheels"] = wheels_mask
        if hubcap_mask:
            masks_dict["hubcap"] = hubcap_mask
        
        payload = {
            "image_url": image_url,
            "masks": masks_dict,
            "layers": layers,
            "content_moderation": content_moderation,
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/product/vehicle/refine_tires",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()
    
    async def apply_effect(
        self,
        image_url: str,
        effect: EffectType,
        layers: bool = False,
        seed: Optional[int] = None,
        content_moderation: bool = False,
    ) -> Dict[str, Any]:
        """
        Apply visual effects to vehicle images.
        Effects: dust, snow, fog, light leaks, lens flare.
        """
        payload = {
            "image_url": image_url,
            "effect": effect.value,
            "layers": layers,
            "content_moderation": content_moderation,
        }
        if seed is not None:
            payload["seed"] = seed
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/product/vehicle/apply_effect",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()
    
    async def harmonize_image(
        self,
        image_url: str,
        preset: HarmonizationPreset,
        content_moderation: bool = False,
    ) -> Dict[str, Any]:
        """
        Apply harmonization presets.
        Matches lighting and tone with environmental context.
        """
        payload = {
            "image_url": image_url,
            "preset": preset.value,
            "content_moderation": content_moderation,
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/product/vehicle/harmonize",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()
    
    async def complete_vehicle_enhancement(
        self,
        image_url: str,
        scene_description: str,
        include_reflections: bool = True,
        include_tire_refinement: bool = True,
        effects: Optional[List[EffectType]] = None,
        harmonization_preset: Optional[HarmonizationPreset] = None,
    ) -> Dict[str, Any]:
        """
        Complete workflow orchestrating all enhancements.
        """
        results = {
            "shot_url": None,
            "segmentation_masks": None,
            "reflections_url": None,
            "tire_refinement_url": None,
            "effect_urls": {},
            "harmonized_url": None,
            "workflow_steps": [],
            "errors": [],
        }
        
        try:
            # Step 1: Generate vehicle shot
            logger.info("Step 1: Generating vehicle shot...")
            shot_result = await self.generate_vehicle_shot_by_text(
                image_url=image_url,
                scene_description=scene_description,
                placement_type=PlacementType.AUTOMATIC,
                num_results=4,
                mode=GenerationMode.HIGH_CONTROL,
                optimize_description=True,
            )
            # Handle both single result_url and array of results
            if isinstance(shot_result, dict):
                results["shot_url"] = shot_result.get("result_url") or shot_result.get("url")
                # If multiple results, use the first one
                if not results["shot_url"] and "results" in shot_result:
                    results_list = shot_result.get("results", [])
                    if results_list and len(results_list) > 0:
                        results["shot_url"] = results_list[0].get("url") or results_list[0].get("result_url")
            results["workflow_steps"].append("vehicle_shot_generated")
            
            # Step 2: Segment vehicle
            logger.info("Step 2: Segmenting vehicle...")
            masks = await self.segment_vehicle(results["shot_url"])
            results["segmentation_masks"] = masks.__dict__
            results["workflow_steps"].append("vehicle_segmented")
            
            # Step 3: Generate reflections
            if include_reflections:
                logger.info("Step 3: Generating reflections...")
                try:
                    reflections = await self.generate_reflections(
                        image_url=results["shot_url"],
                        masks=masks,
                        layers=True,
                    )
                    results["reflections_url"] = reflections.get("url")
                    results["workflow_steps"].append("reflections_applied")
                except Exception as e:
                    logger.error(f"Reflections error: {e}")
                    results["errors"].append(str(e))
            
            # Step 4: Refine tires
            if include_tire_refinement:
                logger.info("Step 4: Refining tires...")
                try:
                    current_url = results["reflections_url"] or results["shot_url"]
                    tire_refinement = await self.refine_tires(
                        image_url=current_url,
                        tires_mask=masks.tires,
                        wheels_mask=masks.wheels,
                        hubcap_mask=masks.hubcap,
                        layers=True,
                    )
                    results["tire_refinement_url"] = tire_refinement.get("url")
                    results["workflow_steps"].append("tires_refined")
                except Exception as e:
                    logger.error(f"Tire refinement error: {e}")
                    results["errors"].append(str(e))
            
            # Step 5: Apply effects
            if effects:
                logger.info("Step 5: Applying effects...")
                current_url = results["tire_refinement_url"] or results["reflections_url"] or results["shot_url"]
                for effect in effects:
                    try:
                        effect_result = await self.apply_effect(
                            image_url=current_url,
                            effect=effect,
                            layers=False,
                        )
                        results["effect_urls"][effect.value] = effect_result.get("url")
                    except Exception as e:
                        logger.error(f"Effect {effect.value} error: {e}")
                        results["errors"].append(str(e))
                if results["effect_urls"]:
                    results["workflow_steps"].append("effects_applied")
            
            # Step 6: Harmonize
            if harmonization_preset:
                logger.info("Step 6: Harmonizing image...")
                try:
                    final_url = (
                        list(results["effect_urls"].values())[0]
                        if results["effect_urls"]
                        else results["tire_refinement_url"] or results["reflections_url"] or results["shot_url"]
                    )
                    harmonized = await self.harmonize_image(
                        image_url=final_url,
                        preset=harmonization_preset,
                    )
                    results["harmonized_url"] = harmonized.get("url")
                    results["workflow_steps"].append("harmonized")
                except Exception as e:
                    logger.error(f"Harmonization error: {e}")
                    results["errors"].append(str(e))
        
        except Exception as e:
            logger.error(f"Error in complete vehicle enhancement: {e}")
            results["errors"].append(str(e))
        
        return results
