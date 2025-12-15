/**
 * AgenticWorkflow.tsx
 * Single-file React component (Tailwind) that provides a frontend for creating,
 * running, and monitoring AI agents (agentic workflows).
 * - Uses Fetch for REST operations: /api/agents, /api/agents/:id, /api/agents/:id/run
 * - Uses EventSource (SSE) to stream run events from: /api/runs/:runId/stream
 * - Provides UI: Agent list, Agent editor, Runner (start/stop), live logs, results
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import type { Agent, RunLog, AgentState, SSEEvent } from "@/types/agentic";
import { AgentEditor } from "./AgentEditor";
import { agentService } from "@/services/agentService";

// ---------- SSE Stream Manager ----------
interface StreamManager {
  eventSource: EventSource | null;
  reconnectAttempts: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  isManualClose: boolean;
}

const DEFAULT_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;

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

  const streamManagerRef = useRef<StreamManager>({
    eventSource: null,
    reconnectAttempts: 0,
    reconnectDelay: DEFAULT_RECONNECT_DELAY,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    isManualClose: false,
  });

  useEffect(() => {
    loadAgents();
    
    // Cleanup on unmount
    return () => {
      closeStream();
    };
  }, []);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const list = await agentService.listAgents();
      setAgents(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load agents", err);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const closeStream = useCallback(() => {
    const manager = streamManagerRef.current;
    if (manager.eventSource) {
      manager.isManualClose = true;
      manager.eventSource.close();
      manager.eventSource = null;
      manager.reconnectAttempts = 0;
    }
  }, []);

  const selectAgent = useCallback((id: string) => {
    setSelectedId(id);
    // Clear run logs when switching
    setRunLogs([]);
    setRunId(null);
    setRunStatus(null);
    closeStream();
  }, [closeStream]);

  const createAgent = useCallback(async (agent: Omit<Agent, "id">) => {
    try {
      const created = await agentService.createAgent({
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        steps: agent.steps,
        tools: agent.tools,
      });
      await loadAgents();
      setSelectedId(created.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to create agent:", errorMessage);
      alert(`Failed to create agent: ${errorMessage}`);
    }
  }, [loadAgents]);

  const startRun = useCallback(async (agentId: string) => {
    setRunLogs([]);
    setRunStatus("EXECUTING");
    
    try {
      const payload = await agentService.startRun({ agentId });
      const id = payload.runId;
      setRunId(id);
      setRunStatus(payload.status || "EXECUTING");
      // Open SSE stream
      openRunStream(id);
    } catch (err) {
      console.error("Failed to start run:", err);
      setRunStatus("FAILED");
      const errorMessage = err instanceof Error ? err.message : String(err);
      setRunLogs((l) => [
        ...l,
        {
          t: Date.now(),
          type: "error",
          message: errorMessage,
        },
      ]);
    }
  }, []);

  const openRunStream = useCallback((runId: string) => {
    const manager = streamManagerRef.current;
    
    // Close existing stream if any
    if (manager.eventSource) {
      manager.eventSource.close();
    }

    manager.isManualClose = false;
    manager.reconnectAttempts = 0;

    const attemptReconnect = () => {
      if (manager.isManualClose || manager.reconnectAttempts >= manager.maxReconnectAttempts) {
        if (manager.reconnectAttempts >= manager.maxReconnectAttempts) {
          setRunLogs((l) => [
            ...l,
            {
              t: Date.now(),
              type: "error",
              message: "Max reconnection attempts reached",
            },
          ]);
          setRunStatus("FAILED");
        }
        return;
      }

      manager.reconnectAttempts++;
      const delay = manager.reconnectDelay * Math.pow(2, manager.reconnectAttempts - 1);

      setRunLogs((l) => [
        ...l,
        {
          t: Date.now(),
          type: "log",
          message: `Reconnecting... (attempt ${manager.reconnectAttempts}/${manager.maxReconnectAttempts})`,
        },
      ]);

      setTimeout(() => {
        if (!manager.isManualClose) {
          openRunStream(runId);
        }
      }, delay);
    };

    try {
      const sseUrl = agentService.getStreamUrl(runId);
      const es = new EventSource(sseUrl, { withCredentials: true });
      manager.eventSource = es;
      esRef.current = es;

      es.onopen = () => {
        manager.reconnectAttempts = 0; // Reset on successful connection
        setRunLogs((l) => [
          ...l,
          {
            t: Date.now(),
            type: "status",
            message: "Stream connected",
          },
        ]);
      };

      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data) as SSEEvent;
          handleRunEvent(payload);
        } catch (err) {
          console.warn("Invalid SSE message", ev.data, err);
          setRunLogs((l) => [
            ...l,
            {
              t: Date.now(),
              type: "error",
              message: "Failed to parse stream event",
            },
          ]);
        }
      };

      es.onerror = (err) => {
        console.error("SSE error", err);
        
        if (es.readyState === EventSource.CLOSED) {
          // Connection closed
          if (!manager.isManualClose) {
            attemptReconnect();
          }
        } else if (es.readyState === EventSource.CONNECTING) {
          // Connection lost, will attempt reconnect
          setRunLogs((l) => [
            ...l,
            {
              t: Date.now(),
              type: "log",
              message: "Connection lost, attempting to reconnect...",
            },
          ]);
        }
      };
    } catch (err) {
      console.error("Failed to open stream", err);
      attemptReconnect();
    }
  }, []);

  const handleRunEvent = useCallback((ev: SSEEvent) => {
    const { type, state, message, data } = ev;
    
    switch (type) {
      case "LOG":
        setRunLogs((logs) => [
          ...logs,
          {
            t: Date.now(),
            type: "log",
            message: message || "",
          },
        ]);
        break;
        
      case "STATE_CHANGE":
        if (state) {
          setRunStatus(state);
          setRunLogs((logs) => [
            ...logs,
            {
              t: Date.now(),
              type: "status",
              message: `State changed to: ${state}`,
            },
          ]);
          
          if (state === "COMPLETED" || state === "FAILED") {
            // Fetch final result on completion
            if (runId) {
              safeFetchResult(runId);
            }
            // Close stream on terminal states
            closeStream();
          }
        }
        break;
        
      case "PROGRESS":
        setRunLogs((logs) => [
          ...logs,
          {
            t: Date.now(),
            type: "log",
            message: message || `Progress: ${ev.pct || 0}%`,
          },
        ]);
        break;
        
      case "PROPOSAL":
        setRunLogs((logs) => [
          ...logs,
          {
            t: Date.now(),
            type: "proposal",
            message: JSON.stringify(ev.proposal || {}),
          },
        ]);
        break;
        
      case "ERROR":
        setRunLogs((logs) => [
          ...logs,
          {
            t: Date.now(),
            type: "error",
            message: message || ev.reason || "An error occurred",
          },
        ]);
        setRunStatus("FAILED");
        closeStream();
        break;
        
      default:
        console.warn("Unknown event type:", type);
    }
  }, [runId, closeStream]);

  const safeFetchResult = useCallback(async (runId: string) => {
    try {
      const res = await agentService.getRunStatus(runId);
      setRunLogs((logs) => [
        ...logs,
        {
          t: Date.now(),
          type: "result",
          message: JSON.stringify(res.result || res),
        },
      ]);
    } catch (err) {
      console.warn("Failed fetching run result", err);
      setRunLogs((logs) => [
        ...logs,
        {
          t: Date.now(),
          type: "error",
          message: "Failed to fetch final result",
        },
      ]);
    }
  }, []);

  const stopRun = useCallback(async (runId: string) => {
    try {
      closeStream();
      await agentService.stopRun(runId);
      setRunStatus("STOPPED");
      setRunLogs((l) => [
        ...l,
        {
          t: Date.now(),
          type: "status",
          message: "Run stopped by user",
        },
      ]);
    } catch (err) {
      console.error("Failed to stop run", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setRunLogs((l) => [
        ...l,
        {
          t: Date.now(),
          type: "error",
          message: `Failed to stop run: ${errorMessage}`,
        },
      ]);
    }
  }, [closeStream]);

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
                  disabled={!runId || runStatus === "STOPPED" || runStatus === "COMPLETED" || runStatus === "FAILED"}
                  className="px-3 py-2 bg-amber-400 text-black rounded disabled:opacity-50 disabled:cursor-not-allowed"
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


