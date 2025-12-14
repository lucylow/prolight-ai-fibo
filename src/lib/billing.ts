/**
 * Billing Utilities
 * Credit checking, usage recording, and subscription management
 */

import { supabase } from '@/integrations/supabase/client';

export interface Plan {
  id: string;
  name: string;
  monthly_credit_limit: number;
  features: string[];
  stripe_price_id: string | null;
  price_cents: number;
  description: string | null;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  stripe_subscription_id: string | null;
  stripe_subscription_item_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan?: Plan;
}

export interface CreditUsage {
  id: string;
  user_id: string;
  action: string;
  credits_used: number;
  related_image_id: string | null;
  related_request_id: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface CreditStatus {
  hasCredits: boolean;
  remaining: number;
  used: number;
  limit: number;
  periodStart: string;
  periodEnd: string;
  info?: {
    reason?: string;
    required?: number;
  };
}

/**
 * Get the current subscription period bounds
 */
function getPeriodBounds(
  subscription: Subscription | null
): { start: Date; end: Date } {
  if (
    subscription?.current_period_start &&
    subscription?.current_period_end
  ) {
    return {
      start: new Date(subscription.current_period_start),
      end: new Date(subscription.current_period_end),
    };
  }

  // Fallback: current month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

/**
 * Get user's active subscription and plan
 */
export async function getUserActivePlan(
  userId: string
): Promise<{ plan: Plan | null; subscription: Subscription | null }> {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching subscription:', error);
      return { plan: null, subscription: null };
    }

    if (!subscription) {
      return { plan: null, subscription: null };
    }

    return {
      plan: (subscription.plan as Plan) || null,
      subscription: subscription as Subscription,
    };
  } catch (error) {
    console.error('Error in getUserActivePlan:', error);
    return { plan: null, subscription: null };
  }
}

/**
 * Calculate credits used in a period
 */
export async function getCreditsUsedInPeriod(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('credit_usage')
      .select('credits_used')
      .eq('user_id', userId)
      .gte('timestamp', periodStart.toISOString())
      .lt('timestamp', periodEnd.toISOString());

    if (error) {
      console.error('Error fetching credit usage:', error);
      return 0;
    }

    return (
      data?.reduce((sum, record) => sum + (record.credits_used || 0), 0) || 0
    );
  } catch (error) {
    console.error('Error in getCreditsUsedInPeriod:', error);
    return 0;
  }
}

/**
 * Check if user can consume credits
 */
export async function canConsumeCredits(
  userId: string,
  creditsNeeded: number = 1
): Promise<CreditStatus> {
  try {
    const { plan, subscription } = await getUserActivePlan(userId);

    if (!plan || !subscription) {
      return {
        hasCredits: false,
        remaining: 0,
        used: 0,
        limit: 0,
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        info: { reason: 'no_active_plan' },
      };
    }

    const { start, end } = getPeriodBounds(subscription);
    const used = await getCreditsUsedInPeriod(userId, start, end);
    const remaining = plan.monthly_credit_limit - used;

    if (remaining >= creditsNeeded) {
      return {
        hasCredits: true,
        remaining,
        used,
        limit: plan.monthly_credit_limit,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      };
    } else {
      return {
        hasCredits: false,
        remaining,
        used,
        limit: plan.monthly_credit_limit,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        info: {
          reason: 'insufficient_credits',
          required: creditsNeeded,
        },
      };
    }
  } catch (error) {
    console.error('Error in canConsumeCredits:', error);
    return {
      hasCredits: false,
      remaining: 0,
      used: 0,
      limit: 0,
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString(),
      info: { reason: 'error_checking_credits' },
    };
  }
}

/**
 * Record credit usage (should be called from backend/edge function with service role)
 */
export async function recordCreditUsage(
  userId: string,
  action: string,
  credits: number = 1,
  relatedImageId?: string,
  relatedRequestId?: string,
  metadata?: Record<string, unknown>
): Promise<CreditUsage | null> {
  try {
    const { data, error } = await supabase
      .from('credit_usage')
      .insert({
        user_id: userId,
        action,
        credits_used: credits,
        related_image_id: relatedImageId || null,
        related_request_id: relatedRequestId || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording credit usage:', error);
      return null;
    }

    return data as CreditUsage;
  } catch (error) {
    console.error('Error in recordCreditUsage:', error);
    return null;
  }
}

/**
 * Get user's credit usage summary
 */
export async function getUserCreditSummary(
  userId: string
): Promise<CreditStatus> {
  return canConsumeCredits(userId, 0);
}

/**
 * Get all plans
 */
export async function getAllPlans(): Promise<Plan[]> {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      return [];
    }

    return (data as Plan[]) || [];
  } catch (error) {
    console.error('Error in getAllPlans:', error);
    return [];
  }
}
