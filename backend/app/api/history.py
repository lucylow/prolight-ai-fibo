"""
History endpoint - Manage generation history.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import HistoryResponse, HistoryItem
from app.data.mock_data import MockDataManager
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/history/stats")
async def get_history_stats():
    """
    Get statistics about generation history.
    
    Returns:
        History statistics
    """
    try:
        history = MockDataManager.get_history(limit=100)
        
        # Calculate stats
        total_generations = len(history)
        total_cost = sum(h["cost_credits"] for h in history)
        
        # Group by preset
        preset_counts = {}
        for h in history:
            preset = h.get("preset_used", "unknown")
            preset_counts[preset] = preset_counts.get(preset, 0) + 1
        
        return {
            "total_generations": total_generations,
            "total_cost_credits": total_cost,
            "average_cost_per_generation": total_cost / total_generations if total_generations > 0 else 0,
            "preset_distribution": preset_counts,
            "most_used_preset": max(preset_counts, key=preset_counts.get) if preset_counts else None
        }
    
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    page: int = 1,
    page_size: int = 10,
    preset_filter: str = None
):
    """
    Get generation history.
    
    Args:
        page: Page number (1-indexed)
        page_size: Items per page
        preset_filter: Optional filter by preset ID
        
    Returns:
        HistoryResponse with generation history
    """
    try:
        # Get history
        history = MockDataManager.get_history(limit=100)
        
        # Apply filter if provided
        if preset_filter:
            history = [h for h in history if h.get("preset_used") == preset_filter]
        
        # Paginate
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated = history[start_idx:end_idx]
        
        # Convert to response format
        items = [
            HistoryItem(
                generation_id=h["generation_id"],
                timestamp=h["timestamp"],
                scene_description=h["scene_description"],
                image_url=h["image_url"],
                cost_credits=h["cost_credits"],
                preset_used=h.get("preset_used")
            )
            for h in paginated
        ]
        
        return HistoryResponse(
            items=items,
            total=len(history),
            page=page,
            page_size=page_size
        )
    
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{generation_id}")
async def get_generation_detail(generation_id: str):
    """
    Get details of a specific generation.

    This handler also handles the special "stats" segment which may be routed
    here instead of the more specific `/history/stats` endpoint in some
    configurations. When `generation_id == "stats"`, we delegate to
    `get_history_stats` to return the expected statistics payload and a 200
    status code rather than a 404.
    """
    try:
        # If the dynamic route captured the "stats" segment, delegate to the
        # dedicated stats endpoint to avoid returning a 404.
        if generation_id == "stats":
            return await get_history_stats()

        # Get history
        history = MockDataManager.get_history(limit=100)
        
        # Find generation
        for h in history:
            if h["generation_id"] == generation_id:
                return h
        
        raise HTTPException(status_code=404, detail=f"Generation {generation_id} not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{generation_id}")
async def delete_generation(generation_id: str):
    """
    Delete a generation from history.
    
    Args:
        generation_id: ID of the generation to delete
        
    Returns:
        Success message
    """
    try:
        # In a real app, this would delete from database
        # For mock, just return success
        return {
            "status": "success",
            "message": f"Generation {generation_id} deleted",
            "generation_id": generation_id
        }
    
    except Exception as e:
        logger.error(f"Error deleting generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/history/clear")
async def clear_history():
    """
    Clear all generation history.
    
    Returns:
        Success message
    """
    try:
        # In a real app, this would clear database
        # For mock, just return success
        return {
            "status": "success",
            "message": "History cleared"
        }
    
    except Exception as e:
        logger.error(f"Error clearing history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/stats")
async def get_history_stats():
    """
    Get statistics about generation history.
    
    Returns:
        History statistics
    """
    try:
        history = MockDataManager.get_history(limit=100)
        
        # Calculate stats
        total_generations = len(history)
        total_cost = sum(h["cost_credits"] for h in history)
        
        # Group by preset
        preset_counts = {}
        for h in history:
            preset = h.get("preset_used", "unknown")
            preset_counts[preset] = preset_counts.get(preset, 0) + 1
        
        return {
            "total_generations": total_generations,
            "total_cost_credits": total_cost,
            "average_cost_per_generation": total_cost / total_generations if total_generations > 0 else 0,
            "preset_distribution": preset_counts,
            "most_used_preset": max(preset_counts, key=preset_counts.get) if preset_counts else None
        }
    
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
