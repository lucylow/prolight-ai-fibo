/**
 * Bria API Client Service
 * Handles communication with Bria Edge Functions
 */

const EDGE_BASE_URL = '/edge/bria';

export interface BriaError {
  error: string;
  errorCode: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface BriaResponse<T = unknown> {
  request_id?: string;
  status: string;
  data: T;
}

export interface TextToImageRequest {
  prompt?: string;
  structured_prompt?: Record<string, unknown>;
  model_version?: 'v1' | 'v2';
  num_results?: number;
  sync?: boolean;
  seed?: number;
  width?: number;
  height?: number;
  guidance_scale?: number;
  steps?: number;
}

export interface TailoredModelTrainRequest {
  name: string;
  training_images: string[];
  description?: string;
}

export interface TailoredGenerationRequest {
  model_id: string;
  prompt?: string;
  structured_prompt?: Record<string, unknown>;
  num_results?: number;
  sync?: boolean;
}

export interface AdsGenerationRequest {
  template_id?: string;
  branding_blocks?: unknown[];
  prompt?: string;
  structured_prompt?: Record<string, unknown>;
  brand_id?: string;
  sizes?: Array<{ width: number; height: number }>;
}

export interface ImageEditRequest {
  asset_id: string;
  operation: string;
  params?: Record<string, unknown>;
}

export interface ProductShotRequest {
  asset_id: string;
  operation: 'isolate' | 'add_shadow' | 'packshot' | 'replace_background' | 'enhance_product';
  params?: Record<string, unknown>;
}

export interface VideoEditRequest {
  asset_id: string;
  operation: string;
  params?: Record<string, unknown>;
}

class BriaClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<BriaResponse<T>> {
    const url = `${EDGE_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData: BriaError = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
          errorCode: 'HTTP_ERROR',
          statusCode: response.status,
        }));
        throw errorData;
      }

      return await response.json();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorCode' in error) {
        throw error;
      }
      throw {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNKNOWN_ERROR',
      } as BriaError;
    }
  }

  async textToImage(request: TextToImageRequest): Promise<BriaResponse> {
    return this.request('/image-generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async onboardImage(imageUrl: string): Promise<BriaResponse<{ asset_id: string }>> {
    return this.request('/image-onboard', {
      method: 'POST',
      body: JSON.stringify({ image_url: imageUrl }),
    });
  }

  async editImage(request: ImageEditRequest): Promise<BriaResponse> {
    return this.request('/image-edit', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Edit image using BRIA API v2 endpoints
   * Supports direct image URLs/base64 (no onboarding required)
   */
  async editImageV2(params: {
    operation: string;
    image: string; // base64 or URL
    mask?: string; // base64 or URL
    prompt?: string;
    negativePrompt?: string;
    [key: string]: unknown;
  }): Promise<BriaResponse> {
    return this.request('/image-edit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async productShotEdit(request: ProductShotRequest): Promise<BriaResponse> {
    return this.request('/product-shot', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async tailoredGeneration(request: TailoredGenerationRequest): Promise<BriaResponse> {
    return this.request('/tailored-gen', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateAds(request: AdsGenerationRequest): Promise<BriaResponse> {
    return this.request('/ads-generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async editVideo(request: VideoEditRequest): Promise<BriaResponse> {
    return this.request('/video-edit', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getStatus(requestId: string): Promise<BriaResponse> {
    return this.request(`/status?request_id=${encodeURIComponent(requestId)}`, {
      method: 'GET',
    });
  }

  async pollStatus(
    requestId: string,
    pollInterval: number = 2000,
    maxWait: number = 300000
  ): Promise<BriaResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const status = await this.getStatus(requestId);

      if (status.status === 'COMPLETED') {
        return status;
      }

      if (status.status === 'ERROR') {
        throw {
          error: 'Job failed',
          errorCode: 'JOB_ERROR',
          details: status.data,
        } as BriaError;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw {
      error: 'Job did not complete within timeout',
      errorCode: 'TIMEOUT',
    } as BriaError;
  }
}

export const briaClient = new BriaClient();

