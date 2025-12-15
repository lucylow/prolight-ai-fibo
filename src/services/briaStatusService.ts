/**
 * Bria Status Service - Frontend Client
 * 
 * Provides status tracking for Bria async requests:
 * - Get status by request_id
 * - Start background polling
 * - Subscribe to real-time updates via SSE
 * 
 * Uses Supabase Edge Functions for backend communication
 */

export type BriaStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'UNKNOWN';

export interface BriaStatusResult {
  image_url?: string;
  video_url?: string;
  structured_prompt?: string;
  seed?: number;
  prompt?: string;
  refined_prompt?: string;
}

export interface BriaStatusResponse {
  request_id: string;
  status: BriaStatus;
  result: BriaStatusResult | null;
  status_payload?: unknown;
  error?: unknown;
  last_checked?: string;
}

export interface StartPollResponse {
  started: boolean;
  request_id: string;
  poll_job_id?: string;
  reason?: string;
  status?: BriaStatusResponse;
  message?: string;
}

export interface SSETokenResponse {
  sse_token: string;
  expires_at: string;
}

// Get Supabase URL from environment or use default
const getSupabaseUrl = (): string => {
  // Try to get from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1`;
  }
  
  // Fallback: try to construct from project reference if available
  const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_REF;
  if (projectRef) {
    return `https://${projectRef}.supabase.co/functions/v1`;
  }
  
  // Last resort: use relative path (works if frontend and Supabase are on same domain)
  return '/functions/v1';
};

const SUPABASE_FUNCTIONS_URL = getSupabaseUrl();

/**
 * Get authentication token from Supabase client
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // Try to get from Supabase client if available
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    }
  } catch (err) {
    console.warn('Could not get auth token:', err);
  }
  return null;
}

/**
 * Make authenticated request to Supabase Edge Function
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${SUPABASE_FUNCTIONS_URL}${endpoint}`;
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

class BriaStatusService {
  /**
   * Get current status for a request_id
   */
  async getStatus(requestId: string): Promise<BriaStatusResponse> {
    return request<BriaStatusResponse>(`/bria-status/${encodeURIComponent(requestId)}`, {
      method: 'GET',
    });
  }

  /**
   * Start background polling for a request_id
   */
  async startPoll(
    requestId: string,
    endpointType?: string
  ): Promise<StartPollResponse> {
    return request<StartPollResponse>('/bria-status/start_poll', {
      method: 'POST',
      body: JSON.stringify({
        request_id: requestId,
        endpoint_type: endpointType,
      }),
    });
  }

  /**
   * Get SSE token for real-time updates
   */
  async getSSEToken(requestId?: string): Promise<SSETokenResponse> {
    return request<SSETokenResponse>('/bria-status-token', {
      method: 'POST',
      body: JSON.stringify({
        request_id: requestId,
      }),
    });
  }

  /**
   * Subscribe to real-time status updates via Server-Sent Events
   */
  subscribe(
    requestId: string,
    callbacks: {
      onUpdate?: (status: BriaStatusResponse) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
    }
  ): () => void {
    let eventSource: EventSource | null = null;
    let isClosed = false;

    const close = () => {
      isClosed = true;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    const setupSSE = async () => {
      try {
        // Get SSE token
        const { sse_token } = await this.getSSEToken(requestId);
        
        // Create EventSource connection
        const url = `${SUPABASE_FUNCTIONS_URL}/bria-status-subscribe/${encodeURIComponent(requestId)}?sse_token=${encodeURIComponent(sse_token)}`;
        eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle initial payload
            if (data.initial && data.payload) {
              callbacks.onUpdate?.(data.payload);
              return;
            }

            // Handle status updates
            if (data.request_id && data.status) {
              callbacks.onUpdate?.(data);
              
              // If terminal, close connection
              if (['COMPLETED', 'ERROR', 'UNKNOWN'].includes(data.status)) {
                callbacks.onComplete?.();
                close();
              }
            }
          } catch (err) {
            callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
          }
        };

        eventSource.onerror = (error) => {
          callbacks.onError?.(new Error('SSE connection error'));
          if (!isClosed) {
            // Try to reconnect after a delay
            setTimeout(() => {
              if (!isClosed) {
                close();
                setupSSE();
              }
            }, 5000);
          }
        };
      } catch (err) {
        callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    setupSSE();

    // Return cleanup function
    return close;
  }
}

export const briaStatusService = new BriaStatusService();

