/**
 * Human-in-the-Loop (HITL) Types for ProLight AI Agentic Workflows
 */

export interface Proposal {
  agent: string;
  intent: string;
  steps: ProposalStep[];
  estimated_cost_usd: number;
  outputs: string[];
  determinism: DeterminismMetadata;
  risk_flags: RiskFlag[];
  request_id?: string;
  timestamp?: string;
}

export interface ProposalStep {
  op: string;
  confidence?: number;
  key_ev?: number;
  fill_ev?: number;
  pixels?: number;
  [key: string]: unknown;
}

export interface DeterminismMetadata {
  seed: number;
  prompt_hash: string;
  model_version: string;
}

export interface RiskFlag {
  type: 'cost' | 'drift' | 'moderation' | 'quality' | 'compliance';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface HITLDecision {
  request_id: string;
  agent: string;
  human: string;
  decision: 'approved' | 'rejected' | 'modified';
  timestamp: string;
  reason?: string;
  modified_proposal?: Proposal;
}

export interface HITLPolicy {
  requireApprovalFor: string[];
  autoApproveIf: {
    cost_lt_usd?: number;
    drift_pct_lt?: number;
    risk_flags_empty?: boolean;
  };
}

export interface DiffViewerProps {
  before?: string;
  after?: string;
  previewUrl?: string;
  overlays?: ('mask' | 'heatmap')[];
  drift?: number;
}

export interface RunEvent {
  type: 'log' | 'step' | 'result' | 'status' | 'proposal';
  data: {
    message?: string;
    status?: string;
    proposal?: Proposal;
    [key: string]: unknown;
  };
}

