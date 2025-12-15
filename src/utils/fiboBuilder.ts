/**
 * FIBO JSON Builder Utilities
 * Constructs structured FIBO prompts from lighting and camera settings
 */

import { FIBOStructuredPrompt } from '@/services/BriaImageService';

export interface LightingConfig {
  key: {
    intensity: number;
    angle_horizontal: number;
    angle_vertical: number;
    color_temperature: number;
    softness: number;
    distance: number;
    enabled: boolean;
  };
  fill: {
    intensity: number;
    angle_horizontal: number;
    angle_vertical: number;
    color_temperature: number;
    softness: number;
    distance: number;
    enabled: boolean;
    fill_ratio: number;
  };
  rim: {
    intensity: number;
    angle_horizontal: number;
    angle_vertical: number;
    color_temperature: number;
    softness: number;
    distance: number;
    enabled: boolean;
  };
  ambient: {
    intensity: number;
    color_temperature: number;
    enabled: boolean;
  };
}

export interface CameraConfig {
  focal_length: number;
  aperture: number;
  iso: number;
  white_balance: number;
  metering_mode: string;
  shot_type: string;
  camera_angle: string;
}

export interface SceneConfig {
  subject_description: string;
  environment: string;
  style_preset: string;
  background: string;
}

/**
 * Build FIBO JSON from lighting, camera, and scene configs
 */
export function buildFIBOJson(
  lighting: LightingConfig,
  camera: CameraConfig,
  scene: SceneConfig
): FIBOStructuredPrompt {
  return {
    lighting: {
      key_light: lighting.key.enabled ? {
        intensity: lighting.key.intensity,
        angle_horizontal: lighting.key.angle_horizontal,
        angle_vertical: lighting.key.angle_vertical,
        color_temperature: lighting.key.color_temperature,
        softness: lighting.key.softness,
        distance: lighting.key.distance,
        enabled: true,
      } : undefined,
      fill_light: lighting.fill.enabled ? {
        intensity: lighting.fill.intensity,
        angle_horizontal: lighting.fill.angle_horizontal,
        angle_vertical: lighting.fill.angle_vertical,
        color_temperature: lighting.fill.color_temperature,
        softness: lighting.fill.softness,
        distance: lighting.fill.distance,
        fill_ratio: lighting.fill.fill_ratio,
        enabled: true,
      } : undefined,
      rim_light: lighting.rim.enabled ? {
        intensity: lighting.rim.intensity,
        angle_horizontal: lighting.rim.angle_horizontal,
        angle_vertical: lighting.rim.angle_vertical,
        color_temperature: lighting.rim.color_temperature,
        softness: lighting.rim.softness,
        distance: lighting.rim.distance,
        enabled: true,
      } : undefined,
      ambient: lighting.ambient.enabled ? {
        intensity: lighting.ambient.intensity,
        color_temperature: lighting.ambient.color_temperature,
        enabled: true,
      } : undefined,
    },
    camera: {
      focal_length: camera.focal_length,
      aperture: camera.aperture,
      iso: camera.iso,
      white_balance: camera.white_balance,
      metering_mode: camera.metering_mode,
      shot_type: camera.shot_type,
      camera_angle: camera.camera_angle,
    },
    scene: {
      subject_description: scene.subject_description,
      environment: scene.environment,
      style_preset: scene.style_preset,
      background: scene.background,
    },
  };
}

/**
 * Validate FIBO JSON structure
 */
export function validateFIBOJson(json: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!json || typeof json !== 'object') {
    return { valid: false, errors: ['FIBO JSON must be an object'] };
  }

  const fibo = json as Record<string, unknown>;

  // Validate lighting structure
  if (fibo.lighting && typeof fibo.lighting === 'object') {
    const lighting = fibo.lighting as Record<string, unknown>;
    
    ['key_light', 'fill_light', 'rim_light'].forEach(lightType => {
      if (lighting[lightType] && typeof lighting[lightType] === 'object') {
        const light = lighting[lightType] as Record<string, unknown>;
        if (light.intensity !== undefined && (typeof light.intensity !== 'number' || light.intensity < 0 || light.intensity > 2)) {
          errors.push(`${lightType}.intensity must be a number between 0 and 2`);
        }
        if (light.angle_horizontal !== undefined && (typeof light.angle_horizontal !== 'number' || light.angle_horizontal < -180 || light.angle_horizontal > 180)) {
          errors.push(`${lightType}.angle_horizontal must be between -180 and 180`);
        }
      }
    });
  }

  // Validate camera structure
  if (fibo.camera && typeof fibo.camera === 'object') {
    const camera = fibo.camera as Record<string, unknown>;
    if (camera.focal_length !== undefined && (typeof camera.focal_length !== 'number' || camera.focal_length < 0)) {
      errors.push('camera.focal_length must be a positive number');
    }
    if (camera.aperture !== undefined && (typeof camera.aperture !== 'number' || camera.aperture < 0)) {
      errors.push('camera.aperture must be a positive number');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get FIBO JSON statistics
 */
export function getFIBOStats(json: FIBOStructuredPrompt | Record<string, unknown>): {
  totalLights: number;
  enabledLights: number;
  hasCamera: boolean;
  hasScene: boolean;
} {
  const fibo = json as FIBOStructuredPrompt;
  const lighting = fibo.lighting || {};
  
  const lights = [
    lighting.key_light,
    lighting.fill_light,
    lighting.rim_light,
  ].filter(Boolean);
  
  const enabledLights = lights.filter(light => light?.enabled).length;

  return {
    totalLights: lights.length,
    enabledLights,
    hasCamera: !!fibo.camera,
    hasScene: !!fibo.scene,
  };
}

