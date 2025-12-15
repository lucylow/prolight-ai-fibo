/**
 * FIBO API Client for Supabase Edge Functions
 * 
 * Provides unified interface for FIBO image generation with fallback chain:
 * 1. Bria API (if BRIA_API_TOKEN configured)
 * 2. fal.ai API (if FAL_KEY configured)
 * 3. Lovable AI Gateway with Gemini (fallback)
 * 
 * Supports FIBO's JSON-native architecture with structured prompts.
 */

import { createAIGatewayClientFromEnv, AIGatewayErrorClass } from "./lovable-ai-gateway-client.ts";
import { createErrorResponseWithLogging } from "./error-handling.ts";

const BRIA_BASE_URL = 'https://engine.prod.bria-api.com/v2';
const FAL_BASE_URL = 'https://fal.run/bria/fibo/generate';

export interface FIBOGenerationRequest {
  structured_prompt?: Record<string, unknown>;
  prompt?: string;
  num_results?: number;
  sync?: boolean;
  steps?: number;
  guidance_scale?: number;
  seed?: number;
  negative_prompt?: string;
}

export interface FIBOGenerationResult {
  status: 'success' | 'error';
  image_url?: string;
  image_id?: string;
  request_id?: string;
  status_url?: string;
  duration_seconds?: number;
  cost_credits?: number;
  model?: string;
  seed?: number;
  steps?: number;
  guidance_scale?: number;
  timestamp?: string;
  error?: string;
  raw?: unknown;
}

export interface FIBOClientConfig {
  preferBria?: boolean;
  preferFal?: boolean;
  timeout?: number;
  retries?: number;
}

/**
 * FIBO API Client with fallback chain
 */
export class FIBOClient {
  private briaToken: string | null;
  private falKey: string | null;
  private aiGatewayClient: ReturnType<typeof createAIGatewayClientFromEnv> | null;
  private config: FIBOClientConfig;

  constructor(config: FIBOClientConfig = {}) {
    this.briaToken = Deno.env.get('BRIA_API_TOKEN') || null;
    this.falKey = Deno.env.get('FAL_KEY') || Deno.env.get('FAL_API_KEY') || null;
    this.config = {
      preferBria: true,
      preferFal: true,
      timeout: 60000,
      retries: 2,
      ...config,
    };

    // Initialize AI Gateway client as fallback
    try {
      this.aiGatewayClient = createAIGatewayClientFromEnv({
        timeout: this.config.timeout,
        retries: this.config.retries,
      });
    } catch (error) {
      console.warn('AI Gateway client initialization failed, will only use FIBO APIs:', error);
      this.aiGatewayClient = null;
    }
  }

