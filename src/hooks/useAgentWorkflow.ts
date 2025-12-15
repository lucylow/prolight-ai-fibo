/**
 * Custom hook for managing agent workflow operations
 * Provides state management and functions for agent CRUD and run management
 */

import { useState, useCallback, useEffect } from "react";
import type { Agent, AgentState, RunLog, RunContext } from "@/types/agentic";
import { agentService } from "@/services/agentService";
import { useToast } from "@/hooks/use-toast";

interface UseAgentWorkflowReturn {
  // State
  agents: Agent[];
  selectedAgent: Agent | null;
  loading: boolean;
  error: string | null;
  
  // Run state
  runId: string | null;
  runStatus: AgentState | null;
  runLogs: RunLog[];
  
  // Actions
  loadAgents: () => Promise<void>;
  selectAgent: (id: string) => void;
  createAgent: (agent: Omit<Agent, "id">) => Promise<void>;
  updateAgent: (agent: Agent) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  startRun: (agentId: string, input?: Record<string, unknown>) => Promise<void>;
  stopRun: (runId: string) => Promise<void>;
  clearRun: () => void;
}

export function useAgentWorkflow(): UseAgentWorkflowReturn {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<AgentState | null>(null);
  const [runLogs, setRunLogs] = useState<RunLog[]>([]);
  
  const { toast } = useToast();

  const selectedAgent = agents.find((a) => a.id === selectedId) || null;

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await agentService.listAgents();
      setAgents(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load agents";
      setError(errorMessage);
      console.error("Failed to load agents", err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedId, toast]);

  const selectAgent = useCallback((id: string) => {
    setSelectedId(id);
    clearRun();
  }, []);

  const createAgent = useCallback(async (agent: Omit<Agent, "id">) => {
    setError(null);
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
      toast({
        title: "Success",
        description: "Agent created successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create agent";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [loadAgents, toast]);

  const updateAgent = useCallback(async (agent: Agent) => {
    setError(null);
    try {
      await agentService.updateAgent({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        steps: agent.steps,
        tools: agent.tools,
      });
      await loadAgents();
      toast({
        title: "Success",
        description: "Agent updated successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update agent";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [loadAgents, toast]);

  const deleteAgent = useCallback(async (id: string) => {
    setError(null);
    try {
      await agentService.deleteAgent(id);
      await loadAgents();
      if (selectedId === id) {
        setSelectedId(null);
      }
      toast({
        title: "Success",
        description: "Agent deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete agent";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [loadAgents, selectedId, toast]);

  const startRun = useCallback(async (agentId: string, input?: Record<string, unknown>) => {
    setRunLogs([]);
    setRunStatus("EXECUTING");
    setError(null);
    
    try {
      const payload = await agentService.startRun({ agentId, input });
      setRunId(payload.runId);
      setRunStatus(payload.status || "EXECUTING");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start run";
      setError(errorMessage);
      setRunStatus("FAILED");
      setRunLogs((l) => [
        ...l,
        {
          t: Date.now(),
          type: "error",
          message: errorMessage,
        },
      ]);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRun = useCallback(async (runId: string) => {
    setError(null);
    try {
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
      toast({
        title: "Success",
        description: "Run stopped successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to stop run";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const clearRun = useCallback(() => {
    setRunLogs([]);
    setRunId(null);
    setRunStatus(null);
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  return {
    agents,
    selectedAgent,
    loading,
    error,
    runId,
    runStatus,
    runLogs,
    loadAgents,
    selectAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    startRun,
    stopRun,
    clearRun,
  };
}

