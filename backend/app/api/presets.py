"""
Presets endpoint - Manage lighting presets.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import PresetListResponse, PresetResponse
from app.data.mock_data import MockDataManager
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/presets", response_model=PresetListResponse)
async def list_presets(
    category: str = None,
    page: int = 1,
    page_size: int = 10
):
    """
    List available lighting presets.
    
    Args:
        category: Optional category filter
        page: Page number (1-indexed)
        page_size: Items per page
        
    Returns:
        PresetListResponse with list of presets
    """
    try:
        # Get presets
        presets = MockDataManager.get_presets(category=category)
        
        # Paginate
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated = presets[start_idx:end_idx]
        
        # Convert to response format
        preset_responses = [
            PresetResponse(
                preset_id=p["presetId"],
                name=p["name"],
                category=p["category"],
                description=p["description"],
                lighting_config=p["lighting"],
                ideal_for=p["ideal_for"]
            )
            for p in paginated
        ]
        
        return PresetListResponse(
            presets=preset_responses,
            total=len(presets),
            page=page,
            page_size=page_size
        )
    
    except Exception as e:
        logger.error(f"Error listing presets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets/{preset_id}", response_model=PresetResponse)
async def get_preset(preset_id: str):
    """
    Get a specific preset by ID.
    
    Args:
        preset_id: ID of the preset
        
    Returns:
        PresetResponse with preset details
    """
    try:
        preset = MockDataManager.get_preset_by_id(preset_id)
        if not preset:
            raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")
        
        return PresetResponse(
            preset_id=preset["presetId"],
            name=preset["name"],
            category=preset["category"],
            description=preset["description"],
            lighting_config=preset["lighting"],
            ideal_for=preset["ideal_for"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting preset: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets/categories")
async def list_categories():
    """
    List all available preset categories.
    
    Returns:
        List of category names
    """
    try:
        presets = MockDataManager.get_presets()
        categories = list(set(p["category"] for p in presets))
        return {
            "categories": sorted(categories),
            "total": len(categories)
        }
    
    except Exception as e:
        logger.error(f"Error listing categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/presets/search")
async def search_presets(
    query: str,
    page: int = 1,
    page_size: int = 10
):
    """
    Search presets by name or description.
    
    Args:
        query: Search query
        page: Page number
        page_size: Items per page
        
    Returns:
        PresetListResponse with matching presets
    """
    try:
        presets = MockDataManager.get_presets()
        
        # Search
        query_lower = query.lower()
        results = [
            p for p in presets
            if query_lower in p["name"].lower()
            or query_lower in p["description"].lower()
            or any(query_lower in ideal.lower() for ideal in p["ideal_for"])
        ]
        
        # Paginate
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated = results[start_idx:end_idx]
        
        # Convert to response format
        preset_responses = [
            PresetResponse(
                preset_id=p["presetId"],
                name=p["name"],
                category=p["category"],
                description=p["description"],
                lighting_config=p["lighting"],
                ideal_for=p["ideal_for"]
            )
            for p in paginated
        ]
        
        return PresetListResponse(
            presets=preset_responses,
            total=len(results),
            page=page,
            page_size=page_size
        )
    
    except Exception as e:
        logger.error(f"Error searching presets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets/professional")
async def get_professional_presets():
    """
    Get professional lighting presets (wedding, product, studio).
    
    These are the presets required for hackathon judging.
    
    Returns:
        Dictionary of professional presets with full FIBO JSON
    """
    return {
        "wedding_romantic": {
            "preset_id": "wedding_romantic",
            "name": "Wedding Romantic",
            "category": "wedding",
            "description": "Soft, romantic lighting for wedding photography",
            "fibo_json": {
                "subject": {
                    "main_entity": "bride and groom",
                    "attributes": "elegant, romantic, professional",
                    "action": "posing together"
                },
                "camera": {
                    "fov": 50.0,
                    "aperture": 2.8,
                    "focus_distance_m": 3.0,
                    "pitch": -5.0,
                    "yaw": 0.0,
                    "roll": 0.0
                },
                "lighting": {
                    "main_light": {
                        "type": "area",
                        "position": [0.7, 1.5, 1.2],
                        "intensity": 0.9,
                        "color_temperature": 3200,
                        "softness": 0.8,
                        "enabled": True
                    },
                    "fill_light": {
                        "type": "area",
                        "position": [-0.5, 1.0, 1.0],
                        "intensity": 0.4,
                        "color_temperature": 3200,
                        "softness": 0.9,
                        "enabled": True
                    },
                    "rim_light": {
                        "type": "directional",
                        "direction": "back-right",
                        "intensity": 0.6,
                        "color_temperature": 5600,
                        "softness": 0.3,
                        "enabled": True
                    }
                },
                "render": {
                    "resolution": [2048, 2048],
                    "bit_depth": 16,
                    "color_space": "sRGB",
                    "samples": 50
                },
                "meta": {
                    "preset": "wedding_romantic",
                    "c2pa": True,
                    "professional": True
                }
            },
            "ideal_for": ["wedding photography", "romantic portraits", "ceremony shots"]
        },
        "product_studio": {
            "preset_id": "product_studio",
            "name": "Product Studio",
            "category": "product",
            "description": "Professional product photography lighting",
            "fibo_json": {
                "subject": {
                    "main_entity": "product on pedestal",
                    "attributes": "professional, clean, commercial"
                },
                "camera": {
                    "fov": 55.0,
                    "aperture": 5.6,
                    "focus_distance_m": 1.5,
                    "pitch": -10.0,
                    "yaw": 0.0,
                    "roll": 0.0
                },
                "lighting": {
                    "main_light": {
                        "type": "area",
                        "position": [0.8, 1.2, 0.9],
                        "intensity": 1.0,
                        "color_temperature": 5600,
                        "softness": 0.4,
                        "enabled": True
                    },
                    "fill_light": {
                        "type": "area",
                        "position": [-0.6, 0.8, 1.1],
                        "intensity": 0.5,
                        "color_temperature": 5600,
                        "softness": 0.6,
                        "enabled": True
                    },
                    "rim_light": {
                        "type": "strip",
                        "position": [0.0, 0.5, -1.0],
                        "intensity": 0.7,
                        "color_temperature": 5600,
                        "softness": 0.2,
                        "enabled": True
                    }
                },
                "render": {
                    "resolution": [2048, 2048],
                    "bit_depth": 16,
                    "color_space": "sRGB",
                    "samples": 60
                },
                "meta": {
                    "preset": "product_studio",
                    "c2pa": True,
                    "professional": True
                }
            },
            "ideal_for": ["product photography", "e-commerce", "catalog shots"]
        },
        "portrait_dramatic": {
            "preset_id": "portrait_dramatic",
            "name": "Portrait Dramatic",
            "category": "portrait",
            "description": "Dramatic portrait lighting with high contrast",
            "fibo_json": {
                "subject": {
                    "main_entity": "portrait subject",
                    "attributes": "dramatic, professional, cinematic"
                },
                "camera": {
                    "fov": 50.0,
                    "aperture": 2.0,
                    "focus_distance_m": 2.0,
                    "pitch": 0.0,
                    "yaw": 0.0,
                    "roll": 0.0
                },
                "lighting": {
                    "main_light": {
                        "type": "spot",
                        "position": [0.9, 1.3, 0.8],
                        "intensity": 1.2,
                        "color_temperature": 5600,
                        "softness": 0.2,
                        "enabled": True
                    },
                    "fill_light": {
                        "type": "point",
                        "position": [-0.7, 0.9, 1.0],
                        "intensity": 0.3,
                        "color_temperature": 5600,
                        "softness": 0.5,
                        "enabled": True
                    },
                    "rim_light": {
                        "type": "directional",
                        "direction": "back-left",
                        "intensity": 0.8,
                        "color_temperature": 3200,
                        "softness": 0.1,
                        "enabled": True
                    }
                },
                "render": {
                    "resolution": [2048, 2048],
                    "bit_depth": 16,
                    "color_space": "sRGB",
                    "samples": 50
                },
                "meta": {
                    "preset": "portrait_dramatic",
                    "c2pa": True,
                    "professional": True
                }
            },
            "ideal_for": ["portrait photography", "headshots", "editorial"]
        }
    }
