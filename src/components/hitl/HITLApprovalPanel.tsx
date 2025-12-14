import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Proposal } from '@/types/hitl';
import { getApprovalReason } from '@/utils/hitl-policy';
import { AlertTriangle, CheckCircle2, XCircle, Edit2, DollarSign, Shield } from 'lucide-react';

interface HITLApprovalPanelProps {
  proposal: Proposal;
  onApprove: (reason?: string) => void;
  onReject: (reason?: string) => void;
  onEdit: () => void;
}

export default function HITLApprovalPanel({
  proposal,
  onApprove,
  onReject,
  onEdit,
}: HITLApprovalPanelProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalReason, setApprovalReason] = useState('');

  const approvalRequiredReason = getApprovalReason(proposal);

  return (
    <Card className="rounded-2xl shadow-xl border border-neutral-800 bg-neutral-900">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-500" />
              Agent Proposal - Human Approval Required
            </CardTitle>
            <CardDescription className="mt-2">
              {approvalRequiredReason}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Info */}
        <div className="bg-black/50 p-3 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Agent</div>
          <div className="text-sm font-medium">{proposal.agent}</div>
          <div className="text-xs text-slate-400 mt-1">{proposal.intent}</div>
        </div>

        {/* Cost & Risk Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/50 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <DollarSign className="w-3 h-3" />
              Estimated Cost
            </div>
            <div className="text-sm font-semibold text-teal-400">
              ${proposal.estimated_cost_usd.toFixed(2)}
            </div>
          </div>
          <div className="bg-black/50 p-3 rounded-xl">
            <div className="text-xs text-slate-400 mb-1">Risk Flags</div>
            <div className="text-sm font-semibold">
              {proposal.risk_flags.length === 0 ? (
                <span className="text-green-400">None</span>
              ) : (
                <span className="text-amber-400">{proposal.risk_flags.length}</span>
              )}
            </div>
          </div>
        </div>

        {/* Risk Flags */}
        {proposal.risk_flags.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              Risk Flags
            </div>
            <div className="space-y-1">
              {proposal.risk_flags.map((flag, i) => (
                <div key={i} className="text-xs text-slate-300">
                  <span className={`font-medium ${
                    flag.severity === 'high' ? 'text-red-400' :
                    flag.severity === 'medium' ? 'text-amber-400' :
                    'text-yellow-400'
                  }`}>
                    [{flag.severity.toUpperCase()}]
                  </span>{' '}
                  {flag.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps Preview */}
        <div>
          <div className="text-xs text-slate-400 mb-2">Proposed Steps</div>
          <div className="bg-black/50 p-3 rounded-xl space-y-2">
            {proposal.steps.map((step, i) => (
              <div key={i} className="text-xs font-mono text-slate-300">
                <span className="text-teal-400">{step.op}</span>
                {step.confidence && (
                  <span className="text-slate-500 ml-2">
                    (confidence: {(step.confidence * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Determinism Info */}
        <div className="bg-black/50 p-3 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Determinism</div>
          <div className="text-xs font-mono text-slate-300">
            Seed: {proposal.determinism.seed} | Model: {proposal.determinism.model_version}
          </div>
        </div>

        {/* Proposal JSON (collapsible) */}
        <details className="bg-black/50 p-3 rounded-xl">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
            View Full Proposal JSON
          </summary>
          <pre className="mt-2 text-xs bg-black/50 p-3 rounded overflow-x-auto text-slate-300">
            {JSON.stringify(proposal, null, 2)}
          </pre>
        </details>

        {/* Approval Reason */}
        <div>
          <Label htmlFor="approval-reason" className="text-xs text-slate-400">
            Approval Reason (optional)
          </Label>
          <Textarea
            id="approval-reason"
            value={approvalReason}
            onChange={(e) => setApprovalReason(e.target.value)}
            placeholder="e.g., Looks good for e-commerce use"
            className="mt-1 bg-black/50 text-sm"
            rows={2}
          />
        </div>

        {/* Rejection Reason */}
        <div>
          <Label htmlFor="rejection-reason" className="text-xs text-slate-400">
            Rejection Reason (required if rejecting)
          </Label>
          <Textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g., Cost too high, quality concerns..."
            className="mt-1 bg-black/50 text-sm"
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Plan
          </Button>
          <Button
            variant="destructive"
            onClick={() => onReject(rejectionReason || undefined)}
            className="flex-1"
            disabled={!rejectionReason.trim()}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            className="flex-1 bg-teal-500 text-black hover:bg-teal-600"
            onClick={() => onApprove(approvalReason || undefined)}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve & Run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
