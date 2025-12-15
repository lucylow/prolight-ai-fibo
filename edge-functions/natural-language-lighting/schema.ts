import { z } from "zod";

// Simplified FIBO lighting schema for edge usage.
// You can extend this to the full FIBO JSON spec if needed.

export const FIBOLightSchema = z.object({
  intensity: z.number().min(0).max(10),
  colorTemp: z.number().min(2000).max(12000),
  softness: z.number().min(0).max(1),
  enabled: z.boolean().default(true),
  position: z.tuple([z.number(), z.number(), z.number()]).optional(),
});

export const FIBOLightingSchema = z.object({
  key_light: FIBOLightSchema,
  fill_light: FIBOLightSchema.optional(),
  rim_light: FIBOLightSchema.optional(),
  ambient_light: FIBOLightSchema.optional(),
  camera: z
    .object({
      fov: z.number().min(10).max(120).default(55),
      aperture: z.string().default("f/2.8"),
      iso: z.number().optional(),
      shutterSpeed: z.string().optional(),
    })
    .optional(),
});

export type FIBOLighting = z.infer<typeof FIBOLightingSchema>;

export const NaturalLanguageLightingInputSchema = z.object({
  instruction: z.string().min(1),
  current_lighting: FIBOLightingSchema.optional(),
});

export type NaturalLanguageLightingInput = z.infer<
  typeof NaturalLanguageLightingInputSchema
>;

export const NaturalLanguageLightingOutputSchema = z.object({
  lighting: FIBOLightingSchema,
  confidence: z.number().min(0).max(1),
  changes_made: z.array(z.string()),
  meta: z
    .object({
      model: z.string().optional(),
      latency_ms: z.number().optional(),
    })
    .optional(),
});

export type NaturalLanguageLightingOutput = z.infer<
  typeof NaturalLanguageLightingOutputSchema
>;


