import { useState, useRef, useCallback } from 'react';
import { useLightingStore } from '@/stores/lightingStore';
import { toast } from 'sonner';
import { getMockGenerationResponse } from '@/services/mockData';
import type { GenerateRequest } from '@/types/fibo';
import {
  generateLighting as generateLightingAPI,
  generateFromNaturalLanguage as generateFromNaturalLanguageAPI,
  analyzeLighting as analyzeLightingAPI,
  generateWithFlux2,
  EdgeFunctionErrorClass,
  type GenerateLightingRequest,
  type NaturalLanguageLightingRequest,
  type AnalyzeLightingRequest,
  type Flux2GenerateRequest,
} from '@/services/supabaseEdgeClient';
import {
  adaptToGenerateRequest,
  adaptToAnalyzeRequest,
  adaptToNaturalLanguageRequest,
  isValidGenerateResponse,
  isValidAnalysisResponse,
} from '@/services/apiAdapters';
import { requestManager } from '@/services/requestManager';

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
  const [progress, setProgress] = useState<{ step: string; percentage: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { setLoading, setGenerationResult, lightingSetup, cameraSettings, sceneSettings } = useLightingStore();

  // Cancel current generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      setLoading(false);
      setProgress(null);
      toast.info('Generation cancelled');
    }
  }, [setLoading]);

  const generateFromCurrentSetup = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setLoading(true);
    setProgress({ step: 'Preparing request...', percentage: 0 });

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Use adapter for type transformation
      const sceneRequest = adaptToGenerateRequest(lightingSetup, cameraSettings, sceneSettings);

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
          lightingAnalysis: mockResponse.analysis as unknown as {
            keyFillRatio: number;
            lightingStyle: string;
            totalExposure: number;
            contrastScore: number;
            professionalRating: number;
          },
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
      const data = await generateLightingAPI(sceneRequest, {
        showToast: false, // We'll show toast after setting state
      });

      console.log('Generation result:', data);

      setProgress({ step: 'Finalizing...', percentage: 100 });
      
      // Extract lighting analysis with type safety
      const lightingAnalysis = data.lighting_analysis as {
        keyFillRatio: number;
        lightingStyle: string;
        totalExposure: number;
        contrastScore: number;
        professionalRating: number;
      } | undefined;

      setGenerationResult({
        image_url: data.image_url,
        image_id: data.image_id,
        fibo_json: data.fibo_json,
        lightingAnalysis,
        generation_metadata: data.generation_metadata
      });

      setError(null);
      setProgress(null);
      toast.success('Image generated successfully!');
      return data;
    } catch (err) {
      // Don't show error if request was cancelled
      if (err instanceof Error && err.name === 'AbortError') {
        setProgress(null);
        return;
      }
      
      const genError = toGenerationError(err);
      setError(genError);
      setProgress(null);
      
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
      abortControllerRef.current = null;
    }
  }, [lightingSetup, cameraSettings, sceneSettings, setLoading, setGenerationResult]);

  const generateFromNaturalLanguage = async (sceneDescription: string, lightingDescription: string) => {
    setIsGenerating(true);
    setError(null);
    setLoading(true);

    try {
      // Extract subject from scene description if not explicitly provided
      // Use scene description as subject, or extract the main subject if possible
      const subject = sceneDescription.trim() || sceneSettings.subjectDescription || 'professional subject';
      
      const nlRequest: NaturalLanguageLightingRequest = {
        sceneDescription,
        lightingDescription,
        subject,
        styleIntent: sceneSettings.stylePreset,
        environment: sceneSettings.environment,
      };

      console.log('Generating from NL:', nlRequest);

      // Use mock data if explicitly enabled
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        console.info('Using mock data (VITE_USE_MOCK_DATA enabled)');
        setProgress({ step: 'Generating mock image...', percentage: 50 });
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const mockRequest: GenerateRequest = {
          scene_description: sceneDescription,
          lighting_setup: {},
          use_mock: true,
        };
        const mockResponse = getMockGenerationResponse(mockRequest);
        
        setProgress({ step: 'Finalizing...', percentage: 100 });
        await new Promise((resolve) => setTimeout(resolve, 200));
        
        setGenerationResult({
          image_url: mockResponse.image_url,
          image_id: mockResponse.generation_id,
          fibo_json: undefined,
          lightingAnalysis: mockResponse.analysis as unknown as {
            keyFillRatio: number;
            lightingStyle: string;
            totalExposure: number;
            contrastScore: number;
            professionalRating: number;
          },
          generation_metadata: {
            timestamp: mockResponse.timestamp,
            duration_seconds: mockResponse.duration_seconds,
            cost_credits: mockResponse.cost_credits,
          }
        });
        setError(null);
        setProgress(null);
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

      setProgress({ step: 'Sending request...', percentage: 10 });
      
      const data = await requestManager.execute(
        'generate-natural-language',
        nlRequest as unknown as Record<string, unknown>,
        async (signal) => {
          setProgress({ step: 'Generating image...', percentage: 30 });
          
          const result = await generateFromNaturalLanguageAPI(nlRequest, {
            showToast: false,
            signal, // Pass abort signal
          });
          
          setProgress({ step: 'Processing result...', percentage: 90 });
          
          if (!isValidGenerateResponse(result)) {
            throw new Error('Invalid response format from server');
          }
          
          return result;
        },
        {
          skipCache: true,
          skipDeduplication: false,
        }
      );

      console.log('NL Generation result:', data);

      setGenerationResult({
        image_url: data.image_url,
        image_id: data.image_id,
        fibo_json: data.fibo_json,
        lightingAnalysis: data.lighting_analysis as {
          keyFillRatio: number;
          lightingStyle: string;
          totalExposure: number;
          contrastScore: number;
          professionalRating: number;
        },
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

  const analyzeLighting = useCallback(async () => {
    try {
      // Use mock data if explicitly enabled
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        console.info('Using mock data for analysis (VITE_USE_MOCK_DATA enabled)');
        const { getMockLightingAnalysis } = await import('@/services/mockData');
        return getMockLightingAnalysis({
          key: lightingSetup.key,
          fill: lightingSetup.fill,
          rim: lightingSetup.rim,
          ambient: lightingSetup.ambient,
        } as unknown as Record<string, unknown>);
      }

      // Use adapter for type transformation
      const request = adaptToAnalyzeRequest(lightingSetup, sceneSettings.stylePreset);

      // Use request manager with caching for analysis (frequently accessed)
      const data = await requestManager.execute(
        'analyze-lighting',
        request as unknown as Record<string, unknown>,
        async (signal) => {
          const result = await analyzeLightingAPI(request, {
            showToast: true,
            signal, // Pass abort signal
          });
          
          // Validate response
          if (!isValidAnalysisResponse(result)) {
            throw new Error('Invalid analysis response format');
          }
          
          return result;
        },
        {
          cacheTTL: 2 * 60 * 1000, // Cache analysis for 2 minutes
          skipCache: false,
          skipDeduplication: false,
        }
      );

      console.log('Analysis result:', data);
      return data;
    } catch (err) {
      const genError = toGenerationError(err);
      
      // For retryable errors, try mock data as fallback
      if (genError.retryable) {
        try {
          const { getMockLightingAnalysis } = await import('@/services/mockData');
          const mockAnalysis = getMockLightingAnalysis(lightingSetup as unknown as Record<string, unknown>);
          toast.warning('Using mock analysis data as fallback.');
          return mockAnalysis;
        } catch {
          // If mock data fails, continue to throw original error
        }
      }
      
      // Error toast already shown by edge client
      throw genError;
    }
  }, [lightingSetup, sceneSettings.stylePreset]);

  /**
   * Generate image using FLUX.2 with FIBO JSON prompt
   */
  const generateWithFlux2FromSetup = useCallback(async (options?: {
    seed?: number;
    steps?: number;
    guidance?: number;
  }) => {
    setIsGenerating(true);
    setError(null);
    setLoading(true);
    setProgress({ step: 'Preparing FLUX.2 request...', percentage: 0 });

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Build FIBO JSON from current lighting setup
      const lightingJson: Record<string, Record<string, unknown>> = {};
      
      if (lightingSetup.key.enabled) {
        lightingJson.key_light = {
          direction: lightingSetup.key.direction,
          intensity: lightingSetup.key.intensity,
          color_temperature: lightingSetup.key.colorTemperature,
          softness: lightingSetup.key.softness,
          distance: lightingSetup.key.distance,
          falloff: "inverse_square"
        };
      }
      
      if (lightingSetup.fill.enabled) {
        lightingJson.fill_light = {
          direction: lightingSetup.fill.direction,
          intensity: lightingSetup.fill.intensity,
          color_temperature: lightingSetup.fill.colorTemperature,
          softness: lightingSetup.fill.softness,
          distance: lightingSetup.fill.distance,
          falloff: "inverse_square"
        };
      }
      
      if (lightingSetup.rim.enabled) {
        lightingJson.rim_light = {
          direction: lightingSetup.rim.direction,
          intensity: lightingSetup.rim.intensity,
          color_temperature: lightingSetup.rim.colorTemperature,
          softness: lightingSetup.rim.softness,
          distance: lightingSetup.rim.distance,
          falloff: "inverse_square"
        };
      }
      
      if (lightingSetup.ambient.enabled) {
        lightingJson.ambient_light = {
          direction: 'omnidirectional',
          intensity: lightingSetup.ambient.intensity,
          color_temperature: lightingSetup.ambient.colorTemperature,
          softness: 1.0,
          distance: 0,
          falloff: "inverse_square"
        };
      }

      const keyTemp = lightingSetup.key.colorTemperature || 5600;
      
      const fiboJson = {
        subject: {
          main_entity: sceneSettings.subjectDescription,
          attributes: ["professionally lit", "high quality", "detailed", "sharp focus"],
          action: "posed for professional photograph",
        },
        environment: {
          setting: sceneSettings.environment,
          time_of_day: "controlled lighting",
          lighting_conditions: "professional studio",
          atmosphere: sceneSettings.environment.includes("outdoor") ? "natural" : "controlled"
        },
        camera: {
          shot_type: cameraSettings.shotType,
          camera_angle: cameraSettings.cameraAngle,
          fov: cameraSettings.fov,
          lens_type: cameraSettings.lensType,
          aperture: cameraSettings.aperture,
          focus: "sharp on subject",
        },
        lighting: lightingJson,
        style_medium: "photograph",
        artistic_style: "professional studio photography",
        color_palette: {
          white_balance: `${keyTemp}K`,
          mood: keyTemp < 4500 ? "warm" : keyTemp > 6000 ? "cool" : "neutral"
        },
        render: {
          resolution: [2048, 2048],
          color_space: "ACEScg",
          bit_depth: 16,
          sampler_steps: options?.steps || 40,
        },
        composition: {
          rule_of_thirds: true,
          depth_layers: ["foreground", "subject", "background"]
        },
      };

      const flux2Request: Flux2GenerateRequest = {
        prompt_json: fiboJson,
        mode: 'generate',
        seed: options?.seed,
        steps: options?.steps || 40,
        guidance: options?.guidance || 7.5,
        output_format: 'png',
      };

      console.log('Generating with FLUX.2:', flux2Request);

      setProgress({ step: 'Sending FLUX.2 request...', percentage: 10 });

      const data = await requestManager.execute(
        'generate-flux2',
        flux2Request as unknown as Record<string, unknown>,
        async (signal) => {
          setProgress({ step: 'Generating with FLUX.2...', percentage: 30 });
          
          const result = await generateWithFlux2(flux2Request, {
            showToast: false,
            signal, // Pass abort signal
          });
          
          setProgress({ step: 'Processing result...', percentage: 90 });
          
          return result;
        },
        {
          skipCache: true,
          skipDeduplication: false,
        }
      );

      console.log('FLUX.2 Generation result:', data);

      // Type assertion for FLUX.2 response
      const flux2Data = data as {
        image_url?: string | null;
        image_b64?: string | null;
        image_id: string;
        json_prompt: Record<string, unknown>;
        cost: number;
        generation_metadata: Record<string, unknown>;
      };

      // Handle base64 image if returned
      let imageUrl = flux2Data.image_url;
      if (!imageUrl && flux2Data.image_b64) {
        // Convert base64 to data URL for display
        imageUrl = `data:image/png;base64,${flux2Data.image_b64}`;
      }

      setGenerationResult({
        image_url: imageUrl || '',
        image_id: flux2Data.image_id,
        fibo_json: flux2Data.json_prompt,
        lightingAnalysis: {
          keyFillRatio: 0,
          lightingStyle: 'flux2',
          totalExposure: 0,
          contrastScore: 0,
          professionalRating: 0,
        },
        generation_metadata: {
          ...flux2Data.generation_metadata,
          cost: flux2Data.cost,
        }
      });

      setError(null);
      setProgress(null);
      toast.success('Image generated with FLUX.2!');
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setProgress(null);
        return;
      }
      
      const genError = toGenerationError(err);
      setError(genError);
      setProgress(null);
      
      if (err instanceof EdgeFunctionErrorClass) {
        toast.error(err.getUserMessage());
      } else {
        toast.error(genError.message || 'An unexpected error occurred');
      }
      
      throw genError;
    } finally {
      setIsGenerating(false);
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [lightingSetup, cameraSettings, sceneSettings, setLoading, setGenerationResult]);

  const clearError = () => {
    setError(null);
  };

  return {
    isGenerating,
    error,
    progress,
    clearError,
    cancelGeneration,
    generateFromCurrentSetup,
    generateFromNaturalLanguage,
    generateWithFlux2FromSetup,
    analyzeLighting,
  };
};
