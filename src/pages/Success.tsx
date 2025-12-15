import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import { getSubscription, getCreditStatus } from "@/services/billingService";
import { toast } from "sonner";
import type { Subscription, CreditStatus } from "@/lib/billing";

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Wait a moment for webhook to process, then load subscription
    const loadSubscription = async () => {
      try {
        // Give webhook time to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const [sub, credits] = await Promise.all([
          getSubscription(),
          getCreditStatus(),
        ]);
        
        setSubscription(sub);
        setCreditStatus(credits);
      } catch (error) {
        console.error("Failed to load subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400 mx-auto mb-4" />
            <p className="text-slate-400">Activating your subscription...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CheckCircle className="w-16 h-16 text-teal-500" />
              <Sparkles className="w-6 h-6 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-3xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for subscribing to ProLight AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sessionId && (
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">
                Session ID: {sessionId.slice(0, 20)}...
              </p>
            </div>
          )}

          {subscription && (
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-teal-400" />
                <h3 className="font-semibold text-teal-300">
                  {subscription.plan?.name || "Subscription"} Active
                </h3>
              </div>
              {subscription.plan && (
                <p className="text-sm text-slate-300">
                  You now have access to {subscription.plan.monthly_credit_limit.toLocaleString()} credits per month
                </p>
              )}
            </div>
          )}

          {creditStatus && (
            <div className="space-y-2">
              <p className="text-slate-300 font-medium">Your Credits:</p>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Available</span>
                  <span className="text-2xl font-bold text-teal-400">
                    {creditStatus.remaining.toLocaleString()}
                  </span>
                </div>
                {creditStatus.limit > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    {creditStatus.used} / {creditStatus.limit} used this period
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-slate-300 font-medium">What's Next?</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
              <li>Access to all lighting presets and tools</li>
              <li>Priority queue processing</li>
              <li>Advanced batch editing capabilities</li>
              <li>API access and webhooks (if included in your plan)</li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              onClick={() => navigate("/studio")} 
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-black"
            >
              Start Creating
            </Button>
            <Button 
              onClick={() => navigate("/billing")} 
              variant="outline" 
              className="flex-1"
            >
              View Billing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

