// frontend/src/utils/fiboMapper.ts
import type { Light } from "@/stores/useLightingStore";

/**
 * Convert single light to fibo-light entry
 */
export function lightToFibo(light: Light) {
  return {
    id: light.id,
    enabled: light.enabled,
    type: "area", // default; you may add UI to choose
    intensity: Number(light.intensity.toFixed(3)),
    color_temperature: Math.round(light.kelvin),
    softness: Number(light.softness.toFixed(3)),
    direction: light.direction.map((v) => Number(v.toFixed(4))),
    distance_m: Number(light.distance.toFixed(2)),
    // include an approximate color preview (optional)
    color_preview: {
      rgb: light.colorRgb ?? null,
    },
  };
}

/**
 * Convert whole scene state to FIBO prompt structure
 */
export function toFiboPrompt(
  sceneTitle: string,
  lights: Light[],
  cameraSettings: Record<string, unknown>,
  mood?: string
) {
  const fiboLights = lights.map(lightToFibo);
  return {
    title: sceneTitle,
    subject: {
      main_entity: "product", // adaptable
      context: "studio",
    },
    camera: cameraSettings,
    lighting: {
      lights: fiboLights,
      mood: mood ?? "neutral",
    },
    render: {
      resolution: [2048, 2048],
      bit_depth: 16,
      aov: ["beauty", "diffuse", "specular", "depth", "mask"],
    },
    meta: {
      source: "prolight-ui",
      deterministic: true,
      version: "pl-1.0",
    },
  };
}
