import type { FIBOPreset, GetPresetsInput } from "./index";
import type { FIBOLighting } from "../natural-language-lighting/schema";

// Standalone helper for user-personalization strategies.

export function personalizeLightingFromHistory(
  base: FIBOPreset,
  input: GetPresetsInput,
  history?: { more_dramatic_ratio?: number },
): FIBOLighting {
  const cloned: FIBOLighting = JSON.parse(JSON.stringify(base.lighting));

  const wantsDrama =
    input.customize?.more_dramatic || (history?.more_dramatic_ratio ?? 0) > 0.5;

  if (wantsDrama) {
    if (!cloned.rim_light) {
      cloned.rim_light = {
        intensity: 0.8,
        colorTemp: 5400,
        softness: 0.4,
        enabled: true,
      };
    } else {
      cloned.rim_light.intensity = Math.min(
        10,
        cloned.rim_light.intensity + 0.4,
      );
    }
  }

  return cloned;
}


