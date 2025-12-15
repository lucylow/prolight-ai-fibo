"""
FIBO JSON Builder (Python)

Enhanced JSON-native generation utilities for Pro Lighting Simulator.
Supports VLM-based base JSON generation and precise 3D lighting control merging.
"""

import math
from typing import List, Dict, Any, Optional
from backend.utils.lighting_mapper import vector_to_direction, lights_to_fibo_lighting


def calculate_lighting_ratios(lighting_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate professional lighting ratios and style.
    
    Args:
        lighting_config: FIBO lighting configuration dictionary
        
    Returns:
        Dictionary with keyFillRatio, lightingStyle, shadowIntensity, contrastRatio
    """
    main_light = lighting_config.get("main_light", {})
    fill_light = lighting_config.get("fill_light", {})
    rim_light = lighting_config.get("rim_light", {})
    
    key_intensity = main_light.get("intensity", 0.8)
    fill_intensity = fill_light.get("intensity", 0.3)
    rim_intensity = rim_light.get("intensity", 0.0)
    
    # Key-to-fill ratio
    key_fill_ratio = key_intensity / max(fill_intensity, 0.1)
    
    # Determine lighting style based on ratio
    if key_fill_ratio > 4.0:
        lighting_style = "dramatic high-contrast"
    elif key_fill_ratio > 2.5:
        lighting_style = "classical portrait (Rembrandt/Loop)"
    elif key_fill_ratio > 1.5:
        lighting_style = "soft portrait"
    elif key_fill_ratio > 1.0:
        lighting_style = "balanced commercial"
    else:
        lighting_style = "flat even lighting"
    
    # Shadow intensity (inverse of fill)
    shadow_intensity = max(0, 1.0 - fill_intensity / max(key_intensity, 0.1))
    
    # Overall contrast ratio
    max_intensity = max(key_intensity, fill_intensity, rim_intensity)
    min_intensity = min(
        key_intensity if key_intensity > 0 else 1,
        fill_intensity if fill_intensity > 0 else 1,
        rim_intensity if rim_intensity > 0 else 1
    )
    contrast_ratio = max_intensity / max(min_intensity, 0.1)
    
    return {
        "keyFillRatio": key_fill_ratio,
        "lightingStyle": lighting_style,
        "shadowIntensity": shadow_intensity,
        "contrastRatio": contrast_ratio,
    }


def determine_mood_from_lighting(lighting_config: Dict[str, Any]) -> str:
    """
    Determine mood from lighting configuration.
    
    Args:
        lighting_config: FIBO lighting configuration dictionary
        
    Returns:
        Mood string description
    """
    main_light = lighting_config.get("main_light", {})
    fill_light = lighting_config.get("fill_light", {})
    
    key_temp = main_light.get("color_temperature", 5600)
    key_intensity = main_light.get("intensity", 0.8)
    fill_intensity = fill_light.get("intensity", 0.3)
    key_fill_ratio = key_intensity / max(fill_intensity, 0.1)
    
    # Warm colors suggest coziness
    is_warm = key_temp < 4500
    is_cool = key_temp > 6000
    
    # High contrast suggests drama
    if key_fill_ratio > 4.0:
        return "dramatic warm" if is_warm else "dramatic cool" if is_cool else "dramatic"
    elif key_fill_ratio > 2.0:
        return "intimate warm" if is_warm else "professional cool" if is_cool else "professional"
    else:
        return "comfortable cozy" if is_warm else "crisp clean" if is_cool else "neutral balanced"


def merge_base_json_with_lighting(
    base_json: Dict[str, Any],
    lighting_config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Merge VLM-generated base JSON with precise 3D lighting configuration.
    
    This is the core function for the Pro Lighting Simulator hack:
    1. Use VLM to generate base JSON from scene description
    2. Override lighting section with precise 3D-mapped lighting
    3. Enhance with professional lighting analysis
    
    Args:
        base_json: Base FIBO JSON from VLM
        lighting_config: FIBO lighting configuration from 3D lights
        
    Returns:
        Merged FIBO JSON with precise lighting control
    """
    import copy
    
    # Create a deep copy of base JSON
    merged_json = copy.deepcopy(base_json)
    
    # Calculate lighting ratios and style
    lighting_analysis = calculate_lighting_ratios(lighting_config)
    
    # Replace/merge lighting section with our precise configuration
    merged_json["lighting"] = lighting_config
    
    # Add lighting metadata
    if "lighting_style" not in merged_json["lighting"]:
        merged_json["lighting"]["lighting_style"] = lighting_analysis["lightingStyle"]
    if "shadow_intensity" not in merged_json["lighting"]:
        merged_json["lighting"]["shadow_intensity"] = lighting_analysis["shadowIntensity"]
    if "key_fill_ratio" not in merged_json["lighting"]:
        merged_json["lighting"]["key_fill_ratio"] = lighting_analysis["keyFillRatio"]
    
    # Update subject mood based on lighting
    if "subject" not in merged_json:
        merged_json["subject"] = {}
    if "mood" not in merged_json["subject"]:
        merged_json["subject"]["mood"] = determine_mood_from_lighting(lighting_config)
    
    # Update color palette based on lighting temperatures
    main_light = lighting_config.get("main_light", {})
    key_temp = main_light.get("color_temperature", 5600)
    
    if "color_palette" not in merged_json:
        merged_json["color_palette"] = {}
    merged_json["color_palette"]["white_balance"] = f"{key_temp}K"
    merged_json["color_palette"]["mood"] = (
        "warm" if key_temp < 4500 else "cool" if key_temp > 6000 else "neutral"
    )
    
    # Ensure style settings
    if "style_medium" not in merged_json:
        merged_json["style_medium"] = "photograph"
    if "artistic_style" not in merged_json:
        merged_json["artistic_style"] = "professional studio photography"
    
    return merged_json


def build_fibo_json_from_scene_and_lights(
    scene_description: str,
    lights: List[Dict[str, Any]],
    camera_settings: Optional[Dict[str, Any]] = None,
    environment: Optional[str] = None
) -> Dict[str, Any]:
    """
    Build complete FIBO JSON from scene description and 3D lights.
    
    Convenience function that combines base JSON generation (via VLM) with 3D lighting override.
    
    Args:
        scene_description: Natural language scene description
        lights: List of 3D light definitions
        camera_settings: Optional camera settings dictionary
        environment: Optional environment description
        
    Returns:
        Complete FIBO JSON structure
    """
    # Convert 3D lights to FIBO lighting config
    lighting_result = lights_to_fibo_lighting(lights)
    lighting_config = lighting_result.get("lighting", {})
    
    # Create base JSON structure (in real implementation, this would come from VLM)
    from backend.utils.vlm_base_json import generate_base_json_from_scene
    
    base_json = generate_base_json_from_scene(scene_description)
    
    # Update with provided camera settings if available
    if camera_settings:
        if "camera" not in base_json:
            base_json["camera"] = {}
        base_json["camera"].update(camera_settings)
    
    # Update environment if provided
    if environment:
        if "environment" not in base_json:
            base_json["environment"] = {}
        base_json["environment"]["setting"] = environment
    
    # Merge with precise lighting
    return merge_base_json_with_lighting(base_json, lighting_config)

