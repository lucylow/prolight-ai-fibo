# Billing & Payment Integration Guide

Complete guide for Stripe payment processing, subscriptions, and billing management in ProLight AI.

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Frontend Components](#frontend-components)
4. [Backend Endpoints](#backend-endpoints)
5. [Webhook Handling](#webhook-handling)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This application uses **Stripe** for payment processing with:

- **One-time payments** via Checkout Sessions
- **Recurring subscriptions** with automatic billing
- **Customer Portal** for self-service subscription management
- **Invoice management** with pagination and filtering
- **Webhook integration** for real-time payment events

### Architecture

```
Frontend (React)
  ├── StripeProvider (Elements wrapper)
  ├── CheckoutButton (initiates checkout)
  ├── BillingPortalButton (opens customer portal)
  └── Invoices page (billing history)

Backend (Supabase Edge Functions)
  ├── stripe-checkout (creates checkout sessions)
  ├── stripe-portal (creates portal sessions)
  └── stripe-webhook (handles Stripe events)
```

---

## Environment Variables

### Frontend (`.env.local`)

```bash
# Stripe Publishable Key (required)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51AbC123... # Test key
# VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51XyZ789... # Production key

# API Base URL (optional, defaults to localhost:8000)
VITE_API_BASE_URL=http://localhost:8000

# Supabase URL (for edge functions)
VITE_SUPABASE_URL=https://your-project.supabase.co
```

### Backend (Supabase Edge Functions)

Set these in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```bash
# Stripe Secret Key (required)
STRIPE_SECRET_KEY=sk_test_51AbC123... # Test key
# STRIPE_SECRET_KEY=sk_live_51XyZ789... # Production key

# Stripe Webhook Secret (required for webhook verification)
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...

# Site URL (for redirects)
SITE_URL=https://your-frontend.example.com

# Success/Cancel URLs (optional, defaults to SITE_URL)
SUCCESS_URL=https://your-frontend.example.com/billing?success=true
CANCEL_URL=https://your-frontend.example.com/pricing?canceled=true
BILLING_PORTAL_RETURN_URL=https://your-frontend.example.com/billing
```

### Getting Stripe Keys

1. **Test Mode** (Development):
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
   - Copy "Publishable key" → `VITE_STRIPE_PUBLISHABLE_KEY`
   - Copy "Secret key" → `STRIPE_SECRET_KEY`

2. **Live Mode** (Production):
   - Switch to Live mode in Stripe Dashboard
   - Copy keys from [API Keys](https://dashboard.stripe.com/apikeys)
   - **Never commit live keys to git!**

---

## Frontend Components

### StripeProvider

Wraps the app with Stripe Elements. Already integrated in `App.tsx`:

```tsx
import StripeProvider from "@/contexts/StripeProvider";

<StripeProvider>
  <App />
</StripeProvider>;
```

### CheckoutButton

Creates a Stripe Checkout Session for one-time payments or subscriptions.

**Props:**

- `planName?: string` - Plan name (uses existing billing service)
- `priceId?: string` - Stripe Price ID (direct usage)
- `mode?: "payment" | "subscription"` - Checkout mode (default: "subscription")
- `successUrl?: string` - Custom success redirect
- `cancelUrl?: string` - Custom cancel redirect
- `label?: string` - Button label
- `variant?` - Button variant (default, outline, etc.)
- `size?` - Button size (default, sm, lg)
- `disabled?: boolean` - Disable button

**Example - Subscription:**

```tsx
import CheckoutButton from "@/components/billing/CheckoutButton";

<CheckoutButton planName="pro" mode="subscription" label="Subscribe to Pro" />;
```

**Example - One-time Payment:**

```tsx
<CheckoutButton priceId="price_1234567890" mode="payment" label="Buy Now" />
```

### BillingPortalButton

Opens Stripe Customer Portal for subscription management.

**Props:**

- `returnUrl?: string` - Return URL after portal (default: `/billing`)
- `label?: string` - Button label (default: "Manage Subscription")
- `variant?` - Button variant
- `size?` - Button size
- `showIcon?: boolean` - Show settings icon (default: true)
- `disabled?: boolean` - Disable button

**Example:**

```tsx
import BillingPortalButton from "@/components/billing/BillingPortalButton";

<BillingPortalButton returnUrl="/billing" label="Manage Subscription" />;
```

### Invoices Page

Enhanced invoices page with:

- Cursor-based pagination (preferred)
- Page-based pagination (fallback)
- Status filtering (Paid, Due, Overdue, Pending)
- Search by invoice number or date
- Download receipts and view hosted invoices

**Route:** `/invoices`

**API Endpoint:** `GET /api/billing/invoices`

**Query Parameters:**

- `limit?: number` - Items per page (default: 20)
- `cursor?: string` - Cursor for pagination
- `page?: number` - Page number (fallback)
- `status?: string` - Filter by status
- `q?: string` - Search query

**Response Format:**

```json
{
  "items": [
    {
      "id": "inv_123",
      "stripe_invoice_id": "in_1AbC123",
      "number": "INV-1042",
      "date": "2025-12-14T00:00:00Z",
      "amount": 49.0,
      "amount_due": 4900,
      "currency": "usd",
      "status": "paid",
      "hosted_invoice_url": "https://invoice.stripe.com/i/...",
      "invoice_pdf": "https://pay.stripe.com/invoice/..."
    }
  ],
  "nextCursor": "cursor_123",
  "total": 42,
  "totalPages": 3
}
```

---

## Backend Endpoints

### Supabase Edge Functions

#### 1. `stripe-checkout` (POST)

Creates a Stripe Checkout Session.

**Request:**

```json
{
  "user_email": "user@example.com",
  "plan_name": "pro",
  "success_url": "https://example.com/billing?success=true",
  "cancel_url": "https://example.com/pricing?canceled=true"
}
```

**Response:**

```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "session_id": "cs_test_1234567890"
}
```

**Location:** `supabase/functions/stripe-checkout/index.ts`

#### 2. `stripe-portal` (POST)

Creates a Stripe Customer Portal session.

**Request:**

```json
{
  "return_url": "https://example.com/billing"
}
```

**Headers:**

```
Authorization: Bearer <supabase_access_token>
```

**Response:**

```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

**Location:** `supabase/functions/stripe-portal/index.ts`

#### 3. `stripe-webhook` (POST)

Handles Stripe webhook events.

**Headers:**

```
Stripe-Signature: t=1234567890,v1=...
```

**Events Handled:**

- `invoice.paid` - Mark invoice as paid
- `invoice.payment_failed` - Handle failed payment
- `customer.subscription.created` - Create subscription record
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Cancel subscription

**Location:** `supabase/functions/stripe-webhook/index.ts`

---

## Webhook Handling

### Setting Up Webhooks

1. **Local Development** (Stripe CLI):

   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login
   stripe login

   # Forward webhooks to local server
   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
   ```

2. **Production** (Stripe Dashboard):
   - Go to [Webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"
   - URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Events to send:
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### Webhook Event Flow

```
Stripe Event
  ↓
Webhook Endpoint (stripe-webhook)
  ↓
Verify Signature
  ↓
Handle Event Type
  ↓
Update Database
  ↓
Send Notifications (optional)
```

### Database Schema

**Invoices Table** (example migration):

```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  customer_id VARCHAR(255) NOT NULL,
  amount_due INT NOT NULL,
  currency VARCHAR(10) DEFAULT 'usd',
  status VARCHAR(32) NOT NULL,
  invoice_date TIMESTAMP NOT NULL,
  hosted_url TEXT,
  invoice_pdf TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date DESC);
```

---

## Testing

### Unit Tests

Run tests for billing components:

```bash
npm test src/components/billing
```

**Test Files:**

- `src/components/billing/__tests__/CheckoutButton.test.tsx`
- `src/components/billing/__tests__/BillingPortalButton.test.tsx`

### Storybook

View component stories:

```bash
npm run storybook
```

**Stories:**

- `Billing/CheckoutButton` - Various checkout scenarios
- `Billing/BillingPortalButton` - Portal button variants

### Manual Testing

1. **Test Checkout Flow:**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Any ZIP code

2. **Test Webhooks Locally:**

   ```bash
   # Trigger test events
   stripe trigger invoice.paid
   stripe trigger customer.subscription.updated
   ```

3. **Test Customer Portal:**
   - Subscribe with test card
   - Click "Manage Subscription"
   - Verify portal opens
   - Test updating payment method

### Test Cards

| Card Number           | Scenario                            |
| --------------------- | ----------------------------------- |
| `4242 4242 4242 4242` | Success                             |
| `4000 0000 0000 0002` | Card declined                       |
| `4000 0000 0000 9995` | Insufficient funds                  |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

---

## Deployment

### CI/CD Setup

**GitHub Actions Example:**

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Build
        env:
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY }}
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        run: npm run build

      - name: Deploy
        # Your deployment step
```

**Required Secrets:**

- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key (backend only)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (backend only)
- `SUPABASE_URL` - Supabase project URL

### Environment Validation

Add validation in your app startup:

```tsx
// src/utils/env.ts
export function validateEnv() {
  const required = ["VITE_STRIPE_PUBLISHABLE_KEY", "VITE_SUPABASE_URL"];

  const missing = required.filter((key) => !import.meta.env[key]);

  if (missing.length > 0) {
    console.error("Missing environment variables:", missing);
    if (import.meta.env.PROD) {
      throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "VITE_STRIPE_PUBLISHABLE_KEY is not set"

**Solution:**

- Check `.env.local` file exists
- Verify variable name (must start with `VITE_`)
- Restart dev server after adding env vars

#### 2. Checkout redirects but shows error

**Possible Causes:**

- Invalid Stripe Price ID
- Customer not created in Stripe
- Webhook endpoint not configured

**Solution:**

- Check Stripe Dashboard → Logs
- Verify Price ID exists in Stripe
- Ensure webhook endpoint is active

#### 3. Webhook signature verification fails

**Solution:**

- Verify `STRIPE_WEBHOOK_SECRET` matches webhook endpoint secret
- Check webhook endpoint URL matches Stripe dashboard
- Ensure raw request body is used (not parsed JSON)

#### 4. Customer Portal shows "No subscription found"

**Solution:**

- Verify `stripe_customer_id` exists in `user_profiles` table
- Check customer was created during checkout
- Ensure webhook processed `customer.subscription.created`

### Debugging

**Enable Stripe Logging:**

```tsx
// In StripeProvider or edge function
import Stripe from "stripe";

const stripe = new Stripe(secretKey, {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
  // Enable logging
  maxNetworkRetries: 2,
});
```

**Check Webhook Logs:**

```bash
# Stripe CLI
stripe listen --print-json

# Or view in Stripe Dashboard
# https://dashboard.stripe.com/webhooks
```

**Frontend Debugging:**

```tsx
// Enable Stripe debug mode
const stripe = await loadStripe(publishableKey, {
  betas: ["debug"],
});
```

---

## Security Best Practices

1. **Never expose secret keys** in frontend code
2. **Always verify webhook signatures** before processing
3. **Use idempotency keys** for critical operations
4. **Rate limit** checkout endpoints
5. **Validate user authentication** before creating sessions
6. **Log all payment events** for audit trail
7. **Use HTTPS** in production
8. **Sanitize user input** before sending to Stripe

---

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing Guide](https://stripe.com/docs/testing)

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review Stripe Dashboard logs
3. Check Supabase Edge Function logs
4. Contact support team

---

**Last Updated:** December 2024
