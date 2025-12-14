import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  user_email: string;
  plan_name: string;
  success_url?: string;
  cancel_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not set');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { user_email, plan_name, success_url, cancel_url }: CheckoutRequest = await req.json();

    if (!user_email || !plan_name) {
      return new Response(
        JSON.stringify({ error: 'user_email and plan_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan from database
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('name', plan_name)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!plan.stripe_price_id) {
      return new Response(
        JSON.stringify({ error: 'Plan does not have a Stripe price ID configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create user profile
    const { data: { user } } = await supabase.auth.admin.getUserByEmail(user_email);
    
    let userId: string;
    let stripeCustomerId: string | null = null;

    if (user) {
      userId = user.id;
      // Check for existing profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();
      
      stripeCustomerId = profile?.stripe_customer_id || null;
    } else {
      // Create user if doesn't exist (you might want to handle this differently)
      return new Response(
        JSON.stringify({ error: 'User not found. Please sign up first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or retrieve Stripe customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user_email,
        metadata: {
          supabase_user_id: userId,
        },
      });
      stripeCustomerId = customer.id;

      // Upsert user profile
      await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          email: user_email,
          stripe_customer_id: stripeCustomerId,
        }, { onConflict: 'id' });
    }

    // Create Stripe Checkout Session
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '') || 'http://localhost:54321';
    const functionUrl = `${baseUrl}/functions/v1/stripe-webhook`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      customer: stripeCustomerId,
      success_url: success_url || `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/billing?success=true`,
      cancel_url: cancel_url || `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/pricing?canceled=true`,
      metadata: {
        plan_id: plan.id,
        plan_name: plan.name,
        supabase_user_id: userId,
      },
      subscription_data: {
        metadata: {
          plan_id: plan.id,
          plan_name: plan.name,
          supabase_user_id: userId,
        },
      },
    });

    return new Response(
      JSON.stringify({ checkout_url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
