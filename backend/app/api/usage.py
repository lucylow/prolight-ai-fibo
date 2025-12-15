"""
Metered usage reporting endpoints.
Handles reporting usage to Stripe for metered billing.
"""
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Header, Body
from typing import Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime

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
    quantity: float
    subscription_item_id: Optional[str] = None  # Required if user has multiple subscription items
    metadata: Optional[str] = None  # JSON string for additional metadata


class ReportUsageResponse(BaseModel):
    ok: bool
    usage_id: int
    stripe_report_id: Optional[str] = None
    error: Optional[str] = None


@router.post("/report_usage", response_model=ReportUsageResponse)
def report_usage(
    body: ReportUsageRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Report usage for metered billing.
    
    - quantity: numeric units (e.g., images processed, seconds used)
    - subscription_item_id: required if user has multiple subscription items; otherwise derived from active subscription
    - metadata: optional JSON string for additional metadata
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
    
    # Resolve subscription_item_id if not provided
    subscription_item_id = body.subscription_item_id
    
    if not subscription_item_id:
        # Attempt to find subscription item from DB
        # Get the user's Stripe customer ID
        if not db_user.stripe_customer_id:
            raise HTTPException(
                status_code=400,
                detail="User has no Stripe customer. Create a customer first."
            )
        
        # Find active subscription
        sub = db.query(Subscription).filter(
            Subscription.stripe_customer_id == db_user.stripe_customer_id,
            Subscription.status == "active"
        ).first()
        
        if not sub:
            raise HTTPException(
                status_code=400,
                detail="No active subscription found. subscription_item_id is required."
            )
        
        if not sub.stripe_subscription_item_id:
            raise HTTPException(
                status_code=400,
                detail="Subscription missing subscription_item_id. Please provide subscription_item_id parameter."
            )
        
        subscription_item_id = sub.stripe_subscription_item_id
    
    # Create local usage record
    usage = UsageRecord(
        user_id=user_id,
        stripe_subscription_item_id=subscription_item_id,
        quantity=Decimal(str(body.quantity)),
        metadata=body.metadata,
        reported_at=datetime.utcnow()
    )
    db.add(usage)
    db.commit()
    db.refresh(usage)
    
    # Send to Stripe as usage record
    stripe_report_id = None
    error = None
    
    try:
        stripe_client = get_stripe_client()
        
        if not settings.USE_MOCK_STRIPE and hasattr(stripe_client, 'UsageRecord'):
            # Real Stripe API
            report = stripe.UsageRecord.create(
                quantity=int(body.quantity),
                timestamp=int(usage.reported_at.timestamp()),
                subscription_item=subscription_item_id,
                action="increment"  # Adds quantity to current billing period total
            )
            stripe_report_id = report.get("id")
            
            # Update local record with Stripe report ID
            usage.stripe_report_id = stripe_report_id
            db.add(usage)
            db.commit()
        else:
            # Mock mode - no real Stripe call
            stripe_report_id = f"ur_mock_{usage.id}"
            usage.stripe_report_id = stripe_report_id
            db.add(usage)
            db.commit()
        
        return ReportUsageResponse(
            ok=True,
            usage_id=usage.id,
            stripe_report_id=stripe_report_id
        )
        
    except stripe.error.StripeError as e:
        # Keep local record but mark stripe_report_id null to retry later
        error = str(e)
        logger.error(f"Stripe usage record creation failed: {e}")
        return ReportUsageResponse(
            ok=False,
            usage_id=usage.id,
            error=error
        )
    except Exception as e:
        error = str(e)
        logger.error(f"Usage reporting failed: {e}")
        return ReportUsageResponse(
            ok=False,
            usage_id=usage.id,
            error=error
        )


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