import { useState } from 'react';
import { useLightingStore } from '@/stores/lightingStore';
import { generateImage, type Light, type GenerateRequest } from '@/lib/api';
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
  const convertLightingToAPI = (): Light[] => {
    const lights: Light[] = [];

    if (lightingSetup.key.enabled) {
      lights.push({
        id: 'key',
        type: 'directional',
        position: parsePosition(lightingSetup.key.direction),
        intensity: lightingSetup.key.intensity,
        color_temperature: lightingSetup.key.colorTemperature,
        softness: lightingSetup.key.softness,
        enabled: true,
      });
    }

    if (lightingSetup.fill.enabled) {
      lights.push({
        id: 'fill',
        type: 'point',
        position: parsePosition(lightingSetup.fill.direction),
        intensity: lightingSetup.fill.intensity,
        color_temperature: lightingSetup.fill.colorTemperature,
        softness: lightingSetup.fill.softness,
        enabled: true,
      });
    }

    if (lightingSetup.rim.enabled) {
      lights.push({
        id: 'rim',
        type: 'directional',
        position: parsePosition(lightingSetup.rim.direction),
        intensity: lightingSetup.rim.intensity,
        color_temperature: lightingSetup.rim.colorTemperature,
        softness: lightingSetup.rim.softness,
        enabled: true,
      });
    }

    return lights;
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
      const lights = convertLightingToAPI();
      
      if (lights.length === 0) {
        throw new Error('Please enable at least one light');
      }

      const request: GenerateRequest = {
        scene_prompt: `${sceneSettings.subjectDescription} in ${sceneSettings.environment}`,
        lights,
        subject_options: {
          style_preset: sceneSettings.stylePreset,
          enhance_hdr: sceneSettings.enhanceHDR,
        },
        num_results: 1,
        sync: true,
      };

      console.log('Generating from setup:', request);

      const result = await generateImage(request);

      if (!result.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      console.log('Generation result:', result);

      setGenerationResult({
        image_url: result.image_url || '',
        image_id: result.request_id || '',
        fibo_json: result.structured_prompt || {},
        lightingAnalysis: result.meta || {},
        generation_metadata: result.meta || {},
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
