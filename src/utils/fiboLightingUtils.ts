/**
 * FIBO Lighting Utilities
 * 
 * Helper functions for building and analyzing FIBO lighting JSON structures.
 * Provides professional lighting calculations and style determination.
 */

import type { LightingConfig } from "./fiboJsonBuilder";

export interface LightSettings {
  direction: string;
  intensity: number;
  colorTemperature: number;
  softness: number;
  distance?: number;
  enabled: boolean;
}

export interface LightingSetup {
  key?: LightSettings;
  fill?: LightSettings;
  rim?: LightSettings;
  ambient?: LightSettings;
  [key: string]: LightSettings | undefined;
}

/**
 * Calculate key-to-fill ratio for professional lighting analysis
 */
export function calculateKeyFillRatio(lightingSetup: LightingSetup): number {
  const keyIntensity = lightingSetup.key?.intensity ?? 0.8;
  const fillIntensity = lightingSetup.fill?.intensity ?? 0.3;
  return keyIntensity / Math.max(fillIntensity, 0.1);
}

/**
 * Determine lighting style based on setup
 */
export function determineLightingStyle(lightingSetup: LightingSetup): string {
  const ratio = calculateKeyFillRatio(lightingSetup);
  
  if (ratio > 4.0) {
    return "dramatic high-contrast";
  } else if (ratio > 2.5) {
    return "classical portrait (Rembrandt/Loop)";
  } else if (ratio > 1.5) {
    return "soft portrait";
  } else if (ratio > 1.0) {
    return "balanced commercial";
  } else {
    return "flat even lighting";
  }
}

/**
 * Determine mood from lighting setup
 */
export function determineMoodFromLighting(lightingSetup: LightingSetup): string {
  const keyTemp = lightingSetup.key?.colorTemperature ?? 5600;
  const keyIntensity = lightingSetup.key?.intensity ?? 0.8;
  const fillIntensity = lightingSetup.fill?.intensity ?? 0.3;
  const ratio = keyIntensity / Math.max(fillIntensity, 0.1);

  const isWarm = keyTemp < 4500;
  const isCool = keyTemp > 6000;

  if (ratio > 4.0) {
    return isWarm ? "dramatic warm" : isCool ? "dramatic cool" : "dramatic";
  } else if (ratio > 2.0) {
    return isWarm ? "intimate warm" : isCool ? "professional cool" : "professional";
  } else {
    return isWarm ? "comfortable cozy" : isCool ? "crisp clean" : "neutral balanced";
  }
}

/**
 * Calculate shadow intensity from lighting setup
 */
export function calculateShadowIntensity(lightingSetup: LightingSetup): number {
  const keyIntensity = lightingSetup.key?.intensity ?? 0.8;
  const fillIntensity = lightingSetup.fill?.intensity ?? 0.3;
  return Math.max(0, 1.0 - fillIntensity / Math.max(keyIntensity, 0.1));
}

/**
 * Get depth of field description from aperture
 */
export function getDepthOfField(aperture: string): string {
  const match = aperture.match(/f\/(\d+\.?\d*)/);
  if (!match) return "medium";
  
  const fStop = parseFloat(match[1]);
  if (fStop <= 2.8) {
    return "very shallow";
  } else if (fStop <= 5.6) {
    return "shallow";
  } else if (fStop <= 11) {
    return "medium";
  } else {
    return "deep";
  }
}

/**
 * Calculate focus distance based on FOV and shot type
 */
export function calculateFocusDistance(fov: number, shotType: string): number {
  // Approximate focus distances for different shot types
  const shotTypeDistances: Record<string, number> = {
    "close-up": 1.0,
    "medium close-up": 1.5,
    "medium shot": 2.5,
    "medium full shot": 4.0,
    "full shot": 6.0,
    "wide shot": 8.0,
  };
  
  const baseDistance = shotTypeDistances[shotType.toLowerCase()] || 2.5;
  
  // Adjust based on FOV (wider FOV = further focus)
  const fovMultiplier = fov / 85; // Normalize to 85mm equivalent
  
  return baseDistance * fovMultiplier;
}

/**
 * Build FIBO lighting JSON from lighting setup
 */
export function buildFiboLightingJson(lightingSetup: LightingSetup): Record<string, Record<string, unknown>> {
  const lightingJson: Record<string, Record<string, unknown>> = {};
  
  for (const [type, settings] of Object.entries(lightingSetup)) {
    if (settings && settings.enabled) {
      lightingJson[`${type}_light`] = {
        type: "area",
        direction: settings.direction,
        intensity: settings.intensity,
        color_temperature: settings.colorTemperature,
        color_kelvin: settings.colorTemperature,
        softness: settings.softness,
        distance: settings.distance,
        falloff: "inverse_square",
        quality: settings.softness > 0.6 ? "soft_diffused" : 
                 settings.softness < 0.3 ? "hard_crisp" : "medium",
        temperature_description: settings.colorTemperature < 4500 ? "warm_tungsten" :
                                 settings.colorTemperature > 6000 ? "cool_daylight" : "neutral_daylight",
      };
    }
  }
  
  return lightingJson;
}

/**
 * Calculate average color temperature from lighting setup
 */
export function calculateAverageColorTemperature(lightingSetup: LightingSetup): number {
  const temps: number[] = [];
  
  if (lightingSetup.key?.enabled) temps.push(lightingSetup.key.colorTemperature);
  if (lightingSetup.fill?.enabled) temps.push(lightingSetup.fill.colorTemperature);
  if (lightingSetup.rim?.enabled) temps.push(lightingSetup.rim.colorTemperature);
  
  if (temps.length === 0) return 5600;
  
  return Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
}
