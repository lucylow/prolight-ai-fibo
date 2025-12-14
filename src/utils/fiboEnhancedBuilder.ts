/**
 * Enhanced FIBO JSON Builder
 * Leverages FIBO's architecture and training characteristics:
 * - 8B DiT model with flow matching
 * - SmolLM3-3B text encoder optimized for long structured JSON (~1000 words)
 * - DimFusion conditioning architecture for long captions
 * - JSON-native and disentangled control
 * 
 * Based on FIBO training: ~1 billion fully licensed images with long structured JSON captions
 */

import type {
  FIBOPrompt,
  FIBOSubject,
  FIBOEnvironment,
  FIBOCamera,
  FIBOLighting,
  FIBOColorPalette,
  FIBOComposition,
  FIBORender,
  FIBOEnhancements,
  FIBOLight
} from '../types/fibo';

interface LightSettings {
  direction: string;
  intensity: number;
  colorTemperature: number;
  softness: number;
  distance: number;
  enabled: boolean;
}

interface EnhancedFIBOOptions {
  subjectDescription: string;
  environment: string;
  lightingSetup: Record<string, LightSettings>;
  cameraSettings: {
    shotType: string;
    cameraAngle: string;
    fov: number;
    lensType: string;
    aperture: string;
  };
  stylePreset?: string;
  enhanceHDR?: boolean;
  negativePrompt?: string;
  lightingAnalysis?: {
    keyFillRatio: number;
    lightingStyle: string;
    professionalRating: number;
    [key: string]: unknown;
  };
}

/**
 * Build comprehensive subject description leveraging FIBO's training format
 * FIBO was trained on detailed structured descriptions (~1000 words total)
 */
function buildEnhancedSubject(
  subjectDescription: string,
  lightingSetup: Record<string, LightSettings>,
  stylePreset?: string
): FIBOSubject {
  const key = lightingSetup.key;
  const mood = determineMoodFromLighting(lightingSetup);
  
  // Build detailed attributes array - FIBO excels with rich attribute descriptions
  const attributes: string[] = [
    "professionally lit",
    "high quality",
    "detailed",
    "sharp focus",
    "expert lighting",
    "studio quality",
    "magazine editorial standard"
  ];

  // Add style-specific attributes
  if (stylePreset?.includes("fashion")) {
    attributes.push("editorial fashion", "runway quality", "high-end commercial");
  } else if (stylePreset?.includes("beauty")) {
    attributes.push("beauty portrait", "flattering lighting", "skin texture detail");
  } else if (stylePreset?.includes("product")) {
    attributes.push("product photography", "commercial grade", "catalog quality");
  }

  // Add lighting-specific attributes based on setup
  if (key?.enabled) {
    if (key.softness > 0.7) {
      attributes.push("soft diffused lighting", "gradual shadow transitions");
    } else if (key.softness < 0.3) {
      attributes.push("dramatic hard lighting", "defined shadow edges");
    }
    
    if (key.colorTemperature < 4500) {
      attributes.push("warm color temperature", "tungsten-like quality");
    } else if (key.colorTemperature > 6000) {
      attributes.push("cool daylight quality", "blue-white tones");
    }
  }

  // Build comprehensive action description
  const action = buildDetailedAction(subjectDescription, stylePreset);

  return {
    main_entity: subjectDescription,
    attributes,
    action,
    mood,
    emotion: determineEmotionFromMood(mood)
  };
}

/**
 * Build detailed action description matching FIBO's training format
 */
function buildDetailedAction(subjectDescription: string, stylePreset?: string): string {
  const baseAction = "posed for professional photograph";
  
  if (stylePreset?.includes("fashion")) {
    return "posed confidently for high-fashion editorial photograph, displaying garment details and silhouette with professional model composure";
  } else if (stylePreset?.includes("beauty")) {
    return "posed naturally for beauty portrait, with attention to skin texture, facial features, and flattering angles";
  } else if (stylePreset?.includes("product")) {
    return "displayed prominently for commercial product photography, showcasing design details, materials, and professional presentation";
  }
  
  return `${baseAction}, with attention to composition, lighting interaction, and professional presentation standards`;
}

/**
 * Build enhanced environment description with rich details
 */
