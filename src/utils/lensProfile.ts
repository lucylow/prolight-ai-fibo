// frontend/src/utils/lensProfile.ts
/**
 * Lens profile format (simple JSON):
 * {
 *   "name": "Canon RF 50mm F1.2",
 *   "manufacturer": "Canon",
 *   "model": "RF50mmF1.2",
 *   "distortion": { "k1": -0.12, "k2": 0.02 },
 *   "mtf": [0.98, 0.96, 0.93, ...], // normalized 0..1 at increasing spatial freq
 *   "notes": "...",
 * }
 */

export type LensProfile = {
  name: string;
  manufacturer?: string;
  model?: string;
  distortion?: { k1?: number; k2?: number };
  mtf?: number[];
  notes?: string;
};

export function mapLensProfileToSim(profile: LensProfile) {
  // Map distortion directly
  const k1 = profile.distortion?.k1 ?? 0;
  const k2 = profile.distortion?.k2 ?? 0;

  // Map MTF to a "mtf_strength" scalar [0..1] that we can use to influence vignette/filmGrain/chromatic mapping.
  // crude heuristic: average MTF across frequency bands, inverse -> stronger "softening" if low MTF.
  const mtf = profile.mtf ?? [];
  let mtf_strength = 0.0;
  if (mtf.length > 0) {
    const avg = mtf.reduce((s, v) => s + v, 0) / mtf.length;
    mtf_strength = Math.min(1, Math.max(0, 1 - avg)); // if avg is 1.0 -> 0; if avg low -> near 1
  }

  // Map to lensSim defaults:
  return {
    distortionK1: k1,
    distortionK2: k2,
    vignetteAmount: Math.min(0.7, 0.12 + mtf_strength * 0.6),
    chromaticAberration: Math.min(0.2, 0.02 + mtf_strength * 0.18),
    filmGrain: Math.min(0.2, mtf_strength * 0.1),
  };
}
