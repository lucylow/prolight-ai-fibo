/**
 * Enhanced Bria API Client
 * Provides improved error handling, retry logic, and unified interface
 */

const EDGE_BASE_URL = '/edge/bria';
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000;

export interface BriaError {
  error: string;
  errorCode: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface BriaResponse<T = unknown> {
  request_id?: string;
  status: string;
  data?: T;
  images?: Array<{ url: string; [key: string]: unknown }>;
  warning?: string;
}

export interface RequestOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  signal?: AbortSignal;
}

class EnhancedBriaClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit & RequestOptions = {}
  ): Promise<BriaResponse<T>> {
    const {
      retries = DEFAULT_RETRY_ATTEMPTS,
      retryDelay = DEFAULT_RETRY_DELAY,
      timeout = 60000,
      signal,
      ...fetchOptions
    } = options;

    const url = `${EDGE_BASE_URL}${endpoint}`;
    let lastError: BriaError | Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const combinedSignal = signal 
          ? AbortSignal.any([signal, controller.signal])
          : controller.signal;

        const response = await fetch(url, {
          ...fetchOptions,
          signal: combinedSignal,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData: BriaError = await response.json().catch(() => ({
            error: `HTTP ${response.status}: ${response.statusText}`,
            errorCode: 'HTTP_ERROR',
            statusCode: response.status,
          }));

          // Don't retry on client errors (4xx) except for rate limits
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw errorData;
          }

          lastError = errorData;
          
          // Retry on server errors (5xx) and rate limits (429)
          if (attempt < retries && (response.status >= 500 || response.status === 429)) {
            await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
            continue;
          }

          throw errorData;
        }

        return await response.json();
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw {
            error: 'Request timeout',
            errorCode: 'TIMEOUT',
          } as BriaError;
        }

        if (error && typeof error === 'object' && 'errorCode' in error) {
          lastError = error as BriaError;
          
          // Retry on network errors
          if (attempt < retries && error.errorCode === 'UNKNOWN_ERROR') {
            await this.delay(retryDelay * Math.pow(2, attempt));
            continue;
          }
          
          throw error;
        }

        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt));
          continue;
        }

        throw {
          error: lastError instanceof Error ? lastError.message : 'Unknown error',
          errorCode: 'UNKNOWN_ERROR',
        } as BriaError;
      }
    }

    throw lastError || {
      error: 'Request failed after retries',
      errorCode: 'RETRY_EXHAUSTED',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Ads Generation
  async generateAds(request: {
    brand_id?: string;
    template_id?: string;
    formats?: string[];
    prompt?: string;
    structured_prompt?: object;
    branding_blocks?: unknown[];
    sizes?: Array<{ width: number; height: number }>;
  }, options?: RequestOptions): Promise<BriaResponse> {
    return this.request('/ads-generate', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  // Image Onboarding
  async onboardImage(
    imageUrl: string,
    options?: RequestOptions
  ): Promise<BriaResponse<{ asset_id: string }>> {
    return this.request('/image-onboard', {
      method: 'POST',
      body: JSON.stringify({ image_url: imageUrl }),
      ...options,
    });
  }

  // Image Generation
  async textToImage(request: {
    prompt?: string;
    structured_prompt?: object;
    model_version?: 'v1' | 'v2';
    num_results?: number;
    sync?: boolean;
    seed?: number;
    width?: number;
    height?: number;
    guidance_scale?: number;
    steps?: number;
  }, options?: RequestOptions): Promise<BriaResponse> {
    return this.request('/image-generate', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  // Image Editing
  async editImage(request: {
    asset_id: string;
    operation: string;
    params?: Record<string, unknown>;
  }, options?: RequestOptions): Promise<BriaResponse> {
    return this.request('/image-edit', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  // Product Shot Editing
  async editProductShot(request: {
    asset_id: string;
    operation: 'isolate' | 'add_shadow' | 'packshot' | 'replace_background' | 'enhance_product';
    params?: Record<string, unknown>;
  }, options?: RequestOptions): Promise<BriaResponse> {
    return this.request('/product-shot', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  // Video Editing
  async editVideo(request: {
    asset_id: string;
    operation: string;
    params?: Record<string, unknown>;
  }, options?: RequestOptions): Promise<BriaResponse> {
    return this.request('/video-edit', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  // Tailored Generation
  async tailoredGeneration(request: {
    model_id: string;
    prompt?: string;
    structured_prompt?: object;
    num_results?: number;
    sync?: boolean;
  }, options?: RequestOptions): Promise<BriaResponse> {
    return this.request('/tailored-gen', {
      method: 'POST',
      body: JSON.stringify(request),
      ...options,
    });
  }

  // Status Service
  async getStatus(requestId: string, options?: RequestOptions): Promise<BriaResponse> {
    return this.request(`/status?request_id=${encodeURIComponent(requestId)}`, {
      method: 'GET',
      ...options,
    });
  }

  // Enhanced polling with progress callback
  async pollStatus(
    requestId: string,
    options: {
      pollInterval?: number;
      maxWait?: number;
      onProgress?: (status: BriaResponse) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<BriaResponse> {
    const {
      pollInterval = 2000,
      maxWait = 300000,
      onProgress,
      signal,
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (signal?.aborted) {
        throw {
          error: 'Polling aborted',
          errorCode: 'ABORTED',
        } as BriaError;
      }

      const status = await this.getStatus(requestId, { signal });
      
      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'COMPLETED') {
        return status;
      }

      if (status.status === 'ERROR' || status.status === 'FAILED') {
        throw {
          error: 'Job failed',
          errorCode: 'JOB_ERROR',
          details: status.data,
        } as BriaError;
      }

      await this.delay(pollInterval);
    }

    throw {
      error: 'Job did not complete within timeout',
      errorCode: 'TIMEOUT',
    } as BriaError;
  }
}

export const enhancedBriaClient = new EnhancedBriaClient();

