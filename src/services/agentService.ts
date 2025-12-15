/**
 * Agent Service - API client for agentic workflow operations
 * Provides typed methods for agent CRUD and run management
 */

import type { Agent, RunLog, AgentState, RunContext } from "@/types/agentic";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export interface AgentCreateRequest {
  name: string;
  description: string;
  systemPrompt: string;
  steps: Agent["steps"];
  tools: Agent["tools"];
}

export interface AgentUpdateRequest extends Partial<AgentCreateRequest> {
  id: string;
}

export interface RunCreateRequest {
  agentId: string;
  input?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RunCreateResponse {
  runId: string;
  status: AgentState;
  context?: RunContext;
}

export interface RunStatusResponse {
  runId: string;
  status: AgentState;
  logs?: RunLog[];
  result?: unknown;
  error?: string;
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  retryDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (response.ok || attempt === maxRetries) {
        return response;
      }

      // Retry on server errors (5xx) or network errors
      if (response.status >= 500 || response.status === 0) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Failed to fetch after retries");
}

/**
 * Parse JSON response with error handling
 */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error("Empty response");
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
  }
}

/**
 * Mock data for development
 */
const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "Marketing Copy Agent",
    description: "Generate multi-variant ad copy + imagery briefs",
    systemPrompt: "You are a helpful marketing assistant. Generate short ad copy variants.",
    steps: [
      { id: "s1", type: "llm", prompt: "Create 5 headline variants" },
      { id: "s2", type: "tool", tool: "image_gen", input: { headline: "{{s1.output}}" } },
    ],
    tools: [
      { id: "image_gen", name: "Image Generator", type: "generation" },
    ],
  },
  {
    id: "agent-2",
    name: "ProLight Relight Agent",
    description: "Professional product relighting with HITL approval",
    systemPrompt: "You are a professional lighting assistant. Analyze images and propose relighting enhancements.",
    steps: [
      { id: "s1", type: "tool", tool: "analyze_lighting", input: {} },
      { id: "s2", type: "llm", prompt: "Propose relighting plan based on analysis" },
      { id: "s3", type: "tool", tool: "relight", input: { key_ev: 1.1, fill_ev: 0.6 } },
    ],
    tools: [
      { id: "analyze_lighting", name: "Lighting Analyzer", type: "analysis" },
      { id: "relight", name: "Relight Tool", type: "editing" },
    ],
  },
];

/**
 * Agent Service
 */
export const agentService = {
  /**
   * List all agents
   */
  async listAgents(): Promise<Agent[]> {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return [...mockAgents];
    }

    const response = await fetchWithRetry(`${API_BASE_URL}/api/agents`);
    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.statusText}`);
    }
    return parseJsonResponse<Agent[]>(response);
  },

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Agent> {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const agent = mockAgents.find((a) => a.id === agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }
      return { ...agent };
    }

    const response = await fetchWithRetry(`${API_BASE_URL}/api/agents/${agentId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch agent: ${response.statusText}`);
    }
    return parseJsonResponse<Agent>(response);
  },

  /**
   * Create a new agent
   */
  async createAgent(request: AgentCreateRequest): Promise<Agent> {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const newAgent: Agent = {
        ...request,
        id: `agent-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockAgents.push(newAgent);
      return { ...newAgent };
    }

    const response = await fetchWithRetry(`${API_BASE_URL}/api/agents`, {
      method: "POST",
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to create agent: ${response.statusText}`);
    }
    return parseJsonResponse<Agent>(response);
  },

  /**
   * Update an existing agent
   */
  async updateAgent(request: AgentUpdateRequest): Promise<Agent> {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const index = mockAgents.findIndex((a) => a.id === request.id);
      if (index === -1) {
        throw new Error(`Agent ${request.id} not found`);
      }
      const updated = { ...mockAgents[index], ...request, updatedAt: new Date().toISOString() };
      mockAgents[index] = updated;
      return { ...updated };
    }

    const { id, ...updateData } = request;
    const response = await fetchWithRetry(`${API_BASE_URL}/api/agents/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update agent: ${response.statusText}`);
    }
    return parseJsonResponse<Agent>(response);
  },

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const index = mockAgents.findIndex((a) => a.id === agentId);
      if (index !== -1) {
        mockAgents.splice(index, 1);
      }
      return;
    }

    const response = await fetchWithRetry(`${API_BASE_URL}/api/agents/${agentId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete agent: ${response.statusText}`);
    }
  },

  /**
   * Start a run for an agent
   */
  async startRun(request: RunCreateRequest): Promise<RunCreateResponse> {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        runId: `run-${Date.now()}`,
        status: "EXECUTING",
        context: {
          id: `run-${Date.now()}`,
          agentId: request.agentId,
          state: "EXECUTING",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: request.metadata,
        },
      };
    }

    const response = await fetchWithRetry(`${API_BASE_URL}/api/agents/${request.agentId}/run`, {
      method: "POST",
      body: JSON.stringify({
        input: request.input,
        metadata: request.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start run: ${response.statusText}`);
    }
    return parseJsonResponse<RunCreateResponse>(response);
  },

  /**
   * Get run status
   */
  async getRunStatus(runId: string): Promise<RunStatusResponse> {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return {
        runId,
        status: "COMPLETED",
        logs: [],
      };
    }

    const response = await fetchWithRetry(`${API_BASE_URL}/api/runs/${runId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch run status: ${response.statusText}`);
    }
    return parseJsonResponse<RunStatusResponse>(response);
  },

  /**
   * Stop a running execution
   */
  async stopRun(runId: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return;
    }

    const response = await fetchWithRetry(`${API_BASE_URL}/api/runs/${runId}/stop`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to stop run: ${response.statusText}`);
    }
  },

  /**
   * Get SSE stream URL for run events
   */
  getStreamUrl(runId: string): string {
    return `${API_BASE_URL}/api/runs/${runId}/stream`;
  },
};