function buildEnhancedEnvironment(
  environment: string,
  lightingSetup: Record<string, LightSettings>
): FIBOEnvironment {
  const isOutdoor = environment.toLowerCase().includes("outdoor") || 
                    environment.toLowerCase().includes("natural");
  
  const ambient = lightingSetup.ambient;
  const key = lightingSetup.key;
  
  // Build detailed lighting conditions description
  let lightingConditions = "professional studio";
  if (isOutdoor) {
    lightingConditions = "natural daylight with controlled studio lighting enhancement";
  } else {
    lightingConditions = "controlled professional studio environment with precise lighting setup";
  }

  // Determine atmosphere based on lighting
  let atmosphere = "controlled";
  if (key?.enabled) {
    const ratio = key.intensity / Math.max(lightingSetup.fill?.intensity || 0.1, 0.1);
    if (ratio > 5) {
      atmosphere = "dramatic and moody";
    } else if (ratio < 1.5) {
      atmosphere = "soft and even";
    } else {
      atmosphere = "professional and balanced";
    }
  }

  return {
    setting: environment,
    time_of_day: isOutdoor ? "daylight" : "controlled lighting",
    lighting_conditions: lightingConditions,
    atmosphere,
    interior_style: isOutdoor ? undefined : "professional photography studio",
    weather: isOutdoor ? "clear" : undefined
  };
}

/**
 * Build comprehensive lighting structure leveraging DimFusion conditioning
 * FIBO's DimFusion architecture efficiently handles long, structured lighting descriptions
 */
function buildEnhancedLighting(
  lightingSetup: Record<string, LightSettings>
): FIBOLighting {
  const lighting: FIBOLighting = {
    main_light: buildDetailedLight(lightingSetup.key, "main", lightingSetup)
  };

  if (lightingSetup.fill?.enabled) {
    lighting.fill_light = buildDetailedLight(lightingSetup.fill, "fill", lightingSetup);
  }

  if (lightingSetup.rim?.enabled) {
    lighting.rim_light = buildDetailedLight(lightingSetup.rim, "rim", lightingSetup);
  }

  if (lightingSetup.ambient?.enabled) {
    lighting.ambient_light = {
      intensity: lightingSetup.ambient.intensity,
      colorTemperature: lightingSetup.ambient.colorTemperature
    };
  }

  // Add lighting style description for better conditioning
  lighting.lightingStyle = determineLightingStyleName(lightingSetup);

  return lighting;
}

/**
 * Build detailed light configuration with comprehensive parameters
 * Leverages FIBO's ability to handle detailed parameter descriptions
 */
function buildDetailedLight(
  light: LightSettings | undefined,
  type: "main" | "fill" | "rim",
  allLights: Record<string, LightSettings>
): FIBOLight {
  if (!light || !light.enabled) {
    // Return default disabled light
    return {
      direction: "front",
      intensity: 0,
      colorTemperature: 5600,
      softness: 0.5,
      distance: 1.5,
      enabled: false
    };
  }

  // Convert direction string to FIBO direction format
  const direction = convertDirectionToFIBO(light.direction);

  // Build comprehensive light configuration
  const fiboLight: FIBOLight = {
    type: "area", // Default to area light for professional results
    direction,
    intensity: Math.max(0, Math.min(2.0, light.intensity)),
    colorTemperature: Math.max(1000, Math.min(10000, light.colorTemperature)),
    softness: Math.max(0, Math.min(1.0, light.softness)),
    distance: Math.max(0.5, Math.min(10.0, light.distance)),
    enabled: true,
    falloff: "inverse_square" // Professional light falloff
  };

  // Add position if we can derive it from direction
  const position = derivePositionFromDirection(light.direction, light.distance);
  if (position) {
    fiboLight.position = position;
  }

  return fiboLight;
}

/**
 * Convert natural language direction to FIBO direction format
 */
function convertDirectionToFIBO(direction: string): string {
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
  
  return "front-right"; // Default
}

/**
 * Derive 3D position from direction description
 */
function derivePositionFromDirection(
  direction: string,
  distance: number
): [number, number, number] | undefined {
  const dir = direction.toLowerCase();
  
  // Default positions based on common lighting setups
  if (dir.includes("45 degrees") && dir.includes("right")) {
    return [0.7 * distance, 0.7, 0.5 * distance];
  }
  if (dir.includes("45 degrees") && dir.includes("left")) {
    return [-0.7 * distance, 0.7, 0.5 * distance];
  }
  if (dir.includes("behind")) {
    return [0.0, 0.8, -0.8 * distance];
  }
  if (dir.includes("above") || dir.includes("butterfly")) {
    return [0.0, 1.2, 0.3 * distance];
  }
  if (dir.includes("below")) {
    return [0.0, -0.5, 0.5 * distance];
  }
  if (dir.includes("frontal") || dir.includes("front")) {
    return [0.0, 0.5, 1.0 * distance];
  }
  
  return undefined;
}

/**
 * Build comprehensive color palette leveraging FIBO's color control
 */
