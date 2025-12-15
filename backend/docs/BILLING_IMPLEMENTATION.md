# Billing Implementation Summary

This document summarizes the implementation of metered billing, RBAC, Stripe integration, and revenue dashboard features.

## Overview

Complete backend implementation for:
- ✅ Metered (usage-based) billing endpoints & Stripe usage-record integration
- ✅ RBAC for billing endpoints (admin/editor/viewer) with role-check dependency
- ✅ Customer ↔ Stripe ID sync (create/update Stripe Customer & persist stripe_customer_id)
- ✅ Revenue dashboard (MRR, churn, ARR) with SQLAlchemy queries
- ✅ Alembic migration for new tables and fields
- ✅ Invoice PDF proxy endpoint (signed URL or Stripe-hosted invoice proxy)
- ✅ Webhook handler updates to capture subscription_item_id

## Files Created/Modified

### New Files Created

1. **`backend/app/api/stripe_customers.py`**
   - `/api/stripe/create_customer` - Create or retrieve Stripe customer
   - `/api/stripe/attach_payment_method` - Attach payment method to customer
   - `/api/stripe/customer` - Get current user's Stripe customer info

2. **`backend/app/api/usage.py`**
   - `/api/billing/report_usage` - Report usage for metered billing
   - `/api/billing/usage_records` - Get usage records for current user

3. **`backend/app/api/invoice_proxy.py`**
   - `/api/billing/invoice/{stripe_invoice_id}/pdf` - Proxy invoice PDF with auth checks

4. **`backend/app/api/revenue_dashboard.py`**
   - `/api/admin/revenue` - Get revenue metrics (MRR, ARR, churn) - Admin only
   - `/api/admin/subscriptions` - List all subscriptions - Admin only

5. **`backend/alembic/versions/20251215_add_billing_usage_tables.py`**
   - Migration to add User table, UsageRecord table, and subscription_item_id field

### Modified Files

1. **`backend/app/models/billing.py`**
   - Added `User` model with `stripe_customer_id` and `role` fields
   - Added `UsageRecord` model for tracking metered usage
   - Added `stripe_subscription_item_id` field to `Subscription` model

2. **`backend/app/auth/role_middleware.py`**
   - Updated `get_current_user` to work with database User model
   - Updated `require_role` to support hierarchical roles (viewer < editor < admin)
   - Updated `require_any_role` to work with database User model

3. **`backend/app/api/billing_webhook.py`**
   - Updated subscription event handler to capture and store `subscription_item_id`

4. **`backend/app/services/stripe_client.py`**
   - Added `create_metered_subscription()` helper function that stores subscription_item_id

5. **`backend/app/main.py`**
   - Registered new routers: `stripe_customers`, `usage`, `invoice_proxy`, `revenue_dashboard`

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    stripe_customer_id TEXT,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Usage Records Table
```sql
CREATE TABLE usage_records (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    stripe_subscription_item_id TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stripe_report_id TEXT,
    metadata TEXT
);
```

### Subscriptions Table (Updated)
Added field:
- `stripe_subscription_item_id TEXT` - Required for metered usage reporting

## API Endpoints

### Stripe Customer Management
- `POST /api/stripe/create_customer` - Create or retrieve Stripe customer
- `POST /api/stripe/attach_payment_method` - Attach payment method
- `GET /api/stripe/customer` - Get customer info

### Usage Reporting
- `POST /api/billing/report_usage` - Report usage for metered billing
  ```json
  {
    "quantity": 10.0,
    "subscription_item_id": "si_xxx" (optional),
    "metadata": "{}" (optional)
  }
  ```
- `GET /api/billing/usage_records` - Get usage records

### Invoice Management
- `GET /api/billing/invoice/{stripe_invoice_id}/pdf` - Proxy invoice PDF with auth

### Revenue Dashboard (Admin Only)
- `GET /api/admin/revenue` - Get MRR, ARR, churn metrics
- `GET /api/admin/subscriptions` - List all subscriptions

