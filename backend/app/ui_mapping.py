"""
UI State to FIBO JSON Mapper
Converts frontend UI state (sliders, drag handles, controls) into FIBO JSON format.
"""

from typing import Dict, Any, List, Optional
import math
from app.models_fibo import (
    FiboPrompt, Camera, Lighting, Light, Render, Subject, Environment
)


def ui_to_fibo_json(ui_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert frontend UI state to FIBO JSON prompt.
    
    Expected UI state structure:
    {
        "subject_text": "silver watch on pedestal",
        "camera": {
            "fov": 55,
            "aperture": 2.8,
            "focus_distance_m": 1.0,
            "pitch": 0,
            "yaw": 0,
            "roll": 0
        },
        "lights": [
            {
                "id": "key",
                "name": "Key Light",
                "type": "area",
                "pos": [0.5, 1.2, 0.8],  # or position: {x, y, z}
                "intensity": 0.9,
                "kelvin": 5600,  # or color_temperature
                "softness": 0.3,
                "enabled": true
            },
            ...
        ],
        "render": {
            "resolution": [1024, 1024],
            "bit_depth": 8,
            "color_space": "sRGB"
        },
        "preset_name": "Product Three-Point",
        "seed": 12345
    }
    
    Returns:
        Dict[str, Any]: Valid FIBO JSON prompt structure
    """
    prompt: Dict[str, Any] = {
        "subject": {},
        "camera": {},
        "lighting": {},
        "render": {},
        "meta": {}
    }
    
    # Subject
    subject_text = ui_state.get("subject_text") or ui_state.get("subjectText") or "product"
    prompt["subject"] = {
        "main_entity": subject_text,
        "mainEntity": subject_text  # Support both formats
    }
    
    # Add subject attributes if provided
    if "subject_attributes" in ui_state:
        prompt["subject"]["attributes"] = ui_state["subject_attributes"]
    if "subject_action" in ui_state:
        prompt["subject"]["action"] = ui_state["subject_action"]
    
    # Camera
    cam = ui_state.get("camera", {})
    prompt["camera"] = {
        "fov": cam.get("fov", 50.0),
        "aperture": cam.get("aperture", 2.8),
        "focus_distance_m": cam.get("focus_distance_m") or cam.get("focusDistance") or 1.0,
        "pitch": cam.get("pitch", 0.0),
        "yaw": cam.get("yaw", 0.0),
        "roll": cam.get("roll", 0.0),
        "seed": ui_state.get("seed") or cam.get("seed")
    }
    
    # Add optional camera fields
    if "shot_type" in cam:
        prompt["camera"]["shot_type"] = cam["shot_type"]
    if "camera_angle" in cam:
        prompt["camera"]["camera_angle"] = cam["camera_angle"]
    if "lens_type" in cam:
        prompt["camera"]["lens_type"] = cam["lens_type"]
    
    # Lighting
    lights = ui_state.get("lights", [])
    lighting_dict: Dict[str, Any] = {}
    
    # Map light IDs to FIBO light types
    light_type_mapping = {
        "key": "main_light",
        "main": "main_light",
        "mainLight": "main_light",
        "fill": "fill_light",
        "fillLight": "fill_light",
        "rim": "rim_light",
        "back": "rim_light",
        "rimLight": "rim_light",
        "backLight": "rim_light"
    }
    
    for light in lights:
        # Skip disabled lights
        if not light.get("enabled", True):
            continue
        
        # Get light ID and map to FIBO type
        light_id = light.get("id") or light.get("name", "").lower()
        fibo_type = light_type_mapping.get(light_id, None)
        
        # If not recognized, assign to first available slot
        if not fibo_type:
            if "main_light" not in lighting_dict:
                fibo_type = "main_light"
            elif "fill_light" not in lighting_dict:
                fibo_type = "fill_light"
            elif "rim_light" not in lighting_dict:
                fibo_type = "rim_light"
            else:
                continue  # Skip additional lights beyond main/fill/rim
        
        # Extract position
        position = light.get("pos") or light.get("position")
        if isinstance(position, dict):
            pos_list = [position.get("x", 0), position.get("y", 0), position.get("z", 0)]
        elif isinstance(position, (list, tuple)) and len(position) >= 3:
            pos_list = list(position[:3])
        else:
            pos_list = [0.0, 1.0, 1.0]  # Default position
        
        # Convert position to direction (if needed)
        # FIBO can accept both position and direction
        direction = position_to_direction(pos_list)
        
        # Get color temperature (support both kelvin and color_temperature)
        color_temp = light.get("kelvin") or light.get("color_temperature") or light.get("colorTemperature") or 5600
        
        # Build FIBO light object
        fibo_light: Dict[str, Any] = {
            "type": light.get("type", "area"),
            "position": pos_list,
            "direction": direction,
            "intensity": float(light.get("intensity", 1.0)),
            "color_temperature": int(color_temp),
            "softness": float(light.get("softness", 0.5)),
            "enabled": True
        }
        
        # Add optional fields
        if "distance" in light:
            fibo_light["distance"] = light["distance"]
        
        lighting_dict[fibo_type] = fibo_light
    
    # Ensure at least a main light
    if "main_light" not in lighting_dict:
        lighting_dict["main_light"] = {
            "type": "area",
            "direction": "front-left",
            "intensity": 0.8,
            "color_temperature": 5600,
            "softness": 0.3,
            "enabled": True
        }
    
    prompt["lighting"] = lighting_dict
    
    # Add lighting style if provided
    if "lighting_style" in ui_state:
        prompt["lighting"]["lighting_style"] = ui_state["lighting_style"]
    
    # Render
    render = ui_state.get("render", {})
    prompt["render"] = {
        "resolution": render.get("resolution", [1024, 1024]),
        "bit_depth": render.get("bit_depth") or render.get("bitDepth") or 8,
        "color_space": render.get("color_space") or render.get("colorSpace") or "sRGB",
        "aov": render.get("aov", ["beauty"]),
        "samples": render.get("samples", 40)
    }
    
    # Environment (optional)
    if "environment" in ui_state:
        prompt["environment"] = ui_state["environment"]
    
    # Meta
    prompt["meta"] = {
        "preset_name": ui_state.get("preset_name"),
        "client": "ProLight AI",
        "version": "1.0.0"
    }
    
    # Enhancements (optional)
    if "enhancements" in ui_state:
        prompt["enhancements"] = ui_state["enhancements"]
    
    return prompt


def position_to_direction(
    pos: List[float],
    target: List[float] = [0, 0, 0]
) -> str:
    """
    Convert 3D light position to FIBO direction string.
    
    Args:
        pos: Light position [x, y, z]
        target: Target position (default: origin/subject)
        
    Returns:
        str: FIBO direction string (e.g., "front-left", "overhead")
    """
    if len(pos) < 3:
        return "front"
    
    dx = target[0] - pos[0]
    dy = target[1] - pos[1]
    dz = target[2] - pos[2]
    
    # Calculate elevation angle
    horizontal_distance = math.sqrt(dx * dx + dz * dz)
    if horizontal_distance == 0:
        if dy > 0:
            return "overhead"
        elif dy < 0:
            return "underneath"
        else:
            return "front"
    
    elevation = math.degrees(math.atan2(dy, horizontal_distance))
    
    # Check for overhead/underneath
    if elevation >= 60.0:
        return "overhead"
    elif elevation <= -60.0:
        return "underneath"
    
    # Calculate azimuth angle
    azimuth = math.degrees(math.atan2(dx, dz))
    
    # Map azimuth to horizontal directions (45° slices)
    if -22.5 <= azimuth <= 22.5:
        return "front"
    elif 22.5 < azimuth <= 67.5:
        return "front-right"
    elif 67.5 < azimuth <= 112.5:
        return "right"
    elif 112.5 < azimuth <= 157.5:
        return "back-right"
    elif azimuth > 157.5 or azimuth <= -157.5:
        return "back"
    elif -157.5 < azimuth <= -112.5:
        return "back-left"
    elif -112.5 < azimuth <= -67.5:
        return "left"
    elif -67.5 < azimuth <= -22.5:
        return "front-left"
    else:
        return "front"


def fibo_json_to_ui(fibo_prompt: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert FIBO JSON prompt back to UI state format.
    Useful for loading presets or editing existing prompts.
    
    Args:
        fibo_prompt: FIBO JSON prompt structure
        
    Returns:
        Dict[str, Any]: UI state format
    """
    ui_state: Dict[str, Any] = {
        "camera": {},
        "lights": [],
        "render": {}
    }
    
    # Subject
    subject = fibo_prompt.get("subject", {})
    ui_state["subject_text"] = subject.get("main_entity") or subject.get("mainEntity") or "product"
    
    # Camera
    camera = fibo_prompt.get("camera", {})
    ui_state["camera"] = {
        "fov": camera.get("fov", 50.0),
        "aperture": camera.get("aperture", 2.8),
        "focus_distance_m": camera.get("focus_distance_m", 1.0),
        "pitch": camera.get("pitch", 0.0),
        "yaw": camera.get("yaw", 0.0),
        "roll": camera.get("roll", 0.0)
    }
    if "seed" in camera:
        ui_state["seed"] = camera["seed"]
    
    # Lighting
    lighting = fibo_prompt.get("lighting", {})
    light_id_map = {
        "main_light": "key",
        "fill_light": "fill",
        "rim_light": "rim"
    }
    
    for fibo_key, ui_id in light_id_map.items():
        if fibo_key in lighting:
            light = lighting[fibo_key]
            ui_light = {
                "id": ui_id,
                "name": ui_id.capitalize() + " Light",
                "type": light.get("type", "area"),
                "pos": light.get("position", [0.0, 1.0, 1.0]),
                "intensity": light.get("intensity", 1.0),
                "kelvin": light.get("color_temperature", 5600),
                "softness": light.get("softness", 0.5),
                "enabled": light.get("enabled", True)
            }
            ui_state["lights"].append(ui_light)
    
    # Render
    render = fibo_prompt.get("render", {})
    ui_state["render"] = {
        "resolution": render.get("resolution", [1024, 1024]),
        "bit_depth": render.get("bit_depth") or render.get("bitDepth") or 8,
        "color_space": render.get("color_space") or render.get("colorSpace") or "sRGB"
    }
    
    # Meta
    meta = fibo_prompt.get("meta", {})
    if "preset_name" in meta:
        ui_state["preset_name"] = meta["preset_name"]
    
    return ui_state

