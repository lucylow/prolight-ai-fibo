import { z } from "zod";
import {
  FIBOLightingSchema,
  NaturalLanguageLightingInputSchema,
  NaturalLanguageLightingOutputSchema,
  type FIBOLighting,
} from "./schema";
import { trackEdgeAnalytics } from "./analytics";

// Environment:
// PROLIGHT_ENV: "PRODUCTION" | "STAGING" | "COMFYUI" | "MCP" | "DEV"
// OPENAI_API_KEY (or compatible) for GPT-4o-mini style LLM.

const GPT_MODEL = process.env.OPENAI_EDGE_MODEL ?? "gpt-4o-mini";
const PROLIGHT_ENV = process.env.PROLIGHT_ENV ?? "DEV";

// --- Helper: deterministic mock for DEV / missing keys ---

function applyInstructionHeuristics(
  instruction: string,
  base: FIBOLighting,
): { lighting: FIBOLighting; changes: string[]; confidence: number } {
  const lower = instruction.toLowerCase();
  const changes: string[] = [];
  let lighting: FIBOLighting = JSON.parse(JSON.stringify(base));

  function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
  }

  // Dramatic → increase rim intensity
  if (lower.includes("dramatic")) {
    if (!lighting.rim_light) {
      lighting.rim_light = {
        intensity: 0.6,
        colorTemp: 4500,
        softness: 0.2,
        enabled: true,
      };
    } else {
      lighting.rim_light.intensity = clamp(
        lighting.rim_light.intensity + 0.4,
        0,
        10,
      );
    }
    changes.push("Increased rim light intensity for more drama");
  }

  // Golden hour
  if (lower.includes("golden hour") || lower.includes("sunset")) {
    const warmTemp = 3600;
    lighting.key_light.colorTemp = warmTemp;
    if (lighting.fill_light) lighting.fill_light.colorTemp = warmTemp + 300;
    if (!lighting.ambient_light) {
      lighting.ambient_light = {
        intensity: 0.3,
        colorTemp: warmTemp,
        softness: 0.6,
        enabled: true,
      };
    }
    changes.push("Adjusted color temperature for golden hour warmth");
  }

  // Soft
  if (lower.includes("soft")) {
    lighting.key_light.softness = clamp(
      lighting.key_light.softness + 0.2,
      0,
      1,
    );
    if (lighting.fill_light) {
      lighting.fill_light.softness = clamp(
        lighting.fill_light.softness + 0.2,
        0,
        1,
      );
    }
    changes.push("Increased softness for softer shadows");
  }

  // Studio clean
  if (lower.includes("studio") || lower.includes("clean")) {
    const k = 5600;
    lighting.key_light.colorTemp = k;
    if (lighting.fill_light) lighting.fill_light.colorTemp = k;
    if (lighting.ambient_light) lighting.ambient_light.colorTemp = k;
    if (!lighting.fill_light) {
      lighting.fill_light = {
        intensity: lighting.key_light.intensity * 0.5,
        colorTemp: k,
        softness: 0.7,
        enabled: true,
      };
    }
    changes.push("Balanced studio-clean daylight lighting at 5600K");
  }

  // Rim / back glow phrasing
  if (lower.includes("rim") || lower.includes("backlight")) {
    if (!lighting.rim_light) {
      lighting.rim_light = {
        intensity: 0.8,
        colorTemp: 4500,
        softness: 0.3,
        enabled: true,
      };
    }
    changes.push("Emphasized rim/back light for subject separation");
  }

  // Basic confidence heuristic
  const confidence = clamp(changes.length * 0.2 + 0.5, 0, 1);

  return { lighting, changes, confidence };
}

