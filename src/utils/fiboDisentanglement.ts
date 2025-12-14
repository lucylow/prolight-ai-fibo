/**
 * FIBO Disentanglement Utilities
 * 
 * Ensures proper use of FIBO's key architectural strength: disentangled control
 * FIBO allows modifying single parameters (like lighting) without affecting:
 * - Subject appearance
 * - Composition
 * - Environment
 * - Camera settings
 * 
 * This is achieved through FIBO's JSON-native architecture and DimFusion conditioning
 */

import type { FIBOPrompt, FIBOLighting, FIBOLight } from '../types/fibo';

interface LightSettings {
  direction: string;
  intensity: number;
  colorTemperature: number;
  softness: number;
  distance: number;
  enabled: boolean;
}

/**
 * Create a disentangled lighting update
 * Only modifies lighting parameters, preserving all other aspects
 */
export function createDisentangledLightingUpdate(
  basePrompt: FIBOPrompt,
  newLightingSetup: Record<string, LightSettings>
): FIBOPrompt {
  // Build new lighting structure
  const newLighting = buildLightingFromSetup(newLightingSetup);
  
  // Return new prompt with ONLY lighting changed
  // This leverages FIBO's disentanglement: subject, environment, camera unchanged
  return {
    ...basePrompt,
    lighting: newLighting,
    // Update color palette based on new lighting (lighting-dependent)
    color_palette: updateColorPaletteForLighting(basePrompt.color_palette, newLightingSetup),
    // Everything else remains identical
    subject: basePrompt.subject,
    environment: basePrompt.environment,
    camera: basePrompt.camera,
    composition: basePrompt.composition,
    render: basePrompt.render,
    // Enhancements may need slight adjustment for lighting-dependent features
    enhancements: updateEnhancementsForLighting(
      basePrompt.enhancements,
      newLightingSetup
    )
  };
}

/**
 * Build FIBO lighting structure from setup
 */
function buildLightingFromSetup(
  setup: Record<string, LightSettings>
): FIBOLighting {
  const lighting: FIBOLighting = {
    main_light: buildFIBOLight(setup.key, "main")
  };

  if (setup.fill?.enabled) {
    lighting.fill_light = buildFIBOLight(setup.fill, "fill");
  }

  if (setup.rim?.enabled) {
    lighting.rim_light = buildFIBOLight(setup.rim, "rim");
  }

  if (setup.ambient?.enabled) {
    lighting.ambient_light = {
      intensity: setup.ambient.intensity,
      colorTemperature: setup.ambient.colorTemperature
    };
  }

  return lighting;
}

/**
 * Build FIBO light from settings
 */
function buildFIBOLight(
  light: LightSettings | undefined,
  type: "main" | "fill" | "rim"
): FIBOLight {
  if (!light || !light.enabled) {
    return {
      direction: "front",
      intensity: 0,
      colorTemperature: 5600,
      softness: 0.5,
      distance: 1.5,
      enabled: false
    };
  }

  return {
    type: "area",
    direction: convertDirection(light.direction),
    intensity: Math.max(0, Math.min(2.0, light.intensity)),
    colorTemperature: Math.max(1000, Math.min(10000, light.colorTemperature)),
    softness: Math.max(0, Math.min(1.0, light.softness)),
    distance: Math.max(0.5, Math.min(10.0, light.distance)),
    enabled: true,
    falloff: "inverse_square"
  };
}

/**
 * Convert direction string to FIBO format
 */
function convertDirection(direction: string): string {
  const dir = direction.toLowerCase();
  
  if (dir.includes("45 degrees") && dir.includes("right")) return "front-right";
  if (dir.includes("45 degrees") && dir.includes("left")) return "front-left";
  if (dir.includes("90 degrees") || dir.includes("side")) {
    if (dir.includes("right")) return "right";
    if (dir.includes("left")) return "left";
    return "right";
  }
  if (dir.includes("behind") || dir.includes("back")) {
    if (dir.includes("right")) return "back-right";
    if (dir.includes("left")) return "back-left";
    return "back";
  }
  if (dir.includes("above") || dir.includes("butterfly")) return "top";
  if (dir.includes("below")) return "bottom";
  if (dir.includes("front") || dir.includes("frontal")) return "front";
  
  return "front-right";
}

/**
 * Update color palette based on new lighting (lighting-dependent)
 */
function updateColorPaletteForLighting(
  currentPalette: FIBOPrompt['color_palette'],
  newLighting: Record<string, LightSettings>
): FIBOPrompt['color_palette'] {
  if (!currentPalette) {
    return buildDefaultColorPalette(newLighting);
  }

  // Calculate average color temperature
  const temps: number[] = [];
  if (newLighting.key?.enabled) temps.push(newLighting.key.colorTemperature);
  if (newLighting.fill?.enabled) temps.push(newLighting.fill.colorTemperature);
  if (newLighting.rim?.enabled) temps.push(newLighting.rim.colorTemperature);
  
  const avgTemp = temps.length > 0 
    ? temps.reduce((a, b) => a + b, 0) / temps.length 
    : 5600;

  return {
    ...currentPalette,
    white_balance: `${Math.round(avgTemp)}K`,
    mood: avgTemp < 4000 ? "warm" : avgTemp > 6500 ? "cool" : "neutral"
  };
}

