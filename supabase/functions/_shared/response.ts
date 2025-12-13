// Standard response helpers for edge functions

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key, x-idempotency-key',
};

/**
 * Handle CORS preflight request
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Create a success JSON response
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response with consistent format
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: Record<string, unknown>
): Response {
  return new Response(JSON.stringify({
    error: message,
    code: code || getErrorCode(status),
    status,
    ...details,
  }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Get error code from status
 */
function getErrorCode(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 402: return 'PAYMENT_REQUIRED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 429: return 'RATE_LIMITED';
    case 500: return 'INTERNAL_ERROR';
    case 502: return 'BAD_GATEWAY';
    case 503: return 'SERVICE_UNAVAILABLE';
    default: return 'ERROR';
  }
}

/**
 * Handle common HTTP errors
 */
export function handleHttpError(response: Response): Response {
  switch (response.status) {
    case 429:
      return errorResponse(
        'Rate limit exceeded. Please try again later.',
        429,
        'RATE_LIMITED',
        { retry_after: response.headers.get('retry-after') }
      );
    case 402:
      return errorResponse(
        'Payment required. Please add credits to your workspace.',
        402,
        'PAYMENT_REQUIRED'
      );
    case 401:
      return errorResponse(
        'Authentication failed. Please check your API configuration.',
        401,
        'UNAUTHORIZED'
      );
    default:
      return errorResponse(
        `Upstream error: ${response.statusText}`,
        response.status >= 500 ? 502 : response.status
      );
  }
}
