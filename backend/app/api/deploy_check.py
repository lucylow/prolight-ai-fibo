"""
Deploy check endpoint - returns server-side build metadata.
Allows frontend to detect mismatches between client and server builds.
"""
from fastapi import APIRouter
import os
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api", tags=["Deploy"])


class DeployStatus(BaseModel):
    """Deploy status response model."""
    server_commit: Optional[str] = None
    server_build_time: Optional[str] = None
    recommended_rebuild: bool = False


@router.get("/deploy-check", response_model=DeployStatus)
async def deploy_check():
    """
    Returns the server-side build metadata so frontend can detect mismatch.
    Expect CI to set SERVER_COMMIT and SERVER_BUILD_TIME environment variables at deploy time.
    """
    server_commit = os.environ.get("SERVER_COMMIT")
    server_build_time = os.environ.get("SERVER_BUILD_TIME")
    # If there is no server commit, return available fields with recommended_rebuild True to surface issue
    recommended_rebuild = False
    if not server_commit:
        # conservative: show banner on frontend (recommended_rebuild True) if missing metadata
        recommended_rebuild = True
    return DeployStatus(
        server_commit=server_commit,
        server_build_time=server_build_time,
        recommended_rebuild=recommended_rebuild,
    )
