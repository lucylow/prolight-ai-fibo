// Retry with exponential backoff utility
// Handles transient failures for upstream API calls

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 10000,
  jitterFactor: 0.3,
};

/**
 * Check if an error is retriable
 */
export function isRetriableError(error: unknown): boolean {
  if (error instanceof Response) {
    // Retry on rate limits and server errors
    return error.status === 429 || (error.status >= 500 && error.status < 600);
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || 
           message.includes('network') ||
           message.includes('econnreset') ||
           message.includes('rate limit');
  }
  
  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoff(attempt: number, options: RetryOptions): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt);
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * options.jitterFactor * Math.random();
  
  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if not retriable or last attempt
      if (!isRetriableError(error) || attempt >= opts.maxAttempts - 1) {
        throw error;
      }

      const delay = calculateBackoff(attempt, opts);
      console.log(`Retry attempt ${attempt + 1}/${opts.maxAttempts} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Wrapper for fetch with retry and timeout
 */
export async function fetchWithRetryAndTimeout(
  url: string,
  init: RequestInit,
  options: Partial<RetryOptions & { timeoutMs: number }> = {}
): Promise<Response> {
  const { timeoutMs = 30000, ...retryOpts } = options;

  return fetchWithRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok && isRetriableError(response)) {
        throw response;
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }, retryOpts);
}
