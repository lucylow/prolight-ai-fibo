/**
 * BRIA Image Generation API v2 Service
 * Complete implementation for FIBO-based image generation
 * Supports text-to-image, image-to-image, structured prompts, and VLM bridges
 */

export interface BriaV2Config {
  apiToken: string;
  baseUrl?: string;
  timeout?: number;
}

// Text-to-Image Generation
export interface TextToImageV2Params {
  prompt?: string;
  images?: string[]; // Reference images (URLs or base64)
  structured_prompt?: string | Record<string, unknown>; // FIBO JSON structure
  negative_prompt?: string;
  aspect_ratio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9';
  guidance_scale?: number; // 3-5
  steps_num?: number; // 35-50
  seed?: number;
  sync?: boolean;
  model_version?: string; // 'FIBO' or default
  ip_signal?: boolean;
  prompt_content_moderation?: boolean;
  visual_input_content_moderation?: boolean;
  visual_output_content_moderation?: boolean;
}

// Image-to-Image Generation
export interface ImageToImageV2Params {
  images: string[]; // Reference image(s)
  prompt?: string;
  structured_prompt?: string | Record<string, unknown>;
  negative_prompt?: string;
  strength?: number; // 0.0 to 1.0
  guidance_scale?: number;
  steps_num?: number;
  seed?: number;
  aspect_ratio?: string;
  sync?: boolean;
}

// Structured Prompt Generation
export interface StructuredPromptParams {
  prompt?: string;
  images?: string[];
  structured_prompt?: string | Record<string, unknown>; // For refinement
  seed?: number;
  sync?: boolean;
  ip_signal?: boolean;
  prompt_content_moderation?: boolean;
  visual_input_content_moderation?: boolean;
}

// Batch Generation
export interface BatchGenerationParams {
  prompts: string[];
  aspect_ratio?: string;
  quality?: 'draft' | 'standard' | 'premium';
  guidance_scale?: number;
  steps_num?: number;
  seed?: number;
  sync?: boolean;
}

// Response Types
export interface BriaV2Response {
  result?: {
    image_url?: string;
    images?: Array<{ url: string; seed: number }>;
    seed?: number;
    structured_prompt?: string | Record<string, unknown>;
  };
  request_id: string;
  status_url?: string;
  warning?: string;
}

export interface StatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    image_url?: string;
    images?: Array<{ url: string; seed: number }>;
    seed?: number;
    structured_prompt?: string | Record<string, unknown>;
  };
  error?: string;
  progress?: number;
}

/**
 * BRIA Image Generation v2 Service
 */
export class BriaImageGenerationV2Service {
  private config: BriaV2Config;
  private edgeBaseUrl = '/edge/bria';

  constructor(config: BriaV2Config) {
    this.config = config;
  }

