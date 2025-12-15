"""
Enhanced Stripe service for subscriptions, usage billing, and marketplace payouts.
"""
import stripe
from typing import Optional, Dict, Any
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Initialize Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY
else:
    logger.warning("Stripe secret key not configured. Stripe features will be disabled.")


class StripeService:
    """Service for Stripe operations."""
    
    @staticmethod
    def create_customer(email: str, name: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Create a Stripe customer."""
        if not settings.STRIPE_SECRET_KEY or settings.USE_MOCK_STRIPE:
            return {
                "id": f"cus_mock_{email.replace('@', '_')}",
                "email": email,
                "object": "customer"
            }
        
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=metadata or {}
            )
            return customer
        except Exception as e:
            logger.error(f"Error creating Stripe customer: {e}")
            return None
    
    @staticmethod
    def create_subscription(
        customer_id: str,
        price_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Create a subscription for a customer."""
        if not settings.STRIPE_SECRET_KEY or settings.USE_MOCK_STRIPE:
            return {
                "id": f"sub_mock_{customer_id}",
                "customer": customer_id,
                "status": "active",
                "current_period_end": 1735689600,  # Mock timestamp
                "items": {
                    "data": [{
                        "id": f"si_mock_{customer_id}",
                        "price": {"id": price_id}
                    }]
                }
            }
        
        try:
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                metadata=metadata or {}
            )
            return subscription
        except Exception as e:
            logger.error(f"Error creating subscription: {e}")
            return None
    
    @staticmethod
    def cancel_subscription(subscription_id: str, cancel_at_period_end: bool = True) -> Optional[Dict[str, Any]]:
        """Cancel a subscription."""
        if not settings.STRIPE_SECRET_KEY or settings.USE_MOCK_STRIPE:
            return {"id": subscription_id, "status": "canceled" if not cancel_at_period_end else "active"}
        
        try:
            if cancel_at_period_end:
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                subscription = stripe.Subscription.delete(subscription_id)
            return subscription
        except Exception as e:
            logger.error(f"Error canceling subscription: {e}")
            return None
    
    @staticmethod
    def report_usage(
        subscription_item_id: str,
        quantity: int,
        timestamp: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Report usage for metered billing."""
        if not settings.STRIPE_SECRET_KEY or settings.USE_MOCK_STRIPE:
            return {"id": f"usage_mock_{subscription_item_id}"}
        
        try:
            usage_record = stripe.UsageRecord.create(
                subscription_item=subscription_item_id,
                quantity=quantity,
                timestamp=timestamp
            )
            return usage_record
        except Exception as e:
            logger.error(f"Error reporting usage: {e}")
            return None
    
    @staticmethod
    def create_checkout_session(
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Create a Stripe Checkout session."""
        if not settings.STRIPE_SECRET_KEY or settings.USE_MOCK_STRIPE:
            return {
                "id": f"cs_mock_{customer_id}",
                "url": f"{success_url}?session_id=mock_session"
            }
        
        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[{
                    "price": price_id,
                    "quantity": 1,
                }],
                mode="subscription",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata or {}
            )
            return session
        except Exception as e:
            logger.error(f"Error creating checkout session: {e}")
            return None
    
    @staticmethod
    def create_connect_account(email: str, country: str = "US") -> Optional[Dict[str, Any]]:
        """Create a Stripe Connect account for marketplace creators."""
        if not settings.STRIPE_SECRET_KEY or settings.USE_MOCK_STRIPE:
            return {
                "id": f"acct_mock_{email.replace('@', '_')}",
                "email": email,
                "object": "account"
            }
        
        try:
            account = stripe.Account.create(
                type="express",
                country=country,
                email=email,
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
            )
            return account
        except Exception as e:
            logger.error(f"Error creating Connect account: {e}")
            return None
    
    @staticmethod
    def create_connect_account_link(account_id: str, refresh_url: str, return_url: str) -> Optional[Dict[str, Any]]:
        """Create an account link for Connect onboarding."""
        if not settings.STRIPE_SECRET_KEY or settings.USE_MOCK_STRIPE:
            return {"url": f"{return_url}?account_id={account_id}"}
        
        try:
            account_link = stripe.AccountLink.create(
                account=account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type="account_onboarding",
            )
            return account_link
        except Exception as e:
            logger.error(f"Error creating account link: {e}")
            return None
    
    @staticmethod
    def create_marketplace_payment(
        customer_id: str,
        amount: int,  # in cents
        application_fee_amount: int,  # platform fee in cents
        connect_account_id: str,  # creator's Stripe account
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Create a payment with Connect for marketplace purchases."""
        if not settings.STRIPE_SECRET_KEY or settings.USE_MOCK_STRIPE:
            return {
                "id": f"pi_mock_{customer_id}",
                "status": "succeeded",
                "amount": amount
            }
        
        try:
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency="usd",
                customer=customer_id,
                application_fee_amount=application_fee_amount,
                transfer_data={"destination": connect_account_id},
                metadata=metadata or {}
            )
            return payment_intent
        except Exception as e:
            logger.error(f"Error creating marketplace payment: {e}")
            return None
    
    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str) -> Optional[Dict[str, Any]]:
        """Verify Stripe webhook signature."""
        if not settings.STRIPE_WEBHOOK_SECRET or settings.USE_MOCK_STRIPE:
            return {"type": "mock_event", "data": {"object": {}}}
        
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            )
            return event
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            return None
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            return None

