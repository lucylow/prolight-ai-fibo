/**
 * Custom error classes for better error handling and categorization
 */

/**
 * Base API error class
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public statusText?: string,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Network error (connection failed, no internet, etc.)
 */
export class NetworkError extends Error {
  constructor(message: string = 'Network request failed. Please check your internet connection.', public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Timeout error (request took too long)
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out. Please try again.', public timeoutMs?: number) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * JSON parsing error
 */
export class JSONParseError extends Error {
  constructor(message: string = 'Failed to parse response. The server may have returned invalid data.', public originalError?: Error) {
    super(message);
    this.name = 'JSONParseError';
    Object.setPrototypeOf(this, JSONParseError.prototype);
  }
}

/**
 * Validation error (client-side validation failed)
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Helper function to create user-friendly error messages from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    if (error.statusCode === 401) {
      return 'Authentication required. Please log in again.';
    }
    if (error.statusCode === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.statusCode === 404) {
      return 'The requested resource was not found.';
    }
    if (error.statusCode === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.statusCode >= 500) {
      return 'Server error. Please try again later.';
    }
    if (error.statusCode === 400) {
      return error.message || 'Invalid request. Please check your input.';
    }
    return error.message || `API error (${error.statusCode})`;
  }

  if (error instanceof NetworkError) {
    return error.message;
  }

  if (error instanceof TimeoutError) {
    return error.message;
  }

  if (error instanceof JSONParseError) {
    return error.message;
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Helper function to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof TimeoutError) {
    return true;
  }

  if (error instanceof APIError) {
    // Retry on 5xx errors and 429 (rate limit)
    return error.statusCode !== undefined && (error.statusCode >= 500 || error.statusCode === 429);
  }

  return false;
}

