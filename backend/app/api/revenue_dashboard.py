"""
Revenue dashboard endpoints.
Provides MRR, ARR, churn, and other revenue metrics (admin-only).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional
from datetime import datetime, timedelta
import logging

from app.db import SessionLocal
from app.models.billing import Subscription, Invoice, User
from app.auth.role_middleware import require_role
from app.core.config import settings

router = APIRouter(prefix="/api/admin", tags=["Revenue Dashboard"])
logger = logging.getLogger(__name__)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Cache for price lookups (to avoid hitting Stripe API repeatedly)
_price_cache = {}


def get_price_from_stripe(price_id: str) -> Optional[dict]:
    """
    Get price information from Stripe API.
    In production, you should cache this aggressively.
    """
    global _price_cache
    
    if price_id in _price_cache:
        return _price_cache[price_id]
    
    try:
        import stripe
        if settings.STRIPE_SECRET_KEY and not settings.USE_MOCK_STRIPE:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            price = stripe.Price.retrieve(price_id)
            price_data = {
                "unit_amount": price.get("unit_amount", 0),  # in cents
                "recurring": price.get("recurring", {}),
                "currency": price.get("currency", "usd")
            }
            _price_cache[price_id] = price_data
            return price_data
        else:
            # Mock mode - return mock price data
            return {
                "unit_amount": 3500,  # $35.00
                "recurring": {"interval": "month"},
                "currency": "usd"
            }
    except Exception as e:
        logger.error(f"Failed to fetch price {price_id} from Stripe: {e}")
        return None


@router.get("/revenue", dependencies=[Depends(require_role("admin"))])
def revenue_dashboard(
    db: Session = Depends(get_db)
):
    """
    Get revenue dashboard metrics: MRR, ARR, churn rate, active subscriptions.
    Admin-only endpoint.
    """
    try:
        # Get all active subscriptions
        active_subs = db.query(Subscription).filter(
            Subscription.status == "active"
        ).all()
        
        # Calculate MRR (Monthly Recurring Revenue)
        mrr_cents = 0
        
        for sub in active_subs:
            price_info = get_price_from_stripe(sub.price_id)
            
            if not price_info:
                logger.warning(f"Could not fetch price info for price_id: {sub.price_id}")
                continue
            
            unit_amount = price_info.get("unit_amount", 0)  # in cents
            recurring = price_info.get("recurring", {})
            interval = recurring.get("interval", sub.interval)
            
            if interval == "month":
                mrr_cents += unit_amount
            elif interval == "year":
                mrr_cents += unit_amount / 12.0
            # Other intervals (week, day) can be handled similarly
        
        mrr = mrr_cents / 100.0  # Convert cents to dollars
        arr = mrr * 12  # Annual Recurring Revenue
        
        # Calculate churn rate (monthly)
        # Churn = (# canceled subs in last 30 days) / (# active subs at start of period)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Count subscriptions canceled in the last 30 days
        canceled_last_30 = db.query(Subscription).filter(
            Subscription.status == "canceled",
            Subscription.updated_at >= thirty_days_ago
        ).count()
        
        # Count active subscriptions (as proxy for start of period)
        # In production, you might want to store subscription state changes in an events table
        active_count_start = db.query(Subscription).filter(
            Subscription.status == "active",
            Subscription.created_at < thirty_days_ago
        ).count()
        
        # Also count subscriptions that were active 30 days ago (including newly created ones)
        active_count_total = len(active_subs)
        
        # Churn rate calculation
        churn_rate = 0.0
        if active_count_start > 0:
            churn_rate = canceled_last_30 / active_count_start
        
        # Additional metrics
        total_subscriptions = db.query(Subscription).count()
        canceled_subscriptions = db.query(Subscription).filter(
            Subscription.status == "canceled"
        ).count()
        
        # Recent revenue (last 30 days from invoices)
        recent_invoices = db.query(Invoice).filter(
            Invoice.status == "paid",
            Invoice.created_at >= thirty_days_ago
        ).all()
        
        recent_revenue_cents = sum(inv.amount_paid for inv in recent_invoices)
        recent_revenue = recent_revenue_cents / 100.0
        
        # Average revenue per subscription
        arpu = mrr / active_count_total if active_count_total > 0 else 0.0
        
        return {
            "mrr": round(mrr, 2),  # Monthly Recurring Revenue in USD
            "arr": round(arr, 2),  # Annual Recurring Revenue in USD
            "churn_rate": round(churn_rate, 4),  # Monthly churn rate (0-1)
            "churn_percentage": round(churn_rate * 100, 2),  # Churn as percentage
            "active_subscriptions": active_count_total,
            "total_subscriptions": total_subscriptions,
            "canceled_subscriptions": canceled_subscriptions,
            "recent_revenue_30d": round(recent_revenue, 2),  # Revenue from paid invoices in last 30 days
            "arpu": round(arpu, 2),  # Average Revenue Per User (monthly)
            "metrics_period": "30_days",
            "calculated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error calculating revenue metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate revenue metrics: {str(e)}")


@router.get("/subscriptions")
def list_subscriptions(
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None, description="Filter by status: active, canceled, past_due, etc."),
    db: Session = Depends(get_db),
    user = Depends(require_role("admin"))
):
    """
    List all subscriptions (admin-only).
    """
    query = db.query(Subscription)
    
    if status:
        query = query.filter(Subscription.status == status)
    
    subs = query.order_by(Subscription.created_at.desc()).limit(limit).all()
    
    return {
        "subscriptions": [
            {
                "id": sub.id,
                "stripe_subscription_id": sub.stripe_subscription_id,
                "stripe_customer_id": sub.stripe_customer_id,
                "status": sub.status,
                "price_id": sub.price_id,
                "interval": sub.interval,
                "subscription_item_id": sub.stripe_subscription_item_id,
                "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
                "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
                "cancel_at_period_end": sub.cancel_at_period_end,
                "created_at": sub.created_at.isoformat() if sub.created_at else None
            }
            for sub in subs
        ],
        "total": len(subs)
    }