/**
 * API service for Agentic Workflow operations
 */
import { api } from "@/lib/api";
import type {
  Workflow,
  Run,
  RunOptions,
  Plan,
  GuidanceImage,
} from "@/types/workflow";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface CreateWorkflowRequest {
  goal: string;
  mode?: "generate" | "refine" | "inspire";
  meta?: {
    priority?: "low" | "normal" | "high";
    tags?: string[];
  };
}

export interface CreateWorkflowResponse {
  workflow_id: string;
  plan: Plan;
}

export interface UpdateWorkflowRequest {
  plan?: Plan;
  goal?: string;
  mode?: "generate" | "refine" | "inspire";
  meta?: {
    priority?: "low" | "normal" | "high";
    tags?: string[];
  };
}

export interface CreateRunRequest {
  run_options?: RunOptions;
  short_lived_sse_token?: string;
}

export interface CreateRunResponse {
  run_id: string;
  status: "queued" | "running" | "completed" | "failed";
  sse_token: string;
}

export interface RunActionRequest {
  action: "pause" | "resume" | "cancel" | "retry";
  step_id?: string;
  reason?: string;
}

export interface PresignUploadRequest {
  filename: string;
  contentType: string;
  purpose: "guidance";
}

export interface PresignUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  method: "PUT";
  fields?: Record<string, string>;
}

/**
 * Create a new workflow from a goal
 */
export async function createWorkflow(
  request: CreateWorkflowRequest
): Promise<CreateWorkflowResponse> {
  const response = await api.post<CreateWorkflowResponse>(
    "/agent/workflows",
    request
  );
  return response.data;
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
  workflowId: string,
  request: UpdateWorkflowRequest
): Promise<Workflow> {
  const response = await api.put<Workflow>(
    `/agent/workflows/${workflowId}`,
    request
  );
  return response.data;
}

/**
 * Get a workflow by ID
 */
export async function getWorkflow(workflowId: string): Promise<Workflow> {
  const response = await api.get<Workflow>(`/agent/workflows/${workflowId}`);
  return response.data;
}

/**
 * List all workflows
 */
export async function listWorkflows(): Promise<Workflow[]> {
  const response = await api.get<Workflow[]>("/agent/workflows");
  return response.data;
}

/**
 * Start a workflow run
 */
export async function startRun(
  workflowId: string,
  request: CreateRunRequest = {}
): Promise<CreateRunResponse> {
  const response = await api.post<CreateRunResponse>(
    `/agent/workflows/${workflowId}/runs`,
    request
  );
  return response.data;
}

/**
 * Get run status
 */
export async function getRunStatus(runId: string): Promise<Run> {
  const response = await api.get<Run>(`/agent/runs/${runId}`);
  return response.data;
}

/**
 * Perform an action on a run (pause, resume, cancel, retry)
 */
export async function runAction(
  runId: string,
  request: RunActionRequest
): Promise<void> {
  await api.post(`/agent/runs/${runId}/actions`, request);
}

/**
 * Attach guidance images to a workflow step
 */
export async function attachGuidanceImages(
  workflowId: string,
  stepId: string,
  images: GuidanceImage[]
): Promise<void> {
  await api.post(`/agent/workflows/${workflowId}/steps/${stepId}/attach_guidance`, {
    images,
  });
}

/**
 * Get presigned URL for file upload
 */
export async function presignUpload(
  request: PresignUploadRequest
): Promise<PresignUploadResponse> {
  const response = await api.post<PresignUploadResponse>(
    "/uploads/presign",
    request
  );
  return response.data;
}

/**
 * Upload file to presigned URL
 */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  fields?: Record<string, string>
): Promise<void> {
  if (fields) {
    // Multipart POST with fields
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("file", file);

    await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });
  } else {
    // Presigned PUT
    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });
  }
}

