import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Trash2, Loader2, CheckCircle } from "lucide-react";
import { getMockPaymentMethods, type MockPaymentMethod } from "@/services/mockStripeService";
import { toast } from "sonner";

export default function PaymentMethods() {
  const [methods, setMethods] = useState<MockPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const data = await getMockPaymentMethods();
      setMethods(data);
    } catch (error) {
      console.error("Failed to load payment methods:", error);
      toast.error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm("Are you sure you want to remove this payment method?")) {
      return;
    }

    try {
      setDeleting(methodId);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setMethods(methods.filter((m) => m.id !== methodId));
      toast.success("Payment method removed");
    } catch (error) {
      toast.error("Failed to remove payment method");
    } finally {
      setDeleting(null);
    }
  };

  const getCardBrandColor = (brand: string) => {
    const colors: Record<string, string> = {
      visa: "text-blue-500",
      mastercard: "text-red-500",
      amex: "text-green-500",
    };
    return colors[brand.toLowerCase()] || "text-slate-400";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your payment methods for subscriptions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {methods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No payment methods on file</p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {methods.map((method, index) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border border-slate-800 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-slate-800 ${method.card ? getCardBrandColor(method.card.brand) : ""}`}>
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    {method.card ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold capitalize">
                            {method.card.brand} •••• {method.card.last4}
                          </p>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400">
                          Expires {method.card.exp_month.toString().padStart(2, "0")}/{method.card.exp_year}
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold">{method.type}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {index === 0 && (
                    <Button variant="ghost" size="sm" disabled>
                      Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(method.id)}
                    disabled={deleting === method.id || (index === 0 && methods.length === 1)}
                  >
                    {deleting === method.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-400" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            <strong className="text-slate-400">Note:</strong> This is mock data for demonstration. 
            In production, payment methods would be securely stored and managed through Stripe.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

