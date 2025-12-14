"""
Mock Data for ProLight AI - Development and Testing
Contains presets, FIBO templates, generation history, and test fixtures.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any

# ============================================================================
# FIBO JSON Prompt Templates
# ============================================================================

FIBO_PORTRAIT_TEMPLATE = {
    "subject": {
        "mainEntity": "professional model in black dress",
        "attributes": "elegant, composed, high fashion",
        "action": "posing for professional portrait",
        "emotion": "confident, serene"
    },
    "environment": {
        "setting": "minimalist studio with gray backdrop",
        "timeOfDay": "controlled studio lighting",
        "weather": "indoor, artificial lighting",
        "interiorStyle": "contemporary, neutral"
    },
    "camera": {
        "shotType": "medium close-up",
        "cameraAngle": "eye-level",
        "fov": 85,
        "lensType": "portrait 85mm",
        "aperture": "f/2.8",
        "focusDistance_m": 2.5,
        "pitch": 0,
        "yaw": 0,
        "roll": 0,
        "seed": 42
    },
    "lighting": {
        "mainLight": {
            "type": "area",
            "direction": "45 degrees camera-right and above",
            "position": [0.7, 1.2, 0.8],
            "intensity": 1.0,
            "colorTemperature": 5600,
            "softness": 0.4,
            "enabled": True,
            "distance": 1.5
        },
        "fillLight": {
            "type": "point",
            "direction": "30 degrees camera-left",
            "position": [-0.5, 0.6, 1.0],
            "intensity": 0.4,
            "colorTemperature": 5600,
            "softness": 0.7,
            "enabled": True,
            "distance": 2.0
        },
        "rimLight": {
            "type": "directional",
            "direction": "behind and slightly above",
            "position": [0.0, 1.2, -0.8],
            "intensity": 0.6,
            "colorTemperature": 3200,
            "softness": 0.3,
            "enabled": True,
            "distance": 1.0
        },
        "ambientLight": {
            "intensity": 0.1,
            "colorTemperature": 5500
        },
        "lightingStyle": "classical portrait"
    },
    "render": {
        "resolution": [2048, 2048],
        "colorSpace": "ACEScg",
        "bitDepth": 16,
        "aov": ["beauty", "diffuse", "specular", "depth", "maskSubject"],
        "samples": 40,
        "denoiser": "automatic"
    },
    "enhancements": {
        "hdr": True,
        "professionalGrade": True,
        "colorFidelity": True,
        "contrastEnhance": 0.15
    }
}

FIBO_PRODUCT_TEMPLATE = {
    "subject": {
        "mainEntity": "professional product—silver wristwatch on pedestal",
        "attributes": "luxury, high-contrast, studio-isolated",
        "action": "displayed on minimal platform for product photography"
    },
    "environment": {
        "setting": "minimalist product studio with neutral gray seamless backdrop",
        "timeOfDay": "controlled studio lighting",
        "weather": "indoor, artificial lighting",
        "interiorStyle": "clean, professional studio"
    },
    "camera": {
        "shotType": "macro product shot",
        "cameraAngle": "eye-level, slight 15-degree tilt",
        "fov": 50,
        "lensType": "macro 100mm",
        "aperture": "f/5.6",
        "focusDistance_m": 0.3,
        "pitch": -15,
        "yaw": 0,
        "roll": 0,
        "seed": 98765
    },
    "lighting": {
        "mainLight": {
            "type": "area",
            "direction": "45 degrees camera-right and 60 degrees above",
            "position": [0.8, 1.5, 0.6],
            "intensity": 1.2,
            "colorTemperature": 5600,
            "softness": 0.25,
            "enabled": True,
            "distance": 1.8
        },
        "fillLight": {
            "type": "area",
            "direction": "30 degrees camera-left",
            "position": [-0.6, 0.4, 0.8],
            "intensity": 0.25,
            "colorTemperature": 5600,
            "softness": 0.9,
            "enabled": True,
            "distance": 2.5
        },
        "rimLight": {
            "type": "directional",
            "direction": "directly behind product",
            "position": [0.0, 0.8, -0.9],
            "intensity": 0.5,
            "colorTemperature": 6500,
            "softness": 0.2,
            "enabled": True,
            "distance": 1.2
        },
        "ambientLight": {
            "intensity": 0.08,
            "colorTemperature": 5500
        },
        "lightingStyle": "high-contrast product"
    },
    "render": {
        "resolution": [3200, 3200],
        "colorSpace": "ACEScg",
        "bitDepth": 16,
        "aov": ["beauty", "diffuse", "specular", "reflection", "depth", "maskProduct"],
        "samples": 50
    },
    "enhancements": {
        "hdr": True,
        "professionalGrade": True,
        "colorFidelity": True,
        "contrastEnhance": 0.20
    }
}

# ============================================================================
# Professional Lighting Presets
# ============================================================================

LIGHTING_PRESETS = [
    {
        "presetId": "butterfly_classic",
        "name": "Butterfly Classic",
        "category": "portrait",
        "description": "Soft, flattering beauty lighting with butterfly shadow under nose",
        "ideal_for": ["beauty", "commercial", "headshots", "podcast"],
        "lighting": {
            "mainLight": {
                "type": "area",
                "direction": "directly above and slightly forward",
                "position": [0.0, 1.5, 0.3],
                "intensity": 1.0,
                "colorTemperature": 5600,
                "softness": 0.8,
                "enabled": True,
                "distance": 1.2
            },
            "fillLight": {
                "type": "area",
                "direction": "below camera, centered",
                "position": [0.0, -0.3, 0.5],
                "intensity": 0.5,
                "colorTemperature": 5600,
                "softness": 0.9,
                "enabled": True,
                "distance": 1.5
            },
            "rimLight": {
                "type": "directional",
                "direction": "behind, both sides",
                "position": [0.0, 1.0, -1.0],
                "intensity": 0.4,
                "colorTemperature": 5600,
                "softness": 0.6,
                "enabled": False,
                "distance": 1.5
            }
        },
        "camera": {
            "fov": 85,
            "aperture": "f/2.8",
            "seed": 12345
        }
    },
    {
        "presetId": "rembrandt_classic",
        "name": "Rembrandt Classic",
        "category": "portrait",
        "description": "Dramatic side lighting with characteristic triangle under eye",
        "ideal_for": ["dramatic", "editorial", "fine art", "male portraits"],
        "lighting": {
            "mainLight": {
                "type": "area",
                "direction": "45 degrees camera-left and above",
                "position": [-0.7, 1.3, 0.5],
                "intensity": 1.1,
                "colorTemperature": 4500,
                "softness": 0.5,
                "enabled": True,
                "distance": 1.4
            },
            "fillLight": {
                "type": "area",
                "direction": "30 degrees camera-right",
                "position": [0.5, 0.8, 0.8],
                "intensity": 0.3,
                "colorTemperature": 5600,
                "softness": 0.8,
                "enabled": True,
                "distance": 2.0
            },
            "rimLight": {
                "type": "directional",
                "direction": "behind right",
                "position": [0.8, 1.0, -0.8],
                "intensity": 0.5,
                "colorTemperature": 3200,
                "softness": 0.4,
                "enabled": True,
                "distance": 1.2
            }
        },
        "camera": {
            "fov": 75,
            "aperture": "f/2.0",
            "seed": 54321
        }
    },
    {
        "presetId": "loop_lighting",
        "name": "Loop Lighting",
        "category": "portrait",
        "description": "Subtle side lighting creating small shadow loop on cheek",
        "ideal_for": ["beauty", "commercial", "corporate", "headshots"],
        "lighting": {
            "mainLight": {
                "type": "area",
                "direction": "30 degrees camera-right and above",
                "position": [0.5, 1.2, 0.6],
                "intensity": 1.0,
                "colorTemperature": 5600,
                "softness": 0.6,
                "enabled": True,
                "distance": 1.3
            },
            "fillLight": {
                "type": "area",
                "direction": "camera-left",
                "position": [-0.3, 0.7, 1.0],
                "intensity": 0.6,
                "colorTemperature": 5600,
                "softness": 0.8,
                "enabled": True,
                "distance": 1.8
            },
            "rimLight": {
                "type": "directional",
                "direction": "behind",
                "position": [0.0, 1.0, -0.9],
                "intensity": 0.3,
                "colorTemperature": 5600,
                "softness": 0.5,
                "enabled": False,
                "distance": 1.5
            }
        },
        "camera": {
            "fov": 85,
            "aperture": "f/2.8",
            "seed": 11111
        }
    },
    {
        "presetId": "split_dramatic",
        "name": "Split Dramatic",
        "category": "portrait",
        "description": "High contrast split lighting for dramatic effect",
        "ideal_for": ["dramatic", "editorial", "fashion", "character"],
        "lighting": {
            "mainLight": {
                "type": "area",
                "direction": "90 degrees camera-left and above",
                "position": [-1.0, 1.4, 0.0],
                "intensity": 1.3,
                "colorTemperature": 4000,
                "softness": 0.3,
                "enabled": True,
                "distance": 1.2
            },
            "fillLight": {
                "type": "area",
                "direction": "90 degrees camera-right",
                "position": [0.8, 0.5, 0.8],
                "intensity": 0.2,
                "colorTemperature": 5600,
                "softness": 0.7,
                "enabled": True,
                "distance": 2.5
            },
            "rimLight": {
                "type": "directional",
                "direction": "behind",
                "position": [0.0, 1.0, -1.0],
                "intensity": 0.6,
                "colorTemperature": 6500,
                "softness": 0.4,
                "enabled": True,
                "distance": 1.0
            }
        },
        "camera": {
            "fov": 75,
            "aperture": "f/2.0",
            "seed": 22222
        }
    },
    {
        "presetId": "product_three_point",
        "name": "Product Three-Point",
        "category": "product",
        "description": "Professional three-point lighting for product photography",
        "ideal_for": ["products", "jewelry", "watches", "electronics"],
        "lighting": {
            "mainLight": {
                "type": "area",
                "direction": "45 degrees camera-right and 60 degrees above",
                "position": [0.8, 1.5, 0.6],
                "intensity": 1.2,
                "colorTemperature": 5600,
                "softness": 0.25,
                "enabled": True,
                "distance": 1.8
            },
            "fillLight": {
                "type": "area",
                "direction": "30 degrees camera-left",
                "position": [-0.6, 0.4, 0.8],
                "intensity": 0.25,
                "colorTemperature": 5600,
                "softness": 0.9,
                "enabled": True,
                "distance": 2.5
            },
            "rimLight": {
                "type": "directional",
                "direction": "directly behind",
                "position": [0.0, 0.8, -0.9],
                "intensity": 0.5,
                "colorTemperature": 6500,
                "softness": 0.2,
                "enabled": True,
                "distance": 1.2
            }
        },
        "camera": {
            "fov": 50,
            "aperture": "f/5.6",
            "seed": 33333
        }
    },
    {
        "presetId": "golden_hour_window",
        "name": "Golden Hour Window",
        "category": "environmental",
        "description": "Warm window light for natural, golden hour look",
        "ideal_for": ["lifestyle", "editorial", "environmental", "architectural"],
        "lighting": {
            "mainLight": {
                "type": "directional",
                "direction": "window light, low and warm from left",
                "position": [-1.5, 0.5, 0.8],
                "intensity": 1.3,
                "colorTemperature": 3200,
                "softness": 0.8,
                "enabled": True,
                "distance": 8.0
            },
            "fillLight": {
                "type": "area",
                "direction": "subtle fill from right",
                "position": [1.0, 0.4, 0.5],
                "intensity": 0.2,
                "colorTemperature": 5500,
                "softness": 0.9,
                "enabled": True,
                "distance": 10.0
            },
            "rimLight": {
                "type": "directional",
                "direction": "behind",
                "position": [0.0, 1.0, -1.0],
                "intensity": 0.3,
                "colorTemperature": 3500,
                "softness": 0.6,
                "enabled": False,
                "distance": 5.0
            }
        },
        "camera": {
            "fov": 35,
            "aperture": "f/4.0",
            "seed": 44444
        }
    }
]

# ============================================================================
# Generation History Mock Data
# ============================================================================

def generate_mock_history(count: int = 10) -> List[Dict[str, Any]]:
    """Generate mock generation history."""
    history = []
    base_time = datetime.utcnow()
    
    scenes = [
        "professional model in studio",
        "luxury product on pedestal",
        "fashion editorial shoot",
        "corporate headshot",
        "architectural interior",
        "jewelry close-up",
        "lifestyle photography",
        "product showcase"
    ]
    
    presets = [p["presetId"] for p in LIGHTING_PRESETS]
    
    for i in range(count):
        timestamp = base_time - timedelta(hours=i)
        history.append({
            "generation_id": f"gen_{i:04d}_{timestamp.timestamp():.0f}",
            "timestamp": timestamp.isoformat(),
            "scene_description": scenes[i % len(scenes)],
            "image_url": f"https://via.placeholder.com/2048x2048?text=Generation+{i}",
            "cost_credits": 0.04,
            "preset_used": presets[i % len(presets)],
            "duration_seconds": 3.2 + (i % 5) * 0.5,
            "status": "completed"
        })
    
    return history

# ============================================================================
# User Preferences & Workspace
# ============================================================================

MOCK_USER_PROFILE = {
    "user_id": "user_demo_001",
    "email": "demo@prolight.ai",
    "plan": "professional",
    "monthly_credits": 1000,
    "credits_remaining": 856,
    "created_at": "2025-01-15T10:00:00Z",
    "preferences": {
        "default_preset": "butterfly_classic",
        "default_resolution": [2048, 2048],
        "auto_analyze": True,
        "theme": "dark"
    }
}

MOCK_SAVED_WORKSPACES = [
    {
        "workspace_id": "ws_001",
        "name": "Beauty Portrait Studio",
        "description": "Setup for beauty and portrait photography",
        "preset_id": "butterfly_classic",
        "custom_settings": {
            "key_intensity": 1.0,
            "fill_intensity": 0.5,
            "rim_enabled": False
        },
        "created_at": "2025-01-20T14:30:00Z"
    },
    {
        "workspace_id": "ws_002",
        "name": "Product Photography",
        "description": "High-contrast product lighting",
        "preset_id": "product_three_point",
        "custom_settings": {
            "key_intensity": 1.2,
            "fill_intensity": 0.25,
            "rim_enabled": True
        },
        "created_at": "2025-01-22T09:15:00Z"
    }
]

# ============================================================================
# API Response Mocks
# ============================================================================

def get_mock_generation_response(generation_id: str = "gen_demo_001") -> Dict[str, Any]:
    """Get mock generation response."""
    return {
        "generation_id": generation_id,
        "status": "success",
        "image_url": f"https://via.placeholder.com/2048x2048?text={generation_id}",
        "duration_seconds": 3.5,
        "cost_credits": 0.04,
        "fibo_json": FIBO_PORTRAIT_TEMPLATE,
        "analysis": {
            "key_to_fill_ratio": 2.5,
            "color_temperature_consistency": 0.95,
            "professional_rating": 8.5,
            "mood_assessment": "professional, confident",
            "recommendations": [
                "Consider increasing fill light for softer shadows",
                "Rim light could be stronger for more separation"
            ]
        },
        "timestamp": datetime.utcnow().isoformat()
    }

def get_mock_batch_response(batch_id: str = "batch_demo_001", count: int = 5) -> Dict[str, Any]:
    """Get mock batch generation response."""
    results = []
    for i in range(count):
        results.append(get_mock_generation_response(f"gen_batch_{i:03d}"))
    
    return {
        "batch_id": batch_id,
        "status": "completed",
        "items_total": count,
        "items_completed": count,
        "total_cost": count * 0.04,
        "created_at": datetime.utcnow().isoformat(),
        "results": results
    }

# ============================================================================
# Determinism Testing Data
# ============================================================================

DETERMINISM_TEST_CASES = [
    {
        "test_id": "det_001",
        "name": "Same seed produces same output",
        "seed": 42,
        "locked_fields": ["camera.seed", "lighting"],
        "iterations": 3,
        "expected_hash_match": True
    },
    {
        "test_id": "det_002",
        "name": "Different seed produces different output",
        "seed_1": 42,
        "seed_2": 43,
        "locked_fields": ["lighting", "camera.aperture"],
        "expected_hash_match": False
    },
    {
        "test_id": "det_003",
        "name": "Locked fields remain unchanged",
        "locked_fields": ["subject", "environment"],
        "modifications": {"lighting.mainLight.intensity": 0.8},
        "expected_locked_unchanged": True
    }
]

# ============================================================================
# Batch Export Mock Data
# ============================================================================

def get_mock_batch_export(batch_size: int = 12) -> Dict[str, Any]:
    """Get mock batch export with product variations."""
    items = []
    products = [
        "silver wristwatch",
        "gold necklace",
        "diamond ring",
        "leather handbag",
        "sunglasses",
        "perfume bottle"
    ]
    
    for i in range(batch_size):
        product = products[i % len(products)]
        items.append({
            "item_id": f"item_{i:03d}",
            "product": product,
            "variation": f"angle_{i % 4}",
            "generation_id": f"gen_export_{i:04d}",
            "image_url": f"https://via.placeholder.com/2048x2048?text={product}+{i}",
            "cost_credits": 0.04,
            "status": "completed"
        })
    
    return {
        "batch_id": f"export_{datetime.utcnow().timestamp():.0f}",
        "status": "completed",
        "total_items": batch_size,
        "items": items,
        "total_cost": batch_size * 0.04,
        "exported_at": datetime.utcnow().isoformat(),
        "download_url": "https://storage.example.com/exports/batch_export.zip"
    }

# ============================================================================
# Data Manager Class
# ============================================================================

class MockDataManager:
    """Manager for mock data access."""
    
    @staticmethod
    def get_presets(category: str = None) -> List[Dict[str, Any]]:
        """Get presets, optionally filtered by category."""
        if category:
            return [p for p in LIGHTING_PRESETS if p["category"] == category]
        return LIGHTING_PRESETS
    
    @staticmethod
    def get_preset_by_id(preset_id: str) -> Dict[str, Any]:
        """Get preset by ID."""
        for p in LIGHTING_PRESETS:
            if p["presetId"] == preset_id:
                return p
        return None
    
    @staticmethod
    def get_history(limit: int = 10) -> List[Dict[str, Any]]:
        """Get generation history."""
        return generate_mock_history(limit)
    
    @staticmethod
    def get_user_profile() -> Dict[str, Any]:
        """Get mock user profile."""
        return MOCK_USER_PROFILE.copy()
    
    @staticmethod
    def get_fibo_template(template_type: str = "portrait") -> Dict[str, Any]:
        """Get FIBO JSON template."""
        if template_type == "product":
            return FIBO_PRODUCT_TEMPLATE.copy()
        return FIBO_PORTRAIT_TEMPLATE.copy()
