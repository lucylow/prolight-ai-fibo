import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import HITLApprovalPanel from "@/components/hitl/HITLApprovalPanel";
import DiffViewer from "@/components/hitl/DiffViewer";
import type { Proposal, HITLDecision, RunEvent } from "@/types/hitl";
import { requiresApproval } from "@/utils/hitl-policy";
import { FileText, Play, Square, Loader2 } from "lucide-react";

/**
 * AgenticWorkflow Component with Human-in-the-Loop (HITL) Integration
 * 
 * Provides a frontend for creating, running, and monitoring AI agents with
 * explicit human approval gates for enterprise safety and creative control.
 * 
 * Backend endpoints expected:
 * - GET  /api/agents                 -> list of saved agents
 * - POST /api/agents                 -> create agent
 * - PUT  /api/agents/:id             -> update agent
 * - DELETE /api/agents/:id           -> delete agent
 * - POST /api/agents/:id/run        -> start a run, returns { runId }
 * - POST /api/runs/:runId/stop      -> request run stop
 * - GET  /api/runs/:runId/status    -> run status
 * - GET  /api/runs/:runId           -> run results
 * - SSE  /api/runs/:runId/stream    -> stream run events
 * - POST /api/hitl/decisions        -> log HITL decision
 */

interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  steps: Array<{ id?: string; type: string; prompt?: string; tool?: string; [key: string]: unknown }>;
  tools: Array<{ id: string; name: string; type: string }>;
}

// Local mock toggle for development
const USE_MOCK = false;

// ---------- Mock Data ----------
const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "Marketing Copy Agent",
    description: "Generate multi-variant ad copy + imagery briefs",
    systemPrompt: "You are a helpful marketing assistant. Generate short ad copy variants.",
    steps: [
      { id: "s1", type: "llm", prompt: "Create 5 headline variants" },
      { id: "s2", type: "tool", tool: "image_gen", input: "headline" },
    ],
    tools: [
      { id: "image_gen", name: "Image Generator", type: "generation" },
    ],
  },
];

// Mock proposal for testing HITL
const mockProposal: Proposal = {
  agent: "prolight-relight-v1",
  intent: "product_packshot_enhancement",
  steps: [
    { op: "remove_background", confidence: 0.94 },
    { op: "relight", key_ev: 1.1, fill_ev: 0.6 },
    { op: "expand", pixels: 1024 },
  ],
  estimated_cost_usd: 0.18,
  outputs: ["png_alpha", "exr_16bit"],
  determinism: {
    seed: 38291023,
    prompt_hash: "0x9adf...",
    model_version: "bria-edit-2025.1",
  },
  risk_flags: [],
  request_id: "req_mock_001",
  timestamp: new Date().toISOString(),
};

// ---------- Utility functions ----------
async function fetchJson(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, { credentials: "same-origin", ...opts });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

async function mockFetchAgents(): Promise<Agent[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockAgents;
}

