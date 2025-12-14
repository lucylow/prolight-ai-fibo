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
  HistoryItem,
} from '@/types/fibo';
import {
  getMockGenerationResponse,
  getMockPresetListResponse,
  getMockPreset,
  getMockHistoryResponse,
  getMockGenerationDetail,
  getMockBatchJobResponse,
  getMockLightingAnalysis,
  getMockStyleRecommendations,
  getMockCategories,
  getMockHistoryStats,
  shouldUseMockData,
} from './mockData';

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
    // Check if mock data is explicitly enabled
    if (shouldUseMockData()) {
      this.useMock = true;
      console.info('Mock data mode enabled');
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for health check
      
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        this.useMock = true;
        console.warn('Backend health check failed, using mock data');
      } else {
        this.useMock = false;
        console.info('Backend is available');
      }
    } catch (error) {
      this.useMock = true;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Backend connection failed, using mock data:', errorMessage);
      
      // Store the failure in localStorage to avoid repeated checks
      try {
        localStorage.setItem('api_health_failed', Date.now().toString());
      } catch {
        // Ignore localStorage errors
      }
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
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for generate');
      return getMockGenerationResponse(request);
    }

    try {
      return await this.request<GenerationResponse>('/generate', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      // Fallback to mock data on error
      console.warn('API call failed, falling back to mock data:', error);
      return getMockGenerationResponse(request);
    }
  }

  async generateFromNaturalLanguage(
    sceneDescription: string,
    lightingDescription: string,
    subject?: string,
    styleIntent?: string
  ): Promise<GenerationResponse> {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for generateFromNaturalLanguage');
      return getMockGenerationResponse({
        scene_description: sceneDescription,
        lighting_setup: {},
        use_mock: true,
      });
    }

    try {
      const params = new URLSearchParams({
        scene_description: sceneDescription,
        lighting_description: lightingDescription,
        subject: subject || 'professional subject',
        style_intent: styleIntent || 'professional',
      });

      return await this.request<GenerationResponse>(
        `/generate/natural-language?${params}`,
        { method: 'POST' }
      );
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return getMockGenerationResponse({
        scene_description: sceneDescription,
        lighting_setup: {},
        use_mock: true,
      });
    }
  }

  async generateFromPreset(
    presetId: string,
    sceneDescription: string,
    customSettings?: Record<string, unknown>
  ): Promise<GenerationResponse> {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for generateFromPreset');
      return getMockGenerationResponse({
        scene_description: sceneDescription,
        lighting_setup: {},
        use_mock: true,
      });
    }

    try {
      const params = new URLSearchParams({
        preset_id: presetId,
        scene_description: sceneDescription,
      });

      return await this.request<GenerationResponse>(
        `/generate/from-preset?${params}`,
        {
          method: 'POST',
          body: JSON.stringify(customSettings || {}),
        }
      );
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return getMockGenerationResponse({
        scene_description: sceneDescription,
        lighting_setup: {},
        use_mock: true,
      });
    }
  }

  // ============================================================================
  // Presets Endpoints
  // ============================================================================

  async listPresets(
    category?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PresetListResponse> {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for listPresets');
      return getMockPresetListResponse(category);
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (category) {
        params.append('category', category);
      }

      return await this.request<PresetListResponse>(`/presets?${params}`);
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return getMockPresetListResponse(category);
    }
  }

  async getPreset(presetId: string): Promise<LightingPreset> {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for getPreset');
      return getMockPreset(presetId);
    }

    try {
      return await this.request<LightingPreset>(`/presets/${presetId}`);
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return getMockPreset(presetId);
    }
  }

  async listCategories() {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for listCategories');
      return getMockCategories();
    }

    try {
      return await this.request('/presets/categories');
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return getMockCategories();
    }
  }

  async searchPresets(query: string, page: number = 1, pageSize: number = 10): Promise<PresetListResponse> {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for searchPresets');
      // Filter mock presets by query
      const allPresets = getMockPresetListResponse();
      const filtered = allPresets.presets.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      );
      return {
        ...allPresets,
        presets: filtered,
        total: filtered.length,
      };
    }

    try {
      return await this.request<PresetListResponse>('/presets/search', {
        method: 'POST',
        body: JSON.stringify({ query, page, page_size: pageSize }),
      });
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      const allPresets = getMockPresetListResponse();
      const filtered = allPresets.presets.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      );
      return {
        ...allPresets,
        presets: filtered,
        total: filtered.length,
      };
    }
  }

  // ============================================================================
  // History Endpoints
  // ============================================================================

  async getHistory(
    page: number = 1,
    pageSize: number = 10,
    presetFilter?: string
  ): Promise<HistoryResponse> {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for getHistory');
      return getMockHistoryResponse(page, pageSize);
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (presetFilter) {
        params.append('preset_filter', presetFilter);
      }

      return await this.request<HistoryResponse>(`/history?${params}`);
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return getMockHistoryResponse(page, pageSize);
    }
  }

  async getGenerationDetail(generationId: string): Promise<HistoryItem> {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for getGenerationDetail');
      return getMockGenerationDetail(generationId);
    }

    try {
      return await this.request<HistoryItem>(`/history/${generationId}`);
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return getMockGenerationDetail(generationId);
    }
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
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for getHistoryStats');
      return getMockHistoryStats();
    }

    try {
      return await this.request<{
        total_generations: number;
        total_cost_credits: number;
        average_cost_per_generation: number;
        preset_distribution: Record<string, number>;
      }>('/history/stats');
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return getMockHistoryStats();
    }
  }

  // ============================================================================
  // Batch Endpoints
  // ============================================================================

  async batchGenerate(
    items: Array<Record<string, unknown>>,
    presetName?: string,
    totalCount?: number
  ): Promise<BatchJobResponse> {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for batchGenerate');
      return getMockBatchJobResponse(items, 'processing');
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
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for getBatchStatus');
      return getMockBatchJobResponse([{}], 'completed');
    }

    try {
      return await this.request<BatchJobResponse>(`/batch/${batchId}`);
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return getMockBatchJobResponse([{}], 'completed');
    }
  }

  async generateProductVariations(
    productDescription: string,
    numAngles: number = 4,
    numLightingSetups: number = 3,
    presetId?: string
  ) {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for generateProductVariations');
      const items = Array.from({ length: numAngles * numLightingSetups }, () => ({}));
      return getMockBatchJobResponse(items, 'processing');
    }

    try {
      const params = new URLSearchParams({
        product_description: productDescription,
        num_angles: numAngles.toString(),
        num_lighting_setups: numLightingSetups.toString(),
      });

      if (presetId) {
        params.append('preset_id', presetId);
      }

      return await this.request(`/batch/product-variations?${params}`, {
        method: 'POST',
      });
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      const items = Array.from({ length: numAngles * numLightingSetups }, () => ({}));
      return getMockBatchJobResponse(items, 'processing');
    }
  }

  async exportBatch(batchId: string, format: string = 'zip') {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for exportBatch');
      return {
        batch_id: batchId,
        format,
        items: 5,
        download_url: `https://storage.example.com/exports/${batchId}.${format}`,
        expires_in_hours: 24,
      };
    }

    try {
      const params = new URLSearchParams({ format });
      return await this.request(`/batch/${batchId}/export?${params}`);
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return {
        batch_id: batchId,
        format,
        items: 5,
        download_url: `https://storage.example.com/exports/${batchId}.${format}`,
        expires_in_hours: 24,
      };
    }
  }

  // ============================================================================
  // Analysis Endpoints
  // ============================================================================

  async compareLightingSetups(setup1: Record<string, unknown>, setup2: Record<string, unknown>) {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for compareLightingSetups');
      const analysis1 = getMockLightingAnalysis(setup1);
      const analysis2 = getMockLightingAnalysis(setup2);
      return {
        setup_1: analysis1,
        setup_2: analysis2,
        winner: analysis1.professional_rating > analysis2.professional_rating ? 'setup_1' : 'setup_2',
        rating_difference: Math.abs(analysis1.professional_rating - analysis2.professional_rating),
      };
    }

    try {
      return await this.request('/analyze/compare', {
        method: 'POST',
        body: JSON.stringify({ setup_1: setup1, setup_2: setup2 }),
      });
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      const analysis1 = getMockLightingAnalysis(setup1);
      const analysis2 = getMockLightingAnalysis(setup2);
      return {
        setup_1: analysis1,
        setup_2: analysis2,
        winner: analysis1.professional_rating > analysis2.professional_rating ? 'setup_1' : 'setup_2',
        rating_difference: Math.abs(analysis1.professional_rating - analysis2.professional_rating),
      };
    }
  }

  async getStyleRecommendations(lightingStyle: string): Promise<{
    description: string;
    key_to_fill_ratio: string;
    tips: string[];
  }> {
    if (this.useMock || shouldUseMockData()) {
      console.info('Using mock data for getStyleRecommendations');
      return getMockStyleRecommendations(lightingStyle);
    }

    try {
      return await this.request<{
        description: string;
        key_to_fill_ratio: string;
        tips: string[];
      }>(`/analyze/recommendations/${lightingStyle}`);
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      return getMockStyleRecommendations(lightingStyle);
    }
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

}

export const apiClient = new APIClient();
