/**
 * Helper utility for Supabase Edge Functions to call Lovable Edge Functions
 * 
 * This allows Supabase functions to securely proxy requests to BRIA via Lovable Edge Functions
 * without exposing API keys in Supabase environment.
 */

interface LovableEdgeConfig {
  baseUrl: string; // Your Lovable Cloud project URL, e.g., "https://your-project.lovable.dev"
  timeout?: number;
}

interface LovableEdgeResponse<T = unknown> {
  request_id?: string;
  status?: string;
  data?: T;
  error?: string;
  errorCode?: string;
  statusCode?: number;
}

class LovableEdgeClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: LovableEdgeConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 60000; // 60s default
  }

  /**
   * Call a Lovable Edge Function
   */
  private async callEdgeFunction<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<LovableEdgeResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request to Lovable Edge Function timed out');
      }
      
      throw error;
    }
  }

  /**
   * Generate image using BRIA via Lovable Edge Function
   */
  async generateImage(params: {
    prompt?: string;
    structured_prompt?: Record<string, unknown>;
    images?: string[];
    num_results?: number;
    sync?: boolean;
    [key: string]: unknown;
  }): Promise<LovableEdgeResponse> {
    return this.callEdgeFunction('/edge/bria/image-generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Edit image using BRIA via Lovable Edge Function
   */
  async editImage(params: {
    asset_id: string;
    operation: string;
    params?: Record<string, unknown>;
  }): Promise<LovableEdgeResponse> {
    return this.callEdgeFunction('/edge/bria/image-edit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get status of async BRIA job
   */
  async getStatus(request_id: string): Promise<LovableEdgeResponse> {
    return this.callEdgeFunction(`/edge/bria/status?request_id=${encodeURIComponent(request_id)}`, {
      method: 'GET',
    });
  }

  /**
   * Onboard image to BRIA
   */
  async onboardImage(image_url: string): Promise<LovableEdgeResponse> {
    return this.callEdgeFunction('/edge/bria/image-onboard', {
      method: 'POST',
      body: JSON.stringify({ image_url }),
    });
  }

  /**
   * Generate ad using BRIA
   */
  async generateAd(params: {
    template_id?: string;
    branding_blocks?: unknown[];
    prompt?: string;
    structured_prompt?: Record<string, unknown>;
    [key: string]: unknown;
  }): Promise<LovableEdgeResponse> {
    return this.callEdgeFunction('/edge/bria/ads-generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Edit product shot using BRIA
   */
  async editProductShot(params: {
    asset_id: string;
    operation: string;
    params?: Record<string, unknown>;
  }): Promise<LovableEdgeResponse> {
    return this.callEdgeFunction('/edge/bria/product-shot', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Generate tailored image using BRIA
   */
  async generateTailored(params: {
    model_id: string;
    prompt?: string;
    structured_prompt?: Record<string, unknown>;
    [key: string]: unknown;
  }): Promise<LovableEdgeResponse> {
    return this.callEdgeFunction('/edge/bria/tailored-gen', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Edit video using BRIA
   */
  async editVideo(params: {
    asset_id: string;
    operation: string;
    params?: Record<string, unknown>;
  }): Promise<LovableEdgeResponse> {
    return this.callEdgeFunction('/edge/bria/video-edit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Poll job status until completion
   */
  async waitForCompletion(
    request_id: string,
    options: {
      pollInterval?: number;
      maxWait?: number;
      onProgress?: (status: string) => void;
    } = {}
  ): Promise<LovableEdgeResponse> {
    const { pollInterval = 2000, maxWait = 300000, onProgress } = options; // 2s poll, 5min max
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed > maxWait) {
        throw new Error(`Job ${request_id} did not complete within ${maxWait}ms`);
      }

      const status = await this.getStatus(request_id);
      
      if (onProgress && status.status) {
        onProgress(status.status);
      }

      if (status.status === 'COMPLETED') {
        return status;
      }

      if (status.status === 'ERROR') {
        throw new Error(`Job ${request_id} failed: ${status.error || 'Unknown error'}`);
      }

      if (status.status === 'UNKNOWN') {
        throw new Error(`Job ${request_id} in unknown state`);
      }

      // Still in progress, wait and retry
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
}

/**
 * Create a Lovable Edge Client instance
 * 
 * Usage:
 * const client = createLovableEdgeClient({
 *   baseUrl: Deno.env.get('LOVABLE_EDGE_URL') || 'https://your-project.lovable.dev'
 * });
 */
export function createLovableEdgeClient(config: LovableEdgeConfig): LovableEdgeClient {
  return new LovableEdgeClient(config);
}

export type { LovableEdgeClient, LovableEdgeResponse, LovableEdgeConfig };

