"""
Presets endpoint - Manage lighting presets.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import PresetListResponse, PresetResponse, PresetRequest
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
    body: PresetRequest,
    page: int = 1,
    page_size: int = 10,
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
        query_value = body.search or body.category or body.search
        if not query_value and body:
            # Backwards-compatible: also accept `query` field if provided
            query_value = getattr(body, "search", None) or getattr(body, "category", None)
        if not query_value:
            # If no query provided, return all presets paginated
            results = presets
        else:
            query_lower = query_value.lower()
            results = [
                p
                for p in presets
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
