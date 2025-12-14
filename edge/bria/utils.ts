/**
 * Shared utilities for BRIA API Edge Functions
 * Provides secure secret access, error handling, and request validation
 */

export interface BriaErrorResponse {
  error: string;
  errorCode: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface BriaSuccessResponse<T = unknown> {
  data: T;
  request_id?: string;
  status?: string;
}

/**
 * Get BRIA API key from environment secrets
 * Supports environment-specific keys (PRODUCTION, STAGING, BRIA_API_KEY)
 */
export function getBriaApiKey(): string {
  const env = process.env.NODE_ENV || 'development';
  
  // Priority: PRODUCTION > STAGING > BRIA_API_KEY
  const key = 
    env === 'production' 
      ? (process.env.PRODUCTION || process.env.BRIA_API_KEY)
      : env === 'staging'
      ? (process.env.STAGING || process.env.BRIA_API_KEY)
      : process.env.BRIA_API_KEY;

  if (!key) {
    throw new Error('BRIA API key not configured. Please add BRIA_API_KEY, PRODUCTION, or STAGING secret in Lovable Cloud.');
  }

  return key;
}

/**
 * Create proper BRIA API headers
 * BRIA uses 'api_token' header, NOT 'Authorization: Bearer'
 */
export function getBriaHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'api_token': apiKey,
  };
}

/**
 * Handle BRIA API errors and return structured error responses
 */
export function handleBriaError(error: unknown, context: string): BriaErrorResponse {
  console.error(`[${context}] Error:`, error);

  if (error instanceof Error) {
    // Network/timeout errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        error: 'Network error connecting to BRIA API. Please check your connection.',
        errorCode: 'BRIA_NETWORK_ERROR',
        statusCode: 503,
      };
    }

    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return {
        error: 'BRIA API request timed out. Please try again.',
        errorCode: 'BRIA_TIMEOUT',
        statusCode: 504,
      };
    }

    // Authentication errors
    if (error.message.includes('API key') || error.message.includes('authentication')) {
      return {
        error: 'BRIA API authentication failed. Please check your API key configuration.',
        errorCode: 'BRIA_AUTH_ERROR',
        statusCode: 401,
      };
    }
  }

  // Default error
  return {
    error: error instanceof Error ? error.message : 'Unknown error occurred',
    errorCode: 'BRIA_UNKNOWN_ERROR',
    statusCode: 500,
  };
}

/**
 * Parse and validate BRIA API response
 */
export async function parseBriaResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    let errorText = '';
    let errorData: Record<string, unknown> | null = null;

    try {
      errorText = await response.text();
      errorData = JSON.parse(errorText);
    } catch {
      // If parsing fails, use raw text
    }

    // Handle specific status codes
    if (response.status === 401) {
      throw new Error('BRIA API authentication failed. Check your API key.');
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '60';
      throw new Error(`BRIA API rate limit exceeded. Retry after ${retryAfter} seconds.`);
    }

    if (response.status === 402) {
      throw new Error('BRIA API payment required. Please add credits to your account.');
    }

    if (response.status >= 500) {
      throw new Error(`BRIA API server error: ${errorData?.error?.message || errorText.substring(0, 200) || 'Unknown server error'}`);
    }

    throw new Error(`BRIA API error ${response.status}: ${errorData?.error?.message || errorText.substring(0, 200) || 'Unknown error'}`);
  }

  return response.json();
}

/**
 * Safe logging - never logs secrets
 */
export function safeLog(context: string, message: string, data?: Record<string, unknown>): void {
  const sanitizedData = data ? { ...data } : {};
  
  // Remove any potential secret fields
  delete sanitizedData.api_token;
  delete sanitizedData.api_key;
  delete sanitizedData.token;
  delete sanitizedData.key;

  console.log(`[${context}] ${message}`, sanitizedData);
}

/**
 * Validate request body structure
 */
export function validateRequestBody(body: unknown, requiredFields: string[]): Record<string, unknown> {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a valid JSON object');
  }

  const bodyObj = body as Record<string, unknown>;
  const missing = requiredFields.filter(field => !(field in bodyObj));

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  return bodyObj;
}
