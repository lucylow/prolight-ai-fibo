"""
Pydantic schemas for billing and subscription API endpoints.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import PlanTier


class UserCreditsResponse(BaseModel):
    """Schema for user credits response."""
    credits: int
    plan_tier: PlanTier
    credits_last_reset: Optional[datetime]
    next_reset_date: Optional[datetime]


class SubscriptionCreate(BaseModel):
    """Schema for creating a subscription."""
    price_id: str
    plan_tier: PlanTier


class SubscriptionResponse(BaseModel):
    """Schema for subscription response."""
    id: int
    stripe_subscription_id: str
    status: str
    plan_tier: PlanTier
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    cancel_at_period_end: bool
    
    class Config:
        from_attributes = True


class CheckoutSessionResponse(BaseModel):
    """Schema for Stripe checkout session response."""
    session_id: str
    url: str


class UsageStatsResponse(BaseModel):
    """Schema for usage statistics response."""
    total_generations: int
    generations_this_month: int
    credits_used: int
    credits_remaining: int
    monthly_limit: int

