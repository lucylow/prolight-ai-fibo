/**
 * Unified Bria Image Service
 * Combines image generation, editing, and FIBO structured prompts
 */

import { briaClient, TextToImageRequest, ImageEditRequest } from './briaClient';
import { BriaImageGenerationV2Service, TextToImageV2Params, ImageToImageV2Params } from './briaImageGenerationV2';
import { BriaImageEditingService, GenFillParams, RemoveBackgroundParams, ReplaceBackgroundParams, EnhanceParams, ExpandParams } from './briaImageEditingService';
import { getBriaApiToken } from '@/utils/env';

export interface FIBOStructuredPrompt {
  lighting?: {
    key_light?: {
      intensity?: number;
      angle_horizontal?: number;
      angle_vertical?: number;
      color_temperature?: number;
      softness?: number;
      distance?: number;
      enabled?: boolean;
    };
    fill_light?: {
      intensity?: number;
      angle_horizontal?: number;
      angle_vertical?: number;
      color_temperature?: number;
      softness?: number;
      distance?: number;
      enabled?: boolean;
      fill_ratio?: number;
    };
    rim_light?: {
      intensity?: number;
      angle_horizontal?: number;
      angle_vertical?: number;
      color_temperature?: number;
      softness?: number;
      distance?: number;
      enabled?: boolean;
    };
    ambient?: {
      intensity?: number;
      color_temperature?: number;
      enabled?: boolean;
    };
  };
  camera?: {
    focal_length?: number;
    aperture?: number;
    iso?: number;
    white_balance?: number;
    metering_mode?: string;
    shot_type?: string;
    camera_angle?: string;
  };
  scene?: {
    subject_description?: string;
    environment?: string;
    style_preset?: string;
    background?: string;
  };
}

export interface GenerationResult {
  image_url: string;
  image_id?: string;
  seed?: number;
  fibo_json?: FIBOStructuredPrompt | Record<string, unknown>;
  request_id?: string;
  timestamp?: string;
}

export class BriaImageService {
  private generationService: BriaImageGenerationV2Service;
  private editingService: BriaImageEditingService;
  private apiToken: string;

  constructor() {
    const token = getBriaApiToken();
    if (!token) {
      console.warn('BRIA_API_TOKEN not found. Some features may not work.');
    }
    this.apiToken = token || '';
    this.generationService = new BriaImageGenerationV2Service({ apiToken: this.apiToken });
    this.editingService = new BriaImageEditingService({ apiToken: this.apiToken });
  }

  /**
   * Generate image with FIBO structured prompt
   */
  async generateWithFIBO(
    prompt: string,
    fiboJson: FIBOStructuredPrompt | Record<string, unknown>,
    options?: {
      seed?: number;
      sync?: boolean;
      aspect_ratio?: TextToImageV2Params['aspect_ratio'];
      guidance_scale?: number;
      steps_num?: number;
    }
  ): Promise<GenerationResult> {
    try {
      const params: TextToImageV2Params = {
        prompt,
        structured_prompt: fiboJson,
        seed: options?.seed,
        sync: options?.sync !== false,
        aspect_ratio: options?.aspect_ratio || '1:1',
        guidance_scale: options?.guidance_scale || 4,
        steps_num: options?.steps_num || 40,
      };

      const response = await this.generationService.textToImage(params);
      
      return {
        image_url: response.result?.image_url || response.result?.images?.[0]?.url || '',
        seed: response.result?.seed || response.result?.images?.[0]?.seed,
        fibo_json: typeof response.result?.structured_prompt === 'string' 
          ? JSON.parse(response.result.structured_prompt)
          : response.result?.structured_prompt || fiboJson,
        request_id: response.request_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('FIBO generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate image with seed locking (deterministic)
   */
  async generateWithSeed(
    prompt: string,
    seed: number,
    fiboJson?: FIBOStructuredPrompt | Record<string, unknown>,
    options?: {
      sync?: boolean;
      aspect_ratio?: TextToImageV2Params['aspect_ratio'];
    }
  ): Promise<GenerationResult> {
    return this.generateWithFIBO(prompt, fiboJson || {}, {
      seed,
      sync: options?.sync,
      aspect_ratio: options?.aspect_ratio,
    });
  }

  /**
   * Image-to-image generation
   */
  async imageToImage(
    imageUrl: string,
    prompt?: string,
    fiboJson?: FIBOStructuredPrompt | Record<string, unknown>,
    options?: {
      strength?: number;
      seed?: number;
      sync?: boolean;
    }
  ): Promise<GenerationResult> {
    try {
      const params: ImageToImageV2Params = {
        images: [imageUrl],
        prompt,
        structured_prompt: fiboJson,
        strength: options?.strength || 0.7,
        seed: options?.seed,
        sync: options?.sync !== false,
      };

      const response = await this.generationService.imageToImage(params);
      
      return {
        image_url: response.result?.image_url || response.result?.images?.[0]?.url || '',
        seed: response.result?.seed || response.result?.images?.[0]?.seed,
        fibo_json: typeof response.result?.structured_prompt === 'string'
          ? JSON.parse(response.result.structured_prompt)
          : response.result?.structured_prompt || fiboJson,
        request_id: response.request_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Image-to-image generation failed:', error);
      throw error;
    }
  }

  /**
   * Generative fill
   */
  async generativeFill(params: GenFillParams): Promise<GenerationResult> {
    try {
      const response = await this.editingService.generativeFill(params);
      return {
        image_url: response.result?.image_url || '',
        seed: response.result?.seed,
        request_id: response.request_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Generative fill failed:', error);
      throw error;
    }
  }

  /**
   * Remove background
   */
  async removeBackground(params: RemoveBackgroundParams): Promise<GenerationResult> {
    try {
      const response = await this.editingService.removeBackground(params);
      return {
        image_url: response.result?.image_url || '',
        seed: response.result?.seed,
        request_id: response.request_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Remove background failed:', error);
      throw error;
    }
  }

  /**
   * Replace background
   */
  async replaceBackground(params: ReplaceBackgroundParams): Promise<GenerationResult> {
    try {
      const response = await this.editingService.replaceBackground(params);
      return {
        image_url: response.result?.image_url || '',
        seed: response.result?.seed,
        request_id: response.request_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Replace background failed:', error);
      throw error;
    }
  }

  /**
   * Enhance image
   */
  async enhance(params: EnhanceParams): Promise<GenerationResult> {
    try {
      const response = await this.editingService.enhance(params);
      return {
        image_url: response.result?.image_url || '',
        seed: response.result?.seed,
        request_id: response.request_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Enhance failed:', error);
      throw error;
    }
  }

  /**
   * Expand image
   */
  async expand(params: ExpandParams): Promise<GenerationResult> {
    try {
      const response = await this.editingService.expand(params);
      return {
        image_url: response.result?.image_url || '',
        seed: response.result?.seed,
        request_id: response.request_id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Expand failed:', error);
      throw error;
    }
  }
}

export const briaImageService = new BriaImageService();

