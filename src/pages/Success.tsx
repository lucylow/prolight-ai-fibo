import React, { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-teal-500" />
          </div>
          <CardTitle className="text-3xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for subscribing to ProLight AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionId && (
            <p className="text-sm text-slate-400 text-center">
              Session ID: {sessionId}
            </p>
          )}
          <div className="space-y-2">
            <p className="text-slate-300">
              Your subscription has been activated. You now have access to all premium features.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
              <li>Access to all lighting presets</li>
              <li>Priority queue processing</li>
              <li>Advanced batch editing</li>
              <li>API access and webhooks</li>
            </ul>
          </div>
          <div className="flex gap-4 pt-4">
            <Button asChild className="flex-1 bg-teal-500 hover:bg-teal-600 text-black">
              <Link to="/studio">Start Creating</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/billing">View Billing</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
