/**
 * API client for ProLight AI backend
 * Connects frontend to FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Light {
  id: string;
  type?: string;
  position: { x: number; y: number; z: number };
  intensity: number;
  color_temperature: number;
  softness: number;
  enabled: boolean;
}

export interface GenerateRequest {
  scene_prompt: string;
  lights: Light[];
  subject_options?: Record<string, any>;
  num_results?: number;
  sync?: boolean;
}

export interface GenerateResponse {
  ok: boolean;
  request_id?: string;
  status: string;
  image_url?: string;
  structured_prompt?: Record<string, any>;
  meta: Record<string, any>;
  error?: string;
}

export interface StatusResponse {
  ok: boolean;
  status: string;
  image_url?: string;
  structured_prompt?: Record<string, any>;
  meta: Record<string, any>;
  error?: string;
}

/**
 * Generate image with lighting setup
 */
export async function generateImage(request: GenerateRequest): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Check status of async generation
 */
export async function checkStatus(requestId: string): Promise<StatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/status/${requestId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Poll for async generation completion
 */
export async function waitForCompletion(
  requestId: string,
  onProgress?: (status: string) => void,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<StatusResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkStatus(requestId);
    
    if (onProgress) {
      onProgress(status.status);
    }

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Timeout waiting for generation');
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get API configuration
 */
export function getApiConfig() {
  return {
    baseUrl: API_BASE_URL,
    timeout: 30000,
  };
}

/**
 * Re-export axios instance for backward compatibility
 */
export { default as api } from "@/api/axios";
