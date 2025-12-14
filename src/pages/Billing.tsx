import React, { useEffect, useState } from "react";
import { stripeClient, Invoice } from "@/services/stripeClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Mock customer ID - in production, get from auth context
const MOCK_CUSTOMER_ID = "cus_mock_customer_123";

export default function BillingDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await stripeClient.getInvoices(MOCK_CUSTOMER_ID, 12);
      setInvoices(data.invoices);
    } catch (error: any) {
      console.error("Failed to load invoices:", error);
      toast.error("Failed to load billing history");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      open: "secondary",
      draft: "outline",
      void: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">Loading billing history...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-teal-300 mb-2">Billing History</h2>
        <p className="text-slate-400">View and download your invoices</p>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">No invoices found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">
                        Invoice #{invoice.id.slice(-8)}
                      </h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-slate-400">
                      Period: {format(new Date(invoice.period_start * 1000), "MMM d, yyyy")} –{" "}
                      {format(new Date(invoice.period_end * 1000), "MMM d, yyyy")}
                    </p>
                    <p className="text-lg font-medium">
                      ${(invoice.amount_paid / 100).toFixed(2)}{" "}
                      {invoice.currency.toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-500">
                      Created: {format(new Date(invoice.created * 1000), "MMM d, yyyy")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {invoice.hosted_invoice_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.hosted_invoice_url, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Invoice
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
