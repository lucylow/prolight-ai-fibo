/**
 * Unified Supabase Edge Functions Client
 * Provides consistent error handling, retry logic, and type safety for all edge functions
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Standard error response from edge functions
 */
export interface EdgeFunctionError {
  error: string;
  errorCode: string;
  details?: Record<string, unknown>;
  timestamp?: string;
  retryAfter?: number;
}

/**
 * Standard success response wrapper
 */
export interface EdgeFunctionResponse<T = unknown> {
  data?: T;
  error?: EdgeFunctionError;
}

/**
 * Configuration for edge function requests
 */
export interface EdgeFunctionConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  showToast?: boolean;
  validateResponse?: (data: unknown) => boolean;
}

/**
 * Custom error class for edge function errors
 */
export class EdgeFunctionErrorClass extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 0,
    public details?: Record<string, unknown>,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
    Object.setPrototypeOf(this, EdgeFunctionErrorClass.prototype);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.retryable;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'AI_RATE_LIMIT':
      case 'RATE_LIMIT':
        return `Too many requests. Please wait ${this.retryAfter || 60} seconds and try again.`;
      case 'AI_TIMEOUT':
      case 'TIMEOUT_ERROR':
        return 'The request took too long. Please try again.';
      case 'AI_NETWORK_ERROR':
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection and try again.';
      case 'AI_PAYMENT_REQUIRED':
      case 'PAYMENT_REQUIRED':
        return 'Payment required. Please add credits to your workspace.';
      case 'AI_AUTH_ERROR':
      case 'AUTH_ERROR':
      case 'CONFIG_ERROR':
        return 'Configuration error. Please check that LOVABLE_API_KEY is set in your project secrets.';
      case 'AI_NO_IMAGE':
        return 'The AI service did not generate an image. Please try again with a different prompt.';
      case 'AI_INVALID_RESPONSE':
      case 'AI_INCOMPLETE_RESPONSE':
        return 'The AI service returned an invalid response. Please try again.';
      case 'AI_SERVER_ERROR':
      case 'SERVER_ERROR':
        return 'The service is temporarily unavailable. Please try again later.';
      case 'METHOD_NOT_ALLOWED':
        return 'Invalid request method.';
      case 'MISSING_BODY':
      case 'INVALID_JSON':
        return 'Invalid request format. Please check your input.';
      case 'VALIDATION_ERROR':
        return 'Request validation failed. Please check your input.';
      default:
        return this.message || 'An unexpected error occurred.';
    }
  }
}

