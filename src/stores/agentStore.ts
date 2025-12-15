/**
 * Zustand store for Agentic Workflow state management
 */
import { create } from "zustand";
import type {
  Workflow,
  Run,
  LogEntry,
  Artifact,
  SSEConnection,
  PlanStep,
  GuidanceImage,
} from "@/types/workflow";

interface AgentStore {
  // Workflows
  workflows: Record<string, Workflow>;
  currentWorkflow: Workflow | null;
  
  // Runs
  runs: Record<string, Run>;
  currentRun: Run | null;
  
  // Logs (indexed by run_id)
  logs: Record<string, LogEntry[]>;
  
  // Artifacts (indexed by run_id)
  artifacts: Record<string, Artifact[]>;
  
  // SSE connections
  sseConnections: Record<string, SSEConnection>;
  
  // Actions
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  upsertWorkflow: (workflow: Workflow) => void;
  updateWorkflowPlan: (workflowId: string, plan: Workflow["plan"]) => void;
  updateStepGuidanceImages: (
    workflowId: string,
    stepId: string,
    images: GuidanceImage[]
  ) => void;
  updateStepParams: (
    workflowId: string,
    stepId: string,
    params: Record<string, unknown>
  ) => void;
  reorderSteps: (workflowId: string, stepIds: string[]) => void;
  
  setCurrentRun: (run: Run | null) => void;
  upsertRun: (run: Run) => void;
  updateRunStatus: (runId: string, status: Run["status"]) => void;
  
  addLog: (runId: string, logEntry: LogEntry) => void;
  clearLogs: (runId: string) => void;
  
  addArtifact: (runId: string, artifact: Artifact) => void;
  clearArtifacts: (runId: string) => void;
  
  setSSEConnection: (runId: string, connection: SSEConnection | null) => void;
  updateSSELastEvent: (runId: string) => void;
  
  receiveSSEEvent: (event: {
    type: string;
    run_id: string;
    step_id?: string;
    percent?: number;
    log_level?: string;
    message: string;
    payload?: Record<string, unknown>;
  }) => void;
  
  reset: () => void;
}

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const initialState = {
  workflows: {},
  currentWorkflow: null,
  runs: {},
  currentRun: null,
  logs: {},
  artifacts: {},
  sseConnections: {},
};

