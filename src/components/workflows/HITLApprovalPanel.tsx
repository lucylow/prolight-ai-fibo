/**
 * HITLApprovalPanel - Human-in-the-Loop approval component
 * Displays agent proposals and allows approve/reject/edit actions
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Proposal } from "@/types/hitl";

interface HITLApprovalPanelProps {
  proposal: Proposal;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onViewDiff?: () => void;
}

export function HITLApprovalPanel({
  proposal,
  onApprove,
  onReject,
  onEdit,
  onViewDiff,
}: HITLApprovalPanelProps) {
  return (
    <Card className="rounded-2xl shadow-xl border border-neutral-800 bg-neutral-900">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Agent Proposal</CardTitle>
        <div className="text-sm text-muted-foreground">
          Agent: {proposal.agent} | Intent: {proposal.intent}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Proposal Details */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Steps:</div>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {proposal.steps.map((step, i) => (
              <li key={i}>
                {step.op}
                {step.confidence && ` (confidence: ${(step.confidence * 100).toFixed(0)}%)`}
              </li>
            ))}
          </ul>
        </div>

        {/* Cost & Risk Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Estimated Cost</div>
            <div className="font-semibold">${proposal.estimated_cost_usd.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Outputs</div>
            <div className="font-semibold">{proposal.outputs.join(", ")}</div>
          </div>
        </div>

        {/* Risk Flags */}
        {proposal.risk_flags.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded">
            <div className="text-sm font-medium text-amber-300 mb-1">Risk Flags:</div>
            <ul className="text-xs text-amber-200/80 space-y-1">
              {proposal.risk_flags.map((flag, i) => (
                <li key={i}>
                  [{flag.severity.toUpperCase()}] {flag.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Determinism Info */}
        <div className="p-3 bg-slate-800 rounded text-xs">
          <div className="font-mono text-slate-400">
            Seed: {proposal.determinism.seed} | Model: {proposal.determinism.model_version}
          </div>
        </div>

        {/* Full Proposal JSON (collapsible) */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View Full Proposal JSON
          </summary>
          <pre className="mt-2 bg-black/50 p-3 rounded-xl overflow-x-auto">
            {JSON.stringify(proposal, null, 2)}
          </pre>
        </details>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onViewDiff && (
            <Button variant="outline" onClick={onViewDiff} className="flex-1">
              View Diff
            </Button>
          )}
          <Button variant="secondary" onClick={onEdit} className="flex-1">
            Edit Plan
          </Button>
          <Button variant="destructive" onClick={onReject} className="flex-1">
            Reject
          </Button>
          <Button
            className="bg-teal-500 text-black hover:bg-teal-600 flex-1"
            onClick={onApprove}
          >
            Approve & Run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
