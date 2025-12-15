/**
 * Bria API Client SDK for TypeScript/React
 * 
 * Provides typed, production-ready client for Bria API integration.
 * Handles async generation, status polling, and structured prompt workflows.
 * 
 * Usage:
 * ```ts
 * const client = new BriaClient();
 * 
 * // Decoupled workflow (recommended by Bria)
 * const prompt = await client.generateStructuredPrompt({
 *   prompt: "silver lamp with soft butterfly lighting"
 * });
 * 
 * const result = await client.generateImage({
 *   structured_prompt: prompt.structured_prompt,
 *   sync: false
 * });
 * 
 * // Poll for completion
 * const status = await client.pollStatus(result.request_id);
 * ```
 */

export interface BriaClientConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  pollInterval?: number;
  maxPollAttempts?: number;
}

export interface StructuredPromptRequest {
  prompt?: string;
  images?: string[];
  sync?: boolean;
  style_hint?: string;
  composition_hint?: string;
}

export interface StructuredPromptResponse {
  request_id?: string;
  status: string;
  structured_prompt: Record<string, unknown>;
  data: unknown;
}

export interface GenerateImageRequest {
  prompt?: string;
  structured_prompt?: Record<string, unknown>;
  images?: string[];
  num_results?: number;
  sync?: boolean;
  width?: number;
  height?: number;
  guidance_scale?: number;
  steps?: number;
}

export interface GenerateImageResponse {
  request_id?: string;
  status: string;
  data: unknown;
}

export interface StatusResponse {
  request_id: string;
  status: string;
  data: unknown;
}

export interface ReimagineRequest {
  asset_id?: string;
  image_url?: string;
  prompt?: string;
  structured_prompt?: Record<string, unknown>;
  variations?: number;
  sync?: boolean;
  width?: number;
  height?: number;
}

export interface ReimagineResponse {
  request_id?: string;
  status: string;
  data: unknown;
}

export class BriaClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;
  private pollInterval: number;
  private maxPollAttempts: number;

  constructor(config: BriaClientConfig = {}) {
    this.baseUrl = config.baseUrl || '/edge/bria';
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.pollInterval = config.pollInterval || 2000;
    this.maxPollAttempts = config.maxPollAttempts || 150; // 5 minutes default
  }

  /**
   * Generate structured FIBO JSON prompt from text/images.
   * This is the first step in Bria's recommended decoupled workflow.
   */
  async generateStructuredPrompt(
    request: StructuredPromptRequest
  ): Promise<StructuredPromptResponse> {
    const response = await fetch(`${this.baseUrl}/structured-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Generate image using Bria FIBO API.
   * Can use either text prompt or structured FIBO JSON.
   */
  async generateImage(
    request: GenerateImageRequest
  ): Promise<GenerateImageResponse> {
    const response = await fetch(`${this.baseUrl}/image-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get status of an async generation job.
   */
  async getStatus(requestId: string): Promise<StatusResponse> {
    const response = await fetch(
      `${this.baseUrl}/status?request_id=${encodeURIComponent(requestId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Poll job status until completion.
   * Returns the final result when status is COMPLETED.
   */
  async pollStatus(
    requestId: string,
    onProgress?: (status: StatusResponse) => void
  ): Promise<StatusResponse> {
    let attempts = 0;

    while (attempts < this.maxPollAttempts) {
      const status = await this.getStatus(requestId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'COMPLETED') {
        return status;
      }

      if (status.status === 'ERROR') {
        throw new Error(
          `Generation failed: ${JSON.stringify(status.data)}`
        );
      }

      if (status.status === 'UNKNOWN') {
        throw new Error(`Job ${requestId} in unknown state`);
      }

      // Still in progress, wait and retry
      await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
      attempts++;
    }

    throw new Error(
      `Polling timeout: Job ${requestId} did not complete within ${this.maxPollAttempts * this.pollInterval}ms`
    );
  }

  /**
   * Reimagine an image with structured prompts for stylized variations.
   */
  async reimagine(request: ReimagineRequest): Promise<ReimagineResponse> {
    const response = await fetch(`${this.baseUrl}/reimagine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Complete decoupled workflow: prompt → structured JSON → image generation.
   * This is the recommended pattern from Bria.
   */
  async generateFromPrompt(
    prompt: string,
    options: {
      sync?: boolean;
      num_results?: number;
      lighting_override?: Record<string, unknown>;
      onStructuredPrompt?: (prompt: Record<string, unknown>) => void;
      onProgress?: (status: StatusResponse) => void;
    } = {}
  ): Promise<{
    structured_prompt: Record<string, unknown>;
    result: GenerateImageResponse | StatusResponse;
  }> {
    // Step 1: Generate structured prompt
    const structuredPromptResult = await this.generateStructuredPrompt({
      prompt,
      sync: true,
    });

    let structuredPrompt = structuredPromptResult.structured_prompt;

    // Apply lighting override if provided
    if (options.lighting_override) {
      structuredPrompt = {
        ...structuredPrompt,
        lighting: {
          ...(structuredPrompt.lighting as Record<string, unknown>),
          ...options.lighting_override,
        },
      };
    }

    // Callback for UI reflection
    if (options.onStructuredPrompt) {
      options.onStructuredPrompt(structuredPrompt);
    }

    // Step 2: Generate image with structured prompt
    const generateResult = await this.generateImage({
      structured_prompt: structuredPrompt,
      sync: options.sync || false,
      num_results: options.num_results || 1,
    });

    // Step 3: If async, poll for completion
    let finalResult: GenerateImageResponse | StatusResponse = generateResult;

    if (!options.sync && generateResult.request_id) {
      finalResult = await this.pollStatus(
        generateResult.request_id,
        options.onProgress
      );
    }

    return {
      structured_prompt: structuredPrompt,
      result: finalResult,
    };
  }
}

