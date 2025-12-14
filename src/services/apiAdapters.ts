/**
 * API Adapters
 * Unified type transformation layer between store types and API types
 */

import type { LightingSetup, CameraSettings, SceneSettings } from '@/stores/lightingStore';
import type {
  GenerateLightingRequest,
  AnalyzeLightingRequest,
  NaturalLanguageLightingRequest,
} from '@/services/supabaseEdgeClient';

/**
 * Convert store LightingSetup to API format
 */
export function adaptLightingSetupToAPI(
  lightingSetup: LightingSetup
): GenerateLightingRequest['lightingSetup'] {
  return {
    key: {
      direction: lightingSetup.key.direction,
      intensity: lightingSetup.key.intensity,
      colorTemperature: lightingSetup.key.colorTemperature,
      softness: lightingSetup.key.softness,
      distance: lightingSetup.key.distance,
      enabled: lightingSetup.key.enabled,
    },
    fill: {
      direction: lightingSetup.fill.direction,
      intensity: lightingSetup.fill.intensity,
      colorTemperature: lightingSetup.fill.colorTemperature,
      softness: lightingSetup.fill.softness,
      distance: lightingSetup.fill.distance,
      enabled: lightingSetup.fill.enabled,
    },
    rim: {
      direction: lightingSetup.rim.direction,
      intensity: lightingSetup.rim.intensity,
      colorTemperature: lightingSetup.rim.colorTemperature,
      softness: lightingSetup.rim.softness,
      distance: lightingSetup.rim.distance,
      enabled: lightingSetup.rim.enabled,
    },
    ambient: {
      direction: 'omnidirectional',
      intensity: lightingSetup.ambient.intensity,
      colorTemperature: lightingSetup.ambient.colorTemperature,
      softness: 1.0,
      distance: 0,
      enabled: lightingSetup.ambient.enabled,
    },
  };
}

/**
 * Convert store settings to GenerateLightingRequest
 */
export function adaptToGenerateRequest(
  lightingSetup: LightingSetup,
  cameraSettings: CameraSettings,
  sceneSettings: SceneSettings
): GenerateLightingRequest {
  return {
    subjectDescription: sceneSettings.subjectDescription,
    environment: sceneSettings.environment,
    lightingSetup: adaptLightingSetupToAPI(lightingSetup),
    cameraSettings,
    stylePreset: sceneSettings.stylePreset,
    enhanceHDR: sceneSettings.enhanceHDR,
  };
}

/**
 * Convert store settings to AnalyzeLightingRequest
 */
export function adaptToAnalyzeRequest(
  lightingSetup: LightingSetup,
  styleContext?: string
): AnalyzeLightingRequest {
  return {
    lightingSetup: adaptLightingSetupToAPI(lightingSetup),
    styleContext,
  };
}

/**
 * Convert store settings to NaturalLanguageLightingRequest
 */
export function adaptToNaturalLanguageRequest(
  sceneDescription: string,
  lightingDescription: string,
  sceneSettings: SceneSettings
): NaturalLanguageLightingRequest {
  return {
    sceneDescription,
    lightingDescription,
    subject: sceneSettings.subjectDescription,
    styleIntent: sceneSettings.stylePreset,
    environment: sceneSettings.environment,
  };
}

/**
 * Type guard to validate API response structure
 */
export function isValidGenerateResponse(data: unknown): data is {
  image_url: string;
  image_id: string;
  lighting_analysis?: unknown;
  generation_metadata?: unknown;
} {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.image_url === 'string' &&
    typeof d.image_id === 'string' &&
    d.image_url.length > 0 &&
    d.image_id.length > 0
  );
}

/**
 * Type guard to validate analysis response structure
 */
export function isValidAnalysisResponse(data: unknown): data is {
  keyFillRatio: number;
  lightingStyle: string;
  totalExposure: number;
  contrastScore: number;
  professionalRating: number;
} {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.keyFillRatio === 'number' &&
    typeof d.lightingStyle === 'string' &&
    typeof d.totalExposure === 'number' &&
    typeof d.contrastScore === 'number' &&
    typeof d.professionalRating === 'number'
  );
}
