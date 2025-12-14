/**
 * Error handling utility functions
 * Provides consistent error handling patterns across the application
 */

import { toast } from 'sonner';
import { errorService, getUserErrorMessage, isErrorRetryable, type ErrorContext } from '@/services/errorService';

/**
 * Options for handling errors
 */
export interface HandleErrorOptions {
  showToast?: boolean;
  logError?: boolean;
  context?: ErrorContext;
  fallbackMessage?: string;
  onError?: (error: unknown) => void;
}

/**
 * Handle error with consistent logging and user feedback
 */
export async function handleError(
  error: unknown,
  options: HandleErrorOptions = {}
): Promise<void> {
  const {
    showToast = true,
    logError = true,
    context = {},
    fallbackMessage = 'An unexpected error occurred',
    onError,
  } = options;

  // Log error if enabled
  if (logError) {
    await errorService.logError(error, context).catch((loggingError) => {
      console.error('Failed to log error:', loggingError);
    });
  }

  // Show toast if enabled
  if (showToast) {
    const message = getUserErrorMessage(error) || fallbackMessage;
    toast.error(message);
  }

  // Call custom error handler if provided
  if (onError) {
    try {
      onError(error);
    } catch (handlerError) {
      console.error('Error in onError handler:', handlerError);
    }
  }
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: HandleErrorOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error, {
        ...options,
        context: {
          ...options.context,
          action: options.context?.action || fn.name || 'unknown',
        },
      });
      throw error;
    }
  }) as T;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryable?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryable = isErrorRetryable,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!retryable(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Safe async function wrapper that never throws
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  options: HandleErrorOptions = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    await handleError(error, options);
    return fallback;
  }
}

/**
 * Create error handler for React hooks
 */
export function createErrorHandler(
  setError: (error: unknown) => void,
  options: HandleErrorOptions = {}
) {
  return async (error: unknown) => {
    setError(error);
    await handleError(error, options);
  };
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }

  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('NetworkError') ||
      error.name === 'NetworkError'
    );
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    return code === 'NETWORK_ERROR' || code === 'AI_NETWORK_ERROR';
  }

  return false;
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('timeout') ||
      error.message.includes('Timeout') ||
      error.name === 'TimeoutError' ||
      error.name === 'AbortError'
    );
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    return code === 'TIMEOUT_ERROR' || code === 'AI_TIMEOUT';
  }

  return false;
}

/**
 * Get retry delay for error
 */
export function getRetryDelay(error: unknown, attempt: number): number {
  if (error && typeof error === 'object' && 'retryAfter' in error) {
    const retryAfter = (error as { retryAfter: number }).retryAfter;
    if (typeof retryAfter === 'number') {
      return retryAfter * 1000; // Convert to milliseconds
    }
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
  return Math.min(1000 * Math.pow(2, attempt), 10000);
}
