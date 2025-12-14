"""
Stripe Checkout API endpoints.
Handles payment session creation and webhooks.
"""

from fastapi import APIRouter, HTTPException, Request, Header
from typing import Optional
import logging

from app.models.schemas import (
    CreateCheckoutSessionRequest,
    CheckoutSessionResponse,
    CreatePortalSessionRequest,
    PortalSessionResponse
)
from app.services.stripe_client import get_stripe_client
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stripe", tags=["Stripe"])


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(body: CreateCheckoutSessionRequest):
    """
    Create a Stripe Checkout Session for payment or subscription.
    Returns a URL to redirect the user to Stripe's hosted checkout page.
    """
    try:
        stripe = get_stripe_client()
        
        # Build line items
        line_items = [{
            "price": body.priceId,
            "quantity": 1,
        }]
        
        # Build discounts if coupon provided
        discounts = []
        if body.coupon:
            discounts.append({"coupon": body.coupon})
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode=body.mode,
            discounts=discounts if discounts else None,
            success_url=body.successUrl,
            cancel_url=body.cancelUrl,
            metadata={
                "app": "prolight-ai",
                "price_id": body.priceId
            }
        )
        
        return CheckoutSessionResponse(id=session["id"], url=session["url"])
        
    except Exception as e:
        logger.error(f"Checkout session creation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-portal-session", response_model=PortalSessionResponse)
async def create_portal_session(body: CreatePortalSessionRequest):
    """
    Create a Stripe Customer Portal session for self-service billing management.
    """
    try:
        stripe = get_stripe_client()
        
        session = stripe.billing_portal.Session.create(
            customer=body.customerId,
            return_url=body.returnUrl
        )
        
        return PortalSessionResponse(url=session["url"])
        
    except Exception as e:
        logger.error(f"Portal session creation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(None)):
    """
    Handle Stripe webhook events.
    In mock mode, this will log events but not process them.
    """
    payload = await request.body()
    
    if settings.USE_MOCK_STRIPE or not settings.STRIPE_WEBHOOK_SECRET:
        # Mock mode - just log the event
        logger.info(f"Mock webhook received: {len(payload)} bytes")
        return {"status": "success", "mode": "mock"}
    
    # Real Stripe webhook processing
    try:
        import stripe
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
        
        # Handle different event types
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            logger.info(f"Checkout completed: {session['id']}")
            # TODO: Update user subscription status in database
            
        elif event["type"] == "customer.subscription.updated":
            subscription = event["data"]["object"]
            logger.info(f"Subscription updated: {subscription['id']}")
            # TODO: Update subscription status in database
            
        elif event["type"] == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            logger.info(f"Subscription cancelled: {subscription['id']}")
            # TODO: Mark subscription as cancelled in database
        
        return {"status": "success"}
        
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
