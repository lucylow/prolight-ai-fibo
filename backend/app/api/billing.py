"""
Billing and subscription management API endpoints.
Handles invoices, subscriptions, and usage tracking.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import logging

from app.models.schemas import (
    InvoiceResponse,
    InvoiceListResponse,
    RefundRequest,
    RefundResponse
)
from app.services.stripe_client import get_stripe_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["Billing"])


@router.get("/invoices/{customer_id}", response_model=InvoiceListResponse)
async def get_invoices(
    customer_id: str,
    limit: int = Query(12, ge=1, le=100)
):
    """
    Get invoice history for a customer.
    """
    try:
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
