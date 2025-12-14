import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  getSubscription, 
  getCreditStatus, 
  getPlans,
  type Subscription,
  type CreditStatus,
  type Plan
} from "@/services/billingService";
import { redirectToCustomerPortal } from "@/services/billingService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ExternalLink, 
  CreditCard, 
  Zap, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export default function BillingDashboard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success");

  useEffect(() => {
    loadBillingData();
    
    if (success === "true") {
      toast.success("Subscription activated successfully!");
    }
  }, [success]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [sub, credits] = await Promise.all([
        getSubscription(),
        getCreditStatus(),
      ]);
      setSubscription(sub);
      setCreditStatus(credits);
    } catch (error) {
      console.error("Failed to load billing data:", error);
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      const portalUrl = await redirectToCustomerPortal(
        `${window.location.origin}/billing`
      );
      window.location.href = portalUrl;
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Could not open customer portal. Please contact support.");
      setPortalLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trialing: "secondary",
      past_due: "destructive",
      canceled: "outline",
    };

    const icons: Record<string, React.ReactNode> = {
      active: <CheckCircle className="w-3 h-3 mr-1" />,
      trialing: <AlertCircle className="w-3 h-3 mr-1" />,
      past_due: <XCircle className="w-3 h-3 mr-1" />,
      canceled: <XCircle className="w-3 h-3 mr-1" />,
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize flex items-center">
        {icons[status]}
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getCreditPercentage = () => {
    if (!creditStatus || creditStatus.limit === 0) return 0;
    return Math.min((creditStatus.used / creditStatus.limit) * 100, 100);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-teal-300 mb-2">Billing & Subscription</h2>
          <p className="text-slate-400">Manage your subscription and view usage</p>
        </div>
        {subscription && (
          <Button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
            Manage Subscription
          </Button>
        )}
      </div>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription ? (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-semibold">
                      {subscription.plan?.name || "Unknown Plan"}
                    </h3>
                    {getStatusBadge(subscription.status)}
                  </div>
                  {subscription.plan && (
                    <p className="text-slate-400">
                      ${(subscription.plan.price_cents / 100).toFixed(2)}/month
                    </p>
                  )}
                  {subscription.current_period_end && (
                    <p className="text-sm text-slate-500 mt-2">
                      {subscription.cancel_at_period_end ? (
                        <span className="text-amber-400">
                          Cancels on {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <>
                          Renews on {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
                        </>
                      )}
                    </p>
                  )}
                </div>
                {!subscription && (
                  <Button onClick={() => navigate("/pricing")}>
                    Subscribe
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No active subscription</p>
              <Button onClick={() => navigate("/pricing")}>
                View Plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Usage */}
      {creditStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Credit Usage
            </CardTitle>
            <CardDescription>
              {creditStatus.periodStart && creditStatus.periodEnd && (
                <>
                  Period: {format(new Date(creditStatus.periodStart), "MMM d")} -{" "}
                  {format(new Date(creditStatus.periodEnd), "MMM d, yyyy")}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Used</span>
                <span className="font-semibold">
                  {creditStatus.used.toLocaleString()} / {creditStatus.limit.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={getCreditPercentage()} 
                className="h-2"
              />
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Remaining</span>
                <span className={`font-semibold ${
                  creditStatus.remaining < creditStatus.limit * 0.1 
                    ? "text-amber-400" 
                    : "text-teal-400"
                }`}>
                  {creditStatus.remaining.toLocaleString()} credits
                </span>
              </div>
            </div>
            {creditStatus.remaining === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm text-amber-400">
                  You've used all your credits for this period. Upgrade your plan or wait for the next billing cycle.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing Period Info */}
      {subscription && subscription.current_period_start && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Billing Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Period Start</p>
                <p className="font-semibold">
                  {format(new Date(subscription.current_period_start), "MMMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Period End</p>
                <p className="font-semibold">
                  {format(new Date(subscription.current_period_end || new Date()), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need More Credits?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-4">
              Upgrade your plan to get more credits and access to premium features.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate("/pricing")}
              className="w-full"
            >
              View Plans
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-4">
              Update payment methods, view invoices, and manage your subscription settings.
            </p>
            <Button 
              variant="outline" 
              onClick={handleOpenPortal}
              disabled={!subscription || portalLoading}
              className="w-full"
            >
              {portalLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  Customer Portal
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
