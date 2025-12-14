/**
 * Shared Error Handling Utilities for Supabase Edge Functions
 * Provides consistent error response format, categorization, and context
 */

export interface StandardErrorResponse {
  error: string;
  errorCode: string;
  statusCode: number;
  details?: Record<string, unknown>;
  timestamp: string;
  retryable?: boolean;
  retryAfter?: number;
  context?: {
    function?: string;
    action?: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Error categories for better error handling
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  AI_SERVICE = 'AI_SERVICE',
  DATABASE = 'DATABASE',
  CONFIGURATION = 'CONFIGURATION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Determine error category from error
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Check error name
    if (name.includes('timeout') || name === 'aborterror') {
      return ErrorCategory.TIMEOUT;
    }

    // Check error message
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorCategory.NETWORK;
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCategory.TIMEOUT;
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCategory.RATE_LIMIT;
    }

    if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorCategory.AUTHENTICATION;
    }

    if (message.includes('lovable_api_key') || message.includes('config') || message.includes('environment')) {
      return ErrorCategory.CONFIGURATION;
    }

    if (message.includes('ai') || message.includes('gateway')) {
      return ErrorCategory.AI_SERVICE;
    }

    if (message.includes('database') || message.includes('supabase') || message.includes('query')) {
      return ErrorCategory.DATABASE;
    }
  }

  // Check if it's an object with error code
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    const code = String(errorObj.code || errorObj.errorCode || '').toUpperCase();

    if (code.includes('TIMEOUT')) return ErrorCategory.TIMEOUT;
    if (code.includes('NETWORK')) return ErrorCategory.NETWORK;
    if (code.includes('RATE_LIMIT') || code.includes('RATE')) return ErrorCategory.RATE_LIMIT;
    if (code.includes('AUTH') || code.includes('UNAUTHORIZED') || code.includes('FORBIDDEN')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (code.includes('CONFIG') || code.includes('ENV')) return ErrorCategory.CONFIGURATION;
    if (code.includes('AI_')) return ErrorCategory.AI_SERVICE;
    if (code.includes('VALIDATION') || code.includes('MISSING') || code.includes('INVALID')) {
      return ErrorCategory.VALIDATION;
    }
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(error: unknown, category?: ErrorCategory): boolean {
  const cat = category || categorizeError(error);

  // Retryable categories
  const retryableCategories = [
    ErrorCategory.NETWORK,
    ErrorCategory.TIMEOUT,
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.SERVER,
    ErrorCategory.AI_SERVICE,
  ];

  if (retryableCategories.includes(cat)) {
    return true;
  }

  // Check error object for retryable flag
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.retryable === 'boolean') {
      return errorObj.retryable;
    }
    if (typeof errorObj.isRetryable === 'function') {
      return (errorObj.isRetryable as () => boolean)();
    }
  }

  // Check status code
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    const statusCode = errorObj.statusCode || errorObj.status;
    if (typeof statusCode === 'number') {
      // 5xx errors are retryable, 429 is retryable
      return statusCode >= 500 || statusCode === 429;
    }
  }

  return false;
}

/**
 * Get HTTP status code for error
 */
export function getStatusCodeForError(error: unknown, category?: ErrorCategory): number {
  const cat = category || categorizeError(error);

  // Check if error has status code
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    const statusCode = errorObj.statusCode || errorObj.status;
    if (typeof statusCode === 'number' && statusCode >= 400) {
      return statusCode;
    }
  }

  // Default status codes by category
  switch (cat) {
    case ErrorCategory.VALIDATION:
      return 400;
    case ErrorCategory.AUTHENTICATION:
      return 401;
    case ErrorCategory.AUTHORIZATION:
      return 403;
    case ErrorCategory.RATE_LIMIT:
      return 429;
    case ErrorCategory.TIMEOUT:
      return 504;
    case ErrorCategory.NETWORK:
      return 503;
    case ErrorCategory.SERVER:
    case ErrorCategory.DATABASE:
      return 500;
    case ErrorCategory.AI_SERVICE:
      return 502;
    case ErrorCategory.CONFIGURATION:
      return 500;
    default:
      return 500;
  }
}

