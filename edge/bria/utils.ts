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
 * Also supports Lovable Cloud secret naming conventions
 * 
 * Priority order:
 * 1. Environment-specific keys (PRODUCTION, STAGING)
 * 2. Generic BRIA_API_KEY
 * 3. Alternative names (BRIA_API_TOKEN, BRIA_TOKEN)
 * 
 * @throws {Error} If no valid API key is found
 * @returns {string} The BRIA API key
 */
export function getBriaApiKey(): string {
  const env = process.env.NODE_ENV || process.env.ENV || 'development';
  
  // Try environment-specific keys first
  let key: string | undefined;
  
  if (env === 'production') {
    key = process.env.PRODUCTION 
      || process.env.BRIA_API_TOKEN_PROD
      || process.env.BRIA_API_KEY_PROD
      || process.env.BRIA_API_KEY;
  } else if (env === 'staging') {
    key = process.env.STAGING
      || process.env.BRIA_API_TOKEN_STAGING
      || process.env.BRIA_API_KEY_STAGING
      || process.env.BRIA_API_KEY;
  } else {
    // Development - try all possible names
    key = process.env.BRIA_API_KEY
      || process.env.BRIA_API_TOKEN
      || process.env.BRIA_TOKEN;
  }

  // Validate key format (basic check)
  if (!key) {
    const errorMessage = [
      'BRIA API key not configured.',
      `Environment: ${env}`,
      'Please add one of the following secrets in Lovable Cloud:',
      '  - BRIA_API_KEY (for development)',
      '  - PRODUCTION (for production environment)',
      '  - STAGING (for staging environment)',
      '  - BRIA_API_TOKEN (alternative name)',
      '',
      'To add secrets:',
      '1. Go to Lovable Cloud project dashboard',
      '2. Navigate to Settings → Secrets',
      '3. Click "Add New Secret"',
      '4. Add the secret with the exact name above'
    ].join('\n');
    
    throw new Error(errorMessage);
  }

  // Basic validation: key should not be empty or just whitespace
  const trimmedKey = key.trim();
  if (!trimmedKey || trimmedKey.length < 10) {
    throw new Error(
      'BRIA API key appears to be invalid (too short). ' +
      'Please verify your API key in Lovable Cloud secrets.'
    );
  }

  return trimmedKey;
}

/**
 * Validate BRIA API key format (basic checks)
 * @param key - The API key to validate
 * @returns {boolean} True if key appears valid
 */
export function isValidBriaApiKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  const trimmed = key.trim();
  
  // Basic checks: should be at least 10 characters
  // and not contain obvious placeholder text
  if (trimmed.length < 10) {
    return false;
  }
  
  const placeholderPatterns = [
    /^your[_-]?bria/i,
    /^bria[_-]?api[_-]?key/i,
    /^placeholder/i,
    /^example/i,
    /^test[_-]?key/i,
    /^xxxx/i,
    /^replace/i
  ];
  
  for (const pattern of placeholderPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  
  return true;
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
 * Automatically sanitizes sensitive fields from log output
 */
export function safeLog(context: string, message: string, data?: Record<string, unknown>): void {
  const sanitizedData = data ? { ...data } : {};
  
  // Remove any potential secret fields
  const secretFields = [
    'api_token',
    'api_key',
    'token',
    'key',
    'secret',
    'password',
    'authorization',
    'auth',
    'credentials',
    'BRIA_API_KEY',
    'BRIA_API_TOKEN',
    'PRODUCTION',
    'STAGING'
  ];
  
  for (const field of secretFields) {
    delete sanitizedData[field];
    // Also check nested objects
    for (const key in sanitizedData) {
      if (typeof sanitizedData[key] === 'object' && sanitizedData[key] !== null) {
        const nested = sanitizedData[key] as Record<string, unknown>;
        for (const nestedField of secretFields) {
          delete nested[nestedField];
        }
      }
    }
  }

  // Mask any values that look like API keys (long alphanumeric strings)
  for (const key in sanitizedData) {
    const value = sanitizedData[key];
    if (typeof value === 'string' && value.length > 20 && /^[a-zA-Z0-9_-]+$/.test(value)) {
      sanitizedData[key] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    }
  }

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

