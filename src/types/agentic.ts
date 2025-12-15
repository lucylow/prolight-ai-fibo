/**
 * Agentic Workflow Types for ProLight AI
 * Core types for agent state, routing, and orchestration
 */

export type AgentState =
  | "CREATED"
  | "REGISTERED"
  | "ANALYZED"
  | "PROPOSED"
  | "APPROVED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "STOPPED";

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  steps: AgentStep[];
  tools: AgentTool[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentStep {
  id: string;
  type: "llm" | "tool" | "condition" | "parallel";
  prompt?: string;
  tool?: string;
  input?: Record<string, unknown>;
  condition?: string;
  [key: string]: unknown;
}

export interface AgentTool {
  id: string;
  name: string;
  type: "generation" | "editing" | "analysis" | "export";
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface RunContext {
  id: string;
  agentId: string;
  state: AgentState;
  humanApproved?: boolean;
  blocked?: boolean;
  determinism?: DeterminismContext;
  estimatedCostUsd?: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface DeterminismContext {
  seed: number;
  prompt_hash: string;
  model_version: string;
  locked: boolean;
}

export interface RoutingRule {
  from: AgentState;
  to: AgentState;
  agent?: string;
  requiresHuman?: boolean;
  condition?: (ctx: RunContext) => boolean;
}

export interface AgentRegistry {
  [key: string]: {
    inputs: string[];
    outputs: string[];
    costProfile: "low" | "medium" | "high";
    version?: string;
  };
}

export interface RunLog {
  t: number;
  type: "log" | "status" | "error" | "result" | "proposal";
  message: string;
  data?: Record<string, unknown>;
}

export interface SSEEvent {
  type: "STATE_CHANGE" | "PROGRESS" | "LOG" | "ERROR" | "PROPOSAL";
  state?: AgentState;
  pct?: number;
  message?: string;
  reason?: string;
  proposal?: unknown;
  data?: Record<string, unknown>;
}

export interface ProposalStep {
  op: string;
  confidence?: number;
  // Allow arbitrary additional step fields from the agent
  [key: string]: unknown;
}

export interface Proposal {
  agent: string;
  intent: string;
  estimated_cost_usd: number;
  steps: ProposalStep[];
  risk_flags: string[];
  determinism: DeterminismContext & Record<string, unknown>;
  // Allow extra metadata fields without breaking type-checking
  [key: string]: unknown;
}

export const UI_ROUTES: Record<AgentState, string> = {
  CREATED: "/workflows/upload",
  REGISTERED: "/workflows/analyze",
  ANALYZED: "/workflows/proposal",
  PROPOSED: "/workflows/review",
  APPROVED: "/workflows/run",
  EXECUTING: "/workflows/progress",
  COMPLETED: "/workflows/results",
  FAILED: "/workflows/error",
  STOPPED: "/workflows/stopped",
};


