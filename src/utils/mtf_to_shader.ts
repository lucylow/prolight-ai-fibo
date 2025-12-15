// utils/mtf_to_shader.ts
export function mtfArrayToStrength(mtf: number[]) {
  if (!mtf || mtf.length === 0) return 0;
  const avg = mtf.reduce((s, v) => s + v, 0) / mtf.length;
  // Map avg [0.5-1.0] -> strength [1.0..0.0]
  return Math.max(0, Math.min(1, (1 - avg) * 1.5));
}

/**
 * Convert profile -> shader params
 */
export function profileToShaderParams(profile: {
  distortion?: { k1?: number; k2?: number };
  mtf?: number[];
}) {
  const k1 = profile.distortion?.k1 ?? 0;
  const k2 = profile.distortion?.k2 ?? 0;
  const mtf_strength = mtfArrayToStrength(profile.mtf);
  // Use mtf_strength to tweak vignette/chromatic intensities
  return {
    k1,
    k2,
    vignetteAmount: Math.min(0.7, 0.08 + mtf_strength * 0.5),
    chromatic: Math.min(0.25, 0.01 + mtf_strength * 0.22),
    filmGrain: Math.min(0.2, mtf_strength * 0.1),
  };
}

