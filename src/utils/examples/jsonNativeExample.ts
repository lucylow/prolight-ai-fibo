/**
 * JSON-Native Generation Example
 * 
 * Complete example demonstrating how to use the JSON-native generation utilities
 * for precise lighting control with FIBO.
 */

import { buildFiboJsonFromSceneAndLights } from "../fiboJsonBuilder";
import { vectorToDirection } from "../lightingDirectionMapper";
import type { LightSettings3D } from "../fiboJsonBuilder";

/**
 * Example 1: Basic usage with 3D lights
 */
export function example1_BasicUsage() {
  const lights: LightSettings3D[] = [
    {
      id: "key",
      position: { x: 1.0, y: 1.0, z: 1.0 }, // Front-right, elevated
      intensity: 0.8,
      colorTemperature: 5600,
      softness: 0.3,
      enabled: true,
    },
    {
      id: "fill",
      position: { x: -0.7, y: 0.5, z: 0.8 }, // Front-left
      intensity: 0.4,
      colorTemperature: 5600,
      softness: 0.7,
      enabled: true,
    },
    {
      id: "rim",
      position: { x: 0.0, y: 1.2, z: -1.0 }, // Behind, elevated
      intensity: 0.6,
      colorTemperature: 3200,
      softness: 0.2,
      enabled: true,
    },
  ];

  const fiboJson = buildFiboJsonFromSceneAndLights(
    "professional model in black evening gown",
    lights,
    {
      shotType: "medium shot",
      cameraAngle: "eye-level",
      fov: 85,
      lensType: "portrait 85mm",
      aperture: "f/2.8",
    },
    "luxury photography studio with dark backdrop"
  );

  console.log("FIBO JSON:", JSON.stringify(fiboJson, null, 2));
  return fiboJson;
}

/**
 * Example 2: Classic Rembrandt lighting setup
 */
export function example2_RembrandtLighting() {
  // Rembrandt: Key light at 45° creating triangle of light on shadow-side cheek
  const lights: LightSettings3D[] = [
    {
      id: "key",
      position: { x: 0.7, y: 0.7, z: 0.7 }, // 45° left, elevated
      intensity: 0.9,
      colorTemperature: 5600,
      softness: 0.6, // Medium softness for gradual shadows
      enabled: true,
    },
    {
      id: "fill",
      position: { x: -0.5, y: 0.3, z: 0.8 }, // Front-right, lower
      intensity: 0.3, // Low fill for dramatic ratio (3:1)
      colorTemperature: 4500,
      softness: 0.7,
      enabled: true,
    },
    {
      id: "rim",
      position: { x: -0.8, y: 0.8, z: -0.8 }, // Behind left
      intensity: 0.4,
      colorTemperature: 3200,
      softness: 0.4,
      enabled: true,
    },
  ];

  return buildFiboJsonFromSceneAndLights(
    "professional portrait subject",
    lights,
    {
      shotType: "close-up",
      cameraAngle: "eye-level",
      fov: 85,
      lensType: "portrait 85mm",
      aperture: "f/2.8",
    },
    "classical portrait studio"
  );
}

/**
 * Example 3: Butterfly/Paramount lighting setup
 */
export function example3_ButterflyLighting() {
  // Butterfly: Key directly above camera, creates butterfly shadow under nose
  const lights: LightSettings3D[] = [
    {
      id: "key",
      position: { x: 0.0, y: 1.2, z: 0.3 }, // Directly above camera
      intensity: 0.8,
      colorTemperature: 5600,
      softness: 0.4, // Medium softness
      enabled: true,
    },
    {
      id: "fill",
      position: { x: 0.0, y: -0.3, z: 0.8 }, // Below camera
      intensity: 0.2, // Low fill
      colorTemperature: 5600,
      softness: 0.8,
      enabled: true,
    },
    {
      id: "rim",
      position: { x: 0.0, y: 0.8, z: -1.0 }, // Behind, elevated
      intensity: 0.5,
      colorTemperature: 3200,
      softness: 0.3,
      enabled: true,
    },
  ];

  return buildFiboJsonFromSceneAndLights(
    "fashion model for beauty portrait",
    lights,
    {
      shotType: "close-up",
      cameraAngle: "eye-level",
      fov: 85,
      lensType: "portrait 85mm",
      aperture: "f/2.8",
    },
    "beauty photography studio"
  );
}

/**
 * Example 4: Testing direction mapping
 */
