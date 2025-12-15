# Checkout Process Implementation

This document describes the complete checkout and monetization system implemented for ProLight AI.

## Overview

A comprehensive checkout process has been implemented to monetize the application, including:

- Subscription-based pricing with plans loaded from the database
- Stripe Checkout integration via Supabase Edge Functions
- Customer portal for subscription management
- Credit-based usage tracking and display
- Enhanced billing dashboard
- Success and cancellation pages

## Components Implemented

### 1. Pricing Page (`/pricing/checkout`)

**File:** `src/pages/Pricing.tsx`

**Features:**

- Loads plans dynamically from the database via `getPlans()` from billingService
- Displays plan features, pricing, and credit limits
- Handles authentication - redirects to sign-in if not logged in
- Creates Stripe checkout sessions via Supabase Edge Function
- Shows loading states and error handling
- Responsive design with animations

**Key Changes:**

- Replaced hardcoded plans with database-driven plans
- Integrated with `billingService.createCheckoutSession()` instead of direct Stripe client
- Added authentication check before checkout
- Improved error handling and user feedback

### 2. Billing Dashboard (`/billing`)

**File:** `src/pages/Billing.tsx`

**Features:**

- **Subscription Status Card:**
  - Current plan name and pricing
  - Subscription status badge (active, trialing, past_due, canceled)
  - Renewal/cancellation date
  - Quick action to manage subscription

- **Credit Usage Card:**
  - Visual progress bar showing credit consumption
  - Used vs. remaining credits
  - Billing period dates
  - Warning when credits are low

- **Billing Period Info:**
  - Period start and end dates
  - Clear display of subscription cycle

- **Quick Actions:**
  - Upgrade plan button
  - Customer portal access button

**Key Features:**

- Real-time subscription and credit status
- Integration with customer portal
- Responsive layout with cards
- Loading states and error handling

### 3. Customer Portal Integration

**New Edge Function:** `supabase/functions/stripe-portal/index.ts`

**Features:**

- Creates Stripe Customer Portal sessions
- Authenticates users via Supabase auth
- Retrieves Stripe customer ID from user profile
- Returns portal URL for redirect

**Service Integration:** `src/services/billingService.ts`

- `redirectToCustomerPortal()` function
- Handles authentication and error cases
- Returns portal URL for redirect

### 4. Enhanced Success Page (`/success`)

**File:** `src/pages/Success.tsx`

**Features:**

- Displays subscription activation confirmation
- Shows current plan and credit allocation
- Displays credit status after subscription
- Provides next steps and feature highlights
- Links to studio and billing dashboard
- Handles webhook processing delay with loading state

### 5. Enhanced Cancel Page (`/cancel`)

**File:** `src/pages/Cancel.tsx`

**Features:**

- Clear messaging about cancellation
- Explains no charges were made
- Help section for support
- Quick actions to return to pricing or home

### 6. Billing Service Updates

**File:** `src/services/billingService.ts`

**New Functions:**

- `redirectToCustomerPortal(returnUrl: string)` - Creates portal session and returns URL

**Existing Functions (Enhanced):**

- `createCheckoutSession()` - Creates Stripe checkout via Supabase Edge Function
- `getSubscription()` - Gets user's active subscription
- `getCreditStatus()` - Gets current credit usage and limits

## Database Schema

The checkout process relies on the existing monetization schema:

### Tables Used:

- `plans` - Subscription plans with pricing and features
- `user_profiles` - User profiles with Stripe customer IDs
- `subscriptions` - Active user subscriptions
- `credit_usage` - Credit consumption tracking

### Required Plan Fields:

- `name` - Plan name (e.g., "Free", "Pro", "Team")
- `monthly_credit_limit` - Credits per billing period
- `price_cents` - Price in cents
- `stripe_price_id` - Stripe Price ID for checkout
- `features` - JSONB array of feature strings
- `is_active` - Whether plan is available

