import { z } from "zod";
import { trackEdgeAnalytics } from "../natural-language-lighting/analytics";
import { FIBOLightingSchema, type FIBOLighting } from "../natural-language-lighting/schema";

const PROLIGHT_ENV = process.env.PROLIGHT_ENV ?? "DEV";

// In a full implementation this would be the complete FIBO scene schema.
// For now we reuse FIBOLighting and allow arbitrary extra fields.
export const FIBOFULLSchema = z
  .object({
    lighting: FIBOLightingSchema,
  })
  .catchall(z.any());

export type FIBOFULL = z.infer<typeof FIBOFULLSchema>;

const GenerateLightingInputSchema = z.object({
  fibo_json: FIBOFULLSchema,
  provider: z.enum(["bria", "fal", "comfyui"]).default("bria"),
  batch_size: z.number().int().min(1).max(200).optional(),
});

const GenerateLightingOutputSchema = z.object({
  images: z.array(z.string()), // URLs or base64
  fibo_used: FIBOFULLSchema,
  deterministic_id: z.string(),
  analytics: z.object({
    render_time_ms: z.number(),
    cost_estimate: z.number(),
    provider: z.string(),
  }),
});

export type GenerateLightingInput = z.infer<
  typeof GenerateLightingInputSchema
>;
export type GenerateLightingOutput = z.infer<
  typeof GenerateLightingOutputSchema
>;

function createDeterministicId(input: GenerateLightingInput): string {
  const hashBase = JSON.stringify(input.fibo_json) + `|${input.provider}`;
  let hash = 0;
  for (let i = 0; i < hashBase.length; i++) {
    hash = (hash * 31 + hashBase.charCodeAt(i)) >>> 0;
  }
  return `fibo-${hash.toString(16)}`;
}

// DEV mock renderer – returns placeholder image URLs with timing hints
function mockRender(input: GenerateLightingInput): GenerateLightingOutput {
  const batch = input.batch_size ?? 1;
  const deterministic_id = createDeterministicId(input);
  const images = Array.from({ length: batch }).map(
    (_, i) =>
      `https://placehold.co/1024x768?text=PROLIGHT+MOCK+${encodeURIComponent(
        deterministic_id,
      )}+${i + 1}`,
  );

  const baseTime = 1200;
  const time = baseTime + Math.min(150, batch * 10);
  const costPerImage =
    input.provider === "bria" ? 0.02 : input.provider === "fal" ? 0.015 : 0.0;

  return GenerateLightingOutputSchema.parse({
    images,
    fibo_used: input.fibo_json,
    deterministic_id,
    analytics: {
      render_time_ms: time,
      cost_estimate: Number((batch * costPerImage).toFixed(4)),
      provider: input.provider,
    },
  });
}

async function callProvider(
  input: GenerateLightingInput,
): Promise<GenerateLightingOutput> {
  if (PROLIGHT_ENV === "DEV") {
    return mockRender(input);
  }

  if (PROLIGHT_ENV === "PRODUCTION") {
    // BRIA enterprise path (stub)
    // TODO: swap to real BRIA FIBO generation endpoint
    return mockRender(input);
  }

  if (PROLIGHT_ENV === "STAGING") {
    // FAL.ai testing path (stub)
    // TODO: swap to real FAL generation endpoint
    return mockRender(input);
  }

  if (PROLIGHT_ENV === "COMFYUI" || PROLIGHT_ENV === "MCP") {
    // Local / batch-optimized routes; still mocked for now
    return mockRender(input);
  }

  return mockRender(input);
}

export default async function handler(req: Request): Promise<Response> {
  const start = Date.now();
  const functionName = "generate-lighting" as const;

  await trackEdgeAnalytics({
    functionName,
    event: "request.start",
  });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const json = await req.json().catch(() => null);
    const parsed = GenerateLightingInputSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", issues: parsed.error }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const result = await callProvider(parsed.data);

    await trackEdgeAnalytics({
      functionName,
      event: "request.success",
      durationMs: Date.now() - start,
      extra: {
        provider: parsed.data.provider,
        batch_size: parsed.data.batch_size ?? 1,
      },
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin":
          process.env.ALLOWED_ORIGIN ?? "*",
      },
    });
  } catch (err: any) {
    await trackEdgeAnalytics({
      functionName,
      event: "request.error",
      durationMs: Date.now() - start,
      errorMessage: err?.message ?? "Unknown error",
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: PROLIGHT_ENV === "DEV" ? String(err) : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}