export const useAgentStore = create<AgentStore>((set, get) => ({
  ...initialState,
  
  setCurrentWorkflow: (workflow) => {
    set({ currentWorkflow: workflow });
    if (workflow) {
      get().upsertWorkflow(workflow);
    }
  },
  
  upsertWorkflow: (workflow) => {
    set((state) => ({
      workflows: {
        ...state.workflows,
        [workflow.workflow_id]: workflow,
      },
    }));
  },
  
  updateWorkflowPlan: (workflowId, plan) => {
    set((state) => {
      const workflow = state.workflows[workflowId];
      if (!workflow) return state;
      
      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...workflow,
            plan,
          },
        },
        currentWorkflow: state.currentWorkflow?.workflow_id === workflowId
          ? { ...workflow, plan }
          : state.currentWorkflow,
      };
    });
  },
  
  updateStepGuidanceImages: (workflowId, stepId, images) => {
    set((state) => {
      const workflow = state.workflows[workflowId];
      if (!workflow?.plan) return state;
      
      const updatedSteps = workflow.plan.steps.map((step) =>
        step.id === stepId ? { ...step, guidance_images: images } : step
      );
      
      const updatedPlan = {
        ...workflow.plan,
        steps: updatedSteps,
      };
      
      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...workflow,
            plan: updatedPlan,
          },
        },
        currentWorkflow: state.currentWorkflow?.workflow_id === workflowId
          ? { ...workflow, plan: updatedPlan }
          : state.currentWorkflow,
      };
    });
  },
  
  updateStepParams: (workflowId, stepId, params) => {
    set((state) => {
      const workflow = state.workflows[workflowId];
      if (!workflow?.plan) return state;
      
      const updatedSteps = workflow.plan.steps.map((step) =>
        step.id === stepId ? { ...step, params: { ...step.params, ...params } } : step
      );
      
      const updatedPlan = {
        ...workflow.plan,
        steps: updatedSteps,
      };
      
      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...workflow,
            plan: updatedPlan,
          },
        },
        currentWorkflow: state.currentWorkflow?.workflow_id === workflowId
          ? { ...workflow, plan: updatedPlan }
          : state.currentWorkflow,
      };
    });
  },
  
  reorderSteps: (workflowId, stepIds) => {
    set((state) => {
      const workflow = state.workflows[workflowId];
      if (!workflow?.plan) return state;
      
      const stepMap = new Map(workflow.plan.steps.map((s) => [s.id, s]));
      const reorderedSteps = stepIds
        .map((id) => stepMap.get(id))
        .filter((step): step is PlanStep => step !== undefined);
      
      // Update order property
      const stepsWithOrder = reorderedSteps.map((step, index) => ({
        ...step,
        order: index,
      }));
      
      const updatedPlan = {
        ...workflow.plan,
        steps: stepsWithOrder,
      };
      
      return {
        workflows: {
          ...state.workflows,
          [workflowId]: {
            ...workflow,
            plan: updatedPlan,
          },
        },
        currentWorkflow: state.currentWorkflow?.workflow_id === workflowId
          ? { ...workflow, plan: updatedPlan }
          : state.currentWorkflow,
      };
    });
  },
  
  setCurrentRun: (run) => {
    set({ currentRun: run });
    if (run) {
      get().upsertRun(run);
    }
  },
  
  upsertRun: (run) => {
    set((state) => ({
      runs: {
        ...state.runs,
        [run.run_id]: run,
      },
    }));
  },
  
  updateRunStatus: (runId, status) => {
    set((state) => {
      const run = state.runs[runId];
      if (!run) return state;
      
      const updatedRun = {
        ...run,
        status,
        completed_at: status === "completed" || status === "failed" || status === "cancelled"
          ? new Date().toISOString()
          : run.completed_at,
      };
      
      return {
        runs: {
          ...state.runs,
          [runId]: updatedRun,
        },
        currentRun: state.currentRun?.run_id === runId ? updatedRun : state.currentRun,
      };
    });
  },
  
  addLog: (runId, logEntry) => {
    set((state) => {
      const existingLogs = state.logs[runId] || [];
      return {
        logs: {
          ...state.logs,
          [runId]: [...existingLogs, logEntry],
        },
      };
    });
  },
  
  clearLogs: (runId) => {
    set((state) => {
      const logs = { ...state.logs };
      delete logs[runId];
      return { logs };
    });
  },
  
  addArtifact: (runId, artifact) => {
    set((state) => {
      const existingArtifacts = state.artifacts[runId] || [];
      return {
        artifacts: {
          ...state.artifacts,
          [runId]: [...existingArtifacts, artifact],
        },
      };
    });
  },
  
  clearArtifacts: (runId) => {
    set((state) => {
      const artifacts = { ...state.artifacts };
      delete artifacts[runId];
      return { artifacts };
    });
  },
  
  setSSEConnection: (runId, connection) => {
    set((state) => {
      if (!connection) {
        const connections = { ...state.sseConnections };
        delete connections[runId];
        return { sseConnections: connections };
      }
      
      return {
        sseConnections: {
          ...state.sseConnections,
          [runId]: connection,
        },
      };
    });
  },
  
  updateSSELastEvent: (runId) => {
    set((state) => {
      const connection = state.sseConnections[runId];
      if (!connection) return state;
      
      return {
        sseConnections: {
          ...state.sseConnections,
          [runId]: {
            ...connection,
            lastEventAt: Date.now(),
          },
        },
      };
    });
  },
  
  receiveSSEEvent: (event) => {
    const { run_id, type, message, log_level, percent, step_id, payload } = event;
    
    // Update last event timestamp
    get().updateSSELastEvent(run_id);
    
    // Handle log events
    if (type === "log" || log_level) {
      const logEntry: LogEntry = {
        id: generateId(),
        run_id,
        step_id,
        timestamp: Date.now(),
        level: (log_level as LogLevel) || "info",
        message,
        data: payload,
      };
      get().addLog(run_id, logEntry);
    }
    
    // Handle artifact events
    if (type === "artifacts" && payload?.artifacts) {
      const artifacts = Array.isArray(payload.artifacts) ? payload.artifacts : [payload.artifacts];
      artifacts.forEach((artifact: Artifact) => {
        get().addArtifact(run_id, {
          ...artifact,
          id: artifact.id || generateId(),
          run_id,
          step_id,
        });
      });
    }
    
    // Handle progress events
    if (type === "progress" && percent !== undefined) {
      // Progress is tracked via logs or can be stored separately if needed
    }
    
    // Handle final events
    if (type === "final") {
      const status = payload?.status as Run["status"] || "completed";
      get().updateRunStatus(run_id, status);
    }
  },
  
  reset: () => {
    set(initialState);
  },
}));

