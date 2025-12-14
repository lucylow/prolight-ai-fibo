/**
 * API Client Service
 * Handles communication with ProLight AI backend with mock fallback
 */

import type {
  GenerateRequest,
  GenerationResponse,
  PresetListResponse,
  HistoryResponse,
  BatchJobResponse,
  LightingAnalysis,
  HealthResponse,
  LightingPreset,
} from '@/types/fibo';

/**
 * Custom API Error class with error codes and details
 */
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 0,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVER_ERROR', 'RATE_LIMIT'].includes(this.code);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'AUTH_ERROR':
        return 'Authentication failed. Please check your credentials.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'NOT_FOUND':
        return 'The requested resource was not found.';
      case 'RATE_LIMIT':
        return this.message; // Already user-friendly
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'TIMEOUT_ERROR':
        return 'The request took too long. Please try again.';
      case 'SERVER_ERROR':
        return 'The server encountered an error. Please try again later.';
      case 'CLIENT_ERROR':
        return this.message || 'An error occurred with your request.';
      default:
        return this.message || 'An unexpected error occurred.';
    }
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api';

class APIClient {
  private baseUrl: string;
  private useMock: boolean = false;

  constructor() {
    this.baseUrl = `${API_BASE_URL}${API_PREFIX}`;
    this.checkHealth();
  }

