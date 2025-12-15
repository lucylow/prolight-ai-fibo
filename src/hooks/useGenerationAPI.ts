import { useState } from 'react';
import { useLightingStore } from '@/stores/lightingStore';
import { apiClient } from '@/services/apiClient';
import type { GenerateRequest } from '@/types/fibo';
import { toast } from 'sonner';

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
   * Maps directions like "45 degrees camera-right" to {x, y, z}
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

    // Try to match direction keywords
    const lowerDir = direction.toLowerCase();
    for (const [key, pos] of Object.entries(directionMap)) {
      if (lowerDir.includes(key)) {
        return pos;
      }
    }

    // Parse angle-based directions like "45 degrees camera-right"
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

    // Default to front
    return { x: 0, y: 1.5, z: 2 };
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
        throw new Error('Please enable at least one light');
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
        fibo_json: result.fibo_json || {},
        lightingAnalysis: result.analysis || {},
        generation_metadata: {
          duration_seconds: result.duration_seconds,
          cost_credits: result.cost_credits,
        },
      });

      toast.success('Image generated successfully with FIBO!');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
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
      // Parse lighting description to create lights
      const lights: Light[] = [
        {
          id: 'key',
          type: 'directional',
          position: { x: 1, y: 2, z: 3 },
          intensity: 0.8,
          color_temperature: 5600,
          softness: 0.3,
          enabled: true,
        },
      ];

      const request: GenerateRequest = {
        scene_prompt: `${sceneDescription}. Lighting: ${lightingDescription}`,
        lights,
        num_results: 1,
        sync: true,
      };

      console.log('Generating from NL:', request);

      const result = await generateImage(request);

      if (!result.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      console.log('NL Generation result:', result);

      setGenerationResult({
        image_url: result.image_url || '',
        image_id: result.request_id || '',
        fibo_json: result.structured_prompt || {},
        lightingAnalysis: result.meta || {},
        generation_metadata: result.meta || {},
      });

      toast.success('Image generated from description!');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
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
      const lights = convertLightingToAPI();
      
      // Calculate lighting ratios
      const keyLight = lights.find(l => l.id === 'key');
      const fillLight = lights.find(l => l.id === 'fill');
      
      const ratio = keyLight && fillLight 
        ? (keyLight.intensity / fillLight.intensity).toFixed(1)
        : 'N/A';

      const analysis = {
        ratio,
        style: parseFloat(ratio) >= 4 ? 'Dramatic' : parseFloat(ratio) >= 2 ? 'Classical Portrait' : 'Soft Lighting',
        rating: parseFloat(ratio) >= 2 && parseFloat(ratio) <= 4 ? 8.5 : 7.0,
        lights: lights.length,
      };

      console.log('Analysis result:', analysis);
      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      toast.error(errorMessage);
      throw new Error(errorMessage);
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
