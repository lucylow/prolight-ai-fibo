"""
SQLAlchemy models for marketplace (presets and templates trading).
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Numeric, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base
import enum


class ListingType(str, enum.Enum):
    """Types of marketplace listings."""
    PRESET = "preset"  # Camera/lighting preset
    TEMPLATE = "template"  # FIBO JSON template
    MODEL = "model"  # Custom fine-tuned model


class ListingStatus(str, enum.Enum):
    """Listing approval status."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DELISTED = "delisted"


class MarketplaceListing(Base):
    """Marketplace listing for presets, templates, or models."""
    __tablename__ = "marketplace_listings"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Listing details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    listing_type = Column(Enum(ListingType), nullable=False)
    
    # Pricing
    price = Column(Numeric(10, 2), nullable=False)  # Price in USD
    is_free = Column(Boolean, default=False, nullable=False)
    
    # Content
    fibo_json = Column(JSON, nullable=True)  # For presets/templates
    preview_image_url = Column(String(1024), nullable=True)
    demo_url = Column(String(1024), nullable=True)  # Live demo link
    
    # Categories and tags
    category = Column(String(100), nullable=True)  # e.g., "portrait", "product", "automotive"
    tags = Column(JSON, nullable=True)  # Array of tags
    
    # Status
    status = Column(Enum(ListingStatus), default=ListingStatus.PENDING, nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who approved
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Stats
    purchase_count = Column(Integer, default=0, nullable=False)
    rating_average = Column(Numeric(3, 2), default=0.0, nullable=False)  # 0-5
    rating_count = Column(Integer, default=0, nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    
    # Viral attribution
    attribution_text = Column(String(255), nullable=True)  # e.g., "Made with ProLight 'Sunset Rim' preset"
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="marketplace_listings", foreign_keys=[creator_id])
    purchases = relationship("MarketplacePurchase", back_populates="listing", lazy="selectin")
    reviews = relationship("MarketplaceReview", back_populates="listing", lazy="selectin")


class MarketplacePurchase(Base):
    """Purchase record for marketplace items."""
    __tablename__ = "marketplace_purchases"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    listing_id = Column(Integer, ForeignKey("marketplace_listings.id"), nullable=False, index=True)
    
    # Payment
    stripe_charge_id = Column(String(255), nullable=True, index=True)
    amount_paid = Column(Numeric(10, 2), nullable=False)
    platform_fee = Column(Numeric(10, 2), nullable=False)
    creator_payout = Column(Numeric(10, 2), nullable=False)
    
    # Status
    status = Column(String(50), default="completed", nullable=False)  # completed|refunded
    
    # Timestamps
    purchased_at = Column(DateTime, server_default=func.now(), index=True)
    
    # Relationships
    buyer = relationship("User", back_populates="marketplace_purchases")
    listing = relationship("MarketplaceListing", back_populates="purchases")


class MarketplaceReview(Base):
    """Reviews and ratings for marketplace listings."""
    __tablename__ = "marketplace_reviews"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("marketplace_listings.id"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    listing = relationship("MarketplaceListing", back_populates="reviews")

