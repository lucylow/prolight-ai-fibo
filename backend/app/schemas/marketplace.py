"""
Pydantic schemas for marketplace API endpoints.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from app.models.marketplace import ListingType, ListingStatus


class MarketplaceListingCreate(BaseModel):
    """Schema for creating a marketplace listing."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    listing_type: ListingType
    price: Decimal = Field(..., ge=0, le=1000)
    fibo_json: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    preview_image_url: Optional[str] = None


class MarketplaceListingResponse(BaseModel):
    """Schema for marketplace listing response."""
    id: int
    creator_id: int
    title: str
    description: Optional[str]
    listing_type: ListingType
    price: Decimal
    is_free: bool
    category: Optional[str]
    tags: Optional[List[str]]
    preview_image_url: Optional[str]
    status: ListingStatus
    purchase_count: int
    rating_average: Decimal
    rating_count: int
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class MarketplacePurchaseRequest(BaseModel):
    """Schema for purchasing a marketplace listing."""
    listing_id: int


class MarketplacePurchaseResponse(BaseModel):
    """Schema for purchase response."""
    id: int
    buyer_id: int
    listing_id: int
    amount_paid: Decimal
    platform_fee: Decimal
    creator_payout: Decimal
    status: str
    purchased_at: datetime
    
    class Config:
        from_attributes = True


class MarketplaceReviewCreate(BaseModel):
    """Schema for creating a review."""
    listing_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class MarketplaceReviewResponse(BaseModel):
    """Schema for review response."""
    id: int
    listing_id: int
    reviewer_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class MarketplaceSearchParams(BaseModel):
    """Schema for marketplace search parameters."""
    query: Optional[str] = None
    category: Optional[str] = None
    listing_type: Optional[ListingType] = None
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    limit: int = Field(50, ge=1, le=100)


class CreatorDashboardStats(BaseModel):
    """Schema for creator dashboard statistics."""
    total_listings: int
    approved_listings: int
    pending_listings: int
    total_sales: int
    total_revenue: Decimal
    platform_fees: Decimal
    net_earnings: Decimal
    average_rating: Decimal

