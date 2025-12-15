"""
Admin refund management API endpoints.
Handles refund requests with role-based access control.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel
import logging
from datetime import datetime

from app.services.stripe_client import get_stripe_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Mock refund request storage (in production, use database)
mock_refund_requests = []


class RefundRequestModel(BaseModel):
    """Refund request model."""
    id: str
    tenant_id: str
    user_id: Optional[str]
    charge_id: str
    amount_cents: Optional[int]
    currency: str
    reason: Optional[str]
    status: str
    admin_note: Optional[str]
    stripe_refund_id: Optional[str]
    created_at: str


class ApproveRefundBody(BaseModel):
    """Approve refund request body."""
    amount_cents: Optional[int] = None
    admin_note: Optional[str] = None


class DenyRefundBody(BaseModel):
    """Deny refund request body."""
    admin_note: Optional[str] = None


def get_current_user():
    """Mock user authentication - replace with real auth in production."""
    # In production, implement JWT token validation
    return {"id": "admin_1", "email": "admin@prolight.ai", "role": "admin"}


def require_admin(user = Depends(get_current_user)):
    """Require admin role."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/refunds", response_model=List[RefundRequestModel])
async def list_refunds(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    admin=Depends(require_admin)
):
    """
    List refund requests with optional filtering.
    """
    filtered = mock_refund_requests.copy()
    
    if status:
        filtered = [r for r in filtered if r["status"] == status]
    
    if q:
        q_lower = q.lower()
        filtered = [
            r for r in filtered
            if q_lower in r.get("charge_id", "").lower() or
               q_lower in (r.get("reason", "") or "").lower()
        ]
    
    # Sort by created_at descending
    filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return filtered[:200]  # Limit to 200


@router.post("/refunds/{refund_id}/approve", response_model=RefundRequestModel)
async def approve_refund(
    refund_id: str,
    body: ApproveRefundBody,
    admin=Depends(require_admin)
):
    """
    Approve and process a refund request.
    """
    # Find refund request
    refund = next((r for r in mock_refund_requests if r["id"] == refund_id), None)
    if not refund:
        raise HTTPException(404, "Refund request not found")
    
    if refund["status"] != "pending":
        raise HTTPException(400, "Refund not pending")
    
    try:
        stripe = get_stripe_client()
        
        charge = refund["charge_id"]
        amount = body.amount_cents or refund.get("amount_cents")
        
        # Create Stripe refund
        refund_params = {"charge": charge}
        if amount:
            refund_params["amount"] = int(amount)
        
        stripe_refund = stripe.refunds.create(**refund_params)
        
        # Update refund request
        refund["status"] = "refunded"
        refund["stripe_refund_id"] = stripe_refund["id"]
        refund["admin_note"] = body.admin_note
        refund["updated_at"] = datetime.utcnow().isoformat()
        
        return refund
        
    except Exception as e:
        logger.error(f"Stripe refund failed: {e}")
        refund["status"] = "failed"
        refund["admin_note"] = f"Refund failed: {str(e)}"
        raise HTTPException(400, f"Stripe refund failed: {str(e)}")


@router.post("/refunds/{refund_id}/deny", response_model=RefundRequestModel)
async def deny_refund(
    refund_id: str,
    body: DenyRefundBody,
    admin=Depends(require_admin)
):
    """
    Deny a refund request.
    """
    refund = next((r for r in mock_refund_requests if r["id"] == refund_id), None)
    if not refund:
        raise HTTPException(404, "Refund request not found")
    
    if refund["status"] != "pending":
        raise HTTPException(400, "Refund not pending")
    
    refund["status"] = "denied"
    refund["admin_note"] = body.admin_note
    refund["updated_at"] = datetime.utcnow().isoformat()
    
    return refund


@router.post("/refunds/create")
async def create_refund_request(
    tenant_id: str,
    charge_id: str,
    amount_cents: Optional[int] = None,
    reason: Optional[str] = None
):
    """
    Create a new refund request (for users to request refunds).
    """
    import uuid
    
    refund_request = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "user_id": None,
        "charge_id": charge_id,
        "amount_cents": amount_cents,
        "currency": "usd",
        "reason": reason,
        "status": "pending",
        "admin_note": None,
        "stripe_refund_id": None,
        "created_at": datetime.utcnow().isoformat()
    }
    
    mock_refund_requests.append(refund_request)
    
    return refund_request

