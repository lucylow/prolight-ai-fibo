/**
 * BillingPortalButton Component
 * Opens Stripe Customer Portal for subscription management
 * 
 * Allows users to:
 * - Update payment methods
 * - View invoices
 * - Cancel subscriptions
 * - Update billing information
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { redirectToCustomerPortal } from "@/services/billingService";
import { supabase } from "@/integrations/supabase/client";

export interface BillingPortalButtonProps {
  /** Custom return URL after portal session */
  returnUrl?: string;
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
  /** Show icon */
  showIcon?: boolean;
}

/**
 * BillingPortalButton - Opens Stripe Customer Portal
 * 
 * @example
 * ```tsx
 * <BillingPortalButton 
 *   returnUrl="/billing"
 *   label="Manage Subscription"
 * />
 * ```
 */
export default function BillingPortalButton({
  returnUrl,
  label = "Manage Subscription",
  variant = "outline",
  size = "default",
  className,
  disabled = false,
  showIcon = true,
}: BillingPortalButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleOpenPortal = async () => {
    setLoading(true);

    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to access billing portal");
        return;
      }

      const portalUrl = await redirectToCustomerPortal(
        returnUrl || `${window.location.origin}/billing`
      );
      window.location.href = portalUrl;
    } catch (error) {
      console.error("Portal error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not open customer portal. Please contact support."
      );
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleOpenPortal}
      disabled={loading || disabled}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Opening...
        </>
      ) : (
        <>
          {showIcon && <Settings className="w-4 h-4 mr-2" />}
          {label}
        </>
      )}
    </Button>
  );
}
