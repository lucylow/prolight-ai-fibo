import { z } from "zod";
import { trackEdgeAnalytics } from "../natural-language-lighting/analytics";
import { FIBOLightingSchema, type FIBOLighting } from "../natural-language-lighting/schema";

const PROLIGHT_ENV = process.env.PROLIGHT_ENV ?? "DEV";

const AnalyzeLightingInputSchema = z.object({
  image_b64: z.string().optional(),
  image_url: z.string().url().optional(),
});

const AnalyzeLightingOutputSchema = z.object({
  lighting: FIBOLightingSchema,
  confidence: z.record(z.string(), z.number().min(0).max(1)),
  estimated_params: z.object({
    fov: z.number(),
    aperture: z.string(),
  }),
});

export type AnalyzeLightingInput = z.infer<typeof AnalyzeLightingInputSchema>;
export type AnalyzeLightingOutput = z.infer<typeof AnalyzeLightingOutputSchema>;

// DEV mock: deterministic pseudo-analysis
function mockAnalyzeLighting(): AnalyzeLightingOutput {
  const lighting: FIBOLighting = {
    key_light: {
      intensity: 1.1,
      colorTemp: 5200,
      softness: 0.6,
      enabled: true,
      position: [2, 3, 4],
    },
    fill_light: {
      intensity: 0.7,
      colorTemp: 5400,
      softness: 0.7,
      enabled: true,
      position: [-2, 2, 3],
    },
    rim_light: {
      intensity: 0.5,
      colorTemp: 5600,
      softness: 0.3,
      enabled: true,
      position: [-3, 3, -2],
    },
    ambient_light: {
      intensity: 0.25,
      colorTemp: 6000,
      softness: 0.8,
      enabled: true,
    },
    camera: {
      fov: 55,
      aperture: "f/2.8",
    },
  };

  return {
    lighting,
    confidence: {
      key_light: 0.92,
      fill_light: 0.87,
      rim_light: 0.81,
      ambient_light: 0.78,
    },
    estimated_params: {
      fov: 55,
      aperture: "f/2.8",
    },
  };
}

async function analyzeWithModel(
  input: AnalyzeLightingInput,
): Promise<AnalyzeLightingOutput> {
  if (PROLIGHT_ENV === "DEV" || !process.env.OPENAI_API_KEY) {
    return mockAnalyzeLighting();
  }

  const body = {
    model: process.env.OPENAI_EDGE_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a visual lighting analysis expert. Given an image, you estimate studio lighting setup and camera parameters and output FIBO lighting JSON.",
      },
      {
        role: "user",
        content: JSON.stringify({
          image_b64: input.image_b64,
          image_url: input.image_url,
        }),
      },
    ],
    response_format: { type: "json_object" },
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Lighting analysis failed with status ${res.status}`);
  }

  const json = (await res.json()) as any;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Analysis model returned empty content");

  const parsed = JSON.parse(content);
  return AnalyzeLightingOutputSchema.parse(parsed);
}

export default async function handler(req: Request): Promise<Response> {
  const start = Date.now();
  const functionName = "analyze-lighting" as const;

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
    const parsed = AnalyzeLightingInputSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", issues: parsed.error }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const result = await analyzeWithModel(parsed.data);

    await trackEdgeAnalytics({
      functionName,
      event: "request.success",
      durationMs: Date.now() - start,
      extra: { has_image_b64: !!parsed.data.image_b64 },
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


