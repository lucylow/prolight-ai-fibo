// frontend/src/utils/moods.ts
import { kelvinToRgb } from "./color/kelvinToRgb";
import { generatePaletteFromRgb } from "./color/palette";

/**
 * Mood presets map to lighting param adjustments and base kelvin.
 * Return an object with:
 *  - baseKelvin
 *  - globalTintShift (hue rotation in degrees, optional)
 *  - recommendedIntensityScale
 */
export const MOODS: Record<
  string,
  { baseKelvin: number; intensityScale: number; name: string }
> = {
  neutral: { baseKelvin: 5600, intensityScale: 1.0, name: "Neutral (studio daylight)" },
  warm_cozy: { baseKelvin: 3200, intensityScale: 0.9, name: "Warm & Cozy" },
  cinematic_cool: { baseKelvin: 4200, intensityScale: 1.1, name: "Cinematic Cool" },
  golden_hour: { baseKelvin: 3000, intensityScale: 0.85, name: "Golden Hour" },
  high_key: { baseKelvin: 6000, intensityScale: 1.3, name: "High Key" },
  low_key: { baseKelvin: 4500, intensityScale: 0.7, name: "Low Key" },
};

// Utility to produce palette for mood
export function paletteForMood(moodKey: string) {
  const m = MOODS[moodKey] ?? MOODS["neutral"];
  const rgb = kelvinToRgb(m.baseKelvin);
  const p = generatePaletteFromRgb(rgb);
  return {
    mood: m.name,
    baseKelvin: m.baseKelvin,
    palette: p,
    intensityScale: m.intensityScale,
  };
}

