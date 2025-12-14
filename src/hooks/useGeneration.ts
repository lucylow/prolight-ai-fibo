import { useState } from 'react';
import { useLightingStore } from '@/stores/lightingStore';
import { toast } from 'sonner';
import { getMockGenerationResponse } from '@/services/mockData';
import type { GenerateRequest } from '@/types/fibo';
import {
  generateLighting as generateLightingAPI,
  generateFromNaturalLanguage as generateFromNaturalLanguageAPI,
  analyzeLighting as analyzeLightingAPI,
  EdgeFunctionErrorClass,
  type GenerateLightingRequest,
  type NaturalLanguageLightingRequest,
  type AnalyzeLightingRequest,
} from '@/services/supabaseEdgeClient';

// Backward compatibility: export GenerationError type
export interface GenerationError {
  message: string;
  code?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

// Convert EdgeFunctionErrorClass to GenerationError for backward compatibility
const toGenerationError = (error: unknown): GenerationError => {
  if (error instanceof EdgeFunctionErrorClass) {
    return {
      message: error.message,
      code: error.code,
      retryable: error.isRetryable(),
      details: error.details,
    };
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as { message: string; code?: string };
    return {
      message: err.message,
      code: err.code || 'UNKNOWN_ERROR',
      retryable: false,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    retryable: false,
  };
};

export const useGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<GenerationError | null>(null);
  const { setLoading, setGenerationResult, lightingSetup, cameraSettings, sceneSettings } = useLightingStore();

  const generateFromCurrentSetup = async () => {
    setIsGenerating(true);
    setError(null);
    setLoading(true);

    try {
      // Convert LightingSetup to API format
      const apiLightingSetup: GenerateLightingRequest['lightingSetup'] = {
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

      const sceneRequest: GenerateLightingRequest = {
        subjectDescription: sceneSettings.subjectDescription,
        environment: sceneSettings.environment,
        lightingSetup: apiLightingSetup,
        cameraSettings,
        stylePreset: sceneSettings.stylePreset,
        enhanceHDR: sceneSettings.enhanceHDR,
      };

      console.log('Generating from setup:', sceneRequest);

      // Use mock data if explicitly enabled
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        console.info('Using mock data (VITE_USE_MOCK_DATA enabled)');
        const mockRequest: GenerateRequest = {
          scene_description: sceneSettings.subjectDescription || sceneSettings.environment || 'Professional product photography',
          lighting_setup: {
            key: lightingSetup.key,
            fill: lightingSetup.fill,
            rim: lightingSetup.rim,
            ambient: lightingSetup.ambient,
          } as unknown as Record<string, unknown>,
          use_mock: true,
        };
        const mockResponse = getMockGenerationResponse(mockRequest);
        setGenerationResult({
          image_url: mockResponse.image_url,
          image_id: mockResponse.generation_id,
          fibo_json: undefined,
          lightingAnalysis: mockResponse.analysis,
          generation_metadata: {
            timestamp: mockResponse.timestamp,
            duration_seconds: mockResponse.duration_seconds,
            cost_credits: mockResponse.cost_credits,
          }
        });
        setError(null);
        toast.success('Mock image generated successfully!');
        return {
          image_url: mockResponse.image_url,
          image_id: mockResponse.generation_id,
          fibo_json: undefined,
          lighting_analysis: mockResponse.analysis,
          generation_metadata: {
            timestamp: mockResponse.timestamp,
            duration_seconds: mockResponse.duration_seconds,
            cost_credits: mockResponse.cost_credits,
          }
        };
      }

      // Call the edge function with improved error handling
      const data = await generateLighting(sceneRequest, {
        showToast: false, // We'll show toast after setting state
      });

      console.log('Generation result:', data);

      setGenerationResult({
        image_url: data.image_url,
        image_id: data.image_id,
        fibo_json: data.fibo_json,
        lightingAnalysis: data.lighting_analysis,
        generation_metadata: data.generation_metadata
      });

      setError(null);
      toast.success('Image generated successfully!');
      return data;
    } catch (err) {
      const genError = toGenerationError(err);
      setError(genError);
      
      // Show error toast (already shown by edge client, but show again if needed)
      if (err instanceof EdgeFunctionErrorClass) {
        toast.error(err.getUserMessage());
      } else {
        toast.error(genError.message || 'An unexpected error occurred');
      }
      
      throw genError;
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const generateFromNaturalLanguage = async (sceneDescription: string, lightingDescription: string) => {
    setIsGenerating(true);
    setError(null);
    setLoading(true);

    try {
      const nlRequest: NaturalLanguageLightingRequest = {
        sceneDescription,
        lightingDescription,
        subject: sceneSettings.subjectDescription,
        styleIntent: sceneSettings.stylePreset,
        environment: sceneSettings.environment,
      };

      console.log('Generating from NL:', nlRequest);

      // Use mock data if explicitly enabled
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        console.info('Using mock data (VITE_USE_MOCK_DATA enabled)');
        const mockRequest: GenerateRequest = {
          scene_description: sceneDescription,
          lighting_setup: {},
          use_mock: true,
        };
        const mockResponse = getMockGenerationResponse(mockRequest);
        setGenerationResult({
          image_url: mockResponse.image_url,
          image_id: mockResponse.generation_id,
          fibo_json: undefined,
          lightingAnalysis: mockResponse.analysis,
          generation_metadata: {
            timestamp: mockResponse.timestamp,
            duration_seconds: mockResponse.duration_seconds,
            cost_credits: mockResponse.cost_credits,
          }
        });
        setError(null);
        toast.success('Mock image generated from description!');
        return {
          image_url: mockResponse.image_url,
          image_id: mockResponse.generation_id,
          fibo_json: undefined,
          lighting_analysis: mockResponse.analysis,
          generation_metadata: {
            timestamp: mockResponse.timestamp,
            duration_seconds: mockResponse.duration_seconds,
            cost_credits: mockResponse.cost_credits,
          }
        };
      }

      // Call the edge function with improved error handling
      const data = await generateFromNaturalLanguageAPI(nlRequest, {
        showToast: false, // We'll show toast after setting state
      });

      console.log('NL Generation result:', data);

      setGenerationResult({
        image_url: data.image_url,
        image_id: data.image_id,
        fibo_json: data.fibo_json,
        lightingAnalysis: data.lighting_analysis,
        generation_metadata: data.generation_metadata
      });

      setError(null);
      toast.success('Image generated from description!');
      return data;
    } catch (err) {
      const genError = toGenerationError(err);
      setError(genError);
      
      // Show error toast (already shown by edge client, but show again if needed)
      if (err instanceof EdgeFunctionErrorClass) {
        toast.error(err.getUserMessage());
      } else {
        toast.error(genError.message || 'An unexpected error occurred');
      }
      
      throw genError;
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const analyzeLighting = async () => {
    try {
      // Use mock data if explicitly enabled
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        console.info('Using mock data for analysis (VITE_USE_MOCK_DATA enabled)');
        const { getMockLightingAnalysis } = await import('@/services/mockData');
        return getMockLightingAnalysis(lightingSetup as unknown as Record<string, unknown>);
      }

      // Convert LightingSetup to API format
      const apiLightingSetup: AnalyzeLightingRequest['lightingSetup'] = {
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

      const request: AnalyzeLightingRequest = {
        lightingSetup: apiLightingSetup,
        styleContext: sceneSettings.stylePreset,
      };

      const data = await analyzeLightingAPI(request, {
        showToast: true,
      });

      console.log('Analysis result:', data);
      return data;
    } catch (err) {
      const genError = toGenerationError(err);
      
      // For retryable errors, try mock data as fallback
      if (genError.retryable) {
        try {
          const { getMockLightingAnalysis } = await import('@/services/mockData');
          const mockAnalysis = getMockLightingAnalysis(lightingSetup as Record<string, unknown>);
          toast.warning('Using mock analysis data as fallback.');
          return mockAnalysis;
        } catch {
          // If mock data fails, continue to throw original error
        }
      }
      
      // Error toast already shown by edge client
      throw genError;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    isGenerating,
    error,
    clearError,
    generateFromCurrentSetup,
    generateFromNaturalLanguage,
    analyzeLighting,
  };
};
