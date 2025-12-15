"""
Production admin API endpoints for revenue, user management, and moderation.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from app.db import get_db_session
from app.models.user import User, PlanTier, AdminLog
from app.models.billing import Subscription, Invoice
from app.models.generation import Generation
from app.models.marketplace import MarketplaceListing, MarketplacePurchase, ListingStatus
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


def require_admin() -> int:
    """Require admin role (simplified - should integrate with real auth)."""
    # TODO: Integrate with Clerk/Supabase auth and check admin role
    # For now, return a mock admin user ID
    return 1


class RevenueStatsResponse:
    """Revenue statistics response."""
    def __init__(self):
        self.mrr = Decimal(0)  # Monthly Recurring Revenue
        self.arr = Decimal(0)  # Annual Recurring Revenue
        self.total_revenue = Decimal(0)
        self.churn_rate = Decimal(0)
        self.active_subscriptions = 0
        self.revenue_by_plan = {}
        self.marketplace_commission = Decimal(0)
        self.top_creators = []


@router.get("/revenue/stats")
async def get_revenue_stats(
    db: Session = Depends(get_db_session),
    admin_user_id: int = Depends(require_admin)
):
    """Get revenue dashboard statistics."""
    try:
        # Get active subscriptions
        active_subs = db.query(Subscription).filter(
            Subscription.status.in_(["active", "trialing"])
        ).all()
        
        # Calculate MRR
        mrr = Decimal(0)
        revenue_by_plan = {"free": 0, "pro": 0, "enterprise": 0}
        
        for sub in active_subs:
            user = db.query(User).filter(User.id == sub.user_id).first()
            if user:
                if user.plan_tier == PlanTier.PRO:
                    mrr += Decimal(settings.PRO_PLAN_PRICE) / 100
                    revenue_by_plan["pro"] += 1
                elif user.plan_tier == PlanTier.ENTERPRISE:
                    mrr += Decimal(settings.ENTERPRISE_PLAN_PRICE) / 100
                    revenue_by_plan["enterprise"] += 1
        
        arr = mrr * 12
        
        # Get total revenue from invoices
        invoices = db.query(Invoice).filter(Invoice.status == "paid").all()
        total_revenue = sum(Decimal(inv.amount_paid) / 100 for inv in invoices)
        
        # Calculate churn rate (simplified - last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        canceled_subs = db.query(Subscription).filter(
            and_(
                Subscription.status == "canceled",
                Subscription.updated_at >= thirty_days_ago
            )
        ).count()
        total_subs_start = db.query(Subscription).filter(
            Subscription.created_at <= thirty_days_ago
        ).count()
        churn_rate = Decimal(canceled_subs / total_subs_start * 100) if total_subs_start > 0 else Decimal(0)
        
        # Marketplace commission
        purchases = db.query(MarketplacePurchase).all()
        marketplace_commission = sum(p.platform_fee for p in purchases)
        
        # Top creators
        creator_sales = db.query(
            MarketplaceListing.creator_id,
            func.count(MarketplacePurchase.id).label("sales_count"),
            func.sum(MarketplacePurchase.creator_payout).label("earnings")
        ).join(
            MarketplacePurchase, MarketplacePurchase.listing_id == MarketplaceListing.id
        ).group_by(
            MarketplaceListing.creator_id
        ).order_by(
            func.sum(MarketplacePurchase.creator_payout).desc()
        ).limit(10).all()
        
        top_creators = []
        for creator_id, sales_count, earnings in creator_sales:
            user = db.query(User).filter(User.id == creator_id).first()
            if user:
                top_creators.append({
                    "user_id": creator_id,
                    "email": user.email,
                    "name": user.full_name,
                    "sales_count": sales_count,
                    "earnings": float(earnings or 0)
                })
        
        return {
            "mrr": float(mrr),
            "arr": float(arr),
            "total_revenue": float(total_revenue),
            "churn_rate": float(churn_rate),
            "active_subscriptions": len(active_subs),
            "revenue_by_plan": revenue_by_plan,
            "marketplace_commission": float(marketplace_commission),
            "top_creators": top_creators
        }
    except Exception as e:
        logger.error(f"Error getting revenue stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    plan_tier: Optional[str] = None,
    db: Session = Depends(get_db_session),
    admin_user_id: int = Depends(require_admin)
):
    """List all users with pagination."""
    query = db.query(User)
    
    if plan_tier:
        query = query.filter(User.plan_tier == plan_tier)
    
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "plan_tier": u.plan_tier.value,
                "credits": u.credits,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "is_creator": u.is_creator
            }
            for u in users
        ],
        "total": query.count()
    }


@router.post("/users/{user_id}/credits")
async def add_credits(
    user_id: int,
    credits: int,
    db: Session = Depends(get_db_session),
    admin_user_id: int = Depends(require_admin)
):
    """Manually add credits to a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.credits += credits
    db.commit()
    
    # Log admin action
    log = AdminLog(
        admin_user_id=admin_user_id,
        action="credits_added",
        target_user_id=user_id,
        metadata=f'{{"credits_added": {credits}, "new_balance": {user.credits}}}'
    )
    db.add(log)
    db.commit()
    
    return {"success": True, "new_credits": user.credits}


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db_session),
    admin_user_id: int = Depends(require_admin)
):
    """Ban a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Set credits to 0 and mark as banned (could add a banned field)
    user.credits = 0
    user.role = "banned"
    db.commit()
    
    # Log admin action
    log = AdminLog(
        admin_user_id=admin_user_id,
        action="user_banned",
        target_user_id=user_id,
        metadata=f'{{"reason": "{reason}"}}'
    )
    db.add(log)
    db.commit()
    
    return {"success": True, "message": "User banned"}


@router.get("/marketplace/pending")
async def get_pending_listings(
    db: Session = Depends(get_db_session),
    admin_user_id: int = Depends(require_admin)
):
    """Get pending marketplace listings for review."""
    listings = db.query(MarketplaceListing).filter(
        MarketplaceListing.status == ListingStatus.PENDING
    ).order_by(MarketplaceListing.created_at.desc()).all()
    
    return {
        "listings": [
            {
                "id": l.id,
                "title": l.title,
                "creator_id": l.creator_id,
                "price": float(l.price),
                "listing_type": l.listing_type.value,
                "created_at": l.created_at.isoformat() if l.created_at else None
            }
            for l in listings
        ]
    }


@router.post("/marketplace/listings/{listing_id}/approve")
async def approve_listing(
    listing_id: int,
    db: Session = Depends(get_db_session),
    admin_user_id: int = Depends(require_admin)
):
    """Approve a marketplace listing."""
    from app.services.marketplace_service import MarketplaceService
    
    listing = MarketplaceService.approve_listing(db, listing_id, admin_user_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return {"success": True, "listing": {"id": listing.id, "status": listing.status.value}}


@router.post("/marketplace/listings/{listing_id}/reject")
async def reject_listing(
    listing_id: int,
    reason: str,
    db: Session = Depends(get_db_session),
    admin_user_id: int = Depends(require_admin)
):
    """Reject a marketplace listing."""
    from app.services.marketplace_service import MarketplaceService
    
    listing = MarketplaceService.reject_listing(db, listing_id, admin_user_id, reason)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return {"success": True, "listing": {"id": listing.id, "status": listing.status.value}}


@router.get("/generations/stats")
async def get_generation_stats(
    days: int = 30,
    db: Session = Depends(get_db_session),
    admin_user_id: int = Depends(require_admin)
):
    """Get generation statistics and trends."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    generations = db.query(Generation).filter(
        Generation.created_at >= cutoff_date
    ).all()
    
    # Stats by preset
    preset_stats = {}
    for gen in generations:
        if gen.preset_id:
            if gen.preset_id not in preset_stats:
                preset_stats[gen.preset_id] = {"count": 0, "preset_name": gen.used_preset_name or "Unknown"}
            preset_stats[gen.preset_id]["count"] += 1
    
    # Status breakdown
    status_counts = {}
    for gen in generations:
        status_counts[gen.status] = status_counts.get(gen.status, 0) + 1
    
    return {
        "total_generations": len(generations),
        "successful": len([g for g in generations if g.status == "completed"]),
        "failed": len([g for g in generations if g.status == "failed"]),
        "status_breakdown": status_counts,
        "top_presets": sorted(
            [{"preset_id": k, "name": v["preset_name"], "count": v["count"]} for k, v in preset_stats.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:10]
    }

