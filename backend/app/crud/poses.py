# backend/app/crud/poses.py
"""
CRUD operations for photographer poses.
"""
from sqlalchemy.orm import Session
from app.models import poses
from app.models.schemas import PoseCreate
from typing import Optional, List

def create_pose(db: Session, pose: PoseCreate):
    """Create a new photographer pose."""
    db_pose = poses.PhotographerPose(
        name=pose.name,
        camera_json=pose.camera.dict(),
        owner_id=pose.owner_id
    )
    db.add(db_pose)
    db.commit()
    db.refresh(db_pose)
    return db_pose

def get_pose(db: Session, pose_id: int):
    """Get a pose by ID."""
    return db.query(poses.PhotographerPose).filter(poses.PhotographerPose.id == pose_id).first()

def list_poses(db: Session, limit: int = 100, owner_id: Optional[str] = None):
    """List poses, optionally filtered by owner."""
    q = db.query(poses.PhotographerPose)
    if owner_id:
        q = q.filter(poses.PhotographerPose.owner_id == owner_id)
    return q.order_by(poses.PhotographerPose.created_at.desc()).limit(limit).all()

def delete_pose(db: Session, pose_id: int):
    """Delete a pose by ID."""
    p = db.query(poses.PhotographerPose).filter(poses.PhotographerPose.id == pose_id).first()
    if p:
        db.delete(p)
        db.commit()
    return p
