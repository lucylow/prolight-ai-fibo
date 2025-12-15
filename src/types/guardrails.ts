/**
 * Guardrails Types for ProLight AI
 * Safety and control constraints for agentic workflows
 */

export type GuardrailType =
  | "INPUT_VALIDATION"
  | "PLANNING_CONSTRAINT"
  | "EXECUTION_LIMIT"
  | "OUTPUT_VALIDATION"
  | "OPERATIONAL_LIMIT";

export type GuardrailErrorCode =
  | "UNSUPPORTED_FORMAT"
  | "FILE_TOO_LARGE"
  | "MODERATION_BLOCKED"
  | "OP_NOT_ALLOWED"
  | "EXPAND_TOO_LARGE"
  | "COST_LIMIT_EXCEEDED"
  | "NON_DETERMINISTIC_RUN"
  | "EXR_ALPHA_MISSING"
  | "QUARANTINED"
  | "RATE_LIMIT_EXCEEDED"
  | "CONCURRENCY_LIMIT"
  | "GPU_QUOTA_EXCEEDED";

export class GuardrailError extends Error {
  constructor(
    public code: GuardrailErrorCode,
    message?: string,
    public metadata?: Record<string, unknown>
  ) {
    super(message || `Guardrail violation: ${code}`);
    this.name = "GuardrailError";
  }
}

export interface GuardrailEvent {
  event: "GUARDRAIL_TRIGGERED";
  type: GuardrailType;
  code: GuardrailErrorCode;
  request_id: string;
  agent?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AllowedOperations {
  image: string[];
  video: string[];
}

export interface InputValidationResult {
  valid: boolean;
  state?: "BLOCKED" | "ALLOWED";
  reason?: string;
  errors?: GuardrailError[];
}

export interface ExecutionLimits {
  maxCostPerJob: number;
  maxSteps: number;
  maxGpuTimeSeconds: number;
  requireDeterminism: boolean;
}

export interface OperationalLimits {
  rateLimitPerMinute: number;
  maxConcurrency: number;
  gpuQuotaPerTenant: number;
}

