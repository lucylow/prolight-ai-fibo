"""
SQLAlchemy models for users and authentication.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Numeric, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base
import enum


class PlanTier(str, enum.Enum):
    """Subscription plan tiers."""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class User(Base):
    """User model with billing and credits support."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    stripe_customer_id = Column(String(255), index=True, nullable=True)
    role = Column(String(32), default="viewer", nullable=False)  # viewer|editor|admin
    
    # Credits and billing
    credits = Column(Integer, default=0, nullable=False)
    plan_tier = Column(Enum(PlanTier), default=PlanTier.FREE, nullable=False)
    credits_last_reset = Column(DateTime, nullable=True)  # When monthly credits were last reset
    
    # Auth
    auth_provider = Column(String(50), default="clerk", nullable=True)  # clerk|supabase|custom
    auth_provider_id = Column(String(255), nullable=True, index=True)
    
    # Profile
    avatar_url = Column(String(512), nullable=True)
    bio = Column(Text, nullable=True)
    
    # Marketplace (for creators)
    is_creator = Column(Boolean, default=False, nullable=False)
    stripe_connect_account_id = Column(String(255), nullable=True)  # For marketplace payouts
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    invoices = relationship("Invoice", back_populates="user", lazy="selectin")
    subscriptions = relationship("Subscription", back_populates="user", lazy="selectin")
    usage_records = relationship("UsageRecord", back_populates="user", lazy="selectin")
    generations = relationship("Generation", back_populates="user", lazy="selectin")
    marketplace_listings = relationship("MarketplaceListing", back_populates="creator", lazy="selectin", foreign_keys="MarketplaceListing.creator_id")
    marketplace_purchases = relationship("MarketplacePurchase", back_populates="buyer", lazy="selectin")


class AdminLog(Base):
    """Admin action logs for auditing."""
    __tablename__ = "admin_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_user_id = Column(Integer, nullable=False)
    action = Column(String(100), nullable=False)  # e.g., "user_banned", "credits_added"
    target_user_id = Column(Integer, nullable=True)
    metadata = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, server_default=func.now())

