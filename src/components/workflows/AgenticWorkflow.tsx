/**
 * AgenticWorkflow.tsx
 * Single-file React component (Tailwind) that provides a frontend for creating,
 * running, and monitoring AI agents (agentic workflows).
 * - Uses Fetch for REST operations: /api/agents, /api/agents/:id, /api/agents/:id/run
 * - Uses EventSource (SSE) to stream run events from: /api/runs/:runId/stream
 * - Provides UI: Agent list, Agent editor, Runner (start/stop), live logs, results
 */

import React, { useEffect, useState, useRef } from "react";
import type { Agent, RunLog, AgentState } from "@/types/agentic";
import { AgentEditor } from "./AgentEditor";

// Local mock toggle for development when backend isn't available
const USE_MOCK = true;

// ---------- Utility functions ----------
async function fetchJson(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, { credentials: "same-origin", ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

// ---------- Mock server functions (for local dev) ----------
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

async function mockFetchAgents(): Promise<Agent[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockAgents;
}

async function mockCreateRun(agentId: string): Promise<{ runId: string }> {
  await new Promise((r) => setTimeout(r, 300));
  return { runId: `mock-run-${Date.now()}` };
}

// ---------- Main Component ----------
export default function AgenticWorkflow() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Run state
  const [runId, setRunId] = useState<string | null>(null);
  const [runLogs, setRunLogs] = useState<RunLog[]>([]);
  const esRef = useRef<EventSource | { close: () => void } | null>(null);
  const [runStatus, setRunStatus] = useState<AgentState | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    setLoading(true);
    try {
      const list = USE_MOCK
        ? await mockFetchAgents()
        : await fetchJson("/api/agents");
      setAgents(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
    } catch (err) {
      console.error("Failed to load agents", err);
      // Fallback: empty list
    } finally {
      setLoading(false);
    }
  }

  function selectAgent(id: string) {
    setSelectedId(id);
    // Clear run logs when switching
    setRunLogs([]);
    setRunId(null);
    setRunStatus(null);
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }

  async function createAgent(agent: Omit<Agent, "id">) {
    // optimistic UI add; backend should return id
    try {
      if (USE_MOCK) {
        const newAgent: Agent = {
          ...agent,
          id: `agent-${Date.now()}`,
        };
        mockAgents.push(newAgent);
        await loadAgents();
        setSelectedId(newAgent.id);
        return;
      }
      const created = await fetchJson("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agent),
      });
      await loadAgents();
      setSelectedId(created.id);
    } catch (err) {
      alert("Failed to create agent: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function startRun(agentId: string) {
    setRunLogs([]);
    setRunStatus("EXECUTING");
    try {
      const payload = USE_MOCK
        ? await mockCreateRun(agentId)
        : await fetchJson(`/api/agents/${agentId}/run`, { method: "POST" });
      const id = payload.runId;
      setRunId(id);
      setRunStatus("EXECUTING");
      // open SSE stream
      openRunStream(id);
    } catch (err) {
      console.error(err);
      setRunStatus("FAILED");
      setRunLogs((l) => [
        ...l,
        {
          t: Date.now(),
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        },
      ]);
    }
  }

  function openRunStream(runId: string) {
    if (USE_MOCK) {
      // fake streaming events
      let i = 0;
      const steps = [
        "Agent initialized",
        "Step 1: Writing prompt...",
        "Tool call: image_gen invoked",
        "Tool result: image_abc123 created",
        "Finalizing outputs",
        "Run complete",
      ];
      setRunLogs((l) => [
        ...l,
        {
          t: Date.now(),
          type: "status",
          message: "streaming (mock)",
        },
      ]);
      const iv = setInterval(() => {
        if (i >= steps.length) {
          setRunStatus("COMPLETED");
          clearInterval(iv);
          return;
        }
        setRunLogs((logs) => [
          ...logs,
          {
            t: Date.now(),
            type: "log",
            message: steps[i],
          },
        ]);
        i++;
      }, 800);
      esRef.current = { close: () => clearInterval(iv) };
      return;
    }

    const sseUrl = `/api/runs/${runId}/stream`;
    const es = new EventSource(sseUrl, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        handleRunEvent(payload);
      } catch (err) {
        console.warn("Invalid SSE message", ev.data);
      }
    };

    es.onerror = (err) => {
      console.error("SSE error", err);
      setRunLogs((l) => [
        ...l,
        {
          t: Date.now(),
          type: "error",
          message: "Stream error or closed",
        },
      ]);
      setRunStatus((s) => (s === "EXECUTING" ? "FAILED" : s));
      // Keep the SSE open; backend may close on completion
    };
  }

  function handleRunEvent(ev: { type: string; data: Record<string, unknown> }) {
    const { type, data } = ev;
    if (type === "log") {
      setRunLogs((logs) => [
        ...logs,
        {
          t: Date.now(),
          type: "log",
          message: (data.message as string) || "",
        },
      ]);
    } else if (type === "status") {
      setRunStatus((data.status as AgentState) || null);
      setRunLogs((logs) => [
        ...logs,
        {
          t: Date.now(),
          type: "status",
          message: `Status: ${data.status}`,
        },
      ]);
      if (data.status === "COMPLETED") {
        // Optional: fetch final result
        safeFetchResult(runId!);
      }
    } else if (type === "result") {
      setRunLogs((logs) => [
        ...logs,
        {
          t: Date.now(),
          type: "result",
          message: JSON.stringify(data),
        },
      ]);
    }
  }

  async function safeFetchResult(runId: string) {
    try {
      const res = await fetchJson(`/api/runs/${runId}`);
      setRunLogs((logs) => [
        ...logs,
        {
          t: Date.now(),
          type: "result",
          message: JSON.stringify(res),
        },
      ]);
    } catch (err) {
      console.warn("Failed fetching run result", err);
    }
  }

  async function stopRun(runId: string) {
    if (USE_MOCK) {
      setRunLogs((l) => [
        ...l,
        {
          t: Date.now(),
          type: "status",
          message: "Mock stop requested",
        },
      ]);
      setRunStatus("STOPPED");
      if (esRef.current) esRef.current.close();
      return;
    }
    try {
      await fetchJson(`/api/runs/${runId}/stop`, { method: "POST" });
      setRunStatus("STOPPED");
    } catch (err) {
      setRunLogs((l) => [
        ...l,
        {
          t: Date.now(),
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        },
      ]);
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedId) || null;

  return (
    <div className="p-6 bg-[#0f1113] min-h-screen text-slate-100">
      <div className="max-w-[1400px] mx-auto">
        <header className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Agentic Workflows</h1>
            <p className="text-sm text-slate-300 mt-1">
              Create, run and monitor AI agents that orchestrate tools and steps.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const template: Omit<Agent, "id"> = {
                  name: "New Agent",
                  description: "Describe the agent",
                  systemPrompt: "You are an agent.",
                  steps: [],
                  tools: [],
                };
                createAgent(template);
              }}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded text-black font-medium"
            >
              + New Agent
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Agents list */}
          <aside className="col-span-3 bg-[#0b0c0d] rounded p-4 shadow">
            <h3 className="text-sm text-slate-300 font-semibold mb-3">Agents</h3>
            {loading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => selectAgent(agent.id)}
                    className={`w-full text-left p-2 rounded hover:bg-slate-800 ${
                      selectedId === agent.id
                        ? "bg-slate-800 ring-2 ring-teal-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{agent.name}</div>
                        <div className="text-xs text-slate-400">{agent.description}</div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {agent.steps?.length || 0} steps
                      </div>
                    </div>
                  </button>
                ))}
                {agents.length === 0 && (
                  <div className="text-sm text-slate-400">No agents yet.</div>
                )}
              </div>
            )}
          </aside>

          {/* Main editor / runner area */}
          <main className="col-span-6 bg-[#071018] rounded p-4 shadow">
            {selectedAgent ? (
              <AgentEditor
                agent={selectedAgent}
                onUpdate={() => loadAgents()}
                onRun={() => startRun(selectedAgent.id)}
                runId={runId}
                runStatus={runStatus}
                onStop={() => runId && stopRun(runId)}
              />
            ) : (
              <div className="text-slate-400">Select an agent to edit or run it.</div>
            )}
          </main>

          {/* Right column: run logs & controls */}
          <aside className="col-span-3 bg-[#071018] rounded p-4 shadow flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-semibold">Run Controls</h4>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => selectedAgent && startRun(selectedAgent.id)}
                  disabled={!selectedAgent || runStatus === "EXECUTING"}
                  className="px-3 py-2 bg-teal-500 rounded disabled:opacity-50"
                >
                  Start Run
                </button>
                <button
                  onClick={() => runId && stopRun(runId)}
                  disabled={!runId}
                  className="px-3 py-2 bg-amber-400 text-black rounded disabled:opacity-50"
                >
                  Stop
                </button>
              </div>
              <div className="mt-3 text-sm text-slate-400">
                Status:{" "}
                <span className="font-semibold text-white">{runStatus || "idle"}</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#050607] p-3 rounded">
              <h5 className="text-xs text-slate-300 font-medium mb-2">Run Logs</h5>
              <div className="space-y-2 text-xs text-slate-300">
                {runLogs.length === 0 && (
                  <div className="text-slate-500">No logs yet.</div>
                )}
                {runLogs.map((r, i) => (
                  <div key={i} className="p-2 rounded bg-[#061018]">
                    <div className="text-[10px] text-slate-500">
                      {new Date(r.t).toLocaleTimeString()}
                    </div>
                    <div className="mt-1">{r.message}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Tip: Runs stream events via SSE from{" "}
              <code className="font-mono">/api/runs/:runId/stream</code>.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
