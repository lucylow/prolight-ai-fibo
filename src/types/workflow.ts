/**
 * Agentic Workflow Types
 * Types for workflow planning, execution, and monitoring
 */

export type WorkflowMode = "generate" | "refine" | "inspire";
export type WorkflowPriority = "low" | "normal" | "high";
export type RunStatus = "queued" | "running" | "completed" | "failed" | "paused" | "cancelled";
export type LogLevel = "info" | "warn" | "error" | "debug";
export type ToolType = 
  | "text-to-image"
  | "image-edit"
  | "relight"
  | "generate-variants"
  | "video-edit"
  | "upload-to-asset-library";

export interface WorkflowMeta {
  priority?: WorkflowPriority;
  tags?: string[];
  [key: string]: unknown;
}

export interface PlanStep {
  id: string;
  title: string;
  tool: ToolType;
  params: Record<string, unknown>;
  locked_fields?: string[]; // Fields that can't be edited
  guidance_images?: GuidanceImage[];
  order?: number;
}

export interface GuidanceImage {
  url: string;
  key: string;
  filename: string;
  size?: number;
}

export interface Plan {
  steps: PlanStep[];
  plan_version: number;
}

export interface Workflow {
  workflow_id: string;
  goal: string;
  mode?: WorkflowMode;
  meta?: WorkflowMeta;
  plan?: Plan;
  created_at?: string;
  updated_at?: string;
}

export interface Run {
  run_id: string;
  workflow_id: string;
  status: RunStatus;
  sse_token: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  run_options?: RunOptions;
}

export interface RunOptions {
  max_budget_cents?: number;
  max_steps?: number;
  debug?: boolean;
  short_lived_sse_token?: string;
}

export interface SSEEvent {
  type: "progress" | "log" | "step_result" | "artifacts" | "final";
  workflow_id: string;
  run_id: string;
  step_id?: string;
  percent?: number; // 0-100
  log_level?: LogLevel;
  message: string;
  payload?: Record<string, unknown>;
}

export interface LogEntry {
  id: string;
  run_id: string;
  step_id?: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

export interface Artifact {
  id: string;
  run_id: string;
  step_id?: string;
  url: string;
  thumbnail?: string;
  mime: string;
  meta?: ArtifactMeta;
  created_at?: string;
}

export interface ArtifactMeta {
  seed?: number;
  model_version?: string;
  format?: string;
  dimensions?: { width: number; height: number };
  [key: string]: unknown;
}

export interface SSEConnection {
  run_id: string;
  lastEventAt: number;
  status: "connected" | "disconnected" | "reconnecting" | "error";
}