/**
 * Invoke a Supabase edge function with error handling and retry logic
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>,
  config: EdgeFunctionConfig = {}
): Promise<T> {
  const {
    timeout = 60000, // 60s default timeout
    retries = 2,
    retryDelay = 1000,
    showToast = true,
    validateResponse,
  } = config;

  let lastError: EdgeFunctionErrorClass | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const result = await supabase.functions.invoke(functionName, {
          body: body || {},
          signal: controller.signal as AbortSignal,
        });

        clearTimeout(timeoutId);

        // Check for Supabase function error
        if (result.error) {
          const error = parseError(result.error);
          lastError = error;

          // Handle retryable errors
          if (error.isRetryable() && attempt < retries) {
            const delay = retryDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          if (showToast) {
            toast.error(error.getUserMessage());
          }
          throw error;
        }

        // Check if response has error field
        if (result.data && typeof result.data === 'object' && 'error' in result.data) {
          const errorData = result.data as { error: EdgeFunctionError };
          const error = parseError(errorData.error);
          lastError = error;

          if (error.isRetryable() && attempt < retries) {
            const delay = retryDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          if (showToast) {
            toast.error(error.getUserMessage());
          }
          throw error;
        }

        // Validate response if validator provided
        if (validateResponse && !validateResponse(result.data)) {
          throw new EdgeFunctionErrorClass(
            'Invalid response format received from server',
            'INVALID_RESPONSE',
            502,
            { data: result.data },
            false
          );
        }

        return result.data as T;
      } catch (invokeError) {
        clearTimeout(timeoutId);

        // Handle abort (timeout)
        if (invokeError instanceof Error && invokeError.name === 'AbortError') {
          if (attempt < retries) {
            const delay = retryDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          const error = new EdgeFunctionErrorClass(
            'Request timeout. The server took too long to respond.',
            'TIMEOUT_ERROR',
            504,
            undefined,
            true
          );
          lastError = error;
          if (showToast) {
            toast.error(error.getUserMessage());
          }
          throw error;
        }

        // Handle network errors
        if (invokeError instanceof TypeError && invokeError.message.includes('fetch')) {
          if (attempt < retries) {
            const delay = retryDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          const error = new EdgeFunctionErrorClass(
            'Network error. Please check your connection and try again.',
            'NETWORK_ERROR',
            0,
            { originalError: invokeError.message },
            true
          );
          lastError = error;
          if (showToast) {
            toast.error(error.getUserMessage());
          }
          throw error;
        }

        // Re-throw if it's already an EdgeFunctionError
        if (invokeError instanceof EdgeFunctionErrorClass) {
          throw invokeError;
        }

        // Convert unknown errors
        const error = new EdgeFunctionErrorClass(
          invokeError instanceof Error ? invokeError.message : 'Unknown error occurred',
          'UNKNOWN_ERROR',
          0,
          { originalError: invokeError },
          false
        );
        lastError = error;
        if (showToast) {
          toast.error(error.getUserMessage());
        }
        throw error;
      }
    } catch (error) {
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }

      // For non-retryable errors, throw immediately
      if (error instanceof EdgeFunctionErrorClass && !error.isRetryable()) {
        throw error;
      }

      // Wait before retrying
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new EdgeFunctionErrorClass('Request failed after retries', 'UNKNOWN_ERROR', 0);
}

/**
 * Parse error response into EdgeFunctionErrorClass
 */
function parseError(error: unknown): EdgeFunctionErrorClass {
  if (error instanceof EdgeFunctionErrorClass) {
    return error;
  }

  // Handle error objects from Supabase
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    const message = typeof errorObj.message === 'string' 
      ? errorObj.message 
      : typeof errorObj.error === 'string'
      ? errorObj.error
      : 'An error occurred';

    const code = typeof errorObj.code === 'string' 
      ? errorObj.code 
      : typeof errorObj.errorCode === 'string'
      ? errorObj.errorCode
      : 'UNKNOWN_ERROR';

    const statusCode = typeof errorObj.status === 'number' 
      ? errorObj.status 
      : typeof errorObj.statusCode === 'number'
      ? errorObj.statusCode
      : 0;

    const details = errorObj.details as Record<string, unknown> | undefined;
    const retryAfter = typeof errorObj.retryAfter === 'number' ? errorObj.retryAfter : undefined;

    // Determine if error is retryable
    const retryableCodes = [
      'AI_RATE_LIMIT',
      'RATE_LIMIT',
      'AI_TIMEOUT',
      'TIMEOUT_ERROR',
      'AI_NETWORK_ERROR',
      'NETWORK_ERROR',
      'AI_SERVER_ERROR',
      'SERVER_ERROR',
    ];
    const retryable = retryableCodes.includes(code) || (statusCode >= 500 && statusCode < 600);

    return new EdgeFunctionErrorClass(message, code, statusCode, details, retryable, retryAfter);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return new EdgeFunctionErrorClass(error, 'UNKNOWN_ERROR', 0, undefined, false);
  }

  // Fallback for unknown error types
  return new EdgeFunctionErrorClass(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    0,
    { originalError: error },
    false
  );
}

/**
 * Type-safe wrapper for specific edge functions
 */

/**
 * Generate lighting from setup
 */
