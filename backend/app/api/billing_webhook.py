"""
Stripe webhook handler for billing events.
Handles invoice.* and customer.subscription.* events with database persistence.
"""
import os
import json
import stripe
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.billing import Invoice, Subscription, User
from app.core.config import settings

router = APIRouter(prefix="/webhook", tags=["webhook"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY") or (settings.STRIPE_SECRET_KEY if settings.STRIPE_SECRET_KEY else None)
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET") or (settings.STRIPE_WEBHOOK_SECRET if hasattr(settings, 'STRIPE_WEBHOOK_SECRET') else None)


def upsert_invoice(db: Session, inv_obj: dict):
    """
    Persist or update Invoice row from stripe invoice object.
    Idempotent by stripe_invoice_id.
    """
    stripe_invoice_id = inv_obj.get("id")
    if not stripe_invoice_id:
        return None

    invoice = db.query(Invoice).filter(Invoice.stripe_invoice_id == stripe_invoice_id).first()
    if not invoice:
        invoice = Invoice(stripe_invoice_id=stripe_invoice_id)

    invoice.stripe_customer_id = inv_obj.get("customer")
    invoice.status = inv_obj.get("status")
    invoice.currency = inv_obj.get("currency") or "usd"
    invoice.amount_due = inv_obj.get("amount_due") or 0
    invoice.amount_paid = inv_obj.get("amount_paid") or 0
    invoice.hosted_invoice_url = inv_obj.get("hosted_invoice_url")
    invoice.invoice_pdf = inv_obj.get("invoice_pdf")
    invoice.billing_reason = inv_obj.get("billing_reason")
    period = inv_obj.get("period_start")
    if period:
        try:
            invoice.period_start = datetime.utcfromtimestamp(int(period))
        except Exception:
            invoice.period_start = None
    period_end = inv_obj.get("period_end")
    if period_end:
        try:
            invoice.period_end = datetime.utcfromtimestamp(int(period_end))
        except Exception:
            invoice.period_end = None

    # try to link to local user by stripe_customer_id
    user = db.query(User).filter(User.stripe_customer_id == invoice.stripe_customer_id).first()
    if user:
        invoice.user_id = user.id

    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def upsert_subscription(db: Session, sub_obj: dict):
    """
    Persist or update subscription rows.
    """
    stripe_subscription_id = sub_obj.get("id")
    if not stripe_subscription_id:
        return None
    subscription = db.query(Subscription).filter(Subscription.stripe_subscription_id == stripe_subscription_id).first()
    if not subscription:
        subscription = Subscription(stripe_subscription_id=stripe_subscription_id)
    subscription.stripe_customer_id = sub_obj.get("customer")
    subscription.status = sub_obj.get("status")
    # take first item as canonical
    items = sub_obj.get("items", {}).get("data", [])
    if items:
        first = items[0]
        subscription.price_id = first.get("price", {}).get("id")
        subscription.subscription_item_id = first.get("id")
        if first.get("price", {}).get("recurring"):
            subscription.interval = first["price"]["recurring"].get("interval")
    subscription.cancel_at_period_end = sub_obj.get("cancel_at_period_end", False)
    # period times
    try:
        cps = sub_obj.get("current_period_start")
        cpe = sub_obj.get("current_period_end")
        if cps:
            subscription.current_period_start = datetime.utcfromtimestamp(int(cps))
        if cpe:
            subscription.current_period_end = datetime.utcfromtimestamp(int(cpe))
    except Exception:
        pass

    # link to local user if possible
    user = db.query(User).filter(User.stripe_customer_id == subscription.stripe_customer_id).first()
    if user:
        subscription.user_id = user.id

    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


@router.post("/stripe", include_in_schema=False)
async def stripe_webhook(request: Request):
    """
    Stripe webhook handler. Verifies signature if STRIPE_WEBHOOK_SECRET set.
    Handles:
      - invoice.paid, invoice.finalized, invoice.updated
      - customer.subscription.created/updated/deleted
      - invoice.payment_failed
    Make sure the STRIPE_WEBHOOK_SECRET environment var is configured.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    event = None
    try:
        if WEBHOOK_SECRET and sig_header:
            event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=WEBHOOK_SECRET)
            data = event["data"]["object"]
            typ = event["type"]
        else:
            # no signature configured: parse but this is less secure
            obj = json.loads(payload.decode("utf-8"))
            typ = obj.get("type")
            data = obj.get("data", {}).get("object")
            event = obj
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    db: Session = SessionLocal()  # use generator directly for webhook (be careful in production)
    # Dispatch events
    try:
        if typ.startswith("invoice."):
            inv = data
            upsert_invoice(db, inv)
            # additional actions: notify user, mark paid, trigger delivery, etc.

        elif typ.startswith("customer.subscription."):
            sub = data
            upsert_subscription(db, sub)

        elif typ == "invoice.payment_failed":
            inv = data
            upsert_invoice(db, inv)
            # notify ops / billing team

        # Add more event types as necessary

    finally:
        db.close()

    return {"received": True}

