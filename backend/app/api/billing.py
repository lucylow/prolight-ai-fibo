"""
Billing and subscription management API endpoints.
Handles invoices, subscriptions, and usage tracking.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.models.schemas import (
    InvoiceResponse,
    InvoiceListResponse,
    RefundRequest,
    RefundResponse
)
from app.services.stripe_client import get_stripe_client
from app.db import SessionLocal
from app.models.billing import Invoice

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["Billing"])


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/invoices/{customer_id}", response_model=InvoiceListResponse)
async def get_invoices(
    customer_id: str,
    limit: int = Query(12, ge=1, le=100),
    cursor: Optional[int] = Query(None, description="Cursor for pagination (invoice ID)"),
    use_database: bool = Query(False, description="Query from database instead of Stripe"),
    db: Session = Depends(get_db)
):
    """
    Get invoice history for a customer.
    Can query from database (use_database=true) or Stripe API (use_database=false).
    Supports cursor-based pagination when querying from database.
    """
    try:
        # Query from database if requested
        if use_database:
            query = db.query(Invoice).filter(
                Invoice.stripe_customer_id == customer_id
            ).order_by(Invoice.created_at.desc())
            
            if cursor:
                query = query.filter(Invoice.id < cursor)
            
            invoices = query.limit(limit).all()
            
            invoice_list = [
                InvoiceResponse(
                    id=inv.stripe_invoice_id,
                    amount_paid=inv.amount_paid,
                    currency=inv.currency,
                    status=inv.status,
                    hosted_invoice_url=inv.hosted_invoice_url or "",
                    period_start=int(inv.period_start.timestamp()) if inv.period_start else 0,
                    period_end=int(inv.period_end.timestamp()) if inv.period_end else 0,
                    created=int(inv.created_at.timestamp()) if inv.created_at else 0
                )
                for inv in invoices
            ]
            
            return InvoiceListResponse(
                invoices=invoice_list,
                total=len(invoice_list)
            )
        else:
            # Query from Stripe API (original behavior)
            stripe = get_stripe_client()
            
            invoices = stripe.invoices.list(
                customer=customer_id,
                limit=limit
            )
            
            invoice_list = [
                InvoiceResponse(
                    id=inv["id"],
                    amount_paid=inv.get("amount_paid", 0),
                    currency=inv.get("currency", "usd"),
                    status=inv.get("status", "draft"),
                    hosted_invoice_url=inv.get("hosted_invoice_url", ""),
                    period_start=inv.get("period_start", 0),
                    period_end=inv.get("period_end", 0),
                    created=inv.get("created", 0)
                )
                for inv in invoices.get("data", [])
            ]
            
            return InvoiceListResponse(
                invoices=invoice_list,
                total=len(invoice_list)
            )
        
    except Exception as e:
        logger.error(f"Failed to fetch invoices: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refund", response_model=RefundResponse)
async def create_refund(body: RefundRequest):
    """
    Create a refund for a charge.
    Note: In production, this should be admin-only.
    """
    try:
        stripe = get_stripe_client()
        
        refund_params = {"charge": body.charge_id}
        if body.amount_cents:
            refund_params["amount"] = body.amount_cents
        
        refund = stripe.refunds.create(**refund_params)
        
        return RefundResponse(
            id=refund["id"],
            amount=refund["amount"],
            currency=refund["currency"],
            status=refund["status"],
            charge=refund["charge"]
        )
        
    except Exception as e:
        logger.error(f"Refund creation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