  private async checkHealth(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        this.useMock = true;
        console.warn('Backend not available, using mock data');
      }
    } catch (error) {
      this.useMock = true;
      console.warn('Backend connection failed, using mock data', error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Try to parse error response
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          let errorDetails: Record<string, unknown> | null = null;

          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            }
            errorDetails = errorData;
          } catch {
            // If JSON parsing fails, use status text
            const text = await response.text().catch(() => '');
            if (text) {
              errorMessage = text.substring(0, 200);
            }
          }

          // Handle specific status codes
          if (response.status === 401) {
            throw new APIError('Authentication failed. Please check your credentials.', 'AUTH_ERROR', response.status, errorDetails);
          } else if (response.status === 403) {
            throw new APIError('Access forbidden. You may not have permission for this operation.', 'FORBIDDEN', response.status, errorDetails);
          } else if (response.status === 404) {
            throw new APIError('Resource not found.', 'NOT_FOUND', response.status, errorDetails);
          } else if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
            throw new APIError(
              `Rate limit exceeded. Please try again in ${retrySeconds} seconds.`,
              'RATE_LIMIT',
              response.status,
              { retryAfter: retrySeconds, ...errorDetails }
            );
          } else if (response.status >= 500) {
            // Retry on server errors
            if (attempt < retries) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw new APIError(
              'Server error. Please try again later.',
              'SERVER_ERROR',
              response.status,
              errorDetails
            );
          } else {
            throw new APIError(errorMessage, 'CLIENT_ERROR', response.status, errorDetails);
          }
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof APIError) {
          if (error.code === 'AUTH_ERROR' || error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND') {
            throw error;
          }
          if (error.code === 'RATE_LIMIT' && attempt < retries) {
            const retryAfter = (typeof error.details === 'object' && error.details !== null && 'retryAfter' in error.details) 
              ? (error.details.retryAfter as number) 
              : 60;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          if (attempt < retries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new APIError(
            'Network error. Please check your connection and try again.',
            'NETWORK_ERROR',
            0,
            { originalError: error.message }
          );
        }

        // Handle abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          if (attempt < retries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new APIError(
            'Request timeout. The server took too long to respond.',
            'TIMEOUT_ERROR',
            0,
            { originalError: error.message }
          );
        }

        // If it's the last attempt, throw the error
        if (attempt === retries) {
          if (error instanceof APIError) {
            throw error;
          }
          throw new APIError(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            'UNKNOWN_ERROR',
            0,
            { originalError: error }
          );
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new APIError('Request failed after retries', 'UNKNOWN_ERROR', 0);
  }

  // ============================================================================
  // Generate Endpoints
  // ============================================================================

  async generate(request: GenerateRequest): Promise<GenerationResponse> {
    if (this.useMock) {
      return this.mockGenerate(request);
    }

    return this.request<GenerationResponse>('/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateFromNaturalLanguage(
    sceneDescription: string,
    lightingDescription: string,
    subject?: string,
    styleIntent?: string
  ): Promise<GenerationResponse> {
    if (this.useMock) {
      return this.mockGenerate({
        scene_description: sceneDescription,
        lighting_setup: {},
        use_mock: true,
      });
    }

    const params = new URLSearchParams({
      scene_description: sceneDescription,
      lighting_description: lightingDescription,
      subject: subject || 'professional subject',
      style_intent: styleIntent || 'professional',
    });

    return this.request<GenerationResponse>(
      `/generate/natural-language?${params}`,
      { method: 'POST' }
    );
  }

  async generateFromPreset(
    presetId: string,
    sceneDescription: string,
    customSettings?: Record<string, unknown>
  ): Promise<GenerationResponse> {
    if (this.useMock) {
      return this.mockGenerate({
        scene_description: sceneDescription,
        lighting_setup: {},
        use_mock: true,
      });
    }

    const params = new URLSearchParams({
      preset_id: presetId,
      scene_description: sceneDescription,
    });

    return this.request<GenerationResponse>(
      `/generate/from-preset?${params}`,
      {
        method: 'POST',
        body: JSON.stringify(customSettings || {}),
      }
    );
  }

  // ============================================================================
  // Presets Endpoints
  // ============================================================================

  async listPresets(
    category?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PresetListResponse> {
    if (this.useMock) {
      return this.mockListPresets(category);
    }

    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (category) {
      params.append('category', category);
    }

    return this.request<PresetListResponse>(`/presets?${params}`);
  }

  async getPreset(presetId: string): Promise<LightingPreset> {
    if (this.useMock) {
      return this.mockGetPreset(presetId);
    }

    return this.request<LightingPreset>(`/presets/${presetId}`);
  }

  async listCategories() {
    if (this.useMock) {
      return this.mockListCategories();
    }

    return this.request('/presets/categories');
  }

  async searchPresets(query: string, page: number = 1, pageSize: number = 10): Promise<PresetListResponse> {
    if (this.useMock) {
      return this.mockSearchPresets(query);
    }

    return this.request<PresetListResponse>('/presets/search', {
      method: 'POST',
      body: JSON.stringify({ query, page, page_size: pageSize }),
    });
  }

  // ============================================================================
  // History Endpoints
  // ============================================================================

  async getHistory(
    page: number = 1,
    pageSize: number = 10,
    presetFilter?: string
  ): Promise<HistoryResponse> {
    if (this.useMock) {
      return this.mockGetHistory();
    }

    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (presetFilter) {
      params.append('preset_filter', presetFilter);
    }

    return this.request<HistoryResponse>(`/history?${params}`);
  }

  async getGenerationDetail(generationId: string): Promise<HistoryItem> {
    if (this.useMock) {
      return this.mockGetGenerationDetail(generationId);
    }

    return this.request<HistoryItem>(`/history/${generationId}`);
  }

  async deleteGeneration(generationId: string): Promise<{ status: string; message: string }> {
    if (this.useMock) {
      return { status: 'success', message: 'Deleted' };
    }

    return this.request<{ status: string; message: string }>(`/history/${generationId}`, { method: 'DELETE' });
  }

  async clearHistory() {
    if (this.useMock) {
      return { status: 'success', message: 'History cleared' };
    }

    return this.request('/history/clear', { method: 'POST' });
  }

  async getHistoryStats(): Promise<{
    total_generations: number;
    total_cost_credits: number;
    average_cost_per_generation: number;
    preset_distribution: Record<string, number>;
  }> {
    if (this.useMock) {
      return this.mockGetHistoryStats();
    }

    return this.request<{
      total_generations: number;
      total_cost_credits: number;
      average_cost_per_generation: number;
      preset_distribution: Record<string, number>;
    }>('/history/stats');
  }

  // ============================================================================
  // Batch Endpoints
  // ============================================================================

  async batchGenerate(
    items: Array<Record<string, unknown>>,
    presetName?: string,
    totalCount?: number
  ): Promise<BatchJobResponse> {
    if (this.useMock) {
      return this.mockBatchGenerate(items);
    }

    return this.request<BatchJobResponse>('/batch/generate', {
      method: 'POST',
      body: JSON.stringify({
        items,
        preset_name: presetName,
        total_count: totalCount || items.length,
      }),
    });
  }

  async getBatchStatus(batchId: string): Promise<BatchJobResponse> {
    if (this.useMock) {
      return this.mockGetBatchStatus(batchId);
    }

    return this.request<BatchJobResponse>(`/batch/${batchId}`);
  }

  async generateProductVariations(
    productDescription: string,
    numAngles: number = 4,
    numLightingSetups: number = 3,
    presetId?: string
  ) {
    if (this.useMock) {
      return this.mockGenerateProductVariations(productDescription);
    }

    const params = new URLSearchParams({
      product_description: productDescription,
      num_angles: numAngles.toString(),
      num_lighting_setups: numLightingSetups.toString(),
    });

    if (presetId) {
      params.append('preset_id', presetId);
    }

    return this.request(`/batch/product-variations?${params}`, {
      method: 'POST',
    });
  }

  async exportBatch(batchId: string, format: string = 'zip') {
    if (this.useMock) {
      return this.mockExportBatch(batchId);
    }

    const params = new URLSearchParams({ format });
    return this.request(`/batch/${batchId}/export?${params}`);
  }

  // ============================================================================
  // Analysis Endpoints
  // ============================================================================

  async analyzeLighting(lightingSetup: Record<string, unknown>): Promise<LightingAnalysis> {
    if (this.useMock) {
      return this.mockAnalyzeLighting(lightingSetup);
    }

    return this.request<LightingAnalysis>('/analyze/lighting', {
      method: 'POST',
      body: JSON.stringify({ lighting_setup: lightingSetup }),
    });
  }

  async compareLightingSetups(setup1: Record<string, unknown>, setup2: Record<string, unknown>) {
    if (this.useMock) {
      return this.mockCompareLightingSetups(setup1, setup2);
    }

    return this.request('/analyze/compare', {
      method: 'POST',
      body: JSON.stringify({ setup_1: setup1, setup_2: setup2 }),
    });
  }

  async getStyleRecommendations(lightingStyle: string): Promise<{
    description: string;
    key_to_fill_ratio: string;
    tips: string[];
  }> {
    if (this.useMock) {
      return this.mockGetStyleRecommendations(lightingStyle);
    }

    return this.request<{
      description: string;
      key_to_fill_ratio: string;
      tips: string[];
    }>(`/analyze/recommendations/${lightingStyle}`);
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async health(): Promise<HealthResponse> {
    try {
      return await this.request<HealthResponse>('/health');
    } catch {
      return {
        status: 'unhealthy',
        version: '0.0.0',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ============================================================================
  // Mock Data Methods
  // ============================================================================

  private mockGenerate(request: GenerateRequest): GenerationResponse {
    return {
      generation_id: `gen_${Date.now()}`,
      status: 'success',
      image_url: 'https://via.placeholder.com/2048x2048?text=ProLight+AI',
      duration_seconds: 3.5,
      cost_credits: 0.04,
      analysis: {
        key_to_fill_ratio: 2.5,
        color_temperature_consistency: 0.95,
        professional_rating: 8.5,
        mood_assessment: 'professional, confident',
        recommendations: ['Consider increasing fill light for softer shadows'],
      },
      timestamp: new Date().toISOString(),
    };
  }

  private mockListPresets(category?: string): PresetListResponse {
    const defaultMainLight = {
      type: 'area' as const,
      direction: '45 degrees camera-right',
      position: [1, 1, 1] as [number, number, number],
      intensity: 0.8,
      colorTemperature: 5600,
      softness: 0.5,
      enabled: true,
      distance: 1.5,
    };

    const presets: LightingPreset[] = [
      {
        presetId: 'butterfly_classic',
        name: 'Butterfly Classic',
        category: 'portrait',
        description: 'Soft, flattering beauty lighting',
        lighting_config: {
          mainLight: { ...defaultMainLight, direction: 'above camera' },
          lightingStyle: 'butterfly',
        },
        ideal_for: ['beauty', 'commercial', 'headshots'],
      },
      {
        presetId: 'rembrandt_classic',
        name: 'Rembrandt Classic',
        category: 'portrait',
        description: 'Dramatic side lighting',
        lighting_config: {
          mainLight: { ...defaultMainLight, direction: '45 degrees side' },
          lightingStyle: 'rembrandt',
        },
        ideal_for: ['dramatic', 'editorial'],
      },
    ];

    return {
      presets: category ? presets.filter((p) => p.category === category) : presets,
      total: presets.length,
      page: 1,
      page_size: 10,
    };
  }

  private mockGetPreset(presetId: string) {
    return {
      presetId,
      name: 'Sample Preset',
      category: 'portrait',
      description: 'A sample lighting preset',
      lighting_config: {},
      ideal_for: ['portraits'],
    };
  }

  private mockListCategories() {
    return {
      categories: ['portrait', 'product', 'environmental'],
      total: 3,
    };
  }

  private mockSearchPresets(query: string) {
    return {
      presets: [],
      total: 0,
      page: 1,
      page_size: 10,
    };
  }

  private mockGetHistory() {
    return {
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    };
  }

  private mockGetGenerationDetail(generationId: string) {
    return {
      generation_id: generationId,
      timestamp: new Date().toISOString(),
      scene_description: 'Sample scene',
      image_url: 'https://via.placeholder.com/2048x2048',
      cost_credits: 0.04,
    };
  }

  private mockGetHistoryStats() {
    return {
      total_generations: 0,
      total_cost_credits: 0,
      average_cost_per_generation: 0,
      preset_distribution: {},
    };
  }

  private mockBatchGenerate(items: Array<Record<string, unknown>>) {
    return {
      batch_id: `batch_${Date.now()}`,
      status: 'processing',
      items_total: items.length,
      items_completed: 0,
      total_cost: 0,
      created_at: new Date().toISOString(),
    };
  }

  private mockGetBatchStatus(batchId: string) {
    return {
      batch_id: batchId,
      status: 'completed',
      items_total: 5,
      items_completed: 5,
      total_cost: 0.2,
      created_at: new Date().toISOString(),
    };
  }

  private mockGenerateProductVariations(productDescription: string) {
    return {
      batch_id: `batch_product_${Date.now()}`,
      status: 'processing',
      total_items: 12,
      product: productDescription,
    };
  }

  private mockExportBatch(batchId: string) {
    return {
      batch_id: batchId,
      format: 'zip',
      items: 5,
      download_url: 'https://storage.example.com/exports/batch.zip',
      expires_in_hours: 24,
    };
  }

  private mockAnalyzeLighting(lightingSetup: Record<string, unknown>) {
    return {
      key_to_fill_ratio: 2.5,
      color_temperature_consistency: 0.95,
      professional_rating: 8.5,
      mood_assessment: 'professional',
      recommendations: [],
    };
  }

  private mockCompareLightingSetups(setup1: Record<string, unknown>, setup2: Record<string, unknown>) {
    return {
      setup_1: this.mockAnalyzeLighting(setup1),
      setup_2: this.mockAnalyzeLighting(setup2),
      winner: 'setup_1',
      rating_difference: 0.5,
    };
  }

  private mockGetStyleRecommendations(lightingStyle: string) {
    return {
      description: `Recommendations for ${lightingStyle} lighting`,
      key_to_fill_ratio: '2:1 to 3:1',
      tips: ['Tip 1', 'Tip 2', 'Tip 3'],
    };
  }
}

export const apiClient = new APIClient();
