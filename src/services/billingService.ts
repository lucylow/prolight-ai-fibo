/**
 * Billing Service
 * Frontend service for managing subscriptions, credits, and billing
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  canConsumeCredits, 
  getUserCreditSummary, 
  getAllPlans,
  getUserActivePlan,
  type Plan,
  type Subscription,
  type CreditStatus,
} from '@/lib/billing';

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : 'http://localhost:54321/functions/v1';

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

/**
 * Create Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  planName: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<CheckoutSessionResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.email) {
    throw new Error('User must be logged in to subscribe');
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
    },
    body: JSON.stringify({
      user_email: user.email,
      plan_name: planName,
      success_url: successUrl || `${window.location.origin}/billing?success=true`,
      cancel_url: cancelUrl || `${window.location.origin}/pricing?canceled=true`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  return response.json();
}

/**
 * Get user's subscription status
 */
export async function getSubscription(): Promise<Subscription | null> {
  const { plan, subscription } = await getUserActivePlan(
    (await supabase.auth.getUser()).data.user?.id || ''
  );
  return subscription || null;
}

/**
 * Get user's credit status
 */
export async function getCreditStatus(): Promise<CreditStatus> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    return {
      hasCredits: false,
      remaining: 0,
      used: 0,
      limit: 0,
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString(),
      info: { reason: 'not_authenticated' },
    };
  }

  return getUserCreditSummary(userId);
}

/**
 * Check if user can perform an action (checks credits)
 */
export async function checkCredits(creditsNeeded: number = 1): Promise<CreditStatus> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    return {
      hasCredits: false,
      remaining: 0,
      used: 0,
      limit: 0,
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString(),
      info: { reason: 'not_authenticated' },
    };
  }

  return canConsumeCredits(userId, creditsNeeded);
}

/**
 * Get all available plans
 */
export async function getPlans(): Promise<Plan[]> {
  return getAllPlans();
}

/**
 * Redirect to Stripe Customer Portal for subscription management
 */
export async function redirectToCustomerPortal(returnUrl: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be logged in to access customer portal');
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/stripe-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
    },
    body: JSON.stringify({
      return_url: returnUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create portal session');
  }

  const { url } = await response.json();
  return url;
}
