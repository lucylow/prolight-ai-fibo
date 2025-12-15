"""
Invoice PDF proxy endpoint.
Proxies Stripe invoice PDFs with authentication checks.
"""
import os
import stripe
import requests
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse, RedirectResponse
from typing import Optional
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.billing import Invoice, User
from app.auth.role_middleware import get_current_user
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY if settings.STRIPE_SECRET_KEY else os.getenv("STRIPE_SECRET_KEY")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/billing", tags=["billing"])


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/invoice/{stripe_invoice_id}/pdf")
def invoice_pdf_proxy(
    stripe_invoice_id: str,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Streams the invoice PDF back to an authenticated user.
    - If invoice.invoice_pdf exists, it will fetch and stream it.
    - Otherwise, attempt to fetch from Stripe (stripe.Invoice.retrieve -> invoice_pdf).
    - If hosted_invoice_url exists and streaming not possible, returns redirect.
    """
    # Get current user
    current_user = get_current_user(authorization, db)
    
    # Extract user info
    if hasattr(current_user, 'email'):
        user_email = current_user.email
        user_role = getattr(current_user, 'role', 'viewer')
        user_id = getattr(current_user, 'id', None)
        db_user = current_user if isinstance(current_user, User) else None
    elif isinstance(current_user, dict):
        user_email = current_user.get("email")
        user_role = current_user.get("role", current_user.get("roles", ["viewer"])[0] if current_user.get("roles") else "viewer")
        user_id = current_user.get("id")
        db_user = None
    else:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    # Get user from DB
    if not db_user:
        db_user = db.query(User).filter(User.email == user_email).first()
    
    inv = db.query(Invoice).filter(Invoice.stripe_invoice_id == stripe_invoice_id).first()
    if not inv:
        # try fetching by stripe id from Stripe to be tolerant
        try:
            if not settings.USE_MOCK_STRIPE:
                stripe_inv = stripe.Invoice.retrieve(stripe_invoice_id)
            else:
                raise HTTPException(status_code=404, detail="Invoice not found")
        except Exception as e:
            raise HTTPException(status_code=404, detail="Invoice not found")
        # optional: persist minimal invoice data here
        pdf_url = stripe_inv.get("invoice_pdf")
        if pdf_url:
            r = requests.get(pdf_url, stream=True, timeout=30)
            if r.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch PDF from Stripe")
            return StreamingResponse(r.iter_content(chunk_size=1024), media_type="application/pdf")
        hosted = stripe_inv.get("hosted_invoice_url")
        if hosted:
            return RedirectResponse(hosted)
        raise HTTPException(status_code=404, detail="Invoice PDF not available")

    # Authorization: owner OR admin
    if inv.user_id:
        if inv.user_id != (db_user.id if db_user else None) and user_role != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")
    else:
        # if no linked user, disallow unless admin
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")

    if inv.invoice_pdf:
        r = requests.get(inv.invoice_pdf, stream=True, timeout=30)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch stored PDF")
        return StreamingResponse(r.iter_content(chunk_size=1024), media_type="application/pdf")

    if inv.hosted_invoice_url:
        return RedirectResponse(inv.hosted_invoice_url)

    # fallback: fetch from Stripe API
    try:
        if not settings.USE_MOCK_STRIPE:
            stripe_inv = stripe.Invoice.retrieve(stripe_invoice_id)
            pdf_url = stripe_inv.get("invoice_pdf")
            if pdf_url:
                r = requests.get(pdf_url, stream=True, timeout=30)
                if r.status_code != 200:
                    raise HTTPException(status_code=502, detail="Failed to fetch PDF from Stripe")
                return StreamingResponse(r.iter_content(chunk_size=1024), media_type="application/pdf")
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    raise HTTPException(status_code=404, detail="Invoice PDF not available")
