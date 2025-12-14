import { useState } from 'react';
import { useLightingStore } from '@/stores/lightingStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GenerationError {
  message: string;
  code?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

const getErrorMessage = (error: unknown): GenerationError => {
  if (error && typeof error === 'object' && 'error' in error) {
    const errorData = (error as { error: Record<string, unknown> }).error;
    return {
      message: (typeof errorData.message === 'string' ? errorData.message : typeof errorData.error === 'string' ? errorData.error : 'Generation failed'),
      code: (typeof errorData.errorCode === 'string' ? errorData.errorCode : typeof errorData.code === 'string' ? errorData.code : undefined),
      retryable: ['AI_RATE_LIMIT', 'AI_SERVER_ERROR', 'AI_TIMEOUT', 'AI_NETWORK_ERROR', 'NETWORK_ERROR', 'TIMEOUT_ERROR'].includes(
        (typeof errorData.errorCode === 'string' ? errorData.errorCode : typeof errorData.code === 'string' ? errorData.code : '') || ''
      ),
      details: errorData.details as Record<string, unknown> | undefined
    };
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = error.message;
    const message = typeof errorMessage === 'string' ? errorMessage : String(errorMessage);
    let code = 'UNKNOWN_ERROR';
    let retryable = false;

    const messageLower = message.toLowerCase();
    if (messageLower.includes('rate limit')) {
      code = 'RATE_LIMIT';
      retryable = true;
    } else if (messageLower.includes('timeout')) {
      code = 'TIMEOUT';
      retryable = true;
    } else if (messageLower.includes('network')) {
      code = 'NETWORK_ERROR';
      retryable = true;
    } else if (messageLower.includes('payment')) {
      code = 'PAYMENT_REQUIRED';
    } else if (messageLower.includes('authentication') || messageLower.includes('auth')) {
      code = 'AUTH_ERROR';
    }

    return { message, code, retryable };
  }

  return {
    message: typeof error === 'string' ? error : 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    retryable: false
  };
};

const getUserFriendlyMessage = (error: GenerationError): string => {
  switch (error.code) {
    case 'AI_RATE_LIMIT':
    case 'RATE_LIMIT':
      return 'Too many requests. Please wait a moment and try again.';
    case 'AI_TIMEOUT':
    case 'TIMEOUT':
      return 'The request took too long. Please try again.';
    case 'AI_NETWORK_ERROR':
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection and try again.';
    case 'AI_PAYMENT_REQUIRED':
    case 'PAYMENT_REQUIRED':
      return 'Payment required. Please add credits to your workspace.';
    case 'AI_AUTH_ERROR':
    case 'AUTH_ERROR':
      return 'Authentication failed. Please check your configuration.';
    case 'CONFIG_ERROR':
      return 'Configuration error. Please check that LOVABLE_API_KEY is set in your project secrets.';
    case 'AI_NO_IMAGE':
      return 'The AI service did not generate an image. Please try again with a different prompt.';
    case 'AI_INVALID_RESPONSE':
    case 'AI_INCOMPLETE_RESPONSE':
      return 'The AI service returned an invalid response. Please try again.';
    case 'AI_SERVER_ERROR':
      return 'The AI service is temporarily unavailable. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
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
      const sceneRequest = {
        subjectDescription: sceneSettings.subjectDescription,
        environment: sceneSettings.environment,
        lightingSetup,
        cameraSettings,
        stylePreset: sceneSettings.stylePreset,
        enhanceHDR: sceneSettings.enhanceHDR,
      };

      console.log('Generating from setup:', sceneRequest);

      const { data, error: fnError } = await supabase.functions.invoke('generate-lighting', {
        body: sceneRequest
      });

      if (fnError) {
        const genError = getErrorMessage({ error: { message: fnError.message, code: fnError.name } });
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
        const genError: GenerationError = {
          message: 'Invalid response from generation service',
          code: 'INVALID_RESPONSE',
          retryable: true
        };
        setError(genError);
        toast.error('Invalid response received. Please try again.');
        throw genError;
      }

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
      const genError = getErrorMessage(err);
      setError(genError);
      toast.error(getUserFriendlyMessage(genError));
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

      const { data, error: fnError } = await supabase.functions.invoke('natural-language-lighting', {
        body: nlRequest
      });

      if (fnError) {
        const genError = getErrorMessage({ error: { message: fnError.message, code: fnError.name } });
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
        const genError: GenerationError = {
          message: 'Invalid response from generation service',
          code: 'INVALID_RESPONSE',
          retryable: true
        };
        setError(genError);
        toast.error('Invalid response received. Please try again.');
        throw genError;
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
      const { data, error: fnError } = await supabase.functions.invoke('analyze-lighting', {
        body: lightingSetup
      });

      if (fnError) {
        const genError = getErrorMessage({ error: { message: fnError.message, code: fnError.name } });
        toast.error(getUserFriendlyMessage(genError));
        throw genError;
      }

      if (data?.error) {
        const genError = getErrorMessage(data);
        toast.error(getUserFriendlyMessage(genError));
        throw genError;
      }

      console.log('Analysis result:', data);
      return data;
    } catch (err) {
      const genError = getErrorMessage(err);
      toast.error(getUserFriendlyMessage(genError));
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
