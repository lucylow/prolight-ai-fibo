/**
 * HITL Policy Configuration for ProLight AI
 * Determines when human approval is required vs auto-approval
 */

import type { Proposal, HITLPolicy, RiskFlag } from '@/types/hitl';

export const HITL_POLICY: HITLPolicy = {
  requireApprovalFor: [
    'expand',
    'gen_fill',
    'video',
    '8k',
    'exr',
    'batch',
  ],
  autoApproveIf: {
    cost_lt_usd: 0.05,
    drift_pct_lt: 0.5,
    risk_flags_empty: true,
  },
};

/**
 * Check if a proposal requires human approval based on policy
 */
export function requiresApproval(proposal: Proposal): boolean {
  // Check if any step requires approval
  const hasRequirementStep = proposal.steps.some((step) =>
    HITL_POLICY.requireApprovalFor.includes(step.op)
  );

  if (hasRequirementStep) {
    return true;
  }

  // Check auto-approve conditions
  const { autoApproveIf } = HITL_POLICY;

  // If cost is too high, require approval
  if (autoApproveIf.cost_lt_usd && proposal.estimated_cost_usd >= autoApproveIf.cost_lt_usd) {
    return true;
  }

  // If there are risk flags, require approval
  if (autoApproveIf.risk_flags_empty && proposal.risk_flags.length > 0) {
    return true;
  }

  // Check for high-severity risk flags
  const hasHighRisk = proposal.risk_flags.some((flag) => flag.severity === 'high');
  if (hasHighRisk) {
    return true;
  }

  return false;
}

/**
 * Get approval reason message
 */
export function getApprovalReason(proposal: Proposal): string {
  const reasons: string[] = [];

  const hasRequirementStep = proposal.steps.some((step) =>
    HITL_POLICY.requireApprovalFor.includes(step.op)
  );
  if (hasRequirementStep) {
    reasons.push('Contains operations requiring approval');
  }

  if (proposal.estimated_cost_usd >= (HITL_POLICY.autoApproveIf.cost_lt_usd || 0)) {
    reasons.push(`Cost exceeds $${HITL_POLICY.autoApproveIf.cost_lt_usd}`);
  }

  if (proposal.risk_flags.length > 0) {
    reasons.push(`${proposal.risk_flags.length} risk flag(s) detected`);
  }

  return reasons.join(', ') || 'Policy requires approval';
}
