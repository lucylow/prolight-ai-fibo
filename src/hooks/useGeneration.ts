import { useState } from 'react';
import { useLightingStore } from '@/stores/lightingStore';
import { toast } from 'sonner';
import { getMockGenerationResponse } from '@/services/mockData';
import type { GenerateRequest } from '@/types/fibo';
import {
  generateLighting,
  generateFromNaturalLanguage,
  analyzeLighting,
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
      const sceneRequest: GenerateLightingRequest = {
        subjectDescription: sceneSettings.subjectDescription,
        environment: sceneSettings.environment,
        lightingSetup: lightingSetup as GenerateLightingRequest['lightingSetup'],
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
          lighting_setup: lightingSetup as Record<string, unknown>,
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
      const nlRequest = {
        sceneDescription,
        lightingDescription,
        subject: sceneSettings.subjectDescription,
        styleIntent: sceneSettings.stylePreset,
      };

      console.log('Generating from NL:', nlRequest);

      let data;
      let fnError;

      try {
        const result = await supabase.functions.invoke('natural-language-lighting', {
          body: nlRequest
        });
        data = result.data;
        fnError = result.error;
      } catch (invokeError) {
        console.warn('Supabase function invocation failed, using mock data:', invokeError);
        fnError = invokeError as Error;
      }

      // If there's an error, try to use mock data as fallback
      if (fnError) {
        const errorMessage = fnError instanceof Error ? fnError.message : String(fnError);
        const isNetworkError = errorMessage.includes('network') || 
                              errorMessage.includes('fetch') || 
                              errorMessage.includes('Failed to fetch');
        
        // Use mock data for network errors or if explicitly enabled
        if (isNetworkError || import.meta.env.VITE_USE_MOCK_DATA === 'true') {
          console.info('Falling back to mock data due to error:', errorMessage);
          toast.warning('Using mock data due to connection issue. Some features may be limited.');
          
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
        
        // For non-network errors, throw normally
        const genError = getErrorMessage({ error: { message: errorMessage, code: fnError.name || 'FUNCTION_ERROR' } });
        setError(genError);
        toast.error(getUserFriendlyMessage(genError));
        throw genError;
      }

      if (data?.error) {
        const genError = getErrorMessage(data);
        setError(genError);
        toast.error(getUserFriendlyMessage(genError));
        throw genError;
      }

      // Validate response has required fields
      if (!data?.image_url && !data?.image_id) {
        // Try mock data fallback if response is invalid
        console.warn('Invalid response, falling back to mock data');
        toast.warning('Invalid response received. Using mock data.');
        
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
      const genError = getErrorMessage(err);
      setError(genError);
      toast.error(getUserFriendlyMessage(genError));
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
        return getMockLightingAnalysis(lightingSetup as Record<string, unknown>);
      }

      const request: AnalyzeLightingRequest = {
        lightingSetup: lightingSetup as AnalyzeLightingRequest['lightingSetup'],
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
