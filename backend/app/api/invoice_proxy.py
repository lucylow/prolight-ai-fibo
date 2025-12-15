"""
Invoice PDF proxy endpoint.
Proxies Stripe invoice PDFs with authentication checks.
"""
import requests
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse, RedirectResponse
from typing import Optional
from sqlalchemy.orm import Session
import logging

from app.db import SessionLocal
from app.models.billing import Invoice, User
from app.auth.role_middleware import get_current_user, require_role
from app.core.config import settings
from app.services.stripe_client import get_stripe_client

router = APIRouter(prefix="/api/billing", tags=["Invoices"])
logger = logging.getLogger(__name__)


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
    Proxy invoice PDF with authentication.
    Ensures only the invoice owner or admin can access the PDF.
    """
    # Get current user
    current_user = get_current_user(authorization, db)
    
    # Extract user info
    if hasattr(current_user, 'email'):
        user_email = current_user.email
        user_role = getattr(current_user, 'role', 'viewer')
        db_user = current_user if isinstance(current_user, User) else None
    elif isinstance(current_user, dict):
        user_email = current_user.get("email")
        user_role = current_user.get("role", current_user.get("roles", ["viewer"])[0] if current_user.get("roles") else "viewer")
        db_user = None
    else:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    # Get user from DB to check stripe_customer_id
    if not db_user:
        db_user = db.query(User).filter(User.email == user_email).first()
    
    # Get invoice from database
    inv = db.query(Invoice).filter(Invoice.stripe_invoice_id == stripe_invoice_id).first()
    
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Authorization: make sure current_user owns the invoice or is admin
    is_admin = user_role == "admin"
    is_owner = db_user and db_user.stripe_customer_id == inv.stripe_customer_id
    
    if not (is_admin or is_owner):
        logger.warning(f"Access denied for invoice {stripe_invoice_id} by user {user_email}")
        raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this invoice")
    
    # Try to get PDF URL from stored invoice
    pdf_url = None
    
    if inv.invoice_pdf:
        pdf_url = inv.invoice_pdf
    elif inv.hosted_invoice_url:
        # For hosted invoice URL, we can redirect or try to fetch
        # Stripe hosted URLs are typically HTML pages, not direct PDF links
        # We'll redirect to the hosted URL as a fallback
        return RedirectResponse(url=inv.hosted_invoice_url)
    
    # If we don't have PDF URL stored, fetch from Stripe API
    if not pdf_url:
        try:
            stripe_client = get_stripe_client()
            
            if not settings.USE_MOCK_STRIPE and hasattr(stripe_client, 'Invoice'):
                # Real Stripe API
                stripe_inv = stripe.Invoice.retrieve(
                    stripe_invoice_id,
                    expand=['invoice_pdf']
                )
                pdf_url = stripe_inv.get("invoice_pdf")
                
                # Update database with PDF URL if we got one
                if pdf_url:
                    inv.invoice_pdf = pdf_url
                    db.add(inv)
                    db.commit()
            else:
                # Mock mode - return a mock PDF URL
                pdf_url = f"{settings.FRONTEND_URL}/invoice/{stripe_invoice_id}/mock.pdf"
        except Exception as e:
            logger.error(f"Failed to fetch invoice from Stripe: {e}")
            raise HTTPException(status_code=502, detail=f"Failed to fetch invoice: {str(e)}")
    
    if not pdf_url:
        raise HTTPException(status_code=404, detail="Invoice PDF not available")
    
    # Fetch and stream the PDF
    try:
        # For mock mode, return a simple response
        if settings.USE_MOCK_STRIPE or "mock" in pdf_url:
            return {
                "message": "Invoice PDF (mock mode)",
                "url": pdf_url,
                "invoice_id": stripe_invoice_id
            }
        
        # Fetch PDF from Stripe
        response = requests.get(pdf_url, stream=True, timeout=30)
        
        if response.status_code != 200:
            logger.error(f"Failed to fetch PDF from {pdf_url}: {response.status_code}")
            raise HTTPException(status_code=502, detail="Failed to fetch PDF")
        
        return StreamingResponse(
            response.iter_content(chunk_size=1024),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="invoice_{stripe_invoice_id}.pdf"'
            }
        )
        
    except requests.RequestException as e:
        logger.error(f"Error fetching PDF: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch PDF: {str(e)}")