/**
 * Performance Monitoring Utilities for Edge Functions
 * Provides metrics collection, performance tracking, and observability
 */

export interface PerformanceMetrics {
  functionName: string;
  requestId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  cacheHit?: boolean;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceReport {
  totalRequests: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  cacheHitRate: number;
  requestsPerSecond: number;
  timeRange: { start: number; end: number };
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k metrics
  private readonly windowSize = 60000; // 1 minute window for rate calculation

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Prune old metrics if we exceed max
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow requests (> 5 seconds)
    if (metric.duration && metric.duration > 5000) {
      console.warn(`[Performance] Slow request detected: ${metric.functionName} took ${metric.duration}ms`, {
        requestId: metric.requestId,
        statusCode: metric.statusCode,
        errorCode: metric.errorCode,
        retryCount: metric.retryCount,
      });
    }
  }

  /**
   * Start timing a request
   */
  startTiming(functionName: string, requestId: string, metadata?: Record<string, unknown>): PerformanceMetrics {
    return {
      functionName,
      requestId,
      startTime: Date.now(),
      metadata,
    };
  }

  /**
   * End timing and record metric
   */
  endTiming(
    metric: PerformanceMetrics,
    statusCode?: number,
    errorCode?: string,
    additionalMetadata?: Record<string, unknown>
  ): void {
    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    this.recordMetric({
      ...metric,
      endTime,
      duration,
      statusCode,
      errorCode,
      metadata: {
        ...metric.metadata,
        ...additionalMetadata,
      },
    });
  }

  /**
   * Get performance report for recent requests
   */
  getReport(windowMs: number = 60000): PerformanceReport {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const recentMetrics = this.metrics.filter(m => 
      m.startTime >= windowStart && m.duration !== undefined
    );

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 0,
        cacheHitRate: 0,
        requestsPerSecond: 0,
        timeRange: { start: windowStart, end: now },
      };
    }

    const durations = recentMetrics
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    const totalRequests = recentMetrics.length;
    const averageLatency = durations.reduce((a, b) => a + b, 0) / totalRequests;
    const p50Latency = durations[Math.floor(totalRequests * 0.5)] || 0;
    const p95Latency = durations[Math.floor(totalRequests * 0.95)] || 0;
    const p99Latency = durations[Math.floor(totalRequests * 0.99)] || 0;

    const errors = recentMetrics.filter(m => 
      m.statusCode && (m.statusCode >= 400 || m.errorCode)
    ).length;
    const errorRate = errors / totalRequests;

    const cacheHits = recentMetrics.filter(m => m.cacheHit === true).length;
    const cacheHitRate = cacheHits / totalRequests;

    const requestsPerSecond = (totalRequests / windowMs) * 1000;

    const startTimes = recentMetrics.map(m => m.startTime);
    const timeRange = {
      start: Math.min(...startTimes),
      end: Math.max(...startTimes),
    };

    return {
      totalRequests,
      averageLatency: Math.round(averageLatency),
      p50Latency,
      p95Latency,
      p99Latency,
      errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimals
      cacheHitRate: Math.round(cacheHitRate * 10000) / 100,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      timeRange,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get metrics for a specific function
   */
  getFunctionMetrics(functionName: string, windowMs: number = 60000): PerformanceReport {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const functionMetrics = this.metrics.filter(m => 
      m.functionName === functionName &&
      m.startTime >= windowStart &&
      m.duration !== undefined
    );

    // Create a temporary monitor with just these metrics
    const tempMonitor = new PerformanceMonitor();
    tempMonitor.metrics = functionMetrics;
    return tempMonitor.getReport(windowMs);
  }
}

// Global performance monitor instance
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get global performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Create a performance timer for an edge function
 */
export function createPerformanceTimer(functionName: string, requestId?: string) {
  const monitor = getPerformanceMonitor();
  const id = requestId || crypto.randomUUID();
  
  const metric = monitor.startTiming(functionName, id);

  return {
    metric,
    end: (statusCode?: number, errorCode?: string, metadata?: Record<string, unknown>) => {
      monitor.endTiming(metric, statusCode, errorCode, metadata);
    },
    markCacheHit: () => {
      metric.cacheHit = true;
    },
    incrementRetry: () => {
      metric.retryCount = (metric.retryCount || 0) + 1;
    },
  };
}

/**
 * Wrap an edge function handler with performance monitoring
 */
export function withPerformanceMonitoring<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  functionName: string
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    const timer = createPerformanceTimer(functionName);
    
    try {
      const response = await handler(...args);
      
      timer.end(
        response.status,
        response.status >= 400 ? 'ERROR' : undefined,
        {
          contentType: response.headers.get('content-type'),
        }
      );
      
      return response;
    } catch (error) {
      const statusCode = error && typeof error === 'object' && 'statusCode' in error
        ? (error.statusCode as number)
        : 500;
      const errorCode = error && typeof error === 'object' && 'errorCode' in error
        ? (error.errorCode as string)
        : 'UNKNOWN_ERROR';
      
      timer.end(statusCode, errorCode, {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }) as T;
}