async function callLLMForDiff(opts: {
  instruction: string;
  currentLighting: FIBOLighting;
}): Promise<{ lighting: FIBOLighting; changes: string[]; confidence: number }> {
  // In PRODUCTION/STAGING, call the real model. In DEV, reuse heuristics.
  if (!process.env.OPENAI_API_KEY || PROLIGHT_ENV === "DEV") {
    return applyInstructionHeuristics(opts.instruction, opts.currentLighting);
  }

  const systemPrompt = `
You are a senior studio photographer and lighting TD for a 3D renderer.
You receive:
- A current FIBO lighting JSON (key_light, fill_light, rim_light, ambient_light, camera)
- A natural language instruction like "give me that golden hour glow with dramatic rim"

You must:
- Return a FULL updated lighting JSON (not a diff)
- Only adjust physically meaningful parameters: intensity, colorTemp (K), softness, enabled, and camera params
- Map common phrases to precise changes:
  - "dramatic" → increase rim_light.intensity by about +0.4 (capped at 10), slightly deepen contrast
  - "golden hour" → colorTemp around 3200–4000K, warm key, slightly cooler fill
  - "soft" → increase softness by ~0.2 (max 1.0), reduce harshness
  - "studio clean" → colorTemp around 5600K, even intensities key/fill, neutral color
  - "ecommerce" or "product" → high clarity, even background, 5600–6500K
  - "portrait" "beauty" → soft key, gentle fill, subtle rim
  - "more dramatic rim" → significantly stronger rim_light.intensity and slightly cooler colorTemp

Return ONLY JSON:
{
  "lighting": <full FIBO lighting JSON>,
  "changes_made": [<short bullet phrases>],
  "confidence": <0-1>
}
`;

  const body = {
    model: GPT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          instruction: opts.instruction,
          current_lighting: opts.currentLighting,
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
    throw new Error(`LLM request failed with status ${res.status}`);
  }

  const json = (await res.json()) as any;
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM response missing content");
  }

  const parsed = JSON.parse(content);
  const lighting = FIBOLightingSchema.parse(parsed.lighting);
  const changes = Array.isArray(parsed.changes_made)
    ? parsed.changes_made.map(String)
    : [];
  const confidence =
    typeof parsed.confidence === "number"
      ? parsed.confidence
      : 0.85;

  return { lighting, changes, confidence };
}

// Default/base lighting if none provided
const DEFAULT_LIGHTING: FIBOLighting = {
  key_light: {
    intensity: 1.2,
    colorTemp: 5600,
    softness: 0.5,
    enabled: true,
    position: [2, 3, 4],
  },
  fill_light: {
    intensity: 0.6,
    colorTemp: 5600,
    softness: 0.7,
    enabled: true,
    position: [-2, 2, 3],
  },
  rim_light: {
    intensity: 0.4,
    colorTemp: 5600,
    softness: 0.3,
    enabled: true,
    position: [-3, 3, -2],
  },
  ambient_light: {
    intensity: 0.2,
    colorTemp: 6000,
    softness: 0.8,
    enabled: true,
  },
  camera: {
    fov: 55,
    aperture: "f/2.8",
  },
};

export default async function handler(request: Request): Promise<Response> {
  const start = Date.now();
  const functionName = "natural-language-lighting" as const;

  await trackEdgeAnalytics({
    functionName,
    event: "request.start",
  });

  try {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed, use POST" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const json = await request.json().catch(() => null);
    const parseResult = NaturalLanguageLightingInputSchema.safeParse(json);

    if (!parseResult.success) {
      await trackEdgeAnalytics({
        functionName,
        event: "request.error",
        errorMessage: "ValidationError",
      });
      return new Response(
        JSON.stringify({ error: "Invalid input", issues: parseResult.error }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const input = parseResult.data;
    const baseLighting = input.current_lighting ?? DEFAULT_LIGHTING;

    const { lighting, changes, confidence } = await callLLMForDiff({
      instruction: input.instruction,
      currentLighting: baseLighting,
    });

    const validatedOutput = NaturalLanguageLightingOutputSchema.parse({
      lighting,
      confidence,
      changes_made: changes,
      meta: {
        model: GPT_MODEL,
        latency_ms: Date.now() - start,
      },
    });

    await trackEdgeAnalytics({
      functionName,
      event: "request.success",
      durationMs: Date.now() - start,
      extra: {
        instruction: input.instruction,
        changes_count: validatedOutput.changes_made.length,
      },
    });

    return new Response(JSON.stringify(validatedOutput), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin":
          process.env.ALLOWED_ORIGIN ?? "*",
      },
    });
  } catch (error: any) {
    await trackEdgeAnalytics({
      functionName,
      event: "request.error",
      durationMs: Date.now() - start,
      errorMessage: error?.message ?? "Unknown error",
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: PROLIGHT_ENV === "DEV" ? String(error) : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Minimal OPTIONS handler for CORS preflight (Lovable often auto-wraps but keep explicit)
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


