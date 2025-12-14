import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreditCheckRequest {
  user_id: string;
  credits_needed?: number;
}

interface RecordUsageRequest {
  user_id: string;
  action: string;
  credits_used?: number;
  related_image_id?: string;
  related_request_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get current period bounds from subscription or fallback to current month
 */
function getPeriodBounds(subscription: { current_period_start?: string; current_period_end?: string } | null | undefined): { start: string; end: string } {
  if (subscription?.current_period_start && subscription?.current_period_end) {
    return {
      start: subscription.current_period_start,
      end: subscription.current_period_end,
    };
  }

  // Fallback: current month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();

    if (req.method === 'POST' && endpoint === 'check') {
      // Check if user can consume credits
      const { user_id, credits_needed = 1 }: CreditCheckRequest = await req.json();

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get active subscription and plan
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans(*)
        `)
        .eq('user_id', user_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError || !subscription || !subscription.plan) {
        return new Response(
          JSON.stringify({
            has_credits: false,
            remaining: 0,
            used: 0,
            limit: 0,
            reason: 'no_active_plan',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const plan = subscription.plan;
      const { start, end } = getPeriodBounds(subscription);

      // Calculate credits used in period
      const { data: usageData, error: usageError } = await supabase
        .from('credit_usage')
        .select('credits_used')
        .eq('user_id', user_id)
        .gte('timestamp', start)
        .lt('timestamp', end);

      if (usageError) {
        console.error('Error fetching credit usage:', usageError);
      }

      const used = usageData?.reduce((sum, r) => sum + (r.credits_used || 0), 0) || 0;
      const remaining = plan.monthly_credit_limit - used;
      const hasCredits = remaining >= credits_needed;

      return new Response(
        JSON.stringify({
          has_credits: hasCredits,
          remaining,
          used,
          limit: plan.monthly_credit_limit,
          period_start: start,
          period_end: end,
          info: hasCredits ? undefined : {
            reason: 'insufficient_credits',
            required: credits_needed,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST' && endpoint === 'record') {
      // Record credit usage
      const {
        user_id,
        action,
        credits_used = 1,
        related_image_id,
        related_request_id,
        metadata,
      }: RecordUsageRequest = await req.json();

      if (!user_id || !action) {
        return new Response(
          JSON.stringify({ error: 'user_id and action are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('credit_usage')
        .insert({
          user_id,
          action,
          credits_used,
          related_image_id: related_image_id || null,
          related_request_id: related_request_id || null,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording credit usage:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to record credit usage' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Optionally report to Stripe for metered usage
      const subscriptionItemId = await getSubscriptionItemId(supabase, user_id);
      if (subscriptionItemId && Deno.env.get('STRIPE_SECRET_KEY')) {
        try {
          await reportStripeUsage(subscriptionItemId, credits_used);
        } catch (stripeError) {
          console.error('Failed to report usage to Stripe (non-critical):', stripeError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, usage: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET' && endpoint === 'summary') {
      // Get credit summary
      const userId = url.searchParams.get('user_id');
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'user_id query parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Similar logic to check endpoint but returns summary
      const { data: subscription } = await supabase
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

      if (!subscription || !subscription.plan) {
        return new Response(
          JSON.stringify({
            has_credits: false,
            remaining: 0,
            used: 0,
            limit: 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const plan = subscription.plan;
      const { start, end } = getPeriodBounds(subscription);

      const { data: usageData } = await supabase
        .from('credit_usage')
        .select('credits_used')
        .eq('user_id', userId)
        .gte('timestamp', start)
        .lt('timestamp', end);

      const used = usageData?.reduce((sum, r) => sum + (r.credits_used || 0), 0) || 0;
      const remaining = plan.monthly_credit_limit - used;

      return new Response(
        JSON.stringify({
          remaining,
          used,
          limit: plan.monthly_credit_limit,
          period_start: start,
          period_end: end,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint or method' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in billing-credits function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Get subscription item ID for Stripe metered usage reporting
 */
async function getSubscriptionItemId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_item_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return data?.stripe_subscription_item_id || null;
}

/**
 * Report usage to Stripe for metered billing
 */
async function reportStripeUsage(
  subscriptionItemId: string,
  quantity: number
): Promise<void> {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    return;
  }

  // Import Stripe dynamically
  const Stripe = await import('https://esm.sh/stripe@14.21.0?target=deno');
  const stripe = new Stripe.default(stripeSecretKey, {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  });

  await stripe.usageRecords.create(subscriptionItemId, {
    quantity,
    timestamp: Math.floor(Date.now() / 1000),
  });
}
