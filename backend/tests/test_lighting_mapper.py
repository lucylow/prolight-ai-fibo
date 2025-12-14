"""
Unit tests for lighting_mapper module.
Tests vector-to-direction mapping and FIBO lighting conversion.
"""

import pytest
import math
from utils.lighting_mapper import (
    vector_to_direction,
    lights_to_fibo_lighting,
    get_light_position_from_direction,
    normalize_vector
)


class TestVectorToDirection:
    """Test vector_to_direction function."""
    
    def test_front_direction(self):
        """Test front direction (0° azimuth)."""
        assert vector_to_direction(0, 0, 1) == "front"
        assert vector_to_direction(0, 0, 10) == "front"
    
    def test_front_right_direction(self):
        """Test front-right direction (45° azimuth)."""
        assert vector_to_direction(1, 0, 1) == "front-right"
        assert vector_to_direction(5, 0, 5) == "front-right"
    
    def test_right_direction(self):
        """Test right direction (90° azimuth)."""
        assert vector_to_direction(1, 0, 0) == "right"
        assert vector_to_direction(10, 0, 0) == "right"
    
    def test_back_right_direction(self):
        """Test back-right direction (135° azimuth)."""
        assert vector_to_direction(1, 0, -1) == "back-right"
    
    def test_back_direction(self):
        """Test back direction (180° azimuth)."""
        assert vector_to_direction(0, 0, -1) == "back"
        assert vector_to_direction(0, 0, -10) == "back"
    
    def test_back_left_direction(self):
        """Test back-left direction (-135° azimuth)."""
        assert vector_to_direction(-1, 0, -1) == "back-left"
    
    def test_left_direction(self):
        """Test left direction (-90° azimuth)."""
        assert vector_to_direction(-1, 0, 0) == "left"
        assert vector_to_direction(-10, 0, 0) == "left"
    
    def test_front_left_direction(self):
        """Test front-left direction (-45° azimuth)."""
        assert vector_to_direction(-1, 0, 1) == "front-left"
        assert vector_to_direction(-5, 0, 5) == "front-left"
    
    def test_overhead_direction(self):
        """Test overhead direction (elevation >= 60°)."""
        assert vector_to_direction(0, 10, 0) == "overhead"
        assert vector_to_direction(1, 10, 1) == "overhead"
        # Just above 60° elevation
        assert vector_to_direction(0, 2, 1) == "overhead"
    
    def test_underneath_direction(self):
        """Test underneath direction (elevation <= -60°)."""
        assert vector_to_direction(0, -10, 0) == "underneath"
        assert vector_to_direction(1, -10, 1) == "underneath"
        # Just below -60° elevation
        assert vector_to_direction(0, -2, 1) == "underneath"
    
    def test_boundary_values(self):
        """Test boundary values between directions."""
        # Test 22.5° boundary (front/front-right)
        angle_rad = math.radians(22.5)
        x = math.sin(angle_rad)
        z = math.cos(angle_rad)
        # At exactly 22.5°, should be front-right (just over boundary)
        result = vector_to_direction(x, 0, z)
        assert result in ["front", "front-right"]
        
        # Test 67.5° boundary (front-right/right)
        angle_rad = math.radians(67.5)
        x = math.sin(angle_rad)
        z = math.cos(angle_rad)
        assert vector_to_direction(x, 0, z) == "front-right"
        
        # Test 112.5° boundary (right/back-right)
        angle_rad = math.radians(112.5)
        x = math.sin(angle_rad)
        z = math.cos(angle_rad)
        assert vector_to_direction(x, 0, z) == "right"
    
    def test_zero_vector(self):
        """Test zero vector (defaults to front)."""
        assert vector_to_direction(0, 0, 0) == "front"
    
    def test_negative_coordinates(self):
        """Test negative coordinates."""
        assert vector_to_direction(-1, -1, -1) == "back-left"
        assert vector_to_direction(-5, 2, 3) == "front-left"


