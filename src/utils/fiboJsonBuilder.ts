/**
 * FIBO JSON Builder
 * 
 * Enhanced JSON-native generation utilities for Pro Lighting Simulator.
 * Supports VLM-based base JSON generation and precise 3D lighting control merging.
 */

import { vectorToDirection } from "./lightingDirectionMapper";

export interface LightSettings3D {
  id: string;
  position: { x: number; y: number; z: number } | [number, number, number];
  intensity: number; // 0.0 to 1.0
  colorTemperature: number; // Kelvin
  softness: number; // 0.0 to 1.0
  enabled: boolean;
  distance?: number;
}

export interface FIBOBaseJson {
  subject?: {
    main_entity?: string;
    attributes?: string[];
    action?: string;
    emotion?: string;
    mood?: string;
  };
  environment?: {
    setting?: string;
    time_of_day?: string;
    weather?: string;
    lighting_conditions?: string;
    atmosphere?: string;
  };
  camera?: {
    shot_type?: string;
    camera_angle?: string;
    fov?: number;
    lens_type?: string;
    aperture?: string;
    focus?: string;
    depth_of_field?: string;
  };
  lighting?: Record<string, any>;
  style_medium?: string;
  artistic_style?: string;
  color_palette?: Record<string, any>;
  enhancements?: Record<string, any>;
  composition?: Record<string, any>;
  [key: string]: any;
}

export interface LightingConfig {
  main_light?: {
    direction: string;
    intensity: number;
    color_temperature: number;
    softness: number;
    distance?: number;
    type?: string;
  };
  fill_light?: {
    direction: string;
    intensity: number;
    color_temperature: number;
    softness: number;
    distance?: number;
    type?: string;
  };
  rim_light?: {
    direction: string;
    intensity: number;
    color_temperature: number;
    softness: number;
    distance?: number;
    type?: string;
  };
  [key: string]: any;
}

/**
 * Convert 3D light settings to FIBO lighting configuration
 * 
 * Maps 3D simulator lights to FIBO JSON lighting structure with precise direction strings.
 */
export function lights3DToFiboLighting(lights: LightSettings3D[]): LightingConfig {
  const lightingConfig: LightingConfig = {};

  // Map light IDs to FIBO light types
  const lightTypeMapping: Record<string, keyof LightingConfig> = {
    key: "main_light",
    main: "main_light",
    fill: "fill_light",
    rim: "rim_light",
    back: "rim_light",
    mainLight: "main_light",
    fillLight: "fill_light",
    rimLight: "rim_light",
    backLight: "rim_light",
  };

  for (const light of lights) {
    if (!light.enabled) continue;

    // Get FIBO light type
    const lightId = light.id.toLowerCase();
    let fiboType = lightTypeMapping[lightId];

    // If not recognized, assign to first available slot
    if (!fiboType) {
      if (!lightingConfig.main_light) {
        fiboType = "main_light";
      } else if (!lightingConfig.fill_light) {
        fiboType = "fill_light";
      } else if (!lightingConfig.rim_light) {
        fiboType = "rim_light";
      } else {
        continue; // Skip additional lights beyond main/fill/rim
      }
    }

    // Extract position and convert to direction
    let x: number, y: number, z: number;
    if (Array.isArray(light.position)) {
      [x, y, z] = light.position;
    } else {
      x = light.position.x;
      y = light.position.y;
      z = light.position.z;
    }

    const direction = vectorToDirection(x, y, z);

    // Build FIBO light object
    const fiboLight = {
      direction,
      intensity: Math.max(0, Math.min(1, light.intensity)),
      color_temperature: Math.round(light.colorTemperature),
      softness: Math.max(0, Math.min(1, light.softness)),
      ...(light.distance !== undefined && { distance: light.distance }),
      type: fiboType === "main_light" ? "key light" : fiboType === "fill_light" ? "fill light" : "rim light",
    };

    lightingConfig[fiboType] = fiboLight;
  }

  // Ensure we have at least a main light
  if (!lightingConfig.main_light) {
    lightingConfig.main_light = {
      direction: "front-left",
      intensity: 0.8,
      color_temperature: 5600,
      softness: 0.3,
      type: "key light",
    };
  }

  return lightingConfig;
}

/**
 * Calculate professional lighting ratios and style
 */
export function calculateLightingRatios(lightingConfig: LightingConfig): {
  keyFillRatio: number;
  lightingStyle: string;
  shadowIntensity: number;
  contrastRatio: number;
} {
  const keyIntensity = lightingConfig.main_light?.intensity ?? 0.8;
  const fillIntensity = lightingConfig.fill_light?.intensity ?? 0.3;
  const rimIntensity = lightingConfig.rim_light?.intensity ?? 0.0;

  // Key-to-fill ratio
  const keyFillRatio = keyIntensity / Math.max(fillIntensity, 0.1);

  // Determine lighting style based on ratio
  let lightingStyle: string;
  if (keyFillRatio > 4.0) {
    lightingStyle = "dramatic high-contrast";
  } else if (keyFillRatio > 2.5) {
    lightingStyle = "classical portrait (Rembrandt/Loop)";
  } else if (keyFillRatio > 1.5) {
    lightingStyle = "soft portrait";
  } else if (keyFillRatio > 1.0) {
    lightingStyle = "balanced commercial";
  } else {
    lightingStyle = "flat even lighting";
  }

  // Shadow intensity (inverse of fill)
  const shadowIntensity = Math.max(0, 1.0 - fillIntensity / Math.max(keyIntensity, 0.1));

  // Overall contrast ratio
  const maxIntensity = Math.max(keyIntensity, fillIntensity, rimIntensity);
  const minIntensity = Math.min(
    keyIntensity || 1,
    fillIntensity || 1,
    rimIntensity || 1
  );
  const contrastRatio = maxIntensity / Math.max(minIntensity, 0.1);

  return {
    keyFillRatio,
    lightingStyle,
    shadowIntensity,
    contrastRatio,
  };
}