  /**
   * Generate image using FIBO with fallback chain
   */
  async generate(request: FIBOGenerationRequest): Promise<FIBOGenerationResult> {
    const errors: Array<{ provider: string; error: string }> = [];

    // Try Bria API first (if configured and preferred)
    if (this.config.preferBria && this.briaToken) {
      try {
        return await this.generateWithBria(request);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ provider: 'Bria', error: errorMsg });
        console.warn('Bria API generation failed, trying fallback:', errorMsg);
      }
    }

    // Try fal.ai API (if configured and preferred)
    if (this.config.preferFal && this.falKey) {
      try {
        return await this.generateWithFal(request);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ provider: 'fal.ai', error: errorMsg });
        console.warn('fal.ai API generation failed, trying fallback:', errorMsg);
      }
    }

    // Fallback to AI Gateway with Gemini (converts FIBO JSON to text prompt)
    if (this.aiGatewayClient) {
      try {
        return await this.generateWithAIGateway(request);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ provider: 'AI Gateway', error: errorMsg });
        console.error('All FIBO generation methods failed:', errors);
        throw new Error(`FIBO generation failed on all providers: ${errors.map(e => `${e.provider}: ${e.error}`).join(', ')}`);
      }
    }

    throw new Error('No FIBO generation providers available. Please configure BRIA_API_TOKEN, FAL_KEY, or LOVABLE_API_KEY.');
  }

  /**
   * Generate with Bria API
   */
  private async generateWithBria(request: FIBOGenerationRequest): Promise<FIBOGenerationResult> {
    if (!this.briaToken) {
      throw new Error('BRIA_API_TOKEN not configured');
    }

    const payload: Record<string, unknown> = {
      num_results: request.num_results || 1,
      sync: request.sync !== false, // Default to sync
    };

    if (request.structured_prompt) {
      payload.structured_prompt = request.structured_prompt;
    }
    if (request.prompt) {
      payload.prompt = request.prompt;
    }
    if (request.seed !== undefined) {
      payload.seed = request.seed;
    }
    if (request.negative_prompt) {
      payload.negative_prompt = request.negative_prompt;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${BRIA_BASE_URL}/image/generate`, {
        method: 'POST',
        headers: {
          'api_token': this.briaToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bria API error ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();

      // Handle async response
      if (!request.sync && data.request_id) {
        return {
          status: 'success',
          request_id: data.request_id,
          status_url: data.status_url,
          model: 'Bria FIBO',
          timestamp: new Date().toISOString(),
        };
      }

      // Handle sync response
      const imageUrl = data.images?.[0]?.url || data.image_url || data.images?.[0];
      if (!imageUrl) {
        throw new Error('Bria API returned no image URL');
      }

      return {
        status: 'success',
        image_url: imageUrl,
        image_id: data.request_id || crypto.randomUUID(),
        request_id: data.request_id,
        duration_seconds: data.duration || 0,
        cost_credits: data.cost || 0.04,
        model: 'Bria FIBO',
        seed: data.seed || request.seed,
        timestamp: new Date().toISOString(),
        raw: data,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Bria API request timed out');
      }
      throw error;
    }
  }

  /**
   * Generate with fal.ai API
   */
  private async generateWithFal(request: FIBOGenerationRequest): Promise<FIBOGenerationResult> {
    if (!this.falKey) {
      throw new Error('FAL_KEY not configured');
    }

    const payload: Record<string, unknown> = {
      structured_prompt: request.structured_prompt,
      num_results: request.num_results || 1,
    };

    if (request.prompt) {
      payload.prompt = request.prompt;
    }
    if (request.seed !== undefined) {
      payload.seed = request.seed;
    }
    if (request.steps) {
      payload.steps = request.steps;
    }
    if (request.guidance_scale) {
      payload.guidance_scale = request.guidance_scale;
    }
    if (request.negative_prompt) {
      payload.negative_prompt = request.negative_prompt;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(FAL_BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: payload }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`fal.ai API error ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      const imageUrl = data.data?.image?.url || data.data?.image || data.image_url;

      if (!imageUrl) {
        throw new Error('fal.ai API returned no image URL');
      }

      return {
        status: 'success',
        image_url: imageUrl,
        image_id: data.request_id || crypto.randomUUID(),
        request_id: data.request_id,
        duration_seconds: data.duration || 0,
        cost_credits: data.cost || 0.04,
        model: 'FIBO-fal.ai',
        seed: data.seed || request.seed,
        steps: request.steps,
        guidance_scale: request.guidance_scale,
        timestamp: new Date().toISOString(),
        raw: data,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('fal.ai API request timed out');
      }
      throw error;
    }
  }

  /**
   * Generate with AI Gateway (fallback - converts FIBO JSON to text prompt)
   */
  private async generateWithAIGateway(request: FIBOGenerationRequest): Promise<FIBOGenerationResult> {
    if (!this.aiGatewayClient) {
      throw new Error('AI Gateway client not initialized');
    }

    // Convert FIBO JSON to comprehensive text prompt
    let prompt: string;
    if (request.structured_prompt) {
      prompt = this.fiboJsonToPrompt(request.structured_prompt);
    } else if (request.prompt) {
      prompt = request.prompt;
    } else {
      throw new Error('Either structured_prompt or prompt must be provided');
    }

    try {
      const result = await this.aiGatewayClient.generateImage(
        prompt,
        'google/gemini-2.5-flash-image-preview'
      );

      if (!result.imageUrl) {
        throw new Error('AI Gateway did not return an image URL');
      }

      return {
        status: 'success',
        image_url: result.imageUrl,
        image_id: crypto.randomUUID(),
        duration_seconds: 0,
        cost_credits: 0.01,
        model: 'google/gemini-2.5-flash-image-preview',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof AIGatewayErrorClass) {
        throw error;
      }
      throw new Error(`AI Gateway generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert FIBO JSON to comprehensive text prompt (~1000 words matching FIBO training format)
   */
  private fiboJsonToPrompt(fiboJson: Record<string, unknown>): string {
    const parts: string[] = [];

    // Subject description
    const subject = fiboJson.subject as Record<string, unknown> | undefined;
    if (subject) {
      const mainEntity = subject.main_entity || subject.mainEntity || '';
      const attributes = Array.isArray(subject.attributes) 
        ? subject.attributes.join(', ')
        : typeof subject.attributes === 'string'
        ? subject.attributes
        : '';
      const action = subject.action || '';
      const mood = subject.mood || '';
      const emotion = subject.emotion || '';

      parts.push(`SUBJECT DESCRIPTION:`);
      parts.push(`${mainEntity}${attributes ? `, ${attributes}` : ''}`);
      if (action) parts.push(`Action: ${action}`);
      if (mood) parts.push(`Mood: ${mood}`);
      if (emotion) parts.push(`Emotion: ${emotion}`);
      parts.push('');
    }

    // Environment
    const environment = fiboJson.environment as Record<string, unknown> | undefined;
    if (environment) {
      parts.push(`ENVIRONMENT:`);
      parts.push(`Setting: ${environment.setting || ''}`);
      if (environment.time_of_day || environment.timeOfDay) {
        parts.push(`Time of day: ${environment.time_of_day || environment.timeOfDay}`);
      }
      if (environment.lighting_conditions) {
        parts.push(`Lighting conditions: ${environment.lighting_conditions}`);
      }
      if (environment.atmosphere) {
        parts.push(`Atmosphere: ${environment.atmosphere}`);
      }
      parts.push('');
    }

    // Camera settings
    const camera = fiboJson.camera as Record<string, unknown> | undefined;
    if (camera) {
      parts.push(`CAMERA SETUP:`);
      if (camera.shot_type || camera.shotType) {
        parts.push(`Shot type: ${camera.shot_type || camera.shotType}`);
      }
      if (camera.camera_angle || camera.cameraAngle) {
        parts.push(`Camera angle: ${camera.camera_angle || camera.cameraAngle}`);
      }
      if (camera.fov) parts.push(`FOV: ${camera.fov}°`);
      if (camera.lens_type || camera.lensType) {
        parts.push(`Lens: ${camera.lens_type || camera.lensType}`);
      }
      if (camera.aperture) parts.push(`Aperture: ${camera.aperture}`);
      if (camera.focus_distance_m || camera.focusDistance_m) {
        parts.push(`Focus distance: ${camera.focus_distance_m || camera.focusDistance_m}m`);
      }
      parts.push('');
    }

    // Lighting setup (detailed)
    const lighting = fiboJson.lighting as Record<string, unknown> | undefined;
    if (lighting) {
      parts.push(`COMPREHENSIVE LIGHTING SETUP:`);
      
      // Main/Key light
      const mainLight = lighting.main_light || lighting.mainLight as Record<string, unknown> | undefined;
      if (mainLight) {
        const intensity = Math.round((mainLight.intensity as number || 0.8) * 100);
        const temp = mainLight.colorTemperature || mainLight.color_temperature || 5600;
        const softness = mainLight.softness || 0.5;
        const direction = mainLight.direction || 'front-left';
        const softnessDesc = softness > 0.6 ? 'soft diffused' : softness < 0.3 ? 'hard crisp' : 'medium';
        const tempDesc = temp < 4500 ? 'warm' : temp > 6000 ? 'cool' : 'neutral';
        
        parts.push(`Key light (primary): ${intensity}% intensity, ${softnessDesc} quality, ${tempDesc} ${temp}K color temperature, positioned ${direction}`);
        if (mainLight.distance) {
          parts.push(`Distance: ${mainLight.distance}m with inverse square falloff`);
        }
      }

      // Fill light
      const fillLight = lighting.fill_light || lighting.fillLight as Record<string, unknown> | undefined;
      if (fillLight) {
        const intensity = Math.round((fillLight.intensity as number || 0.4) * 100);
        const temp = fillLight.colorTemperature || fillLight.color_temperature || 5600;
        const direction = fillLight.direction || 'front-right';
        parts.push(`Fill light (shadow detail): ${intensity}% intensity, ${temp}K, from ${direction}`);
      }

      // Rim light
      const rimLight = lighting.rim_light || lighting.rimLight as Record<string, unknown> | undefined;
      if (rimLight) {
        const intensity = Math.round((rimLight.intensity as number || 0.5) * 100);
        const temp = rimLight.colorTemperature || rimLight.color_temperature || 3200;
        const direction = rimLight.direction || 'behind';
        parts.push(`Rim/hair light (edge separation): ${intensity}% intensity, ${temp}K, ${direction} position`);
      }

      // Ambient
      const ambient = lighting.ambient_light || lighting.ambientLight as Record<string, unknown> | undefined;
      if (ambient) {
        const intensity = Math.round((ambient.intensity as number || 0.1) * 100);
        const temp = ambient.colorTemperature || ambient.color_temperature || 5000;
        parts.push(`Ambient fill: ${intensity}% intensity at ${temp}K for overall shadow detail`);
      }

      parts.push('');
    }

    // Style and quality
    if (fiboJson.artistic_style || fiboJson.artisticStyle) {
      parts.push(`STYLE: ${fiboJson.artistic_style || fiboJson.artisticStyle}`);
    }
    if (fiboJson.style_medium || fiboJson.styleMedium) {
      parts.push(`Medium: ${fiboJson.style_medium || fiboJson.styleMedium}`);
    }

    parts.push('');
    parts.push(`QUALITY REQUIREMENTS:`);
    parts.push(`- Photorealistic, magazine-quality image`);
    parts.push(`- Precise professional lighting matching described setup`);
    parts.push(`- Expert-level control over lighting parameters`);
    parts.push(`- High detail and sharp focus on subject`);
    parts.push(`- Natural skin tones and material rendering`);
    parts.push(`- Professional studio photography standard`);

    return parts.join('\n');
  }

  /**
   * Check which providers are available
   */
  getAvailableProviders(): string[] {
    const providers: string[] = [];
    if (this.briaToken) providers.push('Bria');
    if (this.falKey) providers.push('fal.ai');
    if (this.aiGatewayClient) providers.push('AI Gateway');
    return providers;
  }
}

/**
 * Create FIBO client from environment
 */
export function createFIBOClient(config?: FIBOClientConfig): FIBOClient {
  return new FIBOClient(config);
}

