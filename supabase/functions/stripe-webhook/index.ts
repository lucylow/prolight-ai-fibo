import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error('Stripe credentials not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body and signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing Stripe event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          // Subscription will be handled by customer.subscription.created/updated
          console.log(`Checkout completed for subscription: ${session.subscription}`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subscriptionId = subscription.id;
        const status = subscription.status;

        // Get user by Stripe customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error(`User not found for customer ${customerId}`);
          break;
        }

        const userId = profile.id;

        // Get plan from subscription metadata or items
        const metadata = subscription.metadata;
        let planId = metadata?.plan_id;

        if (!planId) {
          // Try to find plan by Stripe price ID
          const priceId = subscription.items.data[0]?.price?.id;
          if (priceId) {
            const { data: plan } = await supabase
              .from('plans')
              .select('id')
              .eq('stripe_price_id', priceId)
              .single();
            planId = plan?.id;
          }
        }

        if (!planId) {
          console.error(`Plan not found for subscription ${subscriptionId}`);
          break;
        }

        // Get subscription item ID for metered usage
        const subscriptionItemId = subscription.items.data[0]?.id || null;

        // Calculate period dates
        const periodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null;
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        // Map Stripe status to our status
        let dbStatus = 'active';
        if (status === 'past_due' || status === 'unpaid') {
          dbStatus = 'past_due';
        } else if (status === 'canceled' || status === 'incomplete_expired') {
          dbStatus = 'canceled';
        } else if (status === 'trialing') {
          dbStatus = 'trialing';
        }

        // Upsert subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan_id: planId,
            status: dbStatus,
            stripe_subscription_id: subscriptionId,
            stripe_subscription_item_id: subscriptionItemId,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
          }, {
            onConflict: 'stripe_subscription_id',
          });

        if (subError) {
          console.error('Error upserting subscription:', subError);
        } else {
          console.log(`Subscription ${subscriptionId} synced for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        // Mark subscription as canceled
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating canceled subscription:', error);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('Error updating subscription status:', error);
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('Error updating subscription status:', error);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

