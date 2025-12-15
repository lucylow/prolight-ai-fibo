"""
Stripe customer management endpoints.
Handles creation and synchronization of Stripe customers with local user records.
"""
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import SessionLocal
from app.models.billing import User, Subscription
from app.auth.role_middleware import get_current_user
from app.core.config import settings
from app.services.stripe_client import get_stripe_client
from datetime import datetime

router = APIRouter(prefix="/api/stripe", tags=["Stripe Customers"])

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


class CustomerResponse(BaseModel):
    stripe_customer_id: str
    email: str
    created: bool  # True if customer was just created, False if already existed


class CreateCustomerResponse(BaseModel):
    stripe_customer_id: str


class AttachPaymentMethodRequest(BaseModel):
    payment_method_id: str


class CreateSubscriptionRequest(BaseModel):
    price_id: str  # the Stripe Price ID (metered or recurring)
    trial_period_days: int = 0


@router.post("/create_customer", response_model=CreateCustomerResponse)
def create_stripe_customer(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Create a Stripe customer for the current user (if missing) and persist stripe_customer_id.
    Idempotent: returns existing stripe_customer_id if present.
    """
    # Get current user
    current_user = get_current_user(authorization, db)
    
    # Extract user info (handle both User model and dict)
    if hasattr(current_user, 'email'):
        user_email = current_user.email
        user_id = current_user.id
        full_name = getattr(current_user, 'full_name', None) or getattr(current_user, 'name', None)
        db_user = current_user if isinstance(current_user, User) else None
    elif isinstance(current_user, dict):
        user_email = current_user.get("email")
        user_id = current_user.get("id")
        full_name = current_user.get("full_name") or current_user.get("name")
        db_user = None
    else:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found")
    
    # Try to get user from database
    if not db_user:
        db_user = db.query(User).filter(User.email == user_email).first()
    
    # If user exists in DB and has Stripe customer ID, return it
    if db_user and db_user.stripe_customer_id:
        return CreateCustomerResponse(stripe_customer_id=db_user.stripe_customer_id)
    
    # Create Stripe customer
    try:
        if not settings.USE_MOCK_STRIPE:
            cust = stripe.Customer.create(
                email=user_email,
                name=full_name or None,
                metadata={"user_id": str(user_id)}
            )
            customer_id = cust["id"]
        else:
            # Mock mode
            customer_id = f"cus_mock_{user_id}"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")
    
    # Create or update user in database
    if db_user:
        db_user.stripe_customer_id = customer_id
        db.add(db_user)
    else:
        # Create new user record
        db_user = User(
            email=user_email,
            stripe_customer_id=customer_id,
            full_name=full_name,
            role="viewer"  # Default role
        )
        db.add(db_user)
    
    db.commit()
    db.refresh(db_user)
    return CreateCustomerResponse(stripe_customer_id=customer_id)


@router.post("/attach_payment_method")
def attach_payment_method(
    payload: AttachPaymentMethodRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Attach a PaymentMethod to the current user's Stripe Customer and set as default.
    """
    # Get current user
    current_user = get_current_user(authorization, db)
    
    # Extract user info
    if hasattr(current_user, 'email'):
        user_email = current_user.email
        db_user = current_user if isinstance(current_user, User) else None
    elif isinstance(current_user, dict):
        user_email = current_user.get("email")
        db_user = None
    else:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    # Ensure user exists in DB and has Stripe customer
    if not db_user:
        db_user = db.query(User).filter(User.email == user_email).first()
    
    if not db_user or not db_user.stripe_customer_id:
        # create customer first (idempotent)
        _ = create_stripe_customer(db, authorization)
        db_user = db.query(User).filter(User.email == user_email).first()
    
    try:
        if not settings.USE_MOCK_STRIPE:
            stripe.PaymentMethod.attach(
                payload.payment_method_id,
                customer=db_user.stripe_customer_id
            )
            stripe.Customer.modify(
                db_user.stripe_customer_id,
                invoice_settings={"default_payment_method": payload.payment_method_id}
            )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")
    return {"status": "attached", "stripe_customer_id": db_user.stripe_customer_id}


@router.get("/customer")
def get_customer(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Get the current user's Stripe customer information.
    """
    # Get current user
    current_user = get_current_user(authorization, db)
    
    # Extract user info
    if hasattr(current_user, 'email'):
        user_email = current_user.email
        db_user = current_user if isinstance(current_user, User) else None
    elif isinstance(current_user, dict):
        user_email = current_user.get("email")
        db_user = None
    else:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    # Get user from DB
    if not db_user:
        db_user = db.query(User).filter(User.email == user_email).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "stripe_customer_id": db_user.stripe_customer_id,
        "email": db_user.email,
        "role": db_user.role
    }


def func_to_datetime(ts):
    """Helper convert epoch or None to datetime (naive)."""
    if not ts:
        return None
    try:
        return datetime.utcfromtimestamp(int(ts))
    except Exception:
        return None


@router.post("/create_subscription")
def create_subscription(
    payload: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Create a subscription for the current user. Stores subscription & subscription_item IDs.
    - For metered usage, subscription_item_id is needed for usage reporting (store it).
    """
    # Get current user
    current_user = get_current_user(authorization, db)
    
    # Extract user info
    if hasattr(current_user, 'email'):
        user_email = current_user.email
        user_id = current_user.id
        db_user = current_user if isinstance(current_user, User) else None
    elif isinstance(current_user, dict):
        user_email = current_user.get("email")
        user_id = current_user.get("id")
        db_user = None
    else:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    # Ensure user exists in DB and has Stripe customer
    if not db_user:
        db_user = db.query(User).filter(User.email == user_email).first()
    
    if not db_user or not db_user.stripe_customer_id:
        _ = create_stripe_customer(db, authorization)
        db_user = db.query(User).filter(User.email == user_email).first()
    
    try:
        if not settings.USE_MOCK_STRIPE:
            sub = stripe.Subscription.create(
                customer=db_user.stripe_customer_id,
                items=[{"price": payload.price_id}],
                trial_period_days=payload.trial_period_days or None,
                expand=["latest_invoice.payment_intent", "items.data.price"]
            )
        else:
            # Mock mode
            sub = {
                "id": f"sub_mock_{user_id}",
                "status": "active",
                "items": {
                    "data": [{
                        "id": f"si_mock_{user_id}",
                        "price": {
                            "id": payload.price_id,
                            "recurring": {"interval": "month"}
                        }
                    }]
                },
                "current_period_start": int(datetime.utcnow().timestamp()),
                "current_period_end": int(datetime.utcnow().timestamp()) + 2592000  # 30 days
            }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    # Persist subscription and subscription_item to DB
    item = sub["items"]["data"][0]
    subscription = Subscription(
        stripe_subscription_id=sub["id"],
        stripe_customer_id=db_user.stripe_customer_id,
        user_id=db_user.id,
        status=sub["status"],
        price_id=item["price"]["id"],
        subscription_item_id=item["id"],
        interval=item["price"]["recurring"]["interval"] if item["price"].get("recurring") else None,
        current_period_start=func_to_datetime(sub.get("current_period_start")),
        current_period_end=func_to_datetime(sub.get("current_period_end"))
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return {"subscription_id": sub["id"], "subscription_item_id": item["id"]}