async function mockCreateRun(agentId: string) {
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
  const [runLogs, setRunLogs] = useState<Array<{ t: number; message: string; type: string }>>([]);
  const esRef = useRef<EventSource | { close: () => void } | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);

  // HITL state
  const [pendingProposal, setPendingProposal] = useState<Proposal | null>(null);
  const [hitlDecisions, setHitlDecisions] = useState<HITLDecision[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    setLoading(true);
    try {
      const list = USE_MOCK ? await mockFetchAgents() : await fetchJson("/api/agents");
      setAgents(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
    } catch (err) {
      console.error("Failed to load agents", err);
    } finally {
      setLoading(false);
    }
  }

  function selectAgent(id: string) {
    setSelectedId(id);
    setRunLogs([]);
    setRunId(null);
    setRunStatus(null);
    setPendingProposal(null);
    setShowDiff(false);
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }

  async function createAgent(agent: Omit<Agent, 'id'>) {
    try {
      if (USE_MOCK) {
        mockAgents.push({ ...agent, id: `agent-${Date.now()}` });
        await loadAgents();
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
    setRunStatus("starting");
    setPendingProposal(null);
    setShowDiff(false);
    try {
      const payload = USE_MOCK
        ? await mockCreateRun(agentId)
        : await fetchJson(`/api/agents/${agentId}/run`, { method: "POST" });
      const id = payload.runId;
      setRunId(id);
      setRunStatus("running");
      await openRunStream(id);
    } catch (err) {
      console.error(err);
      setRunStatus("error");
      setRunLogs((l) => [
        ...l,
        { t: Date.now(), type: "error", message: err instanceof Error ? err.message : String(err) },
      ]);
    }
  }

  async function openRunStream(runId: string) {
    if (USE_MOCK) {
      // Simulate proposal event
      setTimeout(() => {
        handleRunEvent({
          type: "proposal",
          data: { proposal: mockProposal },
        });
      }, 1000);

      // Fake streaming events
      let i = 0;
      const steps = [
        "Agent initialized",
        "Step 1: Analyzing image...",
        "Proposal generated - awaiting approval",
      ];
      setRunLogs((l) => [
        ...l,
        { t: Date.now(), type: "status", message: "streaming (mock)" },
      ]);
      const iv = setInterval(() => {
        if (i >= steps.length) {
          clearInterval(iv);
          return;
        }
        setRunLogs((logs) => [
          ...logs,
          { t: Date.now(), type: "log", message: steps[i] },
        ]);
        i++;
      }, 800);
      esRef.current = { close: () => clearInterval(iv) };
      return;
    }

    // Use enhanced SSE client with auto-reconnection
    const { EnhancedSSEClient } = await import("@/utils/agentic/enhancedSSE");
    const sseUrl = `/api/runs/${runId}/stream`;
    
    const sseClient = new EnhancedSSEClient({
      url: sseUrl,
      withCredentials: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      onMessage: (ev) => {
        try {
          const payload = JSON.parse(ev.data) as RunEvent;
          handleRunEvent(payload);
        } catch (err) {
          console.warn("Invalid SSE message", ev.data);
        }
      },
      onError: (err) => {
        console.error("SSE error", err);
        setRunLogs((l) => [
          ...l,
          { t: Date.now(), type: "error", message: "Stream error - attempting reconnection..." },
        ]);
      },
      onOpen: () => {
        setRunLogs((l) => [
          ...l,
          { t: Date.now(), type: "status", message: "Stream connected" },
        ]);
      },
      onReconnect: (attempt) => {
        setRunLogs((l) => [
          ...l,
          { t: Date.now(), type: "status", message: `Reconnecting... (attempt ${attempt})` },
        ]);
      },
      onClose: () => {
        setRunLogs((l) => [
          ...l,
          { t: Date.now(), type: "status", message: "Stream closed" },
        ]);
        setRunStatus((s) => (s === "running" ? "interrupted" : s));
      },
    });

    sseClient.connect();
    esRef.current = sseClient;
  }

  function handleRunEvent(ev: RunEvent) {
    const { type, data } = ev;
    if (type === "log") {
      setRunLogs((logs) => [
        ...logs,
        { t: Date.now(), type: "log", message: data.message || "" },
      ]);
    } else if (type === "proposal" && data.proposal) {
      // HITL Gate: Check if approval is required
      const proposal = data.proposal;
      if (requiresApproval(proposal)) {
        setPendingProposal(proposal);
        setRunStatus("awaiting_approval");
        setRunLogs((logs) => [
          ...logs,
          {
            t: Date.now(),
            type: "status",
            message: "Proposal generated - awaiting human approval",
          },
        ]);
      } else {
        // Auto-approve and continue
        handleApproval(proposal, "Auto-approved by policy");
      }
    } else if (type === "status") {
      setRunStatus(data.status || null);
      setRunLogs((logs) => [
        ...logs,
        { t: Date.now(), type: "status", message: `Status: ${data.status}` },
      ]);
      if (data.status === "completed" && runId) {
        safeFetchResult(runId);
      }
    } else if (type === "result") {
      setRunLogs((logs) => [
        ...logs,
        { t: Date.now(), type: "result", message: JSON.stringify(data) },
      ]);
    }
  }

  async function handleApproval(proposal: Proposal, reason?: string) {
    const decision: HITLDecision = {
      request_id: proposal.request_id || `req_${Date.now()}`,
      agent: proposal.agent,
      human: "user_123", // TODO: Get from auth context
      decision: "approved",
      timestamp: new Date().toISOString(),
      reason,
    };

    setHitlDecisions((d) => [...d, decision]);
    setPendingProposal(null);
    setRunStatus("running");

    // Log decision and approve the run
    try {
      if (!USE_MOCK && runId) {
        // Log HITL decision
        await fetchJson("/api/hitl/decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(decision),
        });

        // Approve the run to continue execution
        await fetchJson(`/api/runs/${runId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved: true }),
        });
      }
    } catch (err) {
      console.warn("Failed to approve run", err);
      setRunLogs((logs) => [
        ...logs,
        { t: Date.now(), type: "error", message: `Failed to approve: ${err instanceof Error ? err.message : String(err)}` },
      ]);
      return;
    }

    // Continue execution (backend should resume)
    setRunLogs((logs) => [
      ...logs,
      { t: Date.now(), type: "status", message: "Approved - continuing execution" },
    ]);
  }

  async function handleRejection(proposal: Proposal, reason?: string) {
    const decision: HITLDecision = {
      request_id: proposal.request_id || `req_${Date.now()}`,
      agent: proposal.agent,
      human: "user_123",
      decision: "rejected",
      timestamp: new Date().toISOString(),
      reason,
    };

    setHitlDecisions((d) => [...d, decision]);
    setPendingProposal(null);
    setRunStatus("rejected");

    try {
      if (!USE_MOCK && runId) {
        // Log HITL decision
        await fetchJson("/api/hitl/decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(decision),
        });

        // Reject the run
        await fetchJson(`/api/runs/${runId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved: false }),
        });
      }
    } catch (err) {
      console.warn("Failed to log HITL decision", err);
    }

    setRunLogs((logs) => [
      ...logs,
      { t: Date.now(), type: "status", message: `Rejected: ${reason || "No reason provided"}` },
    ]);
  }

  function handleEdit() {
    // TODO: Open proposal editor modal
    alert("Edit functionality - open proposal editor to modify steps");
  }

  async function safeFetchResult(runId: string) {
    try {
      const res = await fetchJson(`/api/runs/${runId}`);
      setRunLogs((logs) => [
        ...logs,
        { t: Date.now(), type: "result", message: JSON.stringify(res) },
      ]);
    } catch (err) {
      console.warn("Failed fetching run result", err);
    }
  }

  async function stopRun(runId: string) {
    if (USE_MOCK) {
      setRunLogs((l) => [
        ...l,
        { t: Date.now(), type: "status", message: "Mock stop requested" },
      ]);
      setRunStatus("stopped");
      if (esRef.current) esRef.current.close();
      return;
    }
    try {
      await fetchJson(`/api/runs/${runId}/stop`, { method: "POST" });
      setRunStatus("stopping");
    } catch (err) {
      setRunLogs((l) => [
        ...l,
        { t: Date.now(), type: "error", message: err instanceof Error ? err.message : String(err) },
      ]);
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedId) || null;

  return (
    <div className="p-6 bg-[#0f1113] min-h-screen text-slate-100">
      <div className="max-w-[1600px] mx-auto">
        <header className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Agentic Workflows</h1>
            <p className="text-sm text-slate-300 mt-1">
              Create, run and monitor AI agents with human-in-the-loop approval gates.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                const template: Omit<Agent, 'id'> = {
                  name: "New Agent",
                  description: "Describe the agent",
                  systemPrompt: "You are an agent.",
                  steps: [],
                  tools: [],
                };
                createAgent(template);
              }}
              className="bg-teal-500 hover:bg-teal-600 text-black"
            >
              + New Agent
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Agents list */}
          <aside className="col-span-3 bg-[#0b0c0d] rounded-lg p-4 shadow">
            <h3 className="text-sm text-slate-300 font-semibold mb-3">Agents</h3>
            {loading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => selectAgent(agent.id)}
                    className={`w-full text-left p-2 rounded hover:bg-slate-800 transition-colors ${
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
          <main className="col-span-6 bg-[#071018] rounded-lg p-4 shadow space-y-4">
            {selectedAgent ? (
              <>
                <AgentEditor
                  agent={selectedAgent}
                  onUpdate={() => loadAgents()}
                  onRun={() => startRun(selectedAgent.id)}
                  runId={runId}
                  runStatus={runStatus}
                  onStop={() => runId && stopRun(runId)}
                />

                {/* HITL Approval Panel */}
                {pendingProposal && (
                  <div className="mt-4">
                    <HITLApprovalPanel
                      proposal={pendingProposal}
                      onApprove={(reason) => handleApproval(pendingProposal, reason)}
                      onReject={(reason) => handleRejection(pendingProposal, reason)}
                      onEdit={handleEdit}
                    />
                  </div>
                )}

                {/* Diff Viewer (if available) */}
                {showDiff && pendingProposal && (
                  <div className="mt-4">
                    <DiffViewer
                      before={undefined} // TODO: Get from proposal
                      after={undefined} // TODO: Get from proposal
                      previewUrl={undefined}
                      overlays={["mask", "heatmap"]}
                      drift={0.4}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-400">Select an agent to edit or run it.</div>
            )}
          </main>

          {/* Right column: run logs & controls */}
          <aside className="col-span-3 bg-[#071018] rounded-lg p-4 shadow flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Run Controls</h4>
              <div className="flex gap-2">
                <Button
                  onClick={() => selectedAgent && startRun(selectedAgent.id)}
                  disabled={!selectedAgent || runStatus === "running" || runStatus === "awaiting_approval"}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-black"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Run
                </Button>
                <Button
                  onClick={() => runId && stopRun(runId)}
                  disabled={!runId || runStatus === "completed" || runStatus === "rejected"}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
              <div className="mt-3 text-sm text-slate-400">
                Status:{" "}
                <span className="font-semibold text-white">
                  {runStatus || "idle"}
                </span>
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

            {/* HITL Decisions Audit Log */}
            {hitlDecisions.length > 0 && (
              <div className="bg-[#050607] p-3 rounded">
                <h5 className="text-xs text-slate-300 font-medium mb-2">HITL Decisions</h5>
                <div className="space-y-2 text-xs">
                  {hitlDecisions.map((d, i) => (
                    <div key={i} className="p-2 rounded bg-[#061018]">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            d.decision === "approved"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {d.decision.toUpperCase()}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(d.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {d.reason && (
                        <div className="text-slate-400 mt-1">{d.reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-slate-500">
              Tip: Runs stream events via SSE from{" "}
              <code className="font-mono">/api/runs/:runId/stream</code>. HITL gates pause
              execution for approval.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ---------- AgentEditor component ----------
function AgentEditor({
  agent,
  onUpdate,
  onRun,
  runId,
  runStatus,
  onStop,
}: {
  agent: Agent;
  onUpdate: () => void;
  onRun: () => void;
  runId: string | null;
  runStatus: string | null;
  onStop: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(agent);

  React.useEffect(() => setLocal(agent), [agent]);

  async function save() {
    try {
      if (USE_MOCK) {
        const a = mockAgents.find((m) => m.id === agent.id);
        if (a) Object.assign(a, local);
        setEditing(false);
        onUpdate();
        return;
      }
      await fetchJson(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local),
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      alert("Failed to save agent: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{agent.name}</div>
          <div className="text-sm text-slate-400">{agent.description}</div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setEditing((s) => !s)}
            variant="secondary"
            size="sm"
          >
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button onClick={onRun} size="sm" className="bg-teal-500 hover:bg-teal-600 text-black">
            <Play className="w-4 h-4 mr-2" />
            Run
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="system-prompt" className="text-xs text-slate-400">
              System Prompt
            </Label>
            <Textarea
              id="system-prompt"
              value={local.systemPrompt}
              onChange={(e) =>
                setLocal({ ...local, systemPrompt: e.target.value })
              }
              className="w-full bg-[#061018] p-2 rounded font-mono text-sm mt-1"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="steps" className="text-xs text-slate-400">
              Steps (JSON)
            </Label>
            <Textarea
              id="steps"
              value={JSON.stringify(local.steps, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setLocal({ ...local, steps: parsed });
                } catch (err) {
                  // ignore parse error during typing
                }
              }}
              className="w-full bg-[#061018] p-2 rounded font-mono text-sm mt-1"
              rows={6}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={save} className="bg-teal-500 hover:bg-teal-600 text-black">
              Save
            </Button>
            <Button
              onClick={() => {
                setLocal(agent);
                setEditing(false);
              }}
              variant="secondary"
            >
              Revert
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="text-sm text-slate-300 font-mono whitespace-pre-wrap bg-[#061018] p-3 rounded">
            {agent.systemPrompt}
          </div>

          <div className="mt-3">
            <h6 className="text-xs text-slate-400">Steps</h6>
            <ul className="mt-2 space-y-2 text-sm">
              {agent.steps?.map((s, i) => (
                <li key={i} className="p-2 rounded bg-[#05080a]">
                  {s.type} — {s.prompt || s.tool || JSON.stringify(s)}
                </li>
              ))}
              {!agent.steps?.length && (
                <li className="text-slate-500">No steps defined.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500">
        Run id: <span className="font-mono">{runId || "-"}</span> — status:{" "}
        <strong>{runStatus || "idle"}</strong>
      </div>
    </div>
  );
}