export interface GenerateLightingRequest {
  subjectDescription: string;
  environment: string;
  lightingSetup: Record<string, {
    direction: string;
    intensity: number;
    colorTemperature: number;
    softness: number;
    distance: number;
    enabled: boolean;
  }>;
  cameraSettings: {
    shotType: string;
    cameraAngle: string;
    fov: number;
    lensType: string;
    aperture: string;
  };
  stylePreset: string;
  enhanceHDR: boolean;
  negativePrompt?: string;
}

export interface GenerateLightingResponse {
  image_url: string;
  image_id: string;
  fibo_json: Record<string, unknown>;
  lighting_analysis: Record<string, unknown>;
  generation_metadata: {
    model: string;
    prompt_summary?: string;
    lighting_style?: string;
    key_fill_ratio?: number;
    professional_rating?: number;
    timestamp: string;
  };
}

export async function generateLighting(
  request: GenerateLightingRequest,
  config?: EdgeFunctionConfig
): Promise<GenerateLightingResponse> {
  return invokeEdgeFunction<GenerateLightingResponse>('generate-lighting', request, {
    timeout: 90000, // 90s for image generation
    retries: 2,
    ...config,
    validateResponse: (data) => {
      if (!data || typeof data !== 'object') return false;
      const d = data as Record<string, unknown>;
      return typeof d.image_url === 'string' && typeof d.image_id === 'string';
    },
  });
}

/**
 * Generate from natural language
 */
export interface NaturalLanguageLightingRequest {
  sceneDescription: string;
  lightingDescription: string;
  subject: string;
  styleIntent?: string;
  environment?: string;
}

export interface NaturalLanguageLightingResponse {
  image_url: string;
  image_id: string;
  fibo_json: Record<string, unknown>;
  lighting_analysis: Record<string, unknown>;
  generation_metadata: {
    model: string;
    original_description?: string;
    translated_style?: string;
    mood?: string;
    timestamp: string;
  };
}

export async function generateFromNaturalLanguage(
  request: NaturalLanguageLightingRequest,
  config?: EdgeFunctionConfig
): Promise<NaturalLanguageLightingResponse> {
  return invokeEdgeFunction<NaturalLanguageLightingResponse>('natural-language-lighting', request, {
    timeout: 90000, // 90s for image generation
    retries: 2,
    ...config,
    validateResponse: (data) => {
      if (!data || typeof data !== 'object') return false;
      const d = data as Record<string, unknown>;
      return typeof d.image_url === 'string' && typeof d.image_id === 'string';
    },
  });
}

/**
 * Analyze lighting setup
 */
export interface AnalyzeLightingRequest {
  lightingSetup: Record<string, {
    direction: string;
    intensity: number;
    colorTemperature: number;
    softness: number;
    distance: number;
    enabled: boolean;
  }>;
  styleContext?: string;
}

export interface AnalyzeLightingResponse {
  keyFillRatio: number;
  lightingStyle: string;
  lightingStyleDescription?: string;
  contrastScore: number;
  totalExposure: number;
  colorAnalysis: Record<string, unknown>;
  shadowAnalysis: Record<string, unknown>;
  professionalRating: number;
  recommendations: string[];
  technicalNotes?: string[];
  lightPositions?: Record<string, { x: number; y: number; z: number }>;
  styleContext?: string;
}

export async function analyzeLighting(
  request: AnalyzeLightingRequest,
  config?: EdgeFunctionConfig
): Promise<AnalyzeLightingResponse> {
  return invokeEdgeFunction<AnalyzeLightingResponse>('analyze-lighting', request, {
    timeout: 30000, // 30s for analysis
    retries: 1,
    ...config,
    validateResponse: (data) => {
      if (!data || typeof data !== 'object') return false;
      const d = data as Record<string, unknown>;
      return typeof d.keyFillRatio === 'number' && typeof d.lightingStyle === 'string';
    },
  });
}
