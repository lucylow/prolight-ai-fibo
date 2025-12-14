"""
Lighting Mapper - Convert 3D light positions to FIBO direction strings.
Implements deterministic mapping from vector coordinates to canonical directions.
"""

import math
from typing import List, Dict, Any, Tuple


def vector_to_direction(x: float, y: float, z: float) -> str:
    """
    Convert a 3D vector to a canonical FIBO direction string.
    
    Coordinate system:
    - Subject at origin
    - Front is +Z
    - Right is +X
    - Up is +Y
    
    Args:
        x: X coordinate (right/left axis)
        y: Y coordinate (up/down axis)
        z: Z coordinate (front/back axis)
        
    Returns:
        str: One of: front, front-right, right, back-right, back, 
             back-left, left, front-left, overhead, underneath
    """
    # Handle zero vector
    if x == 0 and y == 0 and z == 0:
        return "front"
    
    # Calculate elevation angle (in degrees)
    horizontal_distance = math.sqrt(x * x + z * z)
    elevation = math.degrees(math.atan2(y, horizontal_distance))
    
    # Check for overhead/underneath first
    if elevation >= 60.0:
        return "overhead"
    elif elevation <= -60.0:
        return "underneath"
    
    # Calculate azimuth angle (in degrees, -180 to 180)
    azimuth = math.degrees(math.atan2(x, z))
    
    # Map azimuth to horizontal directions (45° slices)
    # Front: [-22.5, 22.5]
    if -22.5 <= azimuth <= 22.5:
        return "front"
    # Front-right: (22.5, 67.5]
    elif 22.5 < azimuth <= 67.5:
        return "front-right"
    # Right: (67.5, 112.5]
    elif 67.5 < azimuth <= 112.5:
        return "right"
    # Back-right: (112.5, 157.5]
    elif 112.5 < azimuth <= 157.5:
        return "back-right"
    # Back: > 157.5 or <= -157.5
    elif azimuth > 157.5 or azimuth <= -157.5:
        return "back"
    # Back-left: (-157.5, -112.5]
    elif -157.5 < azimuth <= -112.5:
        return "back-left"
    # Left: (-112.5, -67.5]
    elif -112.5 < azimuth <= -67.5:
        return "left"
    # Front-left: (-67.5, -22.5]
    elif -67.5 < azimuth <= -22.5:
        return "front-left"
    else:
        # Fallback (should not reach here)
        return "front"


def normalize_vector(x: float, y: float, z: float) -> Tuple[float, float, float]:
    """
    Normalize a 3D vector to unit length.
    
    Args:
        x, y, z: Vector components
        
    Returns:
        Tuple[float, float, float]: Normalized vector
    """
    magnitude = math.sqrt(x * x + y * y + z * z)
    if magnitude == 0:
        return (0.0, 0.0, 1.0)  # Default to front
    return (x / magnitude, y / magnitude, z / magnitude)


def lights_to_fibo_lighting(lights: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Convert a list of 3D light definitions to FIBO lighting JSON structure.
    
    Args:
        lights: List of light dictionaries with structure:
            {
                "id": "key" | "fill" | "rim" | etc.,
                "type": "directional" | "point" | "area",
                "position": {"x": float, "y": float, "z": float},
                "intensity": float (0.0-1.0),
                "color_temperature": int (Kelvin),
                "softness": float (0.0-1.0),
                "enabled": bool (optional)
            }
            
    Returns:
        Dict[str, Any]: FIBO lighting structure with main_light, fill_light, rim_light
    """
    fibo_lighting = {}
    
    # Map light IDs to FIBO light types
    light_type_mapping = {
        "key": "main_light",
        "main": "main_light",
        "fill": "fill_light",
        "rim": "rim_light",
        "back": "rim_light",
        "mainLight": "main_light",
        "fillLight": "fill_light",
        "rimLight": "rim_light",
        "backLight": "rim_light"
    }
    
    for light in lights:
        # Skip disabled lights
        if not light.get("enabled", True):
            continue
        
        # Get light ID and map to FIBO type
        light_id = light.get("id", "")
        fibo_type = light_type_mapping.get(light_id, None)
        
        if not fibo_type:
            # Try to infer from position if ID not recognized
            # Use first three lights as main, fill, rim
            if "main_light" not in fibo_lighting:
                fibo_type = "main_light"
            elif "fill_light" not in fibo_lighting:
                fibo_type = "fill_light"
            elif "rim_light" not in fibo_lighting:
                fibo_type = "rim_light"
            else:
                continue  # Skip additional lights
        
        # Extract position
        position = light.get("position", {})
        if isinstance(position, dict):
            x = position.get("x", 0)
            y = position.get("y", 0)
            z = position.get("z", 0)
        elif isinstance(position, (list, tuple)) and len(position) >= 3:
            x, y, z = position[0], position[1], position[2]
        else:
            x, y, z = 0, 0, 1  # Default to front
        
        # Convert position to direction
        direction = vector_to_direction(x, y, z)
        
        # Build FIBO light object
        fibo_light = {
            "direction": direction,
            "intensity": light.get("intensity", 0.8),
            "color_temperature": light.get("color_temperature", light.get("colorTemperature", 5600)),
            "softness": light.get("softness", 0.5)
        }
        
        fibo_lighting[fibo_type] = fibo_light
    
    # Ensure we have at least a main light
    if "main_light" not in fibo_lighting:
        fibo_lighting["main_light"] = {
            "direction": "front-left",
            "intensity": 0.8,
            "color_temperature": 5600,
            "softness": 0.3
        }
    
    return {"lighting": fibo_lighting}


def get_light_position_from_direction(direction: str, distance: float = 2.0) -> Dict[str, float]:
    """
    Convert a FIBO direction string back to a 3D position (inverse mapping).
    Useful for visualization or testing.
    
    Args:
        direction: FIBO direction string
        distance: Distance from origin
        
    Returns:
        Dict[str, float]: Position with x, y, z keys
    """
    # Direction to angle mapping (azimuth in degrees)
    direction_angles = {
        "front": 0,
        "front-right": 45,
        "right": 90,
        "back-right": 135,
        "back": 180,
        "back-left": -135,
        "left": -90,
        "front-left": -45,
        "overhead": 0,  # Special case
        "underneath": 0  # Special case
    }
    
    if direction == "overhead":
        return {"x": 0, "y": distance, "z": 0}
    elif direction == "underneath":
        return {"x": 0, "y": -distance, "z": 0}
    
    azimuth = direction_angles.get(direction, 0)
    azimuth_rad = math.radians(azimuth)
    
    # Assume 30° elevation for horizontal directions
    elevation_rad = math.radians(30)
    
    x = distance * math.sin(azimuth_rad) * math.cos(elevation_rad)
    y = distance * math.sin(elevation_rad)
    z = distance * math.cos(azimuth_rad) * math.cos(elevation_rad)
    
    return {"x": x, "y": y, "z": z}
