"""
Stripe webhook handler for billing events.
Handles invoice.* and customer.subscription.* events with database persistence.
"""
import logging
import stripe
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.db import SessionLocal
from app.models.billing import Invoice, Subscription
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["Billing"])

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


def timestamp_to_datetime(ts_int):
    """Convert Unix timestamp to datetime, handling None."""
    if ts_int:
        return datetime.fromtimestamp(ts_int)
    return None


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Stripe webhook events for invoices and subscriptions.
    Persists invoice and subscription data to the database.
    """
    payload = await request.body()
    stripe_signature = request.headers.get("stripe-signature")
    
    # Handle mock mode
    if settings.USE_MOCK_STRIPE or not settings.STRIPE_WEBHOOK_SECRET:
        logger.info(f"Mock webhook received: {len(payload)} bytes")
        # In mock mode, we could still process some events if needed
        return {"status": "success", "mode": "mock"}
    
    # Verify webhook signature
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")
    
    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    data = event["data"]["object"]
    event_type = event["type"]
    
    logger.info(f"Processing Stripe event: {event_type}")
    
    # ---------------- INVOICE EVENTS ----------------
    if event_type.startswith("invoice."):
        try:
            invoice = db.query(Invoice).filter(
                Invoice.stripe_invoice_id == data["id"]
            ).first()
            
            # Create new invoice if it doesn't exist
            if not invoice:
                invoice = Invoice(
                    stripe_invoice_id=data["id"],
                    stripe_customer_id=data.get("customer", ""),
                    currency=data.get("currency", "usd"),
                    amount_due=data.get("amount_due", 0),
                    amount_paid=data.get("amount_paid", 0),
                )
                db.add(invoice)
            
            # Update invoice fields
            invoice.stripe_customer_id = data.get("customer", invoice.stripe_customer_id)
            invoice.status = data.get("status", invoice.status)
            invoice.amount_due = data.get("amount_due", invoice.amount_due)
            invoice.amount_paid = data.get("amount_paid", invoice.amount_paid)
            invoice.hosted_invoice_url = data.get("hosted_invoice_url") or invoice.hosted_invoice_url
            invoice.invoice_pdf = data.get("invoice_pdf") or invoice.invoice_pdf
            invoice.billing_reason = data.get("billing_reason") or invoice.billing_reason
            invoice.period_start = timestamp_to_datetime(data.get("period_start")) or invoice.period_start
            invoice.period_end = timestamp_to_datetime(data.get("period_end")) or invoice.period_end
            invoice.updated_at = datetime.utcnow()
            
            db.commit()
            logger.info(f"Invoice {data['id']} updated in database")
            
        except Exception as e:
            logger.error(f"Error processing invoice event: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error processing invoice: {str(e)}")
    
    # ---------------- SUBSCRIPTION EVENTS ----------------
    elif event_type.startswith("customer.subscription."):
        try:
            sub = db.query(Subscription).filter(
                Subscription.stripe_subscription_id == data["id"]
            ).first()
            
            # Get price information and subscription item ID from subscription items
            price = None
            interval = None
            subscription_item_id = None
            if data.get("items") and data["items"].get("data") and len(data["items"]["data"]) > 0:
                first_item = data["items"]["data"][0]
                subscription_item_id = first_item.get("id")  # This is the subscription_item.id needed for usage reporting
                price_obj = first_item.get("price", {})
                price = price_obj.get("id")
                recurring = price_obj.get("recurring", {})
                interval = recurring.get("interval")
            
            # Create new subscription if it doesn't exist
            if not sub:
                if not price or not interval:
                    logger.warning(f"Subscription {data['id']} missing price or interval data")
                    return {"status": "warning", "message": "Missing price/interval data"}
                
                sub = Subscription(
                    stripe_subscription_id=data["id"],
                    stripe_customer_id=data.get("customer", ""),
                    price_id=price,
                    interval=interval,
                    stripe_subscription_item_id=subscription_item_id,  # Store subscription item ID
                )
                db.add(sub)
            
            # Update subscription fields
            sub.stripe_customer_id = data.get("customer", sub.stripe_customer_id)
            sub.status = data.get("status", sub.status)
            if price:
                sub.price_id = price
            if interval:
                sub.interval = interval
            if subscription_item_id:
                sub.stripe_subscription_item_id = subscription_item_id  # Update subscription item ID
            sub.cancel_at_period_end = data.get("cancel_at_period_end", False)
            sub.current_period_start = timestamp_to_datetime(data.get("current_period_start")) or sub.current_period_start
            sub.current_period_end = timestamp_to_datetime(data.get("current_period_end")) or sub.current_period_end
            sub.updated_at = datetime.utcnow()
            
            db.commit()
            logger.info(f"Subscription {data['id']} updated in database (subscription_item_id: {subscription_item_id})")
            
        except Exception as e:
            logger.error(f"Error processing subscription event: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error processing subscription: {str(e)}")
    
    return {"status": "success", "event_type": event_type}
