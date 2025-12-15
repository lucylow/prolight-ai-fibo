import { useState } from 'react';
import { useLightingStore } from '@/stores/lightingStore';
import { apiClient } from '@/services/apiClient';
import type { GenerateRequest, LightingAnalysis as APILightingAnalysis } from '@/types/fibo';
import { toast } from 'sonner';
import { getErrorMessage, ValidationError } from '@/lib/errors';

/**
 * Hook for generating images using FastAPI backend
 * Replaces Supabase functions with direct API calls
 */
export const useGenerationAPI = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { 
    setLoading, 
    setGenerationResult, 
    lightingSetup, 
    cameraSettings, 
    sceneSettings 
  } = useLightingStore();

  /**
   * Convert lighting setup to API format
   */
  const convertLightingToAPI = (): Record<string, any> => {
    const lighting: Record<string, any> = {};

    if (lightingSetup.key.enabled) {
      lighting.mainLight = {
        type: 'area',
        direction: lightingSetup.key.direction,
        position: parsePosition(lightingSetup.key.direction),
        intensity: lightingSetup.key.intensity,
        colorTemperature: lightingSetup.key.colorTemperature,
        softness: lightingSetup.key.softness,
        enabled: true,
        distance: 1.5,
      };
    }

    if (lightingSetup.fill.enabled) {
      lighting.fillLight = {
        type: 'point',
        direction: lightingSetup.fill.direction,
        position: parsePosition(lightingSetup.fill.direction),
        intensity: lightingSetup.fill.intensity,
        colorTemperature: lightingSetup.fill.colorTemperature,
        softness: lightingSetup.fill.softness,
        enabled: true,
        distance: 2.0,
      };
    }

    if (lightingSetup.rim.enabled) {
      lighting.rimLight = {
        type: 'spot',
        direction: lightingSetup.rim.direction,
        position: parsePosition(lightingSetup.rim.direction),
        intensity: lightingSetup.rim.intensity,
        colorTemperature: lightingSetup.rim.colorTemperature,
        softness: lightingSetup.rim.softness,
        enabled: true,
        distance: 2.5,
      };
    }

    lighting.lightingStyle = sceneSettings.stylePreset || 'custom';

    return lighting;
  };

  /**
   * Parse direction string to 3D position
   */
  const parsePosition = (direction: string): { x: number; y: number; z: number } => {
    const directionMap: Record<string, { x: number; y: number; z: number }> = {
      'front': { x: 0, y: 1.5, z: 2 },
      'front-right': { x: 1.5, y: 1.5, z: 1.5 },
      'right': { x: 2, y: 1.5, z: 0 },
      'back-right': { x: 1.5, y: 1.5, z: -1.5 },
      'back': { x: 0, y: 1.5, z: -2 },
      'back-left': { x: -1.5, y: 1.5, z: -1.5 },
      'left': { x: -2, y: 1.5, z: 0 },
      'front-left': { x: -1.5, y: 1.5, z: 1.5 },
      'overhead': { x: 0, y: 3, z: 0 },
      'underneath': { x: 0, y: -1, z: 0 },
    };

    const lowerDir = direction.toLowerCase();
    for (const [key, pos] of Object.entries(directionMap)) {
      if (lowerDir.includes(key)) {
        return pos;
      }
    }

    const angleMatch = lowerDir.match(/(\d+)\s*degrees?\s*(camera-)?(\w+)/);
    if (angleMatch) {
      const angle = parseInt(angleMatch[1]);
      const side = angleMatch[3];
      const rad = (angle * Math.PI) / 180;
      const distance = 2;
      
      if (side.includes('right')) {
        return { x: Math.cos(rad) * distance, y: 1.5, z: Math.sin(rad) * distance };
      } else if (side.includes('left')) {
        return { x: -Math.cos(rad) * distance, y: 1.5, z: Math.sin(rad) * distance };
      }
    }

    return { x: 0, y: 1.5, z: 2 };
  };

  /**
   * Convert API analysis to store format
   */
  const convertAnalysisToStore = (apiAnalysis?: APILightingAnalysis) => {
    if (!apiAnalysis) return undefined;
    return {
      keyFillRatio: apiAnalysis.key_to_fill_ratio || 0,
      lightingStyle: apiAnalysis.mood_assessment || 'custom',
      totalExposure: apiAnalysis.color_temperature_consistency || 0,
      contrastScore: apiAnalysis.color_temperature_consistency || 0,
      professionalRating: apiAnalysis.professional_rating || 0,
    };
  };

  /**
   * Generate from current lighting setup
   */
  const generateFromCurrentSetup = async () => {
    setIsGenerating(true);
    setError(null);
    setLoading(true);

    try {
      const lighting_setup = convertLightingToAPI();
      
      if (!lighting_setup.mainLight && !lighting_setup.fillLight && !lighting_setup.rimLight) {
        throw new ValidationError('Please enable at least one light');
      }

      const request: GenerateRequest = {
        scene_description: `${sceneSettings.subjectDescription} in ${sceneSettings.environment}`,
        lighting_setup,
        camera_settings: cameraSettings,
        render_settings: {
          resolution: [2048, 2048],
          colorSpace: 'ACEScg',
          bitDepth: 16,
          aov: ['beauty', 'diffuse', 'specular', 'depth'],
          samples: 40,
        },
        use_mock: false,
      };

      console.log('Generating from setup (FIBO backend):', request);

      const result = await apiClient.generate(request);

      console.log('Generation result:', result);

      setGenerationResult({
        image_url: result.image_url || '',
        image_id: result.generation_id || '',
        fibo_json: result.fibo_json ? JSON.parse(JSON.stringify(result.fibo_json)) : undefined,
        lightingAnalysis: convertAnalysisToStore(result.analysis),
        generation_metadata: {
          duration_seconds: result.duration_seconds,
          cost_credits: result.cost_credits,
        },
      });

      toast.success('Image generated successfully with FIBO!');
      return result;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error('Generation failed', {
        description: errorMessage,
      });
      throw err instanceof Error ? err : new Error(errorMessage);
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  /**
   * Generate from natural language description
   */
  const generateFromNaturalLanguage = async (
    sceneDescription: string,
    lightingDescription: string
  ) => {
    setIsGenerating(true);
    setError(null);
    setLoading(true);

    try {
      const request: GenerateRequest = {
        scene_description: `${sceneDescription}. Lighting: ${lightingDescription}`,
        lighting_setup: convertLightingToAPI(),
        camera_settings: cameraSettings,
        render_settings: {
          resolution: [2048, 2048],
          colorSpace: 'ACEScg',
          bitDepth: 16,
          aov: ['beauty'],
          samples: 40,
        },
        use_mock: false,
      };

      console.log('Generating from NL:', request);

      const result = await apiClient.generate(request);

      console.log('NL Generation result:', result);

      setGenerationResult({
        image_url: result.image_url || '',
        image_id: result.generation_id || '',
        fibo_json: result.fibo_json ? JSON.parse(JSON.stringify(result.fibo_json)) : undefined,
        lightingAnalysis: convertAnalysisToStore(result.analysis),
        generation_metadata: {
          duration_seconds: result.duration_seconds,
          cost_credits: result.cost_credits,
        },
      });

      toast.success('Image generated from description!');
      return result;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error('Generation failed', {
        description: errorMessage,
      });
      throw err instanceof Error ? err : new Error(errorMessage);
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  /**
   * Analyze current lighting setup
   */
  const analyzeLighting = async () => {
    try {
      const lighting = convertLightingToAPI();
      
      const keyIntensity = lighting.mainLight?.intensity || 0;
      const fillIntensity = lighting.fillLight?.intensity || 0;
      
      const ratio = fillIntensity > 0 
        ? (keyIntensity / fillIntensity).toFixed(1)
        : 'N/A';

      const analysis = {
        ratio,
        style: parseFloat(ratio) >= 4 ? 'Dramatic' : parseFloat(ratio) >= 2 ? 'Classical Portrait' : 'Soft Lighting',
        rating: parseFloat(ratio) >= 2 && parseFloat(ratio) <= 4 ? 8.5 : 7.0,
        lights: Object.keys(lighting).filter(k => k.includes('Light')).length,
      };

      console.log('Analysis result:', analysis);
      return analysis;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      toast.error('Analysis failed', {
        description: errorMessage,
      });
      throw err instanceof Error ? err : new Error(errorMessage);
    }
  };

  return {
    isGenerating,
    error,
    generateFromCurrentSetup,
    generateFromNaturalLanguage,
    analyzeLighting,
  };
};