function buildEnhancedColorPalette(
  lightingSetup: Record<string, LightSettings>
): FIBOColorPalette {
  const key = lightingSetup.key;
  const keyTemp = key?.colorTemperature || 5600;
  
  // Calculate average color temperature across all lights
  const temps: number[] = [];
  if (key?.enabled) temps.push(key.colorTemperature);
  if (lightingSetup.fill?.enabled) temps.push(lightingSetup.fill.colorTemperature);
  if (lightingSetup.rim?.enabled) temps.push(lightingSetup.rim.colorTemperature);
  
  const avgTemp = temps.length > 0 
    ? temps.reduce((a, b) => a + b, 0) / temps.length 
    : 5600;

  // Determine mood from color temperature
  let mood: "warm" | "cool" | "neutral" | "vibrant" | "muted" | "monochrome";
  if (avgTemp < 4000) mood = "warm";
  else if (avgTemp > 6500) mood = "cool";
  else mood = "neutral";

  return {
    white_balance: `${Math.round(avgTemp)}K`,
    mood,
    saturation: 1.0, // Professional standard
    contrast: 1.0 // Professional standard
  };
}

/**
 * Build comprehensive composition details
 */
function buildEnhancedComposition(
  cameraSettings: { shotType: string; cameraAngle: string; aperture: string }
): FIBOComposition {
  const dof = getDepthOfField(cameraSettings.aperture);
  
  return {
    rule_of_thirds: true,
    framing: "professional composition",
    depth: dof === "very shallow" || dof.includes("shallow") ? "shallow" :
           dof.includes("deep") ? "deep" : "medium",
    negative_space: 0.2, // Professional negative space ratio
    leading_lines: ["subject focus", "lighting direction"]
  };
}

/**
 * Build enhanced render settings
 */
function buildEnhancedRender(enhanceHDR?: boolean): FIBORender {
  return {
    resolution: [2048, 2048], // High resolution for professional output
    color_space: "sRGB",
    bit_depth: enhanceHDR ? 16 : 8,
    samples: enhanceHDR ? 256 : 128, // Higher samples for HDR
    denoiser: "professional"
  };
}

/**
 * Build comprehensive enhancements leveraging FIBO's capabilities
 */
function buildEnhancedEnhancements(
  enhanceHDR?: boolean,
  lightingAnalysis?: { professionalRating: number }
): FIBOEnhancements {
  return {
    hdr: enhanceHDR || false,
    professional_grade: true,
    color_fidelity: true,
    detail_enhancement: true,
    noise_reduction: true,
    contrast_enhance: lightingAnalysis?.professionalRating 
      ? Math.min(1.2, 0.8 + (lightingAnalysis.professionalRating / 10) * 0.4)
      : 1.0
  };
}

/**
 * Main function: Build comprehensive FIBO prompt matching training format
 * Creates ~1000 word structured JSON prompt leveraging FIBO's architecture
 */
export function buildEnhancedFIBOPrompt(options: EnhancedFIBOOptions): FIBOPrompt {
  const {
    subjectDescription,
    environment,
    lightingSetup,
    cameraSettings,
    stylePreset,
    enhanceHDR,
    negativePrompt,
    lightingAnalysis
  } = options;

  // Build all components with comprehensive details
  const subject = buildEnhancedSubject(subjectDescription, lightingSetup, stylePreset);
  const env = buildEnhancedEnvironment(environment, lightingSetup);
  const lighting = buildEnhancedLighting(lightingSetup);
  const colorPalette = buildEnhancedColorPalette(lightingSetup);
  const composition = buildEnhancedComposition(cameraSettings);
  const render = buildEnhancedRender(enhanceHDR);
  const enhancements = buildEnhancedEnhancements(enhanceHDR, lightingAnalysis);

  // Build camera configuration
  const camera: FIBOCamera = {
    shot_type: cameraSettings.shotType as any,
    camera_angle: cameraSettings.cameraAngle as any,
    fov: cameraSettings.fov,
    lens_type: cameraSettings.lensType as any,
    aperture: cameraSettings.aperture,
    focus_distance_m: calculateFocusDistance(cameraSettings.fov, cameraSettings.shotType),
    pitch: 0,
    yaw: 0,
    roll: 0,
    seed: Math.floor(Math.random() * 1000000)
  };

  // Build complete FIBO prompt
  const prompt: FIBOPrompt = {
    subject,
    environment: env,
    camera,
    lighting,
    color_palette: colorPalette,
    style_medium: "photograph",
    artistic_style: stylePreset || "professional studio photography",
    composition,
    render,
    enhancements,
    materials: buildMaterialProperties(lightingSetup),
    meta: {
      source: "prolight-ai-enhanced",
      version: "2.0",
      fibo_architecture: "8B-DiT-flow-matching",
      text_encoder: "SmolLM3-3B",
      conditioning: "DimFusion",
      prompt_length_estimate: estimatePromptLength(prompt),
      deterministic: true
    }
  };

  // Add negative prompt if provided
  if (negativePrompt) {
    (prompt as any).negative_prompt = negativePrompt;
  }

  return prompt;
}

