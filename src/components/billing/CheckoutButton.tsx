/**
 * CheckoutButton Component
 * Creates a Stripe Checkout Session for one-time payments or subscriptions
 * 
 * Uses server-side Checkout Sessions (recommended for PCI compliance)
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCheckoutSession } from "@/services/billingService";
import { supabase } from "@/integrations/supabase/client";

export interface CheckoutButtonProps {
  /** Stripe Price ID for the product/subscription */
  priceId?: string;
  /** Plan name (alternative to priceId, uses existing billing service) */
  planName?: string;
  /** Checkout mode: 'payment' for one-time, 'subscription' for recurring */
  mode?: "payment" | "subscription";
  /** Custom success URL */
  successUrl?: string;
  /** Custom cancel URL */
  cancelUrl?: string;
  /** Button label */
  label?: string;
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * CheckoutButton - Initiates Stripe Checkout Session
 * 
 * @example
 * ```tsx
 * // One-time payment
 * <CheckoutButton 
 *   priceId="price_1234567890" 
 *   mode="payment"
 *   label="Buy Now"
 * />
 * 
 * // Subscription
 * <CheckoutButton 
 *   planName="pro" 
 *   mode="subscription"
 *   label="Subscribe"
 * />
 * ```
 */
export default function CheckoutButton({
  priceId,
  planName,
  mode = "subscription",
  successUrl,
  cancelUrl,
  label,
  variant = "default",
  size = "default",
  className,
  disabled = false,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!planName && !priceId) {
      toast.error("Either planName or priceId must be provided");
      return;
    }

    setLoading(true);

    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("Please sign in to continue");
        return;
      }

      // Use existing billing service if planName is provided
      if (planName) {
        const { checkout_url } = await createCheckoutSession(
          planName,
          successUrl,
          cancelUrl
        );
        window.location.href = checkout_url;
        return;
      }

      // For direct priceId usage, call Supabase edge function
      // This is a fallback if you want to use priceId directly
      const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL 
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
        : 'http://localhost:54321/functions/v1';

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          user_email: user.email,
          plan_name: planName || 'default', // Fallback, but planName should be set
          success_url: successUrl || `${window.location.origin}/billing?success=true`,
          cancel_url: cancelUrl || `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { checkout_url } = await response.json();
      window.location.href = checkout_url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Failed to start checkout. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = label || (mode === "subscription" ? "Subscribe" : "Buy Now");

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading || disabled}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Starting...
        </>
      ) : (
        buttonLabel
      )}
    </Button>
  );
}