/**
 * Build default color palette
 */
function buildDefaultColorPalette(
  lighting: Record<string, LightSettings>
): FIBOPrompt['color_palette'] {
  const keyTemp = lighting.key?.colorTemperature || 5600;
  
  return {
    white_balance: `${keyTemp}K`,
    mood: keyTemp < 4000 ? "warm" : keyTemp > 6500 ? "cool" : "neutral",
    saturation: 1.0,
    contrast: 1.0
  };
}

/**
 * Update enhancements based on lighting (only lighting-dependent features)
 */
function updateEnhancementsForLighting(
  currentEnhancements: FIBOPrompt['enhancements'],
  newLighting: Record<string, LightSettings>
): FIBOPrompt['enhancements'] {
  if (!currentEnhancements) {
    return {
      professional_grade: true,
      color_fidelity: true,
      detail_enhancement: true,
      noise_reduction: true
    };
  }

  // Only update contrast if it's lighting-dependent
  const key = newLighting.key;
  const fill = newLighting.fill;
  const ratio = key?.enabled 
    ? key.intensity / Math.max(fill?.enabled ? fill.intensity : 0.1, 0.1)
    : 2.0;
  
  // Adjust contrast based on lighting ratio
  const contrastEnhance = ratio > 5 ? 1.2 : ratio < 1.5 ? 0.9 : 1.0;

  return {
    ...currentEnhancements,
    contrast_enhance: contrastEnhance
  };
}

/**
 * Verify disentanglement: check that only lighting-related fields changed
 */
export function verifyDisentanglement(
  originalPrompt: FIBOPrompt,
  updatedPrompt: FIBOPrompt
): {
  isDisentangled: boolean;
  changedFields: string[];
  preservedFields: string[];
} {
  const changedFields: string[] = [];
  const preservedFields: string[] = [];

  // Check subject (should be unchanged)
  if (JSON.stringify(originalPrompt.subject) !== JSON.stringify(updatedPrompt.subject)) {
    changedFields.push('subject');
  } else {
    preservedFields.push('subject');
  }

  // Check environment (should be unchanged)
  if (JSON.stringify(originalPrompt.environment) !== JSON.stringify(updatedPrompt.environment)) {
    changedFields.push('environment');
  } else {
    preservedFields.push('environment');
  }

  // Check camera (should be unchanged)
  if (JSON.stringify(originalPrompt.camera) !== JSON.stringify(updatedPrompt.camera)) {
    changedFields.push('camera');
  } else {
    preservedFields.push('camera');
  }

  // Check composition (should be unchanged)
  if (JSON.stringify(originalPrompt.composition) !== JSON.stringify(updatedPrompt.composition)) {
    changedFields.push('composition');
  } else {
    preservedFields.push('composition');
  }

  // Lighting should be changed (expected)
  if (JSON.stringify(originalPrompt.lighting) === JSON.stringify(updatedPrompt.lighting)) {
    changedFields.push('lighting (unchanged - unexpected)');
  }

  // Color palette may change (lighting-dependent, acceptable)
  if (JSON.stringify(originalPrompt.color_palette) !== JSON.stringify(updatedPrompt.color_palette)) {
    changedFields.push('color_palette (lighting-dependent)');
  }

  const isDisentangled = 
    !changedFields.includes('subject') &&
    !changedFields.includes('environment') &&
    !changedFields.includes('camera') &&
    !changedFields.includes('composition');

  return {
    isDisentangled,
    changedFields,
    preservedFields
  };
}

/**
 * Create a lighting-only modification that preserves all other aspects
 * This is the core of FIBO's disentanglement capability
 */
export function modifyLightingOnly<T extends FIBOPrompt>(
  prompt: T,
  lightingModifier: (lighting: FIBOLighting) => FIBOLighting
): T {
  return {
    ...prompt,
    lighting: lightingModifier(prompt.lighting),
    // Update color palette if needed (lighting-dependent)
    color_palette: prompt.color_palette ? {
      ...prompt.color_palette,
      // Color palette updates are acceptable as they're lighting-dependent
    } : undefined
  } as T;
}

/**
 * Modify a single light parameter while preserving all others
 * Demonstrates FIBO's fine-grained disentangled control
 */
export function modifySingleLightParameter(
  prompt: FIBOPrompt,
  lightType: 'main_light' | 'fill_light' | 'rim_light',
  parameter: keyof FIBOLight,
  value: unknown
): FIBOPrompt {
  const newLighting: FIBOLighting = {
    ...prompt.lighting,
    [lightType]: prompt.lighting[lightType] ? {
      ...prompt.lighting[lightType]!,
      [parameter]: value
    } : undefined
  };

  return {
    ...prompt,
    lighting: newLighting
  };
}