  /**
   * Generic request method
   */
  private async request<T>(
    endpoint: string,
    payload: Record<string, unknown>
  ): Promise<T> {
    try {
      const response = await fetch(`${this.edgeBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(`Bria API Error: ${response.status} - ${JSON.stringify(error)}`);
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
  async checkStatus(
    requestId: string,
    maxRetries: number = 120,
    pollInterval: number = 2000
  ): Promise<BriaV2Response> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await fetch(
          `${this.edgeBaseUrl}/status?request_id=${encodeURIComponent(requestId)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const data: StatusResponse = await response.json();

        if (data.status === 'completed') {
          return {
            result: data.result,
            request_id: requestId,
          };
        }

        if (data.status === 'failed') {
          throw new Error(`Generation failed: ${data.error}`);
        }

        // Still processing
        console.log(`Generation progress: ${data.progress || 'processing'}%`);
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        retries++;
      } catch (error) {
        console.error('Status check failed:', error);
        throw error;
      }
    }

    throw new Error('Request timeout: Image generation took too long');
  }

  /**
   * Text-to-Image generation with FIBO v2
   */
  async textToImage(params: TextToImageV2Params): Promise<BriaV2Response> {
    const payload: Record<string, unknown> = {
      sync: params.sync !== undefined ? params.sync : false,
    };

    if (params.prompt) payload.prompt = params.prompt;
    if (params.images && params.images.length > 0) payload.images = params.images;
    if (params.structured_prompt) {
      payload.structured_prompt = typeof params.structured_prompt === 'string'
        ? JSON.parse(params.structured_prompt)
        : params.structured_prompt;
    }
    if (params.negative_prompt) payload.negative_prompt = params.negative_prompt;
    if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;
    if (params.guidance_scale !== undefined) payload.guidance_scale = params.guidance_scale;
    if (params.steps_num !== undefined) payload.steps_num = params.steps_num;
    if (params.seed !== undefined) payload.seed = params.seed;
    if (params.model_version) payload.model_version = params.model_version;
    if (params.ip_signal !== undefined) payload.ip_signal = params.ip_signal;
    if (params.prompt_content_moderation !== undefined) {
      payload.prompt_content_moderation = params.prompt_content_moderation;
    }
    if (params.visual_input_content_moderation !== undefined) {
      payload.visual_input_content_moderation = params.visual_input_content_moderation;
    }
    if (params.visual_output_content_moderation !== undefined) {
      payload.visual_output_content_moderation = params.visual_output_content_moderation;
    }

    const response = await this.request<BriaV2Response>('/image-generate-v2', payload);

    // If async, poll for results
    if (!params.sync && response.status_url) {
      const statusUrl = response.status_url;
      const requestId = statusUrl.split('/').pop() || response.request_id;
      if (requestId) {
        return this.checkStatus(requestId);
      }
    }

    return response;
  }

  /**
   * Image-to-Image generation
   */
  async imageToImage(params: ImageToImageV2Params): Promise<BriaV2Response> {
    const payload: Record<string, unknown> = {
      images: params.images,
      sync: params.sync !== undefined ? params.sync : false,
    };

    if (params.prompt) payload.prompt = params.prompt;
    if (params.structured_prompt) {
      payload.structured_prompt = typeof params.structured_prompt === 'string'
        ? JSON.parse(params.structured_prompt)
        : params.structured_prompt;
    }
    if (params.negative_prompt) payload.negative_prompt = params.negative_prompt;
    if (params.strength !== undefined) payload.strength = params.strength;
    if (params.guidance_scale !== undefined) payload.guidance_scale = params.guidance_scale;
    if (params.steps_num !== undefined) payload.steps_num = params.steps_num;
    if (params.seed !== undefined) payload.seed = params.seed;
    if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;

    const response = await this.request<BriaV2Response>('/image-to-image-v2', payload);

    if (!params.sync && response.status_url) {
      const statusUrl = response.status_url;
      const requestId = statusUrl.split('/').pop() || response.request_id;
      if (requestId) {
        return this.checkStatus(requestId);
      }
    }

    return response;
  }

  /**
   * Generate structured prompt (FIBO JSON) from text or images
   */
  async generateStructuredPrompt(params: StructuredPromptParams): Promise<BriaV2Response> {
    const payload: Record<string, unknown> = {
      sync: params.sync !== undefined ? params.sync : true,
    };

    if (params.prompt) payload.prompt = params.prompt;
    if (params.images && params.images.length > 0) payload.images = params.images;
    if (params.structured_prompt) {
      payload.structured_prompt = typeof params.structured_prompt === 'string'
        ? JSON.parse(params.structured_prompt)
        : params.structured_prompt;
    }
    if (params.seed !== undefined) payload.seed = params.seed;
    if (params.ip_signal !== undefined) payload.ip_signal = params.ip_signal;
    if (params.prompt_content_moderation !== undefined) {
      payload.prompt_content_moderation = params.prompt_content_moderation;
    }
    if (params.visual_input_content_moderation !== undefined) {
      payload.visual_input_content_moderation = params.visual_input_content_moderation;
    }

    return this.request<BriaV2Response>('/structured-prompt', payload);
  }

  /**
   * Batch text-to-image generation
   */
  async batchGeneration(params: BatchGenerationParams): Promise<BriaV2Response[]> {
    const results: BriaV2Response[] = [];

    for (const prompt of params.prompts) {
      const result = await this.textToImage({
        prompt,
        aspect_ratio: params.aspect_ratio as TextToImageV2Params['aspect_ratio'],
        guidance_scale: params.guidance_scale,
        steps_num: params.steps_num,
        seed: params.seed,
        sync: params.sync !== undefined ? params.sync : true,
      });

      results.push(result);

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * ProLight-specific: Generate professional product shots
   */
  async generateProductShot(
    productDescription: string,
    lightingSetup: string,
    background: string,
    options?: {
      aspectRatio?: string;
      quality?: 'draft' | 'standard' | 'premium';
      seed?: number;
    }
  ): Promise<BriaV2Response> {
    const prompt = `Professional product photography of ${productDescription}. 
      Lighting setup: ${lightingSetup}. 
      Background: ${background}. 
      Style: commercial photography, studio lighting, professional, high-quality, detailed. 
      Technical specs: shot on professional camera, proper white balance, sharp focus on product, professional color grading.`;

    return this.textToImage({
      prompt,
      aspect_ratio: (options?.aspectRatio as TextToImageV2Params['aspect_ratio']) || '1:1',
      seed: options?.seed,
      sync: true,
    });
  }

  /**
   * ProLight-specific: Generate lighting variations
   */
  async generateLightingVariations(
    productDescription: string,
    baseBackground: string,
    lightingStyles: string[] = [
      'Professional 3-point studio lighting with key light, fill light, and rim light',
      'Soft window light from the left with subtle fill from reflectors',
      'Dramatic rim lighting with moody background',
      'Flat diffused lighting for neutral product shots',
    ]
  ): Promise<Array<{ lighting: string; imageUrl: string; seed: number }>> {
    const results = [];

    for (const lighting of lightingStyles) {
      const prompt = `Professional product photography of ${productDescription}.
        Lighting: ${lighting}.
        Background: ${baseBackground}.
        Studio photography, professional lighting, high quality, sharp focus, detailed.`;

      const response = await this.textToImage({
        prompt,
        sync: true,
      });

      if (response.result?.image_url) {
        results.push({
          lighting,
          imageUrl: response.result.image_url,
          seed: response.result.seed || 0,
        });
      } else if (response.result?.images?.[0]) {
        results.push({
          lighting,
          imageUrl: response.result.images[0].url,
          seed: response.result.images[0].seed,
        });
      }

      // Delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Complete workflow: Generate multiple product photography variations
   */
  async completeProductPhotographyWorkflow(
    productDescription: string,
    options?: {
      numVariations?: number;
      lightingTypes?: string[];
      backgrounds?: string[];
      sync?: boolean;
    }
  ): Promise<{
    variations: Array<{
      prompt: string;
      imageUrl: string;
      seed: number;
      lighting: string;
      background: string;
    }>;
    workflowMetadata: {
      totalGenerated: number;
      successCount: number;
      timing: number;
      productDescription: string;
    };
  }> {
    const startTime = Date.now();
    const variations = [];

    const lightingTypes = options?.lightingTypes || [
      'Professional 3-point studio lighting',
      'Soft window light',
      'Dramatic rim lighting',
    ];

    const backgrounds = options?.backgrounds || [
      'white seamless backdrop',
      'neutral gray background',
    ];

    for (const lighting of lightingTypes) {
      for (const background of backgrounds) {
        try {
          const prompt = `Professional product shot of ${productDescription}.
            Lighting: ${lighting}.
            Background: ${background}.
            Photography style: commercial product photography, studio quality, professional lighting, sharp focus, detailed, high resolution.
            Technical: shot with professional camera, proper white balance, excellent color grading, shadow and highlight detail preserved.`;

          const response = await this.textToImage({
            prompt,
            sync: options?.sync !== undefined ? options.sync : true,
          });

          const imageUrl = response.result?.image_url || response.result?.images?.[0]?.url;
          const seed = response.result?.seed || response.result?.images?.[0]?.seed || 0;

          if (imageUrl) {
            variations.push({
              prompt,
              imageUrl,
              seed,
              lighting,
              background,
            });
          }

          // Delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to generate with ${lighting} + ${background}:`, error);
        }
      }
    }

    return {
      variations,
      workflowMetadata: {
        totalGenerated: lightingTypes.length * backgrounds.length,
        successCount: variations.length,
        timing: Date.now() - startTime,
        productDescription,
      },
    };
  }
}
