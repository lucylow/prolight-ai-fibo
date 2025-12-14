# Payment Integration Guide

This document describes the Stripe payment integration for ProLight AI, including setup, usage, and features.

## Overview

The payment system includes:
- **Stripe Checkout** for one-time and subscription payments
- **Customer Portal** for self-service billing management
- **Billing Dashboard** for viewing invoices
- **Admin Refund Management** for processing refunds
- **Mock Mode** for development without Stripe keys

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

The following packages are included:
- `stripe==7.8.0` - Stripe Python SDK
- `python-jose[cryptography]==3.3.0` - JWT authentication (for admin endpoints)

### 2. Environment Variables

Add to `backend/.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key (for frontend)
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing secret
FRONTEND_URL=http://localhost:5173

# Mock Mode (set to True to use mock data without real Stripe keys)
USE_MOCK_STRIPE=True

# JWT Secret (for admin authentication)
JWT_SECRET=your-secret-key-here
```

### 3. Mock Mode

When `USE_MOCK_STRIPE=True` or Stripe keys are not configured:
- All Stripe API calls return mock data
- Checkout sessions redirect to a mock success page
- No real charges are made
- Perfect for development and testing

## Frontend Setup

### 1. Environment Variables

Add to `.env` or `.env.local`:

```env
VITE_API_URL=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Optional, for Stripe.js
```

### 2. Dependencies

All required dependencies are already installed:
- `axios` - HTTP client
- `framer-motion` - Animations
- `react-router-dom` - Routing

## API Endpoints

### Stripe Checkout

**POST** `/api/stripe/create-checkout-session`
- Creates a Stripe Checkout session
- Request body:
  ```json
  {
    "priceId": "price_...",
    "successUrl": "http://localhost:5173/success",
    "cancelUrl": "http://localhost:5173/cancel",
    "coupon": "optional_coupon_code",
    "mode": "subscription" | "payment"
  }
  ```
- Response:
  ```json
  {
    "id": "cs_...",
    "url": "https://checkout.stripe.com/..."
  }
  ```

**POST** `/api/stripe/create-portal-session`
- Creates a Customer Portal session
- Request body:
  ```json
  {
    "customerId": "cus_...",
    "returnUrl": "http://localhost:5173/account"
  }
  ```

**POST** `/api/stripe/webhook`
- Handles Stripe webhook events
- Processes `checkout.session.completed`, `customer.subscription.updated`, etc.

### Billing

**GET** `/api/billing/invoices/{customer_id}`
- Returns invoice history for a customer
- Query params: `limit` (default: 12)

**POST** `/api/billing/refund`
- Creates a refund for a charge
- Request body:
  ```json
  {
    "charge_id": "ch_...",
    "amount_cents": 3500,  // Optional, omit for full refund
    "reason": "Customer request"
  }
  ```

### Admin Refunds

**GET** `/api/admin/refunds`
- Lists refund requests (admin only)
- Query params: `status`, `q` (search)

**POST** `/api/admin/refunds/{refund_id}/approve`
- Approves and processes a refund (admin only)

**POST** `/api/admin/refunds/{refund_id}/deny`
- Denies a refund request (admin only)

**POST** `/api/admin/refunds/create`
- Creates a new refund request

## Frontend Pages

### Pricing Page (`/pricing`)
- Displays subscription plans with monthly/yearly toggle
- Animated plan cards with feature lists
- "Most Popular" badge for Pro plan
- Direct checkout integration

### Billing Dashboard (`/billing`)
- Lists invoice history
- Shows payment status and amounts
- Links to hosted invoice pages

### Customer Portal (`/account`)
- Button to open Stripe Customer Portal
- Self-service subscription management
- Payment method updates

### Admin Refunds (`/admin/refunds`)
- List all refund requests
- Search and filter by status
- Approve/deny refunds with notes
- Copy charge IDs

### Success Page (`/success`)
- Shown after successful payment
- Displays session ID
- Links to studio and billing

### Cancel Page (`/cancel`)
- Shown when payment is cancelled
- Links back to pricing

## Mock Data

When in mock mode, the system provides:

### Mock Checkout Sessions
- Session ID: `cs_test_mock_session_12345`
- Redirects to: `/checkout/mock?session_id=...`

### Mock Invoices
- Sample invoices with realistic data
- Status: `paid`
- Amounts: $35.00, $15.00, etc.

### Mock Refund Requests
- Stored in memory (use database in production)
- Status: `pending`, `refunded`, `denied`, `failed`

## Testing

### Test Cards (Stripe Test Mode)

Use these test card numbers in Stripe Checkout:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future expiry date and any CVC works.

### Mock Mode Testing

1. Set `USE_MOCK_STRIPE=True` in backend `.env`
2. Start backend: `uvicorn app.main:app --reload`
3. Start frontend: `npm run dev`
4. Visit `/pricing` and click "Subscribe"
5. You'll be redirected to a mock success page

## Production Deployment

### 1. Stripe Setup

1. Create a Stripe account
2. Get your API keys from Dashboard → Developers → API keys
3. Create products and prices in Dashboard → Products
4. Set up webhook endpoint:
   - URL: `https://your-api.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`

### 2. Environment Variables

Set in production:
```env
USE_MOCK_STRIPE=False
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://your-frontend.com
```

### 3. Security

- **Admin Endpoints**: Implement proper JWT authentication
- **Webhooks**: Verify webhook signatures
- **Refunds**: Add role-based access control
- **Rate Limiting**: Add rate limits to payment endpoints

### 4. Database

In production, replace mock storage with database:
- Store subscription status
- Track refund requests
- Log payment events
- Store customer IDs

## Features

### ✅ Implemented
- Stripe Checkout integration
- Customer Portal access
- Invoice history
- Admin refund management
- Mock mode for development
- Animated pricing page
- Monthly/yearly toggle
- Coupon code support

### 🚀 Future Enhancements
- Team seats / multi-seat billing
- Usage-based metering
- Referral rewards system
- Subscription cancellation UI
- Payment method management
- Invoice export (CSV/PDF)
- Revenue analytics dashboard

## Troubleshooting

### Checkout not working
- Check `STRIPE_SECRET_KEY` is set correctly
- Verify `FRONTEND_URL` matches your frontend URL
- Check browser console for errors
- Ensure CORS is configured correctly

### Webhooks not received
- Verify webhook URL is accessible
- Check webhook secret matches
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:8000/api/stripe/webhook`

### Mock mode not working
- Ensure `USE_MOCK_STRIPE=True` in backend `.env`
- Restart backend server after changing env vars

## Support

For issues or questions:
1. Check Stripe Dashboard for payment status
2. Review backend logs for errors
3. Check browser console for frontend errors
4. Verify environment variables are set correctly