/**
 * Build material properties for enhanced realism
 */
function buildMaterialProperties(
  lightingSetup: Record<string, LightSettings>
): Record<string, unknown> {
  const key = lightingSetup.key;
  
  return {
    surface_reflectivity: key?.softness ? (1.0 - key.softness) * 0.3 : 0.15,
    subsurface_scattering: key?.softness && key.softness > 0.6 ? true : false,
    specular_highlights: key?.intensity ? key.intensity * 0.8 : 0.5,
    material_response: "photorealistic"
  };
}

/**
 * Calculate focus distance based on FOV and shot type
 */
function calculateFocusDistance(fov: number, shotType: string): number {
  // Professional focus distances based on shot type
  const shotTypeLower = shotType.toLowerCase();
  
  if (shotTypeLower.includes("close")) return 0.5;
  if (shotTypeLower.includes("medium")) return 1.5;
  if (shotTypeLower.includes("wide")) return 3.0;
  
  // Default based on FOV
  if (fov < 30) return 2.0; // Telephoto
  if (fov > 70) return 1.0; // Wide angle
  
  return 1.5; // Standard
}

/**
 * Determine mood from lighting setup
 */
function determineMoodFromLighting(lightingSetup: Record<string, LightSettings>): string {
  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  
  if (!key?.enabled) return "ambient";
  
  const ratio = key.intensity / Math.max(fill?.enabled ? fill.intensity : 0.1, 0.1);
  const avgTemp = key.colorTemperature;
  
  if (ratio > 5 && avgTemp < 4500) return "dramatic warm";
  if (ratio > 5) return "dramatic";
  if (ratio < 1.5 && avgTemp > 5500) return "clean and bright";
  if (avgTemp < 4000) return "warm and intimate";
  if (avgTemp > 6500) return "cool and modern";
  return "professional and balanced";
}

/**
 * Determine emotion from mood
 */
function determineEmotionFromMood(mood: string): string {
  if (mood.includes("dramatic")) return "intense";
  if (mood.includes("warm")) return "welcoming";
  if (mood.includes("cool")) return "professional";
  if (mood.includes("bright")) return "energetic";
  return "neutral";
}

/**
 * Determine lighting style name
 */
function determineLightingStyleName(lightingSetup: Record<string, LightSettings>): string {
  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  
  if (!key?.enabled) return "ambient";
  
  const ratio = key.intensity / Math.max(fill?.enabled ? fill.intensity : 0.1, 0.1);
  
  if (ratio >= 8) return "high_contrast_dramatic";
  if (ratio >= 4) return "dramatic";
  if (ratio >= 2) return "classical_portrait";
  if (ratio >= 1.5) return "soft_lighting";
  return "flat_lighting";
}

/**
 * Get depth of field description
 */
function getDepthOfField(aperture: string): string {
  const fNumber = parseFloat(aperture.replace('f/', ''));
  if (fNumber <= 2) return "very shallow, strong bokeh";
  if (fNumber <= 2.8) return "shallow, pleasing bokeh";
  if (fNumber <= 4) return "moderate, subject isolation";
  if (fNumber <= 5.6) return "medium depth";
  return "deep, most in focus";
}

/**
 * Estimate prompt length (for metadata)
 */
function estimatePromptLength(prompt: FIBOPrompt): number {
  // Rough estimate of JSON string length
  const jsonString = JSON.stringify(prompt);
  return jsonString.length;
}

/**
 * Ensure disentanglement when modifying lighting parameters
 * FIBO's key strength: modify lighting without affecting subject/composition
 */
export function ensureDisentangledLightingUpdate(
  currentPrompt: FIBOPrompt,
  newLightingSetup: Record<string, LightSettings>
): FIBOPrompt {
  // Create new prompt with ONLY lighting changed
  // Subject, environment, camera, and composition remain unchanged
  return {
    ...currentPrompt,
    lighting: buildEnhancedLighting(newLightingSetup),
    // Update color palette based on new lighting
    color_palette: buildEnhancedColorPalette(newLightingSetup),
    // Keep everything else identical for true disentanglement
    subject: currentPrompt.subject,
    environment: currentPrompt.environment,
    camera: currentPrompt.camera,
    composition: currentPrompt.composition,
    render: currentPrompt.render,
    // Only update enhancements if they're lighting-dependent
    enhancements: {
      ...currentPrompt.enhancements,
      // Lighting-dependent enhancements can change
    }
  };
}
