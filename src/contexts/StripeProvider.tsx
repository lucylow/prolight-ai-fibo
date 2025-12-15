/**
 * Stripe Provider Context
 * Wraps the app with Stripe Elements for payment processing
 */

import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  if (!stripePublishableKey) {
    console.warn("VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe features will not work.");
    return Promise.resolve(null);
  }

  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

interface StripeProviderProps {
  children: React.ReactNode;
}

/**
 * StripeProvider - Wraps app with Stripe Elements
 * 
 * Usage:
 * ```tsx
 * <StripeProvider>
 *   <App />
 * </StripeProvider>
 * ```
 */
export default function StripeProvider({ children }: StripeProviderProps) {
  const stripe = getStripe();

  return (
    <Elements stripe={stripe} options={{ appearance: { theme: 'stripe' } }}>
      {children}
    </Elements>
  );
}

