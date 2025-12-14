/**
 * ProLight AI - BRIA Image Editing API v2 Complete Integration
 * Comprehensive implementation for all image editing operations
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BriaImageEditingConfig {
  apiToken: string;
  baseUrl?: string;
  timeout?: number;
}

export interface EraseParams {
  image: string; // base64 or URL
  mask: string; // base64 or URL
  maskType?: 'manual' | 'automatic';
  preserveAlpha?: boolean;
  sync?: boolean;
  visualInputContentModeration?: boolean;
  visualOutputContentModeration?: boolean;
}

export interface GenFillParams {
  image: string; // base64 or URL
  mask: string; // base64 or URL
  prompt: string;
  version?: 1 | 2;
  refinePrompt?: boolean;
  tailoredModelId?: string;
  promptContentModeration?: boolean;
  negativePrompt?: string;
  preserveAlpha?: boolean;
  sync?: boolean;
  seed?: number;
  visualInputContentModeration?: boolean;
  visualOutputContentModeration?: boolean;
  maskType?: 'manual' | 'automatic';
}

export interface RemoveBackgroundParams {
  image: string; // base64 or URL
  preserveAlpha?: boolean;
  sync?: boolean;
  visualInputContentModeration?: boolean;
  visualOutputContentModeration?: boolean;
}

export interface ReplaceBackgroundParams {
  image: string; // base64 or URL
  prompt?: string;
  refImages?: string | string[];
  mode?: 'base' | 'high_control' | 'fast';
  enhanceRefImages?: boolean;
  refinePrompt?: boolean;
  promptContentModeration?: boolean;
  negativePrompt?: string;
  originalQuality?: boolean;
  forceBackgroundDetection?: boolean;
  sync?: boolean;
  seed?: number;
  visualOutputContentModeration?: boolean;
}

export interface ExpandParams {
  image: string; // base64 or URL
  aspectRatio?: string | number;
  canvasSize?: [number, number];
  originalImageSize?: [number, number];
  originalImageLocation?: [number, number];
  prompt?: string;
  promptContentModeration?: boolean;
  seed?: number;
  negativePrompt?: string;
  preserveAlpha?: boolean;
  sync?: boolean;
  visualInputContentModeration?: boolean;
  visualOutputContentModeration?: boolean;
}

export interface EnhanceParams {
  image: string; // base64 or URL
  sync?: boolean;
  visualInputContentModeration?: boolean;
  visualOutputContentModeration?: boolean;
  seed?: number;
  stepsNum?: number;
  resolution?: '1MP' | '2MP' | '4MP';
  preserveAlpha?: boolean;
}

export interface BlurBackgroundParams {
  image: string; // base64 or URL
  scale?: number; // 1-5
  preserveAlpha?: boolean;
  sync?: boolean;
  visualInputContentModeration?: boolean;
  visualOutputContentModeration?: boolean;
}

export interface EraseForegroundParams {
  image: string; // base64 or URL
  preserveAlpha?: boolean;
  sync?: boolean;
  visualInputContentModeration?: boolean;
  visualOutputContentModeration?: boolean;
}

export interface CropForegroundParams {
  image: string; // base64 or URL
  padding?: number;
  forceBackgroundDetection?: boolean;
  preserveAlpha?: boolean;
  sync?: boolean;
  visualInputContentModeration?: boolean;
  visualOutputContentModeration?: boolean;
}

export interface IncreaseResolutionParams {
  image: string; // base64 or URL
  preserveAlpha?: boolean;
  desiredIncrease?: 2 | 4;
  sync?: boolean;
  visualInputContentModeration?: boolean;
  visualOutputContentModeration?: boolean;
}

export interface MaskGeneratorParams {
  image: string; // base64 or URL
  sync?: boolean;
  visualInputContentModeration?: boolean;
}

export interface BriaImageEditingResponse {
  result?: {
    image_url: string;
    seed?: number;
    refined_prompt?: string;
    prompt?: string;
  };
  request_id: string;
  status_url?: string;
}

export interface StatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    image_url: string;
    refined_prompt?: string;
    seed?: number;
  };
  error?: string;
}

export interface CompleteLightingEnhancementResult {
  originalImageUrl: string;
  backgroundRemovedUrl?: string;
  lightingEnhancedUrl?: string;
  expandedUrl?: string;
  finalUrl: string;
  workflow: string[];
  timing: Record<string, number>;
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class BriaImageEditingService {
  private config: BriaImageEditingConfig;
  private baseUrl: string;

  constructor(config: BriaImageEditingConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://engine.prod.bria-api.com/v2/image/edit';
  }

  /**
   * Generic request method with error handling
   */
  private async request(
    endpoint: string,
    payload: Record<string, any>
  ): Promise<BriaImageEditingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_token': this.config.apiToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Bria API Error: ${response.status} - ${JSON.stringify(error)}`);
      }

      // Handle both 200 (sync) and 202 (async) responses
      if (response.status === 202) {
        const data = await response.json();
        return {
          request_id: data.request_id,
          status_url: data.status_url,
        };
      }

      return await response.json();
    } catch (error) {
      console.error(`Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Poll status endpoint for async requests
   */
  async checkStatus(statusUrl: string, maxRetries: number = 60): Promise<BriaImageEditingResponse> {
    let retries = 0;
    const pollInterval = 2000; // 2 seconds

    while (retries < maxRetries) {
      try {
        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'api_token': this.config.apiToken,
          },
        });

        const data: StatusResponse = await response.json();

        if (data.status === 'completed') {
          return {
            result: data.result,
            request_id: statusUrl.split('/').pop() || '',
          };
        }

        if (data.status === 'failed') {
          throw new Error(`Processing failed: ${data.error}`);
        }

        // Still processing, wait and retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        retries++;
      } catch (error) {
        console.error('Status check failed:', error);
        throw error;
      }
    }

    throw new Error('Request timeout: Processing took too long');
  }

  /**
   * Erase specific regions from an image using a mask
   */
  async erase(params: EraseParams): Promise<BriaImageEditingResponse> {
    const payload: Record<string, any> = {
      image: params.image,
      mask: params.mask,
      mask_type: params.maskType || 'manual',
      preserve_alpha: params.preserveAlpha !== false,
      sync: params.sync === true,
      visual_input_content_moderation: params.visualInputContentModeration || false,
      visual_output_content_moderation: params.visualOutputContentModeration || false,
    };

    const response = await this.request('/erase', payload);
    
    // If async, poll for result
    if (response.status_url && !params.sync) {
      return this.checkStatus(response.status_url);
    }
    
    return response;
  }

  /**
   * Generate objects in a masked region using a text prompt
   */
  async generativeFill(params: GenFillParams): Promise<BriaImageEditingResponse> {
    const payload: Record<string, any> = {
      image: params.image,
      mask: params.mask,
      prompt: params.prompt,
      version: params.version || 2,
      refine_prompt: params.refinePrompt !== false,
      prompt_content_moderation: params.promptContentModeration !== false,
      preserve_alpha: params.preserveAlpha !== false,
      sync: params.sync === true,
      visual_input_content_moderation: params.visualInputContentModeration || false,
      visual_output_content_moderation: params.visualOutputContentModeration || false,
      mask_type: params.maskType || 'manual',
    };

    if (params.tailoredModelId) payload.tailored_model_id = params.tailoredModelId;
    if (params.negativePrompt) payload.negative_prompt = params.negativePrompt;
    if (params.seed !== undefined) payload.seed = params.seed;

    const response = await this.request('/gen_fill', payload);
    
    if (response.status_url && !params.sync) {
      return this.checkStatus(response.status_url);
    }
    
    return response;
  }

  /**
   * Remove background from an image
   */
  async removeBackground(params: RemoveBackgroundParams): Promise<BriaImageEditingResponse> {
    const payload: Record<string, any> = {
      image: params.image,
      preserve_alpha: params.preserveAlpha !== false,
      sync: params.sync === true,
      visual_input_content_moderation: params.visualInputContentModeration || false,
      visual_output_content_moderation: params.visualOutputContentModeration || false,
    };

    const response = await this.request('/remove_background', payload);
    
    if (response.status_url && !params.sync) {
      return this.checkStatus(response.status_url);
    }
    
    return response;
  }

  /**
   * Replace the background with AI-generated content
   */
  async replaceBackground(params: ReplaceBackgroundParams): Promise<BriaImageEditingResponse> {
    const payload: Record<string, any> = {
      image: params.image,
      mode: params.mode || 'high_control',
      enhance_ref_images: params.enhanceRefImages !== false,
      refine_prompt: params.refinePrompt !== false,
      prompt_content_moderation: params.promptContentModeration !== false,
      original_quality: params.originalQuality || false,
      force_background_detection: params.forceBackgroundDetection || false,
      sync: params.sync === true,
      visual_output_content_moderation: params.visualOutputContentModeration || false,
    };

    if (params.prompt) payload.prompt = params.prompt;
    if (params.refImages) payload.ref_images = params.refImages;
    if (params.negativePrompt) payload.negative_prompt = params.negativePrompt;
    if (params.seed !== undefined) payload.seed = params.seed;

    const response = await this.request('/replace_background', payload);
    
    if (response.status_url && !params.sync) {
      return this.checkStatus(response.status_url);
    }
    
    return response;
  }

  /**
   * Expand image canvas in specified directions
   */
  async expand(params: ExpandParams): Promise<BriaImageEditingResponse> {
    const payload: Record<string, any> = {
      image: params.image,
      prompt_content_moderation: params.promptContentModeration !== false,
      preserve_alpha: params.preserveAlpha !== false,
      sync: params.sync === true,
      visual_input_content_moderation: params.visualInputContentModeration || false,
      visual_output_content_moderation: params.visualOutputContentModeration || false,
    };

    if (params.aspectRatio) {
      payload.aspect_ratio = params.aspectRatio;
    } else if (params.canvasSize && params.originalImageSize && params.originalImageLocation) {
      payload.canvas_size = params.canvasSize;
      payload.original_image_size = params.originalImageSize;
      payload.original_image_location = params.originalImageLocation;
    } else {
      payload.canvas_size = params.canvasSize || [1000, 1000];
    }

    if (params.prompt) payload.prompt = params.prompt;
    if (params.negativePrompt) payload.negative_prompt = params.negativePrompt;
    if (params.seed !== undefined) payload.seed = params.seed;

    const response = await this.request('/expand', payload);
    
    if (response.status_url && !params.sync) {
      return this.checkStatus(response.status_url);
    }
    
    return response;
  }

  /**
   * Enhance image quality and resolution
   */
  async enhance(params: EnhanceParams): Promise<BriaImageEditingResponse> {
    const payload: Record<string, any> = {
      image: params.image,
      sync: params.sync === true,
      visual_input_content_moderation: params.visualInputContentModeration || false,
      visual_output_content_moderation: params.visualOutputContentModeration || false,
      steps_num: params.stepsNum || 20,
      resolution: params.resolution || '1MP',
      preserve_alpha: params.preserveAlpha !== false,
    };

    if (params.seed !== undefined) payload.seed = params.seed;

    const response = await this.request('/enhance', payload);
    
    if (response.status_url && !params.sync) {
      return this.checkStatus(response.status_url);
    }
    
    return response;
  }

  /**
   * Blur background while keeping foreground sharp
   */
  async blurBackground(params: BlurBackgroundParams): Promise<BriaImageEditingResponse> {
    const payload: Record<string, any> = {
      image: params.image,
      scale: params.scale || 5,
      preserve_alpha: params.preserveAlpha !== false,
      sync: params.sync === true,
      visual_input_content_moderation: params.visualInputContentModeration || false,
      visual_output_content_moderation: params.visualOutputContentModeration || false,
    };

    const response = await this.request('/blur_background', payload);
    
    if (response.status_url && !params.sync) {
      return this.checkStatus(response.status_url);
    }
    
    return response;
  }

  /**
   * Erase foreground and inpaint background
   */
  async eraseForeground(params: EraseForegroundParams): Promise<BriaImageEditingResponse> {
    const payload: Record<string, any> = {
      image: params.image,
      preserve_alpha: params.preserveAlpha !== false,
      sync: params.sync === true,
      visual_input_content_moderation: params.visualInputContentModeration || false,
      visual_output_content_moderation: params.visualOutputContentModeration || false,
    };

    const response = await this.request('/erase_foreground', payload);
    
    if (response.status_url && !params.sync) {
      return this.checkStatus(response.status_url);
    }
    
    return response;
  }

  /**
   * Automatically crop image to content
   */
  async cropForeground(params: CropForegroundParams): Promise<BriaImageEditingResponse> {
    const payload: Record<string, any> = {
      image: params.image,
      padding: params.padding || 0,
      force_background_detection: params.forceBackgroundDetection || false,
      preserve_alpha: params.preserveAlpha !== false,
      sync: params.sync === true,
      visual_input_content_moderation: params.visualInputContentModeration || false,
      visual_output_content_moderation: params.visualOutputContentModeration || false,
    };

    const response = await this.request('/crop_foreground', payload);
    
    if (response.status_url && !params.sync) {
      return this.checkStatus(response.status_url);
    }
    
    return response;
  }

  /**
   * Increase image resolution
   */
  async increaseResolution(params: IncreaseResolutionParams): Promise<BriaImageEditingResponse> {
    const payload: Record<string, any> = {
      image: params.image,
      preserve_alpha: params.preserveAlpha !== false,
      desired_increase: params.desiredIncrease || 2,
      sync: params.sync === true,
      visual_input_content_moderation: params.visualInputContentModeration || false,
      visual_output_content_moderation: params.visualOutputContentModeration || false,
    };

    const response = await this.request('/increase_resolution', payload);
    
    if (response.status_url && !params.sync) {
      return this.checkStatus(response.status_url);
    }
    
    return response;
  }

  /**
   * Generate masks for all objects in an image (v1 endpoint)
   */
  async generateMasks(params: MaskGeneratorParams): Promise<BriaImageEditingResponse> {
    const v1BaseUrl = 'https://engine.prod.bria-api.com/v1';
    
    const payload: Record<string, any> = {
      image: params.image,
      sync: params.sync === true,
      visual_input_content_moderation: params.visualInputContentModeration || false,
    };

    try {
      const response = await fetch(`${v1BaseUrl}/objects/mask_generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_token': this.config.apiToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Bria API Error: ${response.status} - ${JSON.stringify(error)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Mask generation failed:', error);
      throw error;
    }
  }

  /**
   * Complete lighting enhancement workflow for ProLight
   * Combines multiple operations for professional results
   */
  async completeLightingEnhancement(
    imageUrl: string,
    options?: {
      removeBackground?: boolean;
      replaceBackground?: boolean;
      enhance?: boolean;
      expandCanvas?: boolean;
      backgroundPrompt?: string;
      expandAmount?: { top: number; bottom: number; left: number; right: number };
      expandAspectRatio?: string | number;
    }
  ): Promise<CompleteLightingEnhancementResult> {
    const startTime = Date.now();
    const results: CompleteLightingEnhancementResult = {
      originalImageUrl: imageUrl,
      workflow: [],
      timing: {},
      finalUrl: imageUrl,
    };

    try {
      let currentImageUrl = imageUrl;

      // Step 1: Remove background
      if (options?.removeBackground !== false) {
        console.log('Step 1: Removing background...');
        const stepStart = Date.now();
        const bgResponse = await this.removeBackground({
          image: currentImageUrl,
          sync: true,
        });
        results.backgroundRemovedUrl = bgResponse.result?.image_url;
        currentImageUrl = bgResponse.result?.image_url || currentImageUrl;
        results.workflow.push('background_removed');
        results.timing.backgroundRemoval = Date.now() - stepStart;
      }

      // Step 2: Replace background with lighting
      if (options?.replaceBackground !== false && options?.backgroundPrompt) {
        console.log('Step 2: Replacing background with lighting...');
        const stepStart = Date.now();
        const bgReplaceResponse = await this.replaceBackground({
          image: currentImageUrl,
          prompt: options.backgroundPrompt || 'Professional studio background with neutral lighting',
          mode: 'high_control',
          sync: true,
        });
        results.lightingEnhancedUrl = bgReplaceResponse.result?.image_url;
        currentImageUrl = bgReplaceResponse.result?.image_url || currentImageUrl;
        results.workflow.push('background_replaced');
        results.timing.backgroundReplacement = Date.now() - stepStart;
      }

      // Step 3: Expand canvas
      if (options?.expandCanvas !== false) {
        console.log('Step 3: Expanding canvas...');
        const stepStart = Date.now();
        const expandParams: ExpandParams = {
          image: currentImageUrl,
          prompt: 'Professional studio background with neutral lighting',
          sync: true,
        };

        if (options.expandAspectRatio) {
          expandParams.aspectRatio = options.expandAspectRatio;
        } else if (options.expandAmount) {
          // Calculate canvas size and position based on expand amounts
          // This is a simplified calculation - adjust based on your needs
          expandParams.canvasSize = [2000, 2000];
          expandParams.originalImageSize = [1500, 1500];
          expandParams.originalImageLocation = [
            options.expandAmount.left,
            options.expandAmount.top,
          ];
        }

        const expandResponse = await this.expand(expandParams);
        results.expandedUrl = expandResponse.result?.image_url;
        currentImageUrl = expandResponse.result?.image_url || currentImageUrl;
        results.workflow.push('canvas_expanded');
        results.timing.canvasExpansion = Date.now() - stepStart;
      }

      // Step 4: Enhance overall quality
      if (options?.enhance !== false) {
        console.log('Step 4: Enhancing quality...');
        const stepStart = Date.now();
        const enhanceResponse = await this.enhance({
          image: currentImageUrl,
          resolution: '2MP',
          sync: true,
        });

        results.finalUrl = enhanceResponse.result?.image_url || currentImageUrl;
        results.workflow.push('quality_enhanced');
        results.timing.qualityEnhancement = Date.now() - stepStart;
      } else {
        results.finalUrl = currentImageUrl;
      }

      results.timing.totalTime = Date.now() - startTime;
      return results;
    } catch (error) {
      console.error('Workflow error:', error);
      throw error;
    }
  }
}