## RBAC Implementation

Role hierarchy: `viewer` < `editor` < `admin`

### Usage in Routes
```python
from app.auth.role_middleware import require_role

@router.get("/admin/revenue", dependencies=[Depends(require_role("admin"))])
def revenue_dashboard():
    ...
```

## Environment Variables

Required environment variables (add to `.env`):

```env
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_METERED_ID=price_xxx_metered   # the metered price id
STRIPE_PRODUCT_ID=prod_xxx
DEFAULT_CURRENCY=usd
```

## Migration

Run the migration to create new tables:

```bash
cd backend
alembic upgrade head
```

Or if using SQL migrations directly:

```bash
# The migration file is at:
# backend/alembic/versions/20251215_add_billing_usage_tables.py
```

## Usage Flow

### 1. Create Stripe Customer
```python
POST /api/stripe/create_customer
Authorization: Bearer <token>

Response: {
    "stripe_customer_id": "cus_xxx",
    "email": "user@example.com",
    "created": true
}
```

### 2. Create Metered Subscription
Use the helper function:
```python
from app.services.stripe_client import create_metered_subscription
from app.db import SessionLocal

db = SessionLocal()
sub, subscription_item_id = create_metered_subscription(
    customer_id="cus_xxx",
    price_id="price_xxx",
    db_session=db
)
# subscription_item_id is stored in database automatically
```

### 3. Report Usage
```python
POST /api/billing/report_usage
Authorization: Bearer <token>
Content-Type: application/json

{
    "quantity": 5.0,
    "subscription_item_id": "si_xxx"  # Optional if user has only one active subscription
}
```

### 4. View Revenue Metrics (Admin)
```python
GET /api/admin/revenue
Authorization: Bearer <admin_token>

Response: {
    "mrr": 350.00,
    "arr": 4200.00,
    "churn_rate": 0.05,
    "churn_percentage": 5.0,
    "active_subscriptions": 10,
    "recent_revenue_30d": 1050.00,
    "arpu": 35.00
}
```

## Testing

### Local Testing with Stripe CLI

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli

2. Forward webhooks:
```bash
stripe listen --forward-to localhost:8000/api/billing/webhook
```

3. Trigger test events:
```bash
stripe trigger invoice.paid
stripe trigger customer.subscription.created
```

### Test Usage Reporting

1. Create a subscription with a metered price in Stripe Dashboard
2. Note the `subscription_item.id` from the subscription
3. Call `/api/billing/report_usage` with the subscription_item_id
4. Check Stripe Dashboard for usage records

## Notes & Best Practices

1. **Subscription Item ID**: Always store `subscription_item.id` when creating subscriptions. This is required for usage reporting.

2. **Usage Aggregation**: For high-volume usage, consider batching/aggregating usage on your side before sending to Stripe.

3. **Idempotency**: Use idempotency keys for subscription creation and usage reporting retries.

4. **Price Caching**: The revenue dashboard caches price lookups to avoid excessive Stripe API calls. Consider implementing Redis caching for production.

5. **Audit Trail**: All usage records are stored locally in the `usage_records` table for audit and reconciliation purposes.

6. **Testing**: Use Stripe test mode keys and test cards for development.

## Next Steps

1. Run the migration: `alembic upgrade head`
2. Test customer creation endpoint
3. Test usage reporting with a metered subscription
4. Verify webhook events are properly handling subscription_item_id
5. Test revenue dashboard with active subscriptions
6. Implement frontend integration for usage reporting

## Troubleshooting

### Issue: "No active subscription found"
- Ensure subscription was created and status is "active"
- Verify `stripe_subscription_item_id` is stored in database
- Check webhook events are being processed

### Issue: "User has no Stripe customer"
- Call `/api/stripe/create_customer` first
- Verify user exists in database

### Issue: Revenue metrics showing 0
- Verify active subscriptions exist
- Check that price_id references valid Stripe prices
- Ensure price lookups are working (check logs)

