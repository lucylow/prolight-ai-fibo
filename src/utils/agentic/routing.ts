/**
 * Agentic Workflow Routing & Orchestration
 * Deterministic routing rules and state machine logic
 */

import type { AgentState, RunContext, RoutingRule, AgentRegistry } from "@/types/agentic";

/**
 * UI Route mapping - frontend routes reflect agent state
 */
export const UI_ROUTES: Record<AgentState, string> = {
  CREATED: "/agentic/upload",
  REGISTERED: "/agentic/analyze",
  ANALYZED: "/agentic/proposal",
  PROPOSED: "/agentic/review",
  APPROVED: "/agentic/run",
  REJECTED: "/agentic/review",
  EXECUTING: "/agentic/progress",
  COMPLETED: "/agentic/results",
  FAILED: "/agentic/error",
  STOPPED: "/agentic/progress",
};

/**
 * Routing table - deterministic state transitions
 */
export const ROUTING_TABLE: RoutingRule[] = [
  {
    from: "CREATED",
    to: "REGISTERED",
    // Auto-transition on file upload
  },
  {
    from: "REGISTERED",
    to: "ANALYZED",
    agent: "analyzer-agent",
  },
  {
    from: "ANALYZED",
    to: "PROPOSED",
    agent: "planner-agent",
  },
  {
    from: "PROPOSED",
    to: "APPROVED",
    requiresHuman: true,
  },
  {
    from: "APPROVED",
    to: "EXECUTING",
    agent: "executor-agent",
  },
  {
    from: "EXECUTING",
    to: "COMPLETED",
    // Auto-transition on completion
  },
];

/**
 * Agent registry - capabilities-based routing
 */
export const AGENT_REGISTRY: AgentRegistry = {
  "analyzer-agent": {
    inputs: ["image", "video"],
    outputs: ["analysis"],
    costProfile: "low",
  },
  "planner-agent": {
    inputs: ["analysis"],
    outputs: ["proposal"],
    costProfile: "low",
  },
  "executor-agent": {
    inputs: ["proposal"],
    outputs: ["assets"],
    costProfile: "high",
  },
};

/**
 * Find routing rule for current state
 */
export function findRoutingRule(state: AgentState): RoutingRule | null {
  return ROUTING_TABLE.find((rule) => rule.from === state) || null;
}

/**
 * Check if state requires human approval
 */
export function requiresHumanApproval(state: AgentState): boolean {
  const rule = findRoutingRule(state);
  return rule?.requiresHuman === true;
}

/**
 * Get next state for context
 */
export function getNextState(ctx: RunContext): AgentState | null {
  const rule = findRoutingRule(ctx.state);
  if (!rule) return null;

  // Check if human approval is required
  if (rule.requiresHuman && !ctx.humanApproved) {
    return ctx.state; // Stay in current state
  }

  return rule.to;
}

/**
 * Check if state transition is allowed
 */
export function canTransition(from: AgentState, to: AgentState): boolean {
  const rule = ROUTING_TABLE.find((r) => r.from === from && r.to === to);
  return rule !== undefined;
}

/**
 * Get UI route for state
 */
export function getRouteForState(state: AgentState): string {
  return UI_ROUTES[state] || "/agentic";
}

