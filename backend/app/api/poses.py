"""
Poses endpoint - Manage photographer poses.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.schemas import PoseCreate, PoseOut, RenderStartRequest, RenderStartResponse, RenderCallbackRequest
from app.crud import poses as crud_poses
from app.services.fibo_adapter import FIBOAdapter
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/poses/", response_model=PoseOut)
async def create_pose(pose: PoseCreate, db: Session = Depends(get_db)):
    """
    Create a new photographer pose.
    
    Args:
        pose: Pose creation data
        db: Database session
        
    Returns:
        Created pose
    """
    try:
        db_pose = crud_poses.create_pose(db, pose)
        return PoseOut(
            id=db_pose.id,
            name=db_pose.name,
            camera=db_pose.camera_json,
            created_at=db_pose.created_at.isoformat() if db_pose.created_at else "",
            owner_id=db_pose.owner_id
        )
    except Exception as e:
        logger.error(f"Error creating pose: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/poses/", response_model=list[PoseOut])
async def list_poses(
    owner_id: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List photographer poses.
    
    Args:
        owner_id: Optional owner ID filter
        limit: Maximum number of poses to return
        db: Database session
        
    Returns:
        List of poses
    """
    try:
        db_poses = crud_poses.list_poses(db, limit=limit, owner_id=owner_id)
        return [
            PoseOut(
                id=p.id,
                name=p.name,
                camera=p.camera_json,
                created_at=p.created_at.isoformat() if p.created_at else "",
                owner_id=p.owner_id
            )
            for p in db_poses
        ]
    except Exception as e:
        logger.error(f"Error listing poses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/poses/{pose_id}", response_model=PoseOut)
async def get_pose(pose_id: int, db: Session = Depends(get_db)):
    """
    Get a specific pose by ID.
    
    Args:
        pose_id: ID of the pose
        db: Database session
        
    Returns:
        Pose details
    """
    try:
        p = crud_poses.get_pose(db, pose_id)
        if not p:
            raise HTTPException(status_code=404, detail=f"Pose {pose_id} not found")
        return PoseOut(
            id=p.id,
            name=p.name,
            camera=p.camera_json,
            created_at=p.created_at.isoformat() if p.created_at else "",
            owner_id=p.owner_id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pose: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/poses/{pose_id}", response_model=PoseOut)
async def delete_pose(pose_id: int, db: Session = Depends(get_db)):
    """
    Delete a pose by ID.
    
    Args:
        pose_id: ID of the pose to delete
        db: Database session
        
    Returns:
        Deleted pose
    """
    try:
        p = crud_poses.delete_pose(db, pose_id)
        if not p:
            raise HTTPException(status_code=404, detail=f"Pose {pose_id} not found")
        return PoseOut(
            id=p.id,
            name=p.name,
            camera=p.camera_json,
            created_at=p.created_at.isoformat() if p.created_at else "",
            owner_id=p.owner_id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pose: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/render/from-camera", response_model=RenderStartResponse)
async def start_render_from_camera(request: RenderStartRequest):
    """
    Start a render job from camera state.
    This is a wrapper that calls the FIBO/Bria generation endpoint.
    
    Args:
        request: Render start request with camera state
        
    Returns:
        Render start response with request_id and status_url
    """
    try:
        # TODO: Implement actual FIBO/Bria API call
        # For now, return a mock response
        # In production, this should:
        # 1. Convert camera state to FIBO format
        # 2. Call FIBO/Bria generation endpoint
        # 3. Return request_id and status_url for polling
        
        logger.info(f"Starting render from camera: {request.camera}")
        
        # Mock response - replace with actual API call
        return RenderStartResponse(
            request_id=f"render_{hash(str(request.camera)) % 1000000}",
            status_url=f"/api/render/status/render_{hash(str(request.camera)) % 1000000}"
        )
    except Exception as e:
        logger.error(f"Error starting render: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/render/callback")
async def render_callback(request: RenderCallbackRequest, db: Session = Depends(get_db)):
    """
    Callback endpoint for worker to report render results.
    
    Args:
        request: Callback request with render results
        db: Database session
        
    Returns:
        Success confirmation
    """
    try:
        logger.info(f"Render callback for pose {request.poseId}, request {request.requestId}")
        
        # TODO: Store render results in database
        # You might want to create a render_results table to store:
        # - pose_id
        # - request_id
        # - image_urls
        # - metadata
        # - status
        
        # For now, just log it
        logger.info(f"Render result: {request.result}")
        
        return {"status": "ok", "message": "Callback received"}
    except Exception as e:
        logger.error(f"Error processing render callback: {e}")
        raise HTTPException(status_code=500, detail=str(e))
