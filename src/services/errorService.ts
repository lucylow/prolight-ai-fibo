/**
 * Centralized Error Logging and Reporting Service
 * Provides consistent error handling, logging, and reporting across the application
 */

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorReport {
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  originalError?: unknown;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Extract error information from unknown error type
 */
export function extractErrorInfo(error: unknown): {
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  retryable?: boolean;
} {
  if (error instanceof Error) {
    // Check if it's a custom error with additional properties
    const errorObj = error as Error & {
      code?: string;
      statusCode?: number;
      retryable?: boolean;
      isRetryable?: () => boolean;
    };

    return {
      message: error.message,
      stack: error.stack,
      code: errorObj.code,
      statusCode: errorObj.statusCode,
      retryable: errorObj.retryable ?? (typeof errorObj.isRetryable === 'function' ? errorObj.isRetryable() : undefined),
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    return {
      message: (errorObj.message as string) || (errorObj.error as string) || 'Unknown error occurred',
      code: errorObj.code as string,
      statusCode: errorObj.statusCode as number,
      retryable: errorObj.retryable as boolean,
    };
  }

  return { message: 'Unknown error occurred' };
}

/**
 * Determine error severity based on error type and context
 */
export function determineSeverity(
  error: unknown,
  context?: ErrorContext
): ErrorSeverity {
  const errorInfo = extractErrorInfo(error);

  // Critical errors
  if (
    errorInfo.code === 'AUTH_ERROR' ||
    errorInfo.statusCode === 401 ||
    errorInfo.statusCode === 403 ||
    context?.component === 'ErrorBoundary'
  ) {
    return ErrorSeverity.CRITICAL;
  }

  // High severity errors
  if (
    errorInfo.statusCode === 500 ||
    errorInfo.statusCode === 503 ||
    errorInfo.code === 'SERVER_ERROR' ||
    errorInfo.code === 'NETWORK_ERROR'
  ) {
    return ErrorSeverity.HIGH;
  }

  // Medium severity errors
  if (
    errorInfo.statusCode === 429 ||
    errorInfo.code === 'RATE_LIMIT' ||
    errorInfo.code === 'TIMEOUT_ERROR'
  ) {
    return ErrorSeverity.MEDIUM;
  }

  // Low severity errors
  return ErrorSeverity.LOW;
}

/**
 * Create error report with context
 */
export function createErrorReport(
  error: unknown,
  context: ErrorContext = {}
): ErrorReport {
  const errorInfo = extractErrorInfo(error);
  const severity = determineSeverity(error, context);

  return {
    message: errorInfo.message,
    stack: errorInfo.stack,
    code: errorInfo.code,
    statusCode: errorInfo.statusCode,
    context: {
      ...context,
      url: context.url || (typeof window !== 'undefined' ? window.location.href : undefined),
      userAgent: context.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
      timestamp: context.timestamp || new Date().toISOString(),
    },
    severity,
    retryable: errorInfo.retryable ?? false,
    originalError: error,
  };
}

/**
 * Error logging service
 */
class ErrorService {
  private sessionId: string;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 50;
  private isOnline = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupNetworkListener();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private setupNetworkListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Log error to console and reporting service
   */
  async logError(error: unknown, context: ErrorContext = {}): Promise<void> {
    const report = createErrorReport(error, {
      ...context,
      sessionId: this.sessionId,
    });

    // Always log to console in development
    if (import.meta.env.DEV) {
      console.error('Error logged:', report);
    }

    // Log to reporting service in production
    if (import.meta.env.PROD) {
      try {
        await this.sendToReportingService(report);
      } catch (reportingError) {
        // If reporting fails, queue it for later
        this.queueError(report);
        console.error('Failed to send error to reporting service:', reportingError);
      }
    } else {
      // In development, just queue it
      this.queueError(report);
    }
  }

  /**
   * Send error to external reporting service
   */
  private async sendToReportingService(report: ErrorReport): Promise<void> {
    if (!this.isOnline) {
      this.queueError(report);
      return;
    }

    // TODO: Integrate with error reporting services
    // Examples:
    // - Sentry: Sentry.captureException(report.originalError, { extra: report.context })
    // - LogRocket: LogRocket.captureException(report.originalError)
    // - Custom endpoint: fetch('/api/errors', { method: 'POST', body: JSON.stringify(report) })

    // For now, we'll use a simple approach that can be extended
    if (typeof window !== 'undefined') {
      const windowWithReporter = window as typeof window & {
        __ERROR_REPORTER__?: (report: ErrorReport) => void;
      };
      if (windowWithReporter.__ERROR_REPORTER__) {
        windowWithReporter.__ERROR_REPORTER__(report);
      }
    }
  }

  /**
   * Queue error for later sending
   */
  private queueError(report: ErrorReport): void {
    this.errorQueue.push(report);

    // Limit queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Store in localStorage as backup
    try {
      const stored = localStorage.getItem('error_queue');
      const queue = stored ? JSON.parse(stored) : [];
      queue.push(report);
      // Keep only last 20 errors in localStorage
      const limitedQueue = queue.slice(-20);
      localStorage.setItem('error_queue', JSON.stringify(limitedQueue));
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Flush queued errors when online
   */
  private async flushErrorQueue(): Promise<void> {
    if (!this.isOnline || this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    for (const report of errorsToSend) {
      try {
        await this.sendToReportingService(report);
      } catch {
        // Re-queue if sending fails
        this.queueError(report);
      }
    }

    // Clear localStorage queue
    try {
      localStorage.removeItem('error_queue');
    } catch {
      // Ignore
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: unknown): string {
    const errorInfo = extractErrorInfo(error);

    // Check if error has a getUserMessage method
    if (error && typeof error === 'object' && 'getUserMessage' in error) {
      const getUserMessage = (error as { getUserMessage: () => string }).getUserMessage;
      if (typeof getUserMessage === 'function') {
        return getUserMessage();
      }
    }

    // Default messages based on error code
    switch (errorInfo.code) {
      case 'AUTH_ERROR':
        return 'Authentication failed. Please sign in again.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'NOT_FOUND':
        return 'The requested resource was not found.';
      case 'RATE_LIMIT':
        return 'Too many requests. Please wait a moment and try again.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your internet connection.';
      case 'TIMEOUT_ERROR':
        return 'The request took too long. Please try again.';
      case 'SERVER_ERROR':
        return 'Server error. Please try again later.';
      default:
        return errorInfo.message || 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: unknown): boolean {
    const errorInfo = extractErrorInfo(error);

    if (errorInfo.retryable !== undefined) {
      return errorInfo.retryable;
    }

    // Check if error has isRetryable method
    if (error && typeof error === 'object' && 'isRetryable' in error) {
      const isRetryable = (error as { isRetryable: () => boolean }).isRetryable;
      if (typeof isRetryable === 'function') {
        return isRetryable();
      }
    }

    // Default retryable errors
    return (
      errorInfo.code === 'NETWORK_ERROR' ||
      errorInfo.code === 'TIMEOUT_ERROR' ||
      errorInfo.code === 'SERVER_ERROR' ||
      errorInfo.code === 'RATE_LIMIT' ||
      (errorInfo.statusCode !== undefined && errorInfo.statusCode >= 500)
    );
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const errorService = new ErrorService();

/**
 * Convenience function to log errors
 */
export async function logError(
  error: unknown,
  context?: ErrorContext
): Promise<void> {
  return errorService.logError(error, context);
}

/**
 * Convenience function to get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  return errorService.getUserMessage(error);
}

/**
 * Convenience function to check if error is retryable
 */
export function isErrorRetryable(error: unknown): boolean {
  return errorService.isRetryable(error);
}