/**
 * Extract error message from unknown error
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    return (
      (errorObj.message as string) ||
      (errorObj.error as string) ||
      (errorObj.errorMessage as string) ||
      'An unexpected error occurred'
    );
  }

  return 'An unexpected error occurred';
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown, category?: ErrorCategory): string {
  const cat = category || categorizeError(error);
  const message = extractErrorMessage(error);

  // Check if error has a getUserMessage method
  if (error && typeof error === 'object' && 'getUserMessage' in error) {
    const getUserMessage = (error as { getUserMessage: () => string }).getUserMessage;
    if (typeof getUserMessage === 'function') {
      return getUserMessage();
    }
  }

  // Category-specific messages
  switch (cat) {
    case ErrorCategory.VALIDATION:
      if (message.includes('required') || message.includes('missing')) {
        return 'Please provide all required information.';
      }
      if (message.includes('invalid') || message.includes('format')) {
        return 'Invalid input format. Please check your input and try again.';
      }
      return 'Invalid request. Please check your input and try again.';

    case ErrorCategory.AUTHENTICATION:
      return 'Authentication failed. Please sign in again.';

    case ErrorCategory.AUTHORIZATION:
      return 'You do not have permission to perform this action.';

    case ErrorCategory.RATE_LIMIT:
      return 'Too many requests. Please wait a moment and try again.';

    case ErrorCategory.TIMEOUT:
      return 'The request took too long. Please try again.';

    case ErrorCategory.NETWORK:
      return 'Network error. Please check your connection and try again.';

    case ErrorCategory.AI_SERVICE:
      if (message.includes('payment') || message.includes('credits')) {
        return 'Insufficient credits. Please add credits to continue.';
      }
      if (message.includes('config') || message.includes('api key')) {
        return 'AI service configuration error. Please contact support.';
      }
      return 'AI service error. Please try again or contact support if the problem persists.';

    case ErrorCategory.CONFIGURATION:
      return 'Configuration error. Please contact support.';

    case ErrorCategory.SERVER:
    case ErrorCategory.DATABASE:
      return 'Server error. Please try again later.';

    default:
      return message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Create standard error response
 */
export function createErrorResponse(
  error: unknown,
  options: {
    functionName?: string;
    action?: string;
    metadata?: Record<string, unknown>;
    statusCode?: number;
    errorCode?: string;
    retryable?: boolean;
    retryAfter?: number;
  } = {}
): StandardErrorResponse {
  const category = categorizeError(error);
  const message = extractErrorMessage(error);
  const userMessage = getUserFriendlyMessage(error, category);
  const retryable = options.retryable ?? isRetryableError(error, category);
  const statusCode = options.statusCode ?? getStatusCodeForError(error, category);

  // Determine error code
  let errorCode = options.errorCode;
  if (!errorCode) {
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      errorCode = (errorObj.code || errorObj.errorCode) as string;
    }
    if (!errorCode) {
      // Generate error code from category
      errorCode = category;
    }
  }

  // Extract retryAfter from error if available
  let retryAfter = options.retryAfter;
  if (!retryAfter && error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    retryAfter = errorObj.retryAfter as number | undefined;
  }

  return {
    error: userMessage,
    errorCode,
    statusCode,
    details: {
      originalMessage: message,
      category,
      ...options.metadata,
    },
    timestamp: new Date().toISOString(),
    retryable,
    retryAfter,
    context: {
      function: options.functionName,
      action: options.action,
      metadata: options.metadata,
    },
  };
}

/**
 * Create error response with logging
 */
export function createErrorResponseWithLogging(
  error: unknown,
  options: {
    functionName?: string;
    action?: string;
    metadata?: Record<string, unknown>;
    statusCode?: number;
    errorCode?: string;
    retryable?: boolean;
    retryAfter?: number;
  } = {}
): StandardErrorResponse {
  const errorResponse = createErrorResponse(error, options);

  // Log error with context
  console.error(`[${options.functionName || 'EdgeFunction'}] Error in ${options.action || 'unknown action'}:`, {
    error: extractErrorMessage(error),
    category: categorizeError(error),
    errorCode: errorResponse.errorCode,
    statusCode: errorResponse.statusCode,
    retryable: errorResponse.retryable,
    metadata: options.metadata,
    stack: error instanceof Error ? error.stack : undefined,
  });

  return errorResponse;
}

/**
 * Wrap async handler with error handling and optional performance monitoring
 * 
 * Note: For performance monitoring, import and use withPerformanceMonitoring separately
 * This keeps the error handler lightweight and avoids import dependencies
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  functionName: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      const errorResponse = createErrorResponseWithLogging(error, {
        functionName,
        action: handler.name || 'handler',
        metadata: {
          args: args.length > 0 ? JSON.stringify(args).substring(0, 500) : undefined,
        },
      });

      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }
  }) as T;
}
