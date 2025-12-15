"""
Admin API endpoints with RBAC protection.
Provides administrative functionality accessible only to admin users.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any
import logging

from app.auth.role_middleware import require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin"])


class AdminSummary(BaseModel):
    """Admin summary response model."""
    status: str
    summary: Dict[str, Any]


@router.get("/summary", response_model=AdminSummary, dependencies=[Depends(require_role("admin"))])
async def admin_summary():
    """
    Get admin summary statistics.
    Protected by RBAC - requires 'admin' role.
    """
    # In production, fetch real statistics from database
    return AdminSummary(
        status="ok",
        summary={
            "jobs": 123,
            "active_users": 12,
            "total_revenue": 4567.89,
            "pending_refunds": 3,
        }
    )


@router.get("/health", dependencies=[Depends(require_role("admin"))])
async def admin_health():
    """
    Admin health check endpoint.
    Protected by RBAC - requires 'admin' role.
    """
    return {
        "status": "healthy",
        "admin_access": True,
        "timestamp": "2025-12-15T00:00:00Z"
    }
