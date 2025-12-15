/**
 * AgentEditor component for editing agent configuration
 */

import React, { useEffect, useState } from "react";
import type { Agent, AgentState } from "@/types/agentic";
import { agentService } from "@/services/agentService";

interface AgentEditorProps {
  agent: Agent;
  onUpdate: () => void;
  onRun: () => void;
  runId: string | null;
  runStatus: AgentState | null;
  onStop: () => void;
}

export function AgentEditor({
  agent,
  onUpdate,
  onRun,
  runId,
  runStatus,
  onStop,
}: AgentEditorProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(agent);

  useEffect(() => setLocal(agent), [agent]);

  async function save() {
    try {
      await agentService.updateAgent({
        id: agent.id,
        name: local.name,
        description: local.description,
        systemPrompt: local.systemPrompt,
        steps: local.steps,
        tools: local.tools,
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to save agent:", errorMessage);
      alert(`Failed to save agent: ${errorMessage}`);
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
          <button
            onClick={() => setEditing((s) => !s)}
            className="px-3 py-1 bg-slate-800 rounded"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button onClick={onRun} className="px-3 py-1 bg-teal-500 rounded">
            Run
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-slate-400">System Prompt</label>
          <textarea
            value={local.systemPrompt}
            onChange={(e) =>
              setLocal({ ...local, systemPrompt: e.target.value })
            }
            className="w-full bg-[#061018] p-2 rounded font-mono text-sm"
            rows={4}
          />

          <label className="block text-xs text-slate-400">Steps (JSON)</label>
          <textarea
            value={JSON.stringify(local.steps, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setLocal({ ...local, steps: parsed });
              } catch (err) {
                // ignore parse error during typing
              }
            }}
            className="w-full bg-[#061018] p-2 rounded font-mono text-sm"
            rows={6}
          />

          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-2 bg-teal-500 rounded">
              Save
            </button>
            <button
              onClick={() => {
                setLocal(agent);
                setEditing(false);
              }}
              className="px-3 py-2 bg-slate-700 rounded"
            >
              Revert
            </button>
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


