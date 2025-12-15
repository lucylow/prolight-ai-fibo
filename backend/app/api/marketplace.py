"""
Marketplace API endpoints for listings, purchases, and reviews.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db import get_db_session
from app.schemas.marketplace import (
    MarketplaceListingCreate,
    MarketplaceListingResponse,
    MarketplacePurchaseRequest,
    MarketplacePurchaseResponse,
    MarketplaceReviewCreate,
    MarketplaceReviewResponse,
    MarketplaceSearchParams,
    CreatorDashboardStats
)
from app.services.marketplace_service import MarketplaceService
from app.models.marketplace import MarketplaceListing, ListingType
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/marketplace", tags=["Marketplace"])


def get_current_user_id() -> int:
    """Get current user ID from auth context (simplified - should integrate with real auth)."""
    # TODO: Integrate with Clerk/Supabase auth
    # For now, return a mock user ID
    return 1


@router.post("/listings", response_model=MarketplaceListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    listing: MarketplaceListingCreate,
    db: Session = Depends(get_db_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """Create a new marketplace listing."""
    try:
        created_listing = MarketplaceService.create_listing(
            db=db,
            creator_id=current_user_id,
            title=listing.title,
            description=listing.description,
            listing_type=listing.listing_type,
            price=listing.price,
            fibo_json=listing.fibo_json,
            category=listing.category,
            tags=listing.tags,
            preview_image_url=listing.preview_image_url
        )
        return created_listing
    except Exception as e:
        logger.error(f"Error creating listing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/listings/popular", response_model=List[MarketplaceListingResponse])
async def get_popular_listings(
    category: str = None,
    limit: int = 20,
    db: Session = Depends(get_db_session)
):
    """Get popular marketplace listings."""
    listings = MarketplaceService.get_popular_listings(db, limit=limit, category=category)
    return listings


@router.get("/listings/search", response_model=List[MarketplaceListingResponse])
async def search_listings(
    params: MarketplaceSearchParams = Depends(),
    db: Session = Depends(get_db_session)
):
    """Search marketplace listings."""
    listings = MarketplaceService.search_listings(
        db=db,
        query_text=params.query,
        category=params.category,
        listing_type=params.listing_type,
        min_rating=params.min_rating,
        limit=params.limit
    )
    return listings


@router.get("/listings/{listing_id}", response_model=MarketplaceListingResponse)
async def get_listing(
    listing_id: int,
    db: Session = Depends(get_db_session)
):
    """Get a specific marketplace listing."""
    listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Increment view count
    listing.view_count += 1
    db.commit()
    
    return listing


@router.post("/purchases", response_model=MarketplacePurchaseResponse, status_code=status.HTTP_201_CREATED)
async def purchase_listing(
    purchase: MarketplacePurchaseRequest,
    db: Session = Depends(get_db_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """Purchase a marketplace listing."""
    try:
        purchase_record = MarketplaceService.purchase_listing(
            db=db,
            buyer_id=current_user_id,
            listing_id=purchase.listing_id
        )
        if not purchase_record:
            raise HTTPException(status_code=400, detail="Failed to purchase listing")
        return purchase_record
    except Exception as e:
        logger.error(f"Error purchasing listing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reviews", response_model=MarketplaceReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review: MarketplaceReviewCreate,
    db: Session = Depends(get_db_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """Create a review for a marketplace listing."""
    try:
        review_record = MarketplaceService.add_review(
            db=db,
            listing_id=review.listing_id,
            reviewer_id=current_user_id,
            rating=review.rating,
            comment=review.comment
        )
        if not review_record:
            raise HTTPException(status_code=400, detail="Failed to create review")
        return review_record
    except Exception as e:
        logger.error(f"Error creating review: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/listings/{listing_id}/reviews", response_model=List[MarketplaceReviewResponse])
async def get_listing_reviews(
    listing_id: int,
    db: Session = Depends(get_db_session)
):
    """Get reviews for a marketplace listing."""
    from app.models.marketplace import MarketplaceReview
    reviews = db.query(MarketplaceReview).filter(
        MarketplaceReview.listing_id == listing_id
    ).order_by(MarketplaceReview.created_at.desc()).all()
    return reviews


@router.get("/creator/stats", response_model=CreatorDashboardStats)
async def get_creator_stats(
    db: Session = Depends(get_db_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get creator dashboard statistics."""
    from app.models.marketplace import ListingStatus, MarketplacePurchase
    from decimal import Decimal
    from sqlalchemy import func
    
    listings = db.query(MarketplaceListing).filter(
        MarketplaceListing.creator_id == current_user_id
    ).all()
    
    total_listings = len(listings)
    approved_listings = len([l for l in listings if l.status == ListingStatus.APPROVED])
    pending_listings = len([l for l in listings if l.status == ListingStatus.PENDING])
    
    purchases = db.query(MarketplacePurchase).join(MarketplaceListing).filter(
        MarketplaceListing.creator_id == current_user_id
    ).all()
    
    total_sales = len(purchases)
    total_revenue = sum(p.amount_paid for p in purchases)
    platform_fees = sum(p.platform_fee for p in purchases)
    net_earnings = sum(p.creator_payout for p in purchases)
    
    # Calculate average rating
    approved_listing_ids = [l.id for l in listings if l.status == ListingStatus.APPROVED]
    avg_rating = Decimal(0)
    if approved_listing_ids:
        avg_ratings = [l.rating_average for l in listings if l.status == ListingStatus.APPROVED and l.rating_average > 0]
        if avg_ratings:
            avg_rating = sum(avg_ratings) / len(avg_ratings)
    
    return CreatorDashboardStats(
        total_listings=total_listings,
        approved_listings=approved_listings,
        pending_listings=pending_listings,
        total_sales=total_sales,
        total_revenue=total_revenue,
        platform_fees=platform_fees,
        net_earnings=net_earnings,
        average_rating=avg_rating
    )

