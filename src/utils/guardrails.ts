/**
 * Guardrails Implementation for ProLight AI
 * Enforces safety and control constraints
 */

import type {
  GuardrailError,
  GuardrailErrorCode,
  AllowedOperations,
  InputValidationResult,
  ExecutionLimits,
  Proposal,
  ProposalStep,
} from "@/types/guardrails";
import type { Proposal as HITLProposal } from "@/types/hitl";

const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "exr", "mp4", "mov"];
const MAX_FILE_SIZE_MB = 50;

export const ALLOWED_OPS: AllowedOperations = {
  image: ["remove_background", "expand", "gen_fill", "recolor", "enhance", "relight"],
  video: ["upscale", "background_remove"],
};

export const HITL_REQUIRED_FOR = [
  "gen_fill",
  "expand",
  "video",
  "8k",
  "exr",
];

/**
 * Input Guardrails - Validate what enters the system
 */
export function validateInput(input: {
  format?: string;
  sizeMB?: number;
  moderation?: { flagged?: boolean };
}): InputValidationResult {
  const errors: GuardrailError[] = [];

  if (input.format && !ALLOWED_FORMATS.includes(input.format.toLowerCase())) {
    errors.push(
      new GuardrailError("UNSUPPORTED_FORMAT", `Format ${input.format} is not supported`)
    );
  }

  if (input.sizeMB && input.sizeMB > MAX_FILE_SIZE_MB) {
    errors.push(
      new GuardrailError("FILE_TOO_LARGE", `File size ${input.sizeMB}MB exceeds limit of ${MAX_FILE_SIZE_MB}MB`)
    );
  }

  if (input.moderation?.flagged) {
    return {
      valid: false,
      state: "BLOCKED",
      reason: "MODERATION",
      errors: [
        new GuardrailError("MODERATION_BLOCKED", "Content flagged by moderation"),
      ],
    };
  }

  if (errors.length > 0) {
    return {
      valid: false,
      state: "BLOCKED",
      errors,
    };
  }

  return { valid: true, state: "ALLOWED" };
}

/**
 * Planning Guardrails - Validate agent proposals
 */
export function validateProposal(
  proposal: HITLProposal | Proposal,
  mediaType: "image" | "video" = "image"
): { valid: boolean; errors: GuardrailError[] } {
  const errors: GuardrailError[] = [];
  const allowedOps = ALLOWED_OPS[mediaType];

  for (const step of proposal.steps) {
    if (!allowedOps.includes(step.op)) {
      errors.push(
        new GuardrailError(
          "OP_NOT_ALLOWED",
          `Operation ${step.op} is not allowed for ${mediaType}`
        )
      );
    }

    if (step.op === "expand" && step.pixels && step.pixels > 2048) {
      errors.push(
        new GuardrailError(
          "EXPAND_TOO_LARGE",
          `Expand operation exceeds maximum of 2048 pixels (requested: ${step.pixels})`
        )
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Execution Guardrails - Runtime safety checks
 */
export function enforceExecutionLimits(
  ctx: {
    estimatedCostUsd?: number;
    determinism?: { locked?: boolean };
    user?: { maxCostPerJob?: number };
  }
): void {
  if (
    ctx.estimatedCostUsd &&
    ctx.user?.maxCostPerJob &&
    ctx.estimatedCostUsd > ctx.user.maxCostPerJob
  ) {
    throw new GuardrailError(
      "COST_LIMIT_EXCEEDED",
      `Estimated cost $${ctx.estimatedCostUsd} exceeds limit of $${ctx.user.maxCostPerJob}`
    );
  }

  if (ctx.determinism && !ctx.determinism.locked) {
    throw new GuardrailError(
      "NON_DETERMINISTIC_RUN",
      "Determinism must be locked before execution"
    );
  }
}

/**
 * Output Guardrails - Validate generated content
 */
export function validateOutput(asset: {
  format?: string;
  alpha?: boolean;
  moderation?: { flagged?: boolean };
}): { valid: boolean; state?: "QUARANTINED"; errors: GuardrailError[] } {
  const errors: GuardrailError[] = [];

  if (asset.format === "EXR" && !asset.alpha) {
    errors.push(
      new GuardrailError("EXR_ALPHA_MISSING", "EXR format requires alpha channel")
    );
  }

  if (asset.moderation?.flagged) {
    return {
      valid: false,
      state: "QUARANTINED",
      errors: [
        new GuardrailError("QUARANTINED", "Generated content flagged by moderation"),
      ],
    };
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if HITL approval is required
 */
export function requiresHITL(proposal: HITLProposal | Proposal): boolean {
  return proposal.steps.some((step) => HITL_REQUIRED_FOR.includes(step.op));
}

/**
 * Lock determinism context
 */
export function lockDeterminism(ctx: {
  seed?: number;
  prompt?: string;
  modelVersion?: string;
}): {
  seed: number;
  prompt_hash: string;
  model_version: string;
  locked: boolean;
} {
  const seed = ctx.seed || Math.floor(Math.random() * 1000000000);
  const prompt_hash = ctx.prompt
    ? `0x${Buffer.from(ctx.prompt).toString("hex").slice(0, 16)}`
    : `0x${Math.random().toString(16).slice(2, 18)}`;

  return {
    seed,
    prompt_hash,
    model_version: ctx.modelVersion || "bria-edit-2025.1",
    locked: true,
  };
}
