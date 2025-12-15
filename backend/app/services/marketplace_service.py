"""
Marketplace service for managing listings, purchases, and creator payouts.
"""
from typing import Optional, List, Dict, Any
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.marketplace import MarketplaceListing, MarketplacePurchase, MarketplaceReview, ListingStatus, ListingType
from app.models.user import User
from app.services.stripe_service import StripeService
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class MarketplaceService:
    """Service for marketplace operations."""
    
    @staticmethod
    def create_listing(
        db: Session,
        creator_id: int,
        title: str,
        description: str,
        listing_type: ListingType,
        price: Decimal,
        fibo_json: Optional[Dict[str, Any]] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        preview_image_url: Optional[str] = None
    ) -> MarketplaceListing:
        """Create a new marketplace listing."""
        listing = MarketplaceListing(
            creator_id=creator_id,
            title=title,
            description=description,
            listing_type=listing_type,
            price=price,
            fibo_json=fibo_json,
            category=category,
            tags=tags or [],
            preview_image_url=preview_image_url,
            status=ListingStatus.PENDING if settings.MARKETPLACE_REVIEW_REQUIRED else ListingStatus.APPROVED,
            is_free=(price == 0)
        )
        db.add(listing)
        db.commit()
        db.refresh(listing)
        return listing
    
    @staticmethod
    def approve_listing(db: Session, listing_id: int, admin_user_id: int) -> Optional[MarketplaceListing]:
        """Approve a marketplace listing."""
        listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
        if not listing:
            return None
        
        listing.status = ListingStatus.APPROVED
        listing.approved_by = admin_user_id
        from datetime import datetime
        listing.approved_at = datetime.utcnow()
        
        db.commit()
        db.refresh(listing)
        return listing
    
    @staticmethod
    def reject_listing(db: Session, listing_id: int, admin_user_id: int, reason: str) -> Optional[MarketplaceListing]:
        """Reject a marketplace listing."""
        listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
        if not listing:
            return None
        
        listing.status = ListingStatus.REJECTED
        listing.approved_by = admin_user_id
        listing.rejection_reason = reason
        
        db.commit()
        db.refresh(listing)
        return listing
    
    @staticmethod
    def purchase_listing(
        db: Session,
        buyer_id: int,
        listing_id: int,
        stripe_customer_id: Optional[str] = None
    ) -> Optional[MarketplacePurchase]:
        """Purchase a marketplace listing."""
        listing = db.query(MarketplaceListing).filter(
            MarketplaceListing.id == listing_id,
            MarketplaceListing.status == ListingStatus.APPROVED
        ).first()
        
        if not listing:
            logger.error(f"Listing {listing_id} not found or not approved")
            return None
        
        buyer = db.query(User).filter(User.id == buyer_id).first()
        if not buyer:
            logger.error(f"Buyer {buyer_id} not found")
            return None
        
        creator = db.query(User).filter(User.id == listing.creator_id).first()
        if not creator:
            logger.error(f"Creator {listing.creator_id} not found")
            return None
        
        # Calculate fees
        amount_cents = int(listing.price * 100)
        platform_fee_cents = int(amount_cents * settings.STRIPE_PLATFORM_FEE_PERCENT)
        creator_payout_cents = amount_cents - platform_fee_cents
        
        # Process payment if not free
        stripe_charge_id = None
        if not listing.is_free and settings.STRIPE_SECRET_KEY:
            if creator.stripe_connect_account_id:
                # Use Stripe Connect for marketplace transaction
                payment = StripeService.create_marketplace_payment(
                    customer_id=buyer.stripe_customer_id or stripe_customer_id,
                    amount=amount_cents,
                    application_fee_amount=platform_fee_cents,
                    connect_account_id=creator.stripe_connect_account_id,
                    metadata={
                        "listing_id": listing_id,
                        "buyer_id": buyer_id,
                        "creator_id": listing.creator_id
                    }
                )
                if payment:
                    stripe_charge_id = payment.get("id")
            else:
                logger.warning(f"Creator {listing.creator_id} has no Connect account, payment not processed")
        
        # Create purchase record
        purchase = MarketplacePurchase(
            buyer_id=buyer_id,
            listing_id=listing_id,
            stripe_charge_id=stripe_charge_id,
            amount_paid=listing.price,
            platform_fee=Decimal(platform_fee_cents) / 100,
            creator_payout=Decimal(creator_payout_cents) / 100,
            status="completed"
        )
        db.add(purchase)
        
        # Update listing stats
        listing.purchase_count += 1
        
        db.commit()
        db.refresh(purchase)
        return purchase
    
    @staticmethod
    def add_review(
        db: Session,
        listing_id: int,
        reviewer_id: int,
        rating: int,
        comment: Optional[str] = None
    ) -> Optional[MarketplaceReview]:
        """Add a review to a marketplace listing."""
        if rating < 1 or rating > 5:
            logger.error(f"Invalid rating: {rating}")
            return None
        
        # Check if user has purchased the listing
        purchase = db.query(MarketplacePurchase).filter(
            MarketplacePurchase.listing_id == listing_id,
            MarketplacePurchase.buyer_id == reviewer_id
        ).first()
        
        if not purchase:
            logger.error(f"User {reviewer_id} has not purchased listing {listing_id}")
            return None
        
        # Check if review already exists
        existing_review = db.query(MarketplaceReview).filter(
            MarketplaceReview.listing_id == listing_id,
            MarketplaceReview.reviewer_id == reviewer_id
        ).first()
        
        if existing_review:
            # Update existing review
            existing_review.rating = rating
            existing_review.comment = comment
            db.commit()
            db.refresh(existing_review)
            # Recalculate average rating
            MarketplaceService._update_listing_rating(db, listing_id)
            return existing_review
        
        # Create new review
        review = MarketplaceReview(
            listing_id=listing_id,
            reviewer_id=reviewer_id,
            rating=rating,
            comment=comment
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        
        # Update listing rating
        MarketplaceService._update_listing_rating(db, listing_id)
        
        return review
    
    @staticmethod
    def _update_listing_rating(db: Session, listing_id: int):
        """Recalculate and update listing rating."""
        listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
        if not listing:
            return
        
        reviews = db.query(MarketplaceReview).filter(MarketplaceReview.listing_id == listing_id).all()
        if reviews:
            total_rating = sum(r.rating for r in reviews)
            listing.rating_average = Decimal(total_rating) / len(reviews)
            listing.rating_count = len(reviews)
        else:
            listing.rating_average = Decimal(0)
            listing.rating_count = 0
        
        db.commit()
    
    @staticmethod
    def get_popular_listings(db: Session, limit: int = 20, category: Optional[str] = None) -> List[MarketplaceListing]:
        """Get popular marketplace listings."""
        query = db.query(MarketplaceListing).filter(
            MarketplaceListing.status == ListingStatus.APPROVED
        )
        
        if category:
            query = query.filter(MarketplaceListing.category == category)
        
        return query.order_by(
            MarketplaceListing.purchase_count.desc(),
            MarketplaceListing.rating_average.desc()
        ).limit(limit).all()
    
    @staticmethod
    def search_listings(
        db: Session,
        query_text: Optional[str] = None,
        category: Optional[str] = None,
        listing_type: Optional[ListingType] = None,
        min_rating: Optional[float] = None,
        limit: int = 50
    ) -> List[MarketplaceListing]:
        """Search marketplace listings."""
        query = db.query(MarketplaceListing).filter(
            MarketplaceListing.status == ListingStatus.APPROVED
        )
        
        if category:
            query = query.filter(MarketplaceListing.category == category)
        
        if listing_type:
            query = query.filter(MarketplaceListing.listing_type == listing_type)
        
        if min_rating:
            query = query.filter(MarketplaceListing.rating_average >= min_rating)
        
        if query_text:
            query = query.filter(
                MarketplaceListing.title.ilike(f"%{query_text}%") |
                MarketplaceListing.description.ilike(f"%{query_text}%")
            )
        
        return query.order_by(
            MarketplaceListing.created_at.desc()
        ).limit(limit).all()

