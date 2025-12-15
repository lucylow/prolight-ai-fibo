/**
 * HITL Approval Panel
 * Component for human review and approval of agent proposals
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Proposal } from "@/types/agentic";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Edit, DollarSign, AlertTriangle } from "lucide-react";

interface HITLApprovalPanelProps {
  proposal: Proposal;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  loading?: boolean;
}

export function HITLApprovalPanel({
  proposal,
  onApprove,
  onReject,
  onEdit,
  loading = false,
}: HITLApprovalPanelProps) {
  return (
    <Card className="rounded-2xl shadow-xl border border-neutral-800 bg-neutral-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Agent Proposal - Human Review Required
        </CardTitle>
        <CardDescription>
          Review the proposed changes before execution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Proposal Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Agent:</span>
            <Badge variant="outline">{proposal.agent}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Intent:</span>
            <span className="text-sm text-muted-foreground">{proposal.intent}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Estimated Cost:
            </span>
            <span className="text-sm font-semibold">${proposal.estimated_cost_usd.toFixed(2)}</span>
          </div>
        </div>

        {/* Steps */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Proposed Steps:</h4>
          <div className="space-y-2">
            {proposal.steps.map((step, i) => (
              <div
                key={i}
                className="p-2 rounded bg-neutral-800 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="text-teal-400">{step.op}</span>
                  {step.confidence && (
                    <Badge variant="secondary" className="text-xs">
                      {(step.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  )}
                </div>
                {Object.entries(step)
                  .filter(([key]) => !["op", "confidence"].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="text-muted-foreground mt-1">
                      {key}: {String(value)}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* Risk Flags */}
        {proposal.risk_flags.length > 0 && (
          <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20">
            <h4 className="text-sm font-semibold text-amber-500 mb-1">Risk Flags:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {proposal.risk_flags.map((flag, i) => (
                <li key={i}>• {flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Determinism Info */}
        <div className="p-3 rounded bg-neutral-800 text-xs">
          <h4 className="text-sm font-semibold mb-2">Determinism:</h4>
          <pre className="text-muted-foreground overflow-x-auto">
            {JSON.stringify(proposal.determinism, null, 2)}
          </pre>
        </div>

        {/* Full Proposal JSON (collapsible) */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View Full Proposal JSON
          </summary>
          <pre className="mt-2 p-3 rounded bg-black/50 overflow-x-auto text-[10px]">
            {JSON.stringify(proposal, null, 2)}
          </pre>
        </details>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-neutral-800">
          <Button
            variant="secondary"
            onClick={onEdit}
            disabled={loading}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Plan
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={loading}
            className="flex-1"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            onClick={onApprove}
            disabled={loading}
            loading={loading}
            className="flex-1 bg-teal-500 hover:bg-teal-600 text-black"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve & Run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

