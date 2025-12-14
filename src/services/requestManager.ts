/**
 * Request Manager
 * Handles request cancellation, deduplication, and caching
 */

type RequestKey = string;
type AbortControllerMap = Map<RequestKey, AbortController>;
type RequestCache = Map<RequestKey, { data: unknown; timestamp: number; ttl: number }>;

interface RequestManagerConfig {
  defaultCacheTTL?: number; // Time to live in milliseconds
  enableDeduplication?: boolean;
  enableCaching?: boolean;
}

class RequestManager {
  private abortControllers: AbortControllerMap = new Map();
  private cache: RequestCache = new Map();
  private pendingRequests: Map<RequestKey, Promise<unknown>> = new Map();
  private config: Required<RequestManagerConfig>;

  constructor(config: RequestManagerConfig = {}) {
    this.config = {
      defaultCacheTTL: config.defaultCacheTTL ?? 5 * 60 * 1000, // 5 minutes
      enableDeduplication: config.enableDeduplication ?? true,
      enableCaching: config.enableCaching ?? true,
    };
  }

  /**
   * Generate a unique key for a request
   */
  private getRequestKey(operation: string, params: Record<string, unknown> | unknown): RequestKey {
    // Convert to Record if needed
    const paramsObj = params && typeof params === 'object' 
      ? params as Record<string, unknown>
      : {};
    
    const sortedParams = Object.keys(paramsObj)
      .sort()
      .map((key) => `${key}:${JSON.stringify(paramsObj[key])}`)
      .join('|');
    return `${operation}:${sortedParams}`;
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(key: RequestKey): void {
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
    this.pendingRequests.delete(key);
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cached data if available and not expired
   */
  private getCached(key: RequestKey): unknown | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data
   */
  private setCached(key: RequestKey, data: unknown, ttl?: number): void {
    if (!this.config.enableCaching) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultCacheTTL,
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Execute a request with cancellation, deduplication, and caching
   */
  async execute<T>(
    operation: string,
    params: Record<string, unknown> | unknown,
    requestFn: (signal: AbortSignal) => Promise<T>,
    options?: {
      cacheTTL?: number;
      skipCache?: boolean;
      skipDeduplication?: boolean;
    }
  ): Promise<T> {
    const key = this.getRequestKey(operation, params);

    // Check cache first
    if (!options?.skipCache) {
      const cached = this.getCached(key);
      if (cached !== null) {
        return cached as T;
      }
    }

    // Check for pending duplicate request
    if (this.config.enableDeduplication && !options?.skipDeduplication) {
      const pending = this.pendingRequests.get(key);
      if (pending) {
        return pending as Promise<T>;
      }
    }

    // Create abort controller
    const controller = new AbortController();
    this.abortControllers.set(key, controller);

    // Create request promise
    const requestPromise = (async () => {
      try {
        const result = await requestFn(controller.signal);
        
        // Cache the result
        if (!options?.skipCache) {
          this.setCached(key, result, options?.cacheTTL);
        }

        return result;
      } catch (error) {
        // Don't cache errors, but handle abort errors gracefully
        if (error instanceof Error && error.name === 'AbortError') {
          // Re-throw as a more descriptive error
          const abortError = new Error('Request was cancelled');
          abortError.name = 'AbortError';
          throw abortError;
        }
        throw error;
      } finally {
        // Cleanup
        this.abortControllers.delete(key);
        this.pendingRequests.delete(key);
      }
    })();

    // Store pending request for deduplication
    if (this.config.enableDeduplication && !options?.skipDeduplication) {
      this.pendingRequests.set(key, requestPromise);
    }

    return requestPromise;
  }

  /**
   * Create an abort signal for a request
   */
  createAbortSignal(key: RequestKey): AbortSignal {
    const controller = new AbortController();
    this.abortControllers.set(key, controller);
    return controller.signal;
  }
}

// Singleton instance
export const requestManager = new RequestManager({
  defaultCacheTTL: 5 * 60 * 1000, // 5 minutes
  enableDeduplication: true,
  enableCaching: true,
});

// Cleanup expired cache entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestManager.clearExpiredCache();
  }, 60 * 1000); // Every minute
}