/**
 * Determine mood from lighting configuration
 */
export function determineMoodFromLighting(lightingConfig: LightingConfig): string {
  const keyTemp = lightingConfig.main_light?.color_temperature ?? 5600;
  const keyIntensity = lightingConfig.main_light?.intensity ?? 0.8;
  const fillIntensity = lightingConfig.fill_light?.intensity ?? 0.3;
  const keyFillRatio = keyIntensity / Math.max(fillIntensity, 0.1);

  // Warm colors suggest coziness
  const isWarm = keyTemp < 4500;
  const isCool = keyTemp > 6000;

  // High contrast suggests drama
  if (keyFillRatio > 4.0) {
    return isWarm ? "dramatic warm" : isCool ? "dramatic cool" : "dramatic";
  } else if (keyFillRatio > 2.0) {
    return isWarm ? "intimate warm" : isCool ? "professional cool" : "professional";
  } else {
    return isWarm ? "comfortable cozy" : isCool ? "crisp clean" : "neutral balanced";
  }
}

/**
 * Merge VLM-generated base JSON with precise 3D lighting configuration
 * 
 * This is the core function for the Pro Lighting Simulator hack:
 * 1. Use VLM to generate base JSON from scene description
 * 2. Override lighting section with precise 3D-mapped lighting
 * 3. Enhance with professional lighting analysis
 */
export function mergeBaseJsonWithLighting(
  baseJson: FIBOBaseJson,
  lightingConfig: LightingConfig
): FIBOBaseJson {
  // Create a deep copy of base JSON
  const mergedJson: FIBOBaseJson = JSON.parse(JSON.stringify(baseJson));

  // Calculate lighting ratios and style
  const lightingAnalysis = calculateLightingRatios(lightingConfig);

  // Replace/merge lighting section with our precise configuration
  mergedJson.lighting = lightingConfig;

  // Add lighting metadata
  if (!mergedJson.lighting.lighting_style) {
    mergedJson.lighting.lighting_style = lightingAnalysis.lightingStyle;
  }
  if (!mergedJson.lighting.shadow_intensity) {
    mergedJson.lighting.shadow_intensity = lightingAnalysis.shadowIntensity;
  }
  if (!mergedJson.lighting.key_fill_ratio) {
    mergedJson.lighting.key_fill_ratio = lightingAnalysis.keyFillRatio;
  }

  // Update subject mood based on lighting
  if (!mergedJson.subject) {
    mergedJson.subject = {};
  }
  if (!mergedJson.subject.mood) {
    mergedJson.subject.mood = determineMoodFromLighting(lightingConfig);
  }

  // Update color palette based on lighting temperatures
  const keyTemp = lightingConfig.main_light?.color_temperature ?? 5600;
  if (!mergedJson.color_palette) {
    mergedJson.color_palette = {};
  }
  mergedJson.color_palette.white_balance = `${keyTemp}K`;
  mergedJson.color_palette.mood =
    keyTemp < 4500 ? "warm" : keyTemp > 6000 ? "cool" : "neutral";

  // Ensure style settings
  if (!mergedJson.style_medium) {
    mergedJson.style_medium = "photograph";
  }
  if (!mergedJson.artistic_style) {
    mergedJson.artistic_style = "professional studio photography";
  }

  return mergedJson;
}

/**
 * Build complete FIBO JSON from scene description and 3D lights
 * 
 * Convenience function that combines base JSON generation (via VLM) with 3D lighting override.
 * In a real implementation, you would call your VLM API here to generate baseJson.
 */
export function buildFiboJsonFromSceneAndLights(
  sceneDescription: string,
  lights: LightSettings3D[],
  cameraSettings?: {
    shotType?: string;
    cameraAngle?: string;
    fov?: number;
    lensType?: string;
    aperture?: string;
  },
  environment?: string
): FIBOBaseJson {
  // Convert 3D lights to FIBO lighting config
  const lightingConfig = lights3DToFiboLighting(lights);

  // Create base JSON structure (in real implementation, this would come from VLM)
  const baseJson: FIBOBaseJson = {
    subject: {
      main_entity: sceneDescription,
      attributes: ["professionally lit", "high quality", "detailed", "sharp focus"],
      action: "posed for professional photograph",
      mood: determineMoodFromLighting(lightingConfig),
    },
    environment: {
      setting: environment || "professional studio",
      time_of_day: "controlled lighting",
      lighting_conditions: "professional studio",
      atmosphere: environment?.includes("outdoor") ? "natural" : "controlled",
    },
    camera: {
      shot_type: cameraSettings?.shotType || "medium shot",
      camera_angle: cameraSettings?.cameraAngle || "eye-level",
      fov: cameraSettings?.fov || 85,
      lens_type: cameraSettings?.lensType || "portrait 85mm",
      aperture: cameraSettings?.aperture || "f/2.8",
      focus: "sharp on subject",
      depth_of_field: "shallow",
    },
    style_medium: "photograph",
    artistic_style: "professional studio photography",
    enhancements: {
      hdr: true,
      professional_grade: true,
      color_fidelity: true,
      detail_enhancement: true,
      noise_reduction: true,
    },
    composition: {
      rule_of_thirds: true,
      depth_layers: ["foreground", "subject", "background"],
    },
  };

  // Merge with precise lighting
  return mergeBaseJsonWithLighting(baseJson, lightingConfig);
}
