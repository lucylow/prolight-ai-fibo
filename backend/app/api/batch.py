"""
Batch endpoint - Batch generation operations.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.schemas import BatchGenerateRequest, BatchJobResponse
from app.data.mock_data import MockDataManager, get_mock_batch_response
from app.main import fibo_adapter
import logging
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter()

# Store batch jobs
batch_jobs = {}


@router.post("/batch/generate", response_model=BatchJobResponse)
async def batch_generate(
    request: BatchGenerateRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate multiple images in batch.
    
    Args:
        request: BatchGenerateRequest with items to generate
        background_tasks: Background tasks for async processing
        
    Returns:
        BatchJobResponse with batch status
    """
    try:
        # Create batch job
        batch_id = f"batch_{len(batch_jobs):04d}"
        batch_jobs[batch_id] = {
            "status": "processing",
            "items_total": request.total_count,
            "items_completed": 0,
            "results": []
        }
        
        # Process batch in background
        background_tasks.add_task(
            process_batch,
            batch_id,
            request.items,
            request.preset_name
        )
        
        return BatchJobResponse(
            batch_id=batch_id,
            status="processing",
            items_total=request.total_count,
            items_completed=0,
            total_cost=0,
            created_at="2024-01-01T00:00:00Z"
        )
    
    except Exception as e:
        logger.error(f"Batch generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_batch(batch_id: str, items: list, preset_name: str = None):
    """Process batch in background."""
    try:
        results = []
        total_cost = 0
        
        for i, item in enumerate(items):
            # Generate image
            result = await fibo_adapter.generate(item)
            results.append(result)
            total_cost += result.get("cost_credits", 0.04)
            
            # Update progress
            batch_jobs[batch_id]["items_completed"] = i + 1
            batch_jobs[batch_id]["results"] = results
            
            # Small delay to simulate processing
            await asyncio.sleep(0.1)
        
        # Mark as complete
        batch_jobs[batch_id]["status"] = "completed"
        batch_jobs[batch_id]["total_cost"] = total_cost
        
        logger.info(f"Batch {batch_id} completed: {len(results)} items, {total_cost} credits")
    
    except Exception as e:
        logger.error(f"Batch processing error: {e}")
        batch_jobs[batch_id]["status"] = "error"
        batch_jobs[batch_id]["error"] = str(e)


@router.get("/batch/{batch_id}", response_model=BatchJobResponse)
async def get_batch_status(batch_id: str):
    """
    Get status of a batch job.
    
    Args:
        batch_id: ID of the batch job
        
    Returns:
        BatchJobResponse with current status
    """
    try:
        if batch_id not in batch_jobs:
            raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
        
        job = batch_jobs[batch_id]
        
        return BatchJobResponse(
            batch_id=batch_id,
            status=job["status"],
            items_total=job["items_total"],
            items_completed=job["items_completed"],
            total_cost=job.get("total_cost", 0),
            created_at="2024-01-01T00:00:00Z",
            results=job.get("results")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting batch status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch/product-variations")
async def generate_product_variations(
    product_description: str,
    num_angles: int = 4,
    num_lighting_setups: int = 3,
    preset_id: str = None
):
    """
    Generate product images with multiple angles and lighting setups.
    
    Args:
        product_description: Description of the product
        num_angles: Number of camera angles
        num_lighting_setups: Number of lighting variations
        preset_id: Optional preset to use
        
    Returns:
        Batch job information
    """
    try:
        # Calculate total items
        total_items = num_angles * num_lighting_setups
        
        # Create batch items
        items = []
        for angle in range(num_angles):
            for lighting in range(num_lighting_setups):
                items.append({
                    "product": product_description,
                    "angle": angle,
                    "lighting_variation": lighting
                })
        
        # Create batch request
        request = BatchGenerateRequest(
            items=items,
            preset_name=preset_id,
            total_count=total_items
        )
        
        # Generate batch
        batch_id = f"batch_product_{len(batch_jobs):04d}"
        batch_jobs[batch_id] = {
            "status": "processing",
            "items_total": total_items,
            "items_completed": 0,
            "results": [],
            "product": product_description,
            "angles": num_angles,
            "lighting_setups": num_lighting_setups
        }
        
        return {
            "batch_id": batch_id,
            "status": "processing",
            "total_items": total_items,
            "product": product_description,
            "angles": num_angles,
            "lighting_setups": num_lighting_setups
        }
    
    except Exception as e:
        logger.error(f"Product variations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch/{batch_id}/export")
async def export_batch(batch_id: str, format: str = "zip"):
    """
    Export batch results.
    
    Args:
        batch_id: ID of the batch job
        format: Export format (zip, json, etc.)
        
    Returns:
        Export information
    """
    try:
        if batch_id not in batch_jobs:
            raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
        
        job = batch_jobs[batch_id]
        
        if job["status"] != "completed":
            raise HTTPException(status_code=400, detail="Batch not completed yet")
        
        return {
            "batch_id": batch_id,
            "format": format,
            "items": len(job.get("results", [])),
            "download_url": f"https://storage.example.com/exports/{batch_id}.{format}",
            "expires_in_hours": 24
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))