export function example4_DirectionMapping() {
  const testPositions = [
    { x: 0, y: 0, z: 1, expected: "front" },
    { x: 1, y: 0, z: 1, expected: "front-right" },
    { x: 1, y: 0, z: 0, expected: "right" },
    { x: 1, y: 0, z: -1, expected: "back-right" },
    { x: 0, y: 0, z: -1, expected: "back" },
    { x: -1, y: 0, z: -1, expected: "back-left" },
    { x: -1, y: 0, z: 0, expected: "left" },
    { x: -1, y: 0, z: 1, expected: "front-left" },
    { x: 0, y: 1, z: 0, expected: "overhead" },
    { x: 0, y: -1, z: 0, expected: "underneath" },
  ];

  console.log("Testing direction mapping:");
  testPositions.forEach(({ x, y, z, expected }) => {
    const direction = vectorToDirection(x, y, z);
    const match = direction === expected ? "✓" : "✗";
    console.log(`${match} (${x}, ${y}, ${z}) → ${direction} (expected: ${expected})`);
  });
}

/**
 * Example 5: Dynamic lighting setup from user interaction
 */
export function example5_DynamicLighting() {
  // Simulate user dragging lights in 3D space
  const lights: LightSettings3D[] = [
    {
      id: "key",
      position: { x: 1.2, y: 0.8, z: 0.9 }, // User-adjusted position
      intensity: 0.85, // User-adjusted slider
      colorTemperature: 5800, // User-adjusted color picker
      softness: 0.35, // User-adjusted softness
      enabled: true,
      distance: 2.5, // Optional distance parameter
    },
    {
      id: "fill",
      position: { x: -0.6, y: 0.4, z: 0.7 },
      intensity: 0.45,
      colorTemperature: 5400,
      softness: 0.75,
      enabled: true,
      distance: 2.0,
    },
    {
      id: "rim",
      position: { x: 0.1, y: 1.1, z: -0.9 },
      intensity: 0.55,
      colorTemperature: 3000,
      softness: 0.25,
      enabled: true,
      distance: 2.2,
    },
  ];

  const fiboJson = buildFiboJsonFromSceneAndLights(
    "professional product on display",
    lights,
    {
      shotType: "medium shot",
      cameraAngle: "eye-level",
      fov: 90,
      lensType: "standard 50mm",
      aperture: "f/4.0",
    },
    "product photography studio with white seamless backdrop"
  );

  // The JSON now contains:
  // - Precise direction strings computed from 3D positions
  // - Professional lighting ratios (keyFillRatio, etc.)
  // - Lighting style classification
  // - Mood determination based on color temperature and contrast

  return fiboJson;
}

/**
 * Example 6: Using with async VLM base JSON generation
 */
export async function example6_WithVLM() {
  // In a real implementation, you would:
  // 1. Call VLM to generate base JSON from scene description
  // 2. Convert 3D lights to FIBO lighting config
  // 3. Merge them together

  // Step 1: Generate base JSON (placeholder - replace with actual VLM call)
  /*
  import { callVLMForBaseJson } from '../vlmBaseJsonGenerator';
  
  const baseJson = await callVLMForBaseJson(
    "a fluffy owl sitting in the trees at night",
    VLM_API_KEY,
    VLM_ENDPOINT
  );
  */

  // Step 2: Convert 3D lights
  const lights: LightSettings3D[] = [
    {
      id: "key",
      position: { x: 1.0, y: 1.0, z: 1.0 },
      intensity: 0.8,
      colorTemperature: 3200, // Warm night lighting
      softness: 0.5,
      enabled: true,
    },
    {
      id: "fill",
      position: { x: -0.5, y: 0.3, z: 0.8 },
      intensity: 0.2, // Low fill for night scene
      colorTemperature: 3000,
      softness: 0.8,
      enabled: true,
    },
  ];

  const lightingConfig = lights3DToFiboLighting(lights);

  // Step 3: Merge (in real implementation, baseJson would come from VLM)
  const baseJson = {
    subject: {
      main_entity: "fluffy owl",
      attributes: ["detailed", "nocturnal"],
      action: "sitting in the trees at night",
    },
    environment: {
      setting: "trees at night",
      time_of_day: "night",
      weather: "clear",
    },
    camera: {
      shot_type: "close-up",
      camera_angle: "eye-level",
      fov: 85,
    },
    style_medium: "photograph",
    artistic_style: "realistic",
  };

  const completeJson = mergeBaseJsonWithLighting(baseJson, lightingConfig);
  return completeJson;
}

// Export all examples
export const examples = {
  basic: example1_BasicUsage,
  rembrandt: example2_RembrandtLighting,
  butterfly: example3_ButterflyLighting,
  directionMapping: example4_DirectionMapping,
  dynamic: example5_DynamicLighting,
  withVLM: example6_WithVLM,
};
