import {
  type GenerateLightingInput,
  type GenerateLightingOutput,
} from "./index";

// Thin wrapper for batch behavior – in most cases the main handler already
// supports batch_size, but this file lets you expose a dedicated route if
// desired (e.g. /generate-lighting/batch).

export interface BatchGenerateRequest
  extends Omit<GenerateLightingInput, "batch_size"> {
  batch_size: number;
}

export interface BatchGenerateResponse extends GenerateLightingOutput {}

export async function generateBatch(
  payload: BatchGenerateRequest,
): Promise<BatchGenerateResponse> {
  const { default: handler } = await import("./index");
  const res = await handler(
    new Request("http://localhost/generate-lighting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  if (!res.ok) {
    throw new Error(`Batch generation failed with status ${res.status}`);
  }
  return (await res.json()) as BatchGenerateResponse;
}


