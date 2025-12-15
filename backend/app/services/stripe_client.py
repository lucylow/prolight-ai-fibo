"""
Stripe client configuration and utilities.
Supports both real Stripe integration and mock mode for development.
"""

import os
import stripe
from typing import Optional, Dict, Any
from datetime import datetime
from app.core.config import settings

# Initialize Stripe
if settings.STRIPE_SECRET_KEY and not settings.USE_MOCK_STRIPE:
    stripe.api_key = settings.STRIPE_SECRET_KEY
else:
    # Mock mode - no real Stripe calls
    stripe.api_key = "sk_test_mock_key_for_development"


class MockStripe:
    """Mock Stripe client for development/testing without real Stripe keys."""
    
    @staticmethod
    def create_checkout_session(
        payment_method_types: list,
        line_items: list,
        mode: str,
        success_url: str,
        cancel_url: str,
        discounts: Optional[list] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Mock checkout session creation."""
        return {
            "id": "cs_test_mock_session_12345",
            "url": f"{settings.FRONTEND_URL}/checkout/mock?session_id=cs_test_mock_session_12345",
            "payment_status": "unpaid",
            "status": "open"
        }
    
    @staticmethod
    def create_billing_portal_session(
        customer: str,
        return_url: str
    ) -> Dict[str, Any]:
        """Mock billing portal session creation."""
        return {
            "id": "bps_test_mock_12345",
            "url": f"{settings.FRONTEND_URL}/account/billing?session=bps_test_mock_12345"
        }
    
    @staticmethod
    def list_invoices(customer: str, limit: int = 12) -> Dict[str, Any]:
        """Mock invoice listing."""
        return {
            "data": [
                {
                    "id": "in_mock_1",
                    "amount_paid": 3500,
                    "currency": "usd",
                    "status": "paid",
                    "hosted_invoice_url": f"{settings.FRONTEND_URL}/invoice/mock_1",
                    "period_start": 1704067200,
                    "period_end": 1706745600,
                    "created": 1704067200
                },
                {
                    "id": "in_mock_2",
                    "amount_paid": 3500,
                    "currency": "usd",
                    "status": "paid",
                    "hosted_invoice_url": f"{settings.FRONTEND_URL}/invoice/mock_2",
                    "period_start": 1701388800,
                    "period_end": 1704067200,
                    "created": 1701388800
                }
            ]
        }
    
    @staticmethod
    def create_refund(charge: str, amount: Optional[int] = None) -> Dict[str, Any]:
        """Mock refund creation."""
        return {
            "id": "re_mock_12345",
            "amount": amount or 3500,
            "currency": "usd",
            "status": "succeeded",
            "charge": charge
        }


def get_stripe_client():
    """Get Stripe client (real or mock based on configuration)."""
    if settings.STRIPE_SECRET_KEY and not settings.USE_MOCK_STRIPE:
        return stripe
    else:
        return MockStripe()