## Stripe Integration

### Edge Functions

1. **`stripe-checkout`** (`supabase/functions/stripe-checkout/index.ts`)
   - Creates Stripe Checkout sessions
   - Handles user authentication
   - Creates/retrieves Stripe customers
   - Links subscriptions to user accounts

2. **`stripe-portal`** (`supabase/functions/stripe-portal/index.ts`) - NEW
   - Creates Customer Portal sessions
   - Authenticates users
   - Returns portal URL

3. **`stripe-webhook`** (`supabase/functions/stripe-webhook/index.ts`)
   - Handles Stripe webhook events
   - Updates subscription status
   - Syncs subscription data

### Environment Variables Required

For Supabase Edge Functions:

```env
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_URL=https://your-frontend.com
```

## User Flow

### Subscription Flow:

1. User visits `/pricing/checkout`
2. Sees available plans loaded from database
3. Clicks "Subscribe" on a plan
4. System checks authentication
5. If not authenticated, redirects to sign-in
6. Creates Stripe checkout session via Edge Function
7. Redirects to Stripe Checkout
8. User completes payment
9. Stripe webhook processes subscription
10. User redirected to `/success` page
11. Success page shows subscription details and credits

### Management Flow:

1. User visits `/billing`
2. Sees current subscription and credit status
3. Clicks "Manage Subscription"
4. System creates portal session
5. Redirects to Stripe Customer Portal
6. User manages subscription, payment methods, invoices
7. Returns to `/billing` after portal session

## Testing

### Test Cards (Stripe Test Mode):

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future expiry date and any CVC works.

### Local Testing:

1. Set up Supabase Edge Functions locally
2. Configure Stripe test keys
3. Create test plans in database
4. Test checkout flow end-to-end
5. Verify webhook processing
6. Test customer portal access

## Security Considerations

1. **Authentication**: All checkout and portal functions require valid Supabase auth tokens
2. **Webhook Verification**: Stripe webhooks verify signatures
3. **Customer ID Linking**: Stripe customer IDs are securely stored in user_profiles
4. **Service Role**: Edge functions use service role key for database operations

## Future Enhancements

Potential improvements:

1. One-time credit purchases
2. Promo codes and discounts
3. Usage-based billing
4. Team/workspace billing
5. Invoice download
6. Payment method management UI
7. Subscription upgrade/downgrade flows
8. Prorated billing calculations

## Files Modified/Created

### Modified:

- `src/pages/Pricing.tsx` - Complete rewrite to use database plans
- `src/pages/Billing.tsx` - Enhanced with subscription and credit management
- `src/pages/Success.tsx` - Enhanced with subscription details
- `src/pages/Cancel.tsx` - Enhanced with better messaging
- `src/services/billingService.ts` - Added portal function

### Created:

- `supabase/functions/stripe-portal/index.ts` - Customer portal edge function

## Dependencies

All required dependencies are already in `package.json`:

- `@supabase/supabase-js` - Supabase client
- `react-router-dom` - Routing
- `framer-motion` - Animations
- `sonner` - Toast notifications
- `date-fns` - Date formatting
- `lucide-react` - Icons

## Deployment Checklist

Before deploying to production:

1. ✅ Set up Stripe account and get API keys
2. ✅ Configure Stripe products and prices
3. ✅ Set up Stripe webhook endpoint
4. ✅ Configure environment variables in Supabase
5. ✅ Deploy edge functions to Supabase
6. ✅ Seed plans in database
7. ✅ Test checkout flow end-to-end
8. ✅ Test customer portal access
9. ✅ Verify webhook processing
10. ✅ Test with real payment methods (in test mode)

## Support

For issues or questions:

- Check Stripe Dashboard for payment status
- Check Supabase logs for edge function errors
- Verify environment variables are set correctly
- Ensure database schema is up to date
- Check webhook delivery in Stripe Dashboard
