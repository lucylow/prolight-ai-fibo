// Metrics and analytics emission for edge functions
// Tracks invocations, latency, errors, and custom events

export interface MetricEvent {
  timestamp: string;
  env: string;
  function: string;
  event: 'invocation' | 'completed' | 'error' | 'cache_hit' | 'retry';
  status_code?: number;
  latency_ms: number;
  request_id: string;
  idempotency_key?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// In-memory metrics store (per-worker, resets on cold start)
// For production, use external store like Redis or Supabase
const metricsBuffer: MetricEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Emit a metric event
 */
export function emitMetric(event: Omit<MetricEvent, 'timestamp'>): void {
  const metricEvent: MetricEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // Log for observability
  console.log(JSON.stringify({ type: 'metric', ...metricEvent }));

  // Store in buffer
  metricsBuffer.push(metricEvent);
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift(); // Remove oldest
  }
}

/**
 * Get metrics for last N minutes
 */
export function getRecentMetrics(minutes: number = 60): MetricEvent[] {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return metricsBuffer.filter(m => new Date(m.timestamp) >= cutoff);
}

/**
 * Aggregate metrics for dashboard
 */
export interface AggregatedMetrics {
  function: string;
  invocations: number;
  completed: number;
  errors: number;
  cache_hits: number;
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  last_updated: string;
}

export function aggregateMetrics(functionName?: string): AggregatedMetrics[] {
  const recent = getRecentMetrics(60);
  
  // Group by function
  const byFunction = new Map<string, MetricEvent[]>();
  for (const event of recent) {
    if (functionName && event.function !== functionName) continue;
    
    const existing = byFunction.get(event.function) || [];
    existing.push(event);
    byFunction.set(event.function, existing);
  }

  const results: AggregatedMetrics[] = [];
  
  for (const [fn, events] of byFunction) {
    const invocations = events.filter(e => e.event === 'invocation').length || events.length;
    const completed = events.filter(e => e.event === 'completed').length;
    const errors = events.filter(e => e.event === 'error').length;
    const cacheHits = events.filter(e => e.event === 'cache_hit').length;
    
    const latencies = events.filter(e => e.latency_ms > 0).map(e => e.latency_ms).sort((a, b) => a - b);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index] || avgLatency;

    results.push({
      function: fn,
      invocations,
      completed,
      errors,
      cache_hits: cacheHits,
      success_rate: invocations > 0 ? Math.round((completed / invocations) * 100) : 100,
      avg_latency_ms: Math.round(avgLatency),
      p95_latency_ms: Math.round(p95Latency),
      last_updated: events.length > 0 ? events[events.length - 1].timestamp : new Date().toISOString(),
    });
  }

  return results;
}

/**
 * Create a metrics tracker for a request
 */
export function createMetricsTracker(functionName: string, requestId: string, env: string) {
  const startTime = Date.now();

  return {
    invocation(idempotencyKey?: string) {
      emitMetric({
        env,
        function: functionName,
        event: 'invocation',
        latency_ms: 0,
        request_id: requestId,
        idempotency_key: idempotencyKey,
      });
    },

    completed(statusCode: number, metadata?: Record<string, unknown>) {
      emitMetric({
        env,
        function: functionName,
        event: 'completed',
        status_code: statusCode,
        latency_ms: Date.now() - startTime,
        request_id: requestId,
        metadata,
      });
    },

    error(statusCode: number, errorMessage: string) {
      emitMetric({
        env,
        function: functionName,
        event: 'error',
        status_code: statusCode,
        latency_ms: Date.now() - startTime,
        request_id: requestId,
        error: errorMessage,
      });
    },

    cacheHit() {
      emitMetric({
        env,
        function: functionName,
        event: 'cache_hit',
        latency_ms: Date.now() - startTime,
        request_id: requestId,
      });
    },

    retry(attempt: number) {
      emitMetric({
        env,
        function: functionName,
        event: 'retry',
        latency_ms: Date.now() - startTime,
        request_id: requestId,
        metadata: { attempt },
      });
    },
  };
}
