/**
 * HITL Policy Configuration
 * Enterprise rules for when human approval is required
 */

import type { Proposal } from "@/types/agentic";

export interface HITLPolicy {
  requireApprovalFor: string[];
  autoApproveIf: {
    cost_lt_usd?: number;
    drift_pct_lt?: number;
    risk_flags_empty?: boolean;
  };
}

export const HITL_POLICY: HITLPolicy = {
  requireApprovalFor: ["expand", "gen_fill", "video", "8k", "exr"],
  autoApproveIf: {
    cost_lt_usd: 0.05,
    drift_pct_lt: 0.5,
    risk_flags_empty: true,
  },
};

/**
 * Check if proposal requires human approval based on policy
 */
export function requiresApproval(proposal: Proposal): boolean {
  // Check if any step requires approval
  const hasRequirement = proposal.steps.some((step) =>
    HITL_POLICY.requireApprovalFor.includes(step.op)
  );

  if (hasRequirement) return true;

  // Check auto-approve conditions
  const autoApprove =
    (HITL_POLICY.autoApproveIf.cost_lt_usd &&
      proposal.estimated_cost_usd < HITL_POLICY.autoApproveIf.cost_lt_usd) ||
    (HITL_POLICY.autoApproveIf.risk_flags_empty &&
      proposal.risk_flags.length === 0);

  return !autoApprove;
}

/**
 * Calculate drift percentage (composition change)
 */
export function calculateDrift(proposal: Proposal): number {
  // Simplified drift calculation
  // In real implementation, compare before/after composition
  const expandOps = proposal.steps.filter((s) => s.op === "expand");
  if (expandOps.length === 0) return 0;

  const totalPixels = expandOps.reduce(
    (sum, op) => sum + (op.pixels || 0),
    0
  );
  // Assume base image is 2048x2048 = 4M pixels
  const basePixels = 4_194_304;
  return Math.min((totalPixels / basePixels) * 100, 100);
}
