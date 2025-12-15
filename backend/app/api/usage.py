"""
Metered usage reporting endpoints.
Handles reporting usage to Stripe for metered billing.
"""
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal

from app.db import SessionLocal
from app.models.billing import User, UsageRecord, Subscription
from app.auth.role_middleware import get_current_user
from app.core.config import settings
from app.services.stripe_client import get_stripe_client

router = APIRouter(prefix="/api/billing", tags=["Usage"])

# Initialize Stripe
if settings.STRIPE_SECRET_KEY and not settings.USE_MOCK_STRIPE:
    stripe.api_key = settings.STRIPE_SECRET_KEY
else:
    stripe.api_key = "sk_test_mock_key_for_development"


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ReportUsageRequest(BaseModel):
    subscription_item_id: str  # required: the subscription_item to record usage against
    quantity: float
    metadata: dict = None


class ReportUsageResponse(BaseModel):
    ok: bool
    usage_id: int
    stripe_report_id: Optional[str] = None
    error: Optional[str] = None


@router.post("/report_usage")
def report_usage(
    payload: ReportUsageRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Record usage locally and send UsageRecord to Stripe (increment).
    This endpoint is idempotent for local persistence but Stripe creates a usage record per request.
    For high volume usage, batch on the client/server and call this endpoint periodically.
    """
    # Get current user
    current_user = get_current_user(authorization, db)
    
    # Extract user info
    if hasattr(current_user, 'id') and isinstance(current_user, User):
        user_id = current_user.id
        db_user = current_user
    elif hasattr(current_user, 'id'):
        user_id = current_user.id
        db_user = db.query(User).filter(User.id == user_id).first()
    elif isinstance(current_user, dict):
        user_email = current_user.get("email")
        db_user = db.query(User).filter(User.email == user_email).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found in database")
        user_id = db_user.id
    else:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    # Validate subscription ownership (optional)
    sub = None
    if payload.subscription_item_id:
        sub = db.query(Subscription).filter(Subscription.subscription_item_id == payload.subscription_item_id).first()
        if sub and sub.stripe_customer_id != db_user.stripe_customer_id:
            raise HTTPException(status_code=403, detail="Subscription item does not belong to the current user")

    # Persist local UsageRecord
    usage = UsageRecord(
        user_id=user_id,
        stripe_subscription_item_id=payload.subscription_item_id,
        quantity=Decimal(str(payload.quantity)),
        metadata=(str(payload.metadata) if payload.metadata else None)
    )
    db.add(usage)
    db.commit()
    db.refresh(usage)

    # Send to Stripe
    try:
        if not settings.USE_MOCK_STRIPE:
            report = stripe.UsageRecord.create(
                subscription_item=payload.subscription_item_id,
                quantity=int(payload.quantity),
                timestamp=int(usage.reported_at.timestamp()),
                action="increment"
            )
            stripe_report_id = report.get("id")
        else:
            # Mock mode
            stripe_report_id = f"ur_mock_{usage.id}"
    except stripe.error.StripeError as e:
        # don't delete local record — mark stripe_report_id null so it can be retried via admin task
        return {"ok": False, "error": str(e), "usage_id": usage.id}

    # Persist stripe report id
    usage.stripe_report_id = stripe_report_id
    db.add(usage)
    db.commit()
    return {"ok": True, "usage_id": usage.id, "stripe_report_id": usage.stripe_report_id}


@router.get("/usage_records")
def get_usage_records(
    limit: int = 100,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Get usage records for the current user.
    """
    # Get current user
    current_user = get_current_user(authorization, db)
    
    # Extract user info
    if hasattr(current_user, 'id') and isinstance(current_user, User):
        user_id = current_user.id
    elif isinstance(current_user, dict):
        user_email = current_user.get("email")
        db_user = db.query(User).filter(User.email == user_email).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = db_user.id
    else:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    # Query usage records
    usage_records = db.query(UsageRecord).filter(
        UsageRecord.user_id == user_id
    ).order_by(UsageRecord.reported_at.desc()).limit(limit).all()
    
    return {
        "records": [
            {
                "id": record.id,
                "quantity": float(record.quantity),
                "subscription_item_id": record.stripe_subscription_item_id,
                "reported_at": record.reported_at.isoformat() if record.reported_at else None,
                "stripe_report_id": record.stripe_report_id,
                "metadata": record.metadata
            }
            for record in usage_records
        ],
        "total": len(usage_records)
    }


# Import logger
import logging
logger = logging.getLogger(__name__)