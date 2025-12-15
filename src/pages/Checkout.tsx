import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Lock, 
  CheckCircle, 
  Loader2, 
  ArrowLeft,
  Shield,
  Check,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { completeMockCheckout, createMockCheckoutSession } from "@/services/mockStripeService";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const paymentSchema = z.object({
  cardNumber: z.string().min(16, "Card number must be 16 digits").max(19),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, "Format: MM/YY"),
  cvc: z.string().min(3, "CVC must be 3 digits").max(4),
  cardholderName: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface CheckoutItem {
  name: string;
  description: string;
  amount: number;
  quantity: number;
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"details" | "processing" | "success">("details");
  const [items] = useState<CheckoutItem[]>([
    {
      name: "Pro Plan",
      description: "Monthly subscription",
      amount: 49.99,
      quantity: 1,
    },
  ]);

  const sessionId = searchParams.get("session_id") || `cs_test_${Math.random().toString(36).substring(2, 15)}`;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: "4242 4242 4242 4242",
      expiryDate: "12/25",
      cvc: "123",
      cardholderName: "Jane Doe",
      email: "customer@example.com",
    },
  });

  const cardNumber = watch("cardNumber");

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const getCardBrand = (number: string) => {
    const num = number.replace(/\s/g, "");
    if (/^4/.test(num)) return "Visa";
    if (/^5[1-5]/.test(num)) return "Mastercard";
    if (/^3[47]/.test(num)) return "American Express";
    return "Card";
  };

  const total = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);

  const onSubmit = async (data: PaymentFormData) => {
    setProcessing(true);
    setStep("processing");

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await completeMockCheckout(sessionId);
      
      if (result.success) {
        setStep("success");
        toast.success("Payment successful!");
        
        // Redirect to success page after a moment
        setTimeout(() => {
          navigate(`/success?session_id=${sessionId}`);
        }, 2000);
      }
    } catch (error) {
      toast.error("Payment failed. Please try again.");
      setStep("details");
      setProcessing(false);
    }
  };

  if (step === "processing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#071018] to-[#06121a] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-teal-400 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Processing Payment</h3>
              <p className="text-slate-400">Please wait while we process your payment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#071018] to-[#06121a] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-teal-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
              <p className="text-slate-400">Redirecting you...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071018] to-[#06121a] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/pricing")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pricing
          </Button>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-teal-400" />
            <h1 className="text-3xl font-bold text-teal-300">Secure Checkout</h1>
          </div>
          <p className="text-slate-400">Complete your purchase with secure payment</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Payment Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Details
                </CardTitle>
                <CardDescription>
                  <Badge variant="outline" className="mr-2">
                    <Shield className="w-3 h-3 mr-1" />
                    Secure
                  </Badge>
                  Mock Stripe Checkout (No real charges)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="customer@example.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Cardholder Name */}
                  <div className="space-y-2">
                    <Label htmlFor="cardholderName">Cardholder Name</Label>
                    <Input
                      id="cardholderName"
                      placeholder="Jane Doe"
                      {...register("cardholderName")}
                    />
                    {errors.cardholderName && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.cardholderName.message}
                      </p>
                    )}
                  </div>

                  {/* Card Number */}
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        placeholder="4242 4242 4242 4242"
                        maxLength={19}
                        {...register("cardNumber", {
                          onChange: (e) => {
                            e.target.value = formatCardNumber(e.target.value);
                          },
                        })}
                      />
                      {cardNumber && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Badge variant="outline" className="text-xs">
                            {getCardBrand(cardNumber)}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {errors.cardNumber && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.cardNumber.message}
                      </p>
                    )}
                  </div>

                  {/* Expiry and CVC */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        placeholder="MM/YY"
                        maxLength={5}
                        {...register("expiryDate", {
                          onChange: (e) => {
                            e.target.value = formatExpiry(e.target.value);
                          },
                        })}
                      />
                      {errors.expiryDate && (
                        <p className="text-sm text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.expiryDate.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        {...register("cvc")}
                      />
                      {errors.cvc && (
                        <p className="text-sm text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.cvc.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <Button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-black font-semibold py-6 text-lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Pay ${total.toFixed(2)}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-slate-500">
                    Your payment is secured with mock encryption. This is a demonstration.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-slate-400">{item.description}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">${item.amount.toFixed(2)}</p>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Tax</span>
                    <span>$0.00</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-teal-400">${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <Check className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    <span>14-day money-back guarantee</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <Check className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    <span>Cancel anytime</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <Check className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    <span>No hidden fees</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

