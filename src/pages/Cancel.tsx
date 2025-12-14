import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, HelpCircle } from "lucide-react";

export default function CancelPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="w-16 h-16 text-amber-500" />
          </div>
          <CardTitle className="text-3xl">Checkout Cancelled</CardTitle>
          <CardDescription>
            Your payment was not completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-slate-300 text-center">
              No charges were made. Your payment information was not processed.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-slate-300 font-medium">What happened?</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
              <li>You cancelled the checkout process</li>
              <li>No payment was processed</li>
              <li>Your account remains unchanged</li>
            </ul>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-300 mb-1">
                  Need help?
                </p>
                <p className="text-xs text-slate-400">
                  If you encountered an issue during checkout, please contact our support team. 
                  We're here to help!
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              onClick={() => navigate("/pricing")} 
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-black"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Pricing
            </Button>
            <Button 
              onClick={() => navigate("/")} 
              variant="outline" 
              className="flex-1"
            >
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