class TestLightsToFiboLighting:
    """Test lights_to_fibo_lighting function."""
    
    def test_single_main_light(self):
        """Test conversion of single main light."""
        lights = [
            {
                "id": "key",
                "type": "directional",
                "position": {"x": 1, "y": 2, "z": 3},
                "intensity": 0.8,
                "color_temperature": 5600,
                "softness": 0.3
            }
        ]
        
        result = lights_to_fibo_lighting(lights)
        
        assert "lighting" in result
        assert "main_light" in result["lighting"]
        
        main_light = result["lighting"]["main_light"]
        # Direction should be one of the valid front-ish directions
        assert main_light["direction"] in ["front", "front-right", "front-left"]
        assert main_light["intensity"] == 0.8
        assert main_light["color_temperature"] == 5600
        assert main_light["softness"] == 0.3
    
    def test_three_point_lighting(self):
        """Test classic three-point lighting setup."""
        lights = [
            {
                "id": "key",
                "position": {"x": 0.7, "y": 1.2, "z": 0.8},
                "intensity": 1.0,
                "color_temperature": 5600,
                "softness": 0.4
            },
            {
                "id": "fill",
                "position": {"x": -0.5, "y": 0.6, "z": 1.0},
                "intensity": 0.4,
                "color_temperature": 5600,
                "softness": 0.7
            },
            {
                "id": "rim",
                "position": {"x": 0, "y": 1.0, "z": -1.5},
                "intensity": 0.6,
                "color_temperature": 3200,
                "softness": 0.2
            }
        ]
        
        result = lights_to_fibo_lighting(lights)
        
        assert "lighting" in result
        assert "main_light" in result["lighting"]
        assert "fill_light" in result["lighting"]
        assert "rim_light" in result["lighting"]
        
        # Check main light
        assert result["lighting"]["main_light"]["direction"] == "front-right"
        assert result["lighting"]["main_light"]["intensity"] == 1.0
        
        # Check fill light
        assert result["lighting"]["fill_light"]["direction"] == "front-left"
        assert result["lighting"]["fill_light"]["intensity"] == 0.4
        
        # Check rim light
        assert result["lighting"]["rim_light"]["direction"] == "back"
        assert result["lighting"]["rim_light"]["intensity"] == 0.6
    
    def test_disabled_light(self):
        """Test that disabled lights are skipped."""
        lights = [
            {
                "id": "key",
                "position": {"x": 1, "y": 1, "z": 1},
                "intensity": 0.8,
                "color_temperature": 5600,
                "softness": 0.3,
                "enabled": True
            },
            {
                "id": "fill",
                "position": {"x": -1, "y": 1, "z": 1},
                "intensity": 0.4,
                "color_temperature": 5600,
                "softness": 0.7,
                "enabled": False
            }
        ]
        
        result = lights_to_fibo_lighting(lights)
        
        assert "main_light" in result["lighting"]
        assert "fill_light" not in result["lighting"]
    
    def test_position_as_list(self):
        """Test position provided as list instead of dict."""
        lights = [
            {
                "id": "key",
                "position": [1.0, 2.0, 3.0],
                "intensity": 0.8,
                "color_temperature": 5600,
                "softness": 0.3
            }
        ]
        
        result = lights_to_fibo_lighting(lights)
        
        assert "main_light" in result["lighting"]
        # Should successfully parse position as list
        assert result["lighting"]["main_light"]["direction"] in ["front", "front-right", "front-left"]
    
    def test_camelCase_properties(self):
        """Test support for camelCase property names."""
        lights = [
            {
                "id": "mainLight",
                "position": {"x": 1, "y": 1, "z": 1},
                "intensity": 0.8,
                "colorTemperature": 5600,  # camelCase
                "softness": 0.3
            }
        ]
        
        result = lights_to_fibo_lighting(lights)
        
        assert "main_light" in result["lighting"]
        assert result["lighting"]["main_light"]["color_temperature"] == 5600
    
    def test_empty_lights_list(self):
        """Test empty lights list creates default main light."""
        lights = []
        
        result = lights_to_fibo_lighting(lights)
        
        assert "main_light" in result["lighting"]
        assert result["lighting"]["main_light"]["direction"] == "front-left"
    
    def test_unknown_light_id(self):
        """Test lights with unknown IDs are assigned sequentially."""
        lights = [
            {
                "id": "unknown1",
                "position": {"x": 1, "y": 0, "z": 1},
                "intensity": 0.8,
                "color_temperature": 5600,
                "softness": 0.3
            },
            {
                "id": "unknown2",
                "position": {"x": -1, "y": 0, "z": 1},
                "intensity": 0.4,
                "color_temperature": 5600,
                "softness": 0.7
            }
        ]
        
        result = lights_to_fibo_lighting(lights)
        
        # Should be assigned as main_light and fill_light
        assert "main_light" in result["lighting"]
        assert "fill_light" in result["lighting"]


class TestGetLightPositionFromDirection:
    """Test get_light_position_from_direction function."""
    
    def test_front_position(self):
        """Test front direction to position."""
        pos = get_light_position_from_direction("front", distance=2.0)
        assert pos["z"] > 0
        assert abs(pos["x"]) < 0.1
    
    def test_overhead_position(self):
        """Test overhead direction to position."""
        pos = get_light_position_from_direction("overhead", distance=2.0)
        assert pos["y"] == 2.0
        assert pos["x"] == 0
        assert pos["z"] == 0
    
    def test_underneath_position(self):
        """Test underneath direction to position."""
        pos = get_light_position_from_direction("underneath", distance=2.0)
        assert pos["y"] == -2.0
        assert pos["x"] == 0
        assert pos["z"] == 0
    
    def test_right_position(self):
        """Test right direction to position."""
        pos = get_light_position_from_direction("right", distance=2.0)
        assert pos["x"] > 0
        assert abs(pos["z"]) < 0.1


class TestNormalizeVector:
    """Test normalize_vector function."""
    
    def test_normalize_unit_vector(self):
        """Test normalizing a unit vector."""
        x, y, z = normalize_vector(1, 0, 0)
        assert abs(x - 1.0) < 0.001
        assert abs(y) < 0.001
        assert abs(z) < 0.001
    
    def test_normalize_arbitrary_vector(self):
        """Test normalizing an arbitrary vector."""
        x, y, z = normalize_vector(3, 4, 0)
        magnitude = math.sqrt(x*x + y*y + z*z)
        assert abs(magnitude - 1.0) < 0.001
    
    def test_normalize_zero_vector(self):
        """Test normalizing zero vector (defaults to front)."""
        x, y, z = normalize_vector(0, 0, 0)
        assert x == 0
        assert y == 0
        assert z == 1.0
