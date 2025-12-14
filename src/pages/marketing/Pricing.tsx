import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createCheckoutSession, getPlans, type Plan as BillingPlan } from "@/services/billingService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoadingPlans(true);
      const fetchedPlans = await getPlans();
      setPlans(fetchedPlans);
    } catch (error) {
      console.error("Failed to load plans:", error);
      toast.error("Failed to load pricing plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSubscribe = async (plan: BillingPlan) => {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please sign in to subscribe");
      navigate("/sign-in?redirect=/pricing");
      return;
    }

    setLoading(plan.id);

    try {
      const { checkout_url } = await createCheckoutSession(
        plan.name,
        `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        `${window.location.origin}/cancel`
      );

      // Redirect to Stripe Checkout
      window.location.href = checkout_url;
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout";
      toast.error(errorMessage);
      setLoading(null);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const getFeatures = (plan: BillingPlan): string[] => {
    const features: string[] = [];
    if (plan.monthly_credit_limit > 0) {
      features.push(`${plan.monthly_credit_limit.toLocaleString()} Credits/mo`);
    } else {
      features.push("Unlimited Credits");
    }
    
    if (plan.features && Array.isArray(plan.features)) {
      plan.features.forEach((feature: string) => {
        if (feature === "basic_generation") features.push("Basic Generation");
        else if (feature === "hdr") features.push("HDR Support");
        else if (feature === "batch_generation") features.push("Batch Generation");
        else if (feature === "priority_support") features.push("Priority Support");
        else if (feature === "api_access") features.push("API Access");
        else if (feature === "team_collaboration") features.push("Team Collaboration");
        else features.push(feature);
      });
    }
    
    return features;
  };

  if (loadingPlans) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-teal-400 mb-4">No Plans Available</h1>
          <p className="text-slate-400">Please check back later or contact support.</p>
        </div>
      </div>
    );
  }

  // Find the most popular plan (Pro or middle tier)
  const popularPlanIndex = plans.length > 1 ? Math.floor(plans.length / 2) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold text-teal-400">ProLight AI Pricing</h1>
        <p className="text-lg text-slate-400">
          Choose the perfect plan for your lighting needs
        </p>
        <p className="text-sm text-slate-500">
          All paid plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan, index) => {
          const features = getFeatures(plan);
          const isPopular = index === popularPlanIndex && plans.length > 1;
          const price = plan.price_cents / 100;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="relative"
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-black z-10">
                  Most Popular
                </Badge>
              )}
              <Card className={`h-full flex flex-col ${isPopular ? "border-teal-500 border-2" : ""}`}>
                <CardHeader>
                  <CardTitle className="text-2xl text-center">{plan.name}</CardTitle>
                  <div className="text-center mt-4">
                    {plan.price_cents === 0 ? (
                      <span className="text-5xl font-extrabold text-teal-300">Free</span>
                    ) : (
                      <>
                        <span className="text-5xl font-extrabold text-teal-300">
                          ${formatPrice(plan.price_cents)}
                        </span>
                        <span className="text-lg text-slate-400 ml-2">/mo</span>
                      </>
                    )}
                  </div>
                  {plan.description && (
                    <CardDescription className="text-center mt-2">
                      {plan.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {features.map((feature, idx) => (
                      <motion.li
                        key={idx}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="flex items-center text-sm"
                      >
                        <Check className="w-5 h-5 text-teal-400 mr-2 flex-shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading === plan.id || !plan.is_active}
                    className={`w-full ${
                      isPopular
                        ? "bg-teal-500 hover:bg-teal-600 text-black"
                        : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  >
                    {loading === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : plan.price_cents === 0 ? (
                      "Get Started"
                    ) : plan.name.toLowerCase().includes("enterprise") ? (
                      "Contact Sales"
                    ) : (
                      <>
                        Subscribe
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center space-y-4 pt-8 border-t border-slate-800">
        <p className="text-sm text-slate-400">
          Secure checkout powered by Stripe. Your payment information is encrypted and secure.
        </p>
        <div className="flex justify-center gap-6 text-sm">
          <a href="/legal/terms" className="text-teal-400 hover:text-teal-300">Terms of Service</a>
          <a href="/legal/privacy" className="text-teal-400 hover:text-teal-300">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
