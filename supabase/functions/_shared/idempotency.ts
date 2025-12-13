// Idempotency handling for edge functions
// Prevents duplicate processing of requests with same Idempotency-Key

export type IdempotencyStatus = 'in_progress' | 'completed' | 'failed';

export interface IdempotencyRecord {
  key: string;
  status: IdempotencyStatus;
  result?: unknown;
  jobId?: string;
  createdAt: string;
  expiresAt: string;
}

// In-memory store (per-worker, for demo)
// For production, use Redis or Supabase
const idempotencyStore = new Map<string, IdempotencyRecord>();

// Default TTL: 24 hours
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Clean up expired entries
 */
function cleanupExpired(): void {
  const now = new Date();
  for (const [key, record] of idempotencyStore) {
    if (new Date(record.expiresAt) < now) {
      idempotencyStore.delete(key);
    }
  }
}

/**
 * Check if a request with this idempotency key exists
 */
export function checkIdempotency(key: string): IdempotencyRecord | null {
  cleanupExpired();
  return idempotencyStore.get(key) || null;
}

/**
 * Mark a request as in progress
 */
export function setInProgress(key: string, jobId: string, ttlMs: number = DEFAULT_TTL_MS): void {
  const now = new Date();
  idempotencyStore.set(key, {
    key,
    status: 'in_progress',
    jobId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  });
}

/**
 * Mark a request as completed with result
 */
export function setCompleted(key: string, result: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
  const existing = idempotencyStore.get(key);
  const now = new Date();
  
  idempotencyStore.set(key, {
    key,
    status: 'completed',
    result,
    jobId: existing?.jobId,
    createdAt: existing?.createdAt || now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  });
}

/**
 * Mark a request as failed
 */
export function setFailed(key: string, error: string): void {
  const existing = idempotencyStore.get(key);
  if (existing) {
    existing.status = 'failed';
    idempotencyStore.set(key, existing);
  }
}

/**
 * Extract idempotency key from request headers
 */
export function getIdempotencyKey(req: Request): string | null {
  return req.headers.get('idempotency-key') || 
         req.headers.get('x-idempotency-key') || 
         null;
}

/**
 * Handle idempotency check with appropriate response
 * Returns a Response if cached result exists, null otherwise
 */
export function handleIdempotencyCheck(
  idempotencyKey: string | null,
  corsHeaders: Record<string, string>
): Response | null {
  if (!idempotencyKey) return null;

  const existing = checkIdempotency(idempotencyKey);
  if (!existing) return null;

  if (existing.status === 'completed' && existing.result) {
    return new Response(JSON.stringify({
      ...existing.result as object,
      _idempotency: { cached: true, key: idempotencyKey }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Idempotency-Status': 'cached' },
    });
  }

  if (existing.status === 'in_progress') {
    return new Response(JSON.stringify({
      status: 'processing',
      job_id: existing.jobId,
      message: 'Request is being processed',
      _idempotency: { in_progress: true, key: idempotencyKey }
    }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Idempotency-Status': 'in_progress' },
    });
  }

  return null;
}
