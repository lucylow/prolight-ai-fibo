import React, { useState } from "react";
import { stripeClient } from "@/services/stripeClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Settings, FileText } from "lucide-react";
import { toast } from "sonner";

// Mock customer ID - in production, get from auth context
const MOCK_CUSTOMER_ID = "cus_mock_customer_123";

export default function CustomerPortal() {
  const [loading, setLoading] = useState(false);

  const handleOpenPortal = async () => {
    try {
      setLoading(true);
      const session = await stripeClient.createPortalSession({
        customerId: MOCK_CUSTOMER_ID,
        returnUrl: `${window.location.origin}/account`,
      });

      // Redirect to Stripe Customer Portal
      window.location.href = session.url;
    } catch (error: unknown) {
      console.error("Portal error:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { detail?: string } })?.data?.detail 
        : undefined;
      toast.error(errorMessage || "Could not open customer portal");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-teal-300 mb-2">Manage Subscription</h2>
        <p className="text-slate-400">
          Update your payment method, view invoices, and manage your subscription
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Customer Portal
          </CardTitle>
          <CardDescription>
            Access Stripe's secure customer portal to manage your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-300">
              In the customer portal, you can:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
              <li>Update your payment method</li>
              <li>View billing history and invoices</li>
              <li>Change or cancel your subscription</li>
              <li>Update billing address</li>
            </ul>
          </div>

          <Button
            onClick={handleOpenPortal}
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-600 text-black"
            size="lg"
          >
            {loading ? "Opening Portal..." : "Open Customer Portal"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-4 h-4" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Manage your payment methods and billing information
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-4 h-4" />
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              View and download your billing history
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
