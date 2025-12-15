import { z } from "zod";
import { trackEdgeAnalytics } from "../natural-language-lighting/analytics";
import {
  FIBOLightingSchema,
  type FIBOLighting,
} from "../natural-language-lighting/schema";

const PROLIGHT_ENV = process.env.PROLIGHT_ENV ?? "DEV";

export const FIBOPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["wedding", "product", "portrait", "ecommerce"]),
  lighting: FIBOLightingSchema,
  tags: z.array(z.string()).optional(),
});

export type FIBOPreset = z.infer<typeof FIBOPresetSchema>;

const GetPresetsInputSchema = z.object({
  type: z.enum(["wedding", "product", "portrait", "ecommerce"]),
  user_id: z.string().optional(),
  customize: z
    .object({
      more_dramatic: z.boolean().optional(),
    })
    .optional(),
});

const GetPresetsOutputSchema = z.object({
  presets: z.array(FIBOPresetSchema),
  recommended: FIBOLightingSchema,
  usage_stats: z.object({
    popular_by_type: z.record(z.string(), z.number()),
  }),
});

export type GetPresetsInput = z.infer<typeof GetPresetsInputSchema>;
export type GetPresetsOutput = z.infer<typeof GetPresetsOutputSchema>;

const basePresets: FIBOPreset[] = [
  {
    id: "wedding_romantic",
    name: "Wedding Romantic Golden Hour",
    type: "wedding",
    lighting: {
      key_light: {
        intensity: 1.0,
        colorTemp: 3600,
        softness: 0.8,
        enabled: true,
      },
      fill_light: {
        intensity: 0.5,
        colorTemp: 4000,
        softness: 0.9,
        enabled: true,
      },
      rim_light: {
        intensity: 0.7,
        colorTemp: 3800,
        softness: 0.5,
        enabled: true,
      },
      ambient_light: {
        intensity: 0.3,
        colorTemp: 3800,
        softness: 0.9,
        enabled: true,
      },
      camera: {
        fov: 55,
        aperture: "f/2.0",
      },
    },
    tags: ["golden hour", "romantic", "warm"],
  },
  {
    id: "product_studio",
    name: "Product Studio Clean 5600K",
    type: "product",
    lighting: {
      key_light: {
        intensity: 1.2,
        colorTemp: 5600,
        softness: 0.7,
        enabled: true,
      },
      fill_light: {
        intensity: 0.9,
        colorTemp: 5600,
        softness: 0.8,
        enabled: true,
      },
      rim_light: {
        intensity: 0.4,
        colorTemp: 5600,
        softness: 0.4,
        enabled: true,
      },
      ambient_light: {
        intensity: 0.2,
        colorTemp: 5600,
        softness: 0.9,
        enabled: true,
      },
      camera: {
        fov: 50,
        aperture: "f/8.0",
      },
    },
    tags: ["studio", "clean", "catalog"],
  },
  {
    id: "portrait_dramatic",
    name: "Portrait Dramatic High Contrast",
    type: "portrait",
    lighting: {
      key_light: {
        intensity: 1.5,
        colorTemp: 5200,
        softness: 0.4,
        enabled: true,
      },
      fill_light: {
        intensity: 0.3,
        colorTemp: 5400,
        softness: 0.6,
        enabled: true,
      },
      rim_light: {
        intensity: 0.9,
        colorTemp: 5600,
        softness: 0.3,
        enabled: true,
      },
      ambient_light: {
        intensity: 0.15,
        colorTemp: 6000,
        softness: 0.8,
        enabled: true,
      },
      camera: {
        fov: 60,
        aperture: "f/1.8",
      },
    },
    tags: ["dramatic", "portrait", "high-contrast"],
  },
  {
    id: "ecommerce_clean",
    name: "E-commerce Clean Neutral 6500K",
    type: "ecommerce",
    lighting: {
      key_light: {
        intensity: 1.3,
        colorTemp: 6500,
        softness: 0.7,
        enabled: true,
      },
      fill_light: {
        intensity: 1.1,
        colorTemp: 6500,
        softness: 0.7,
        enabled: true,
      },
      rim_light: {
        intensity: 0.3,
        colorTemp: 6500,
        softness: 0.5,
        enabled: true,
      },
      ambient_light: {
        intensity: 0.25,
        colorTemp: 6500,
        softness: 0.9,
        enabled: true,
      },
      camera: {
        fov: 45,
        aperture: "f/5.6",
      },
    },
    tags: ["ecommerce", "clean", "neutral"],
  },
];

function personalizePreset(
  preset: FIBOPreset,
  input: GetPresetsInput,
): FIBOLighting {
  const lighting: FIBOLighting = JSON.parse(JSON.stringify(preset.lighting));

  if (input.customize?.more_dramatic) {
    if (!lighting.rim_light) {
      lighting.rim_light = {
        intensity: 0.8,
        colorTemp: 5400,
        softness: 0.4,
        enabled: true,
      };
    } else {
      lighting.rim_light.intensity = Math.min(
        10,
        lighting.rim_light.intensity + 0.4,
      );
    }
  }

  return lighting;
}

function mockUsageStats(): GetPresetsOutput["usage_stats"] {
  return {
    popular_by_type: {
      wedding: 0.67,
      product: 0.54,
      portrait: 0.58,
      ecommerce: 0.49,
    },
  };
}

export default async function handler(req: Request): Promise<Response> {
  const start = Date.now();
  const functionName = "get-presets" as const;

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
    const parsed = GetPresetsInputSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", issues: parsed.error }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const input = parsed.data;
    const presetsForType = basePresets.filter(
      (p) => p.type === input.type,
    );
    const fallback =
      presetsForType[0] ??
      basePresets.find((p) => p.type === "product") ??
      basePresets[0];

    const recommended = personalizePreset(fallback, input);

    const output = GetPresetsOutputSchema.parse({
      presets: presetsForType,
      recommended,
      usage_stats: mockUsageStats(),
    });

    await trackEdgeAnalytics({
      functionName,
      event: "request.success",
      durationMs: Date.now() - start,
      extra: { type: input.type, user_id: input.user_id },
    });

    return new Response(JSON.stringify(output), {
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


