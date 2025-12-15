/**
 * Routing and Orchestration for ProLight AI Agentic Workflows
 * Deterministic state machine-based routing
 */

import type { AgentState, RunContext, RoutingRule, AgentRegistry } from "@/types/agentic";

export const ROUTING_TABLE: RoutingRule[] = [
  {
    from: "CREATED",
    to: "REGISTERED",
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
  },
];

export const AGENT_REGISTRY: AgentRegistry = {
  "analyzer-agent": {
    inputs: ["raw_media"],
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
 * Advance workflow to next state based on routing rules
 */
export async function advanceWorkflow(
  ctx: RunContext,
  runAgent?: (agentId: string, context: RunContext) => Promise<RunContext>
): Promise<RunContext> {
  const rule = ROUTING_TABLE.find((r) => r.from === ctx.state);

  if (!rule) {
    return ctx;
  }

  // Check if human approval is required
  if (rule.requiresHuman && !ctx.humanApproved) {
    ctx.state = "PROPOSED";
    ctx.blocked = true;
    return ctx;
  }

  // Check conditional routing
  if (rule.condition && !rule.condition(ctx)) {
    return ctx;
  }

  // Run agent if specified
  if (rule.agent && runAgent) {
    ctx = await runAgent(rule.agent, ctx);
  }

  // Transition to next state
  ctx.state = rule.to;
  ctx.updatedAt = new Date().toISOString();

  return ctx;
}

/**
 * Get UI route for current state
 */
export function getRouteForState(state: AgentState): string {
  const routes: Record<AgentState, string> = {
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
  return routes[state] || "/workflows";
}

