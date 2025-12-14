import React, { useState } from "react";
import { motion } from "framer-motion";
import { stripeClient } from "@/services/stripeClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  monthly: number;
  yearly: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    monthly: 15,
    yearly: 150,
    monthlyPriceId: "price_basic_month",
    yearlyPriceId: "price_basic_year",
    features: ["10 Credits/mo", "Standard Queue", "Email Support"],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 35,
    yearly: 350,
    monthlyPriceId: "price_pro_month",
    yearlyPriceId: "price_pro_year",
    features: [
      "50 Credits/mo",
      "Priority Queue",
      "Batch Editing",
      "Webhooks & API",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: 99,
    yearly: 990,
    monthlyPriceId: "price_ent_month",
    yearlyPriceId: "price_ent_year",
    features: [
      "Unlimited Credits",
      "Dedicated Support",
      "SLA Uptime",
      "Custom Plugins",
    ],
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    const priceId = isYearly ? plan.yearlyPriceId : plan.monthlyPriceId;
    setLoading(plan.id);

    try {
      const session = await stripeClient.createCheckoutSession({
        priceId,
        successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing`,
        mode: "subscription",
      });

      // Redirect to Stripe Checkout
      window.location.href = session.url;
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { detail?: string } })?.data?.detail 
        : undefined;
      toast.error(errorMessage || "Failed to start checkout");
      setLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold text-teal-400">ProLight AI Pricing</h1>
        <p className="text-lg text-slate-400">
          Choose the perfect plan for your lighting needs
        </p>
      </div>

      {/* Toggle */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4 bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-4 py-2 rounded-md transition ${
              !isYearly
                ? "bg-teal-500 text-black font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-4 py-2 rounded-md transition ${
              isYearly
                ? "bg-teal-500 text-black font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Yearly
            <Badge className="ml-2 bg-amber-400 text-black text-xs">Save 17%</Badge>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-8">
        {PLANS.map((plan, index) => {
          const price = isYearly ? plan.yearly : plan.monthly;
          const savings = isYearly ? Math.round((plan.monthly * 12 - plan.yearly) / (plan.monthly * 12) * 100) : 0;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="relative"
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-black">
                  Most Popular
                </Badge>
              )}
              <Card className={`h-full flex flex-col ${plan.popular ? "border-teal-500 border-2" : ""}`}>
                <CardHeader>
                  <CardTitle className="text-2xl text-center">{plan.name}</CardTitle>
                  <div className="text-center mt-4">
                    <span className="text-5xl font-extrabold text-teal-300">
                      ${price}
                    </span>
                    <span className="text-lg text-slate-400 ml-2">
                      {isYearly ? "/yr" : "/mo"}
                    </span>
                    {isYearly && savings > 0 && (
                      <p className="text-sm text-slate-500 mt-1">
                        Save ${plan.monthly * 12 - plan.yearly}/year
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
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
                    disabled={loading === plan.id}
                    className={`w-full ${
                      plan.popular
                        ? "bg-teal-500 hover:bg-teal-600 text-black"
                        : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  >
                    {loading === plan.id ? "Loading..." : plan.name === "Enterprise" ? "Contact Sales" : "Subscribe"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-sm text-slate-400">
        All plans include a 14-day free trial. Cancel anytime.
      </p>
    </div>
  );
}
