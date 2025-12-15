/**
 * Text-to-Image Generation API Client
 * 
 * Handles deterministic generation, caching, guidance images, ControlNet,
 * and SSE status streaming.
 */

import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ========== TYPES ==========

export interface GuidanceImage {
  url: string;
  role: 'reference' | 'style' | 'texture';
}

export interface ControlNetConfig {
  name: string;
  weight: number;
  mask_url?: string;
}

export interface TextToImageRequest {
  prompt?: string;
  fibo_json?: Record<string, unknown>;
  model?: string;
  seed?: number;
  guidance_images?: GuidanceImage[];
  controlnet?: ControlNetConfig;
  width?: number;
  height?: number;
  num_variants?: number;
  refine_mode?: 'generate' | 'refine' | 'inspire';
  meta?: {
    user_id?: string;
    tags?: string[];
    priority?: 'normal' | 'high' | 'low';
  };
}

export interface TextToImageResponse {
  request_id: string;
  run_id: string;
  seed: number;
  model_version: string;
  queued_at: string;
  est_cost_cents: number;
  sse_token: string;
  cached_hit?: boolean;
  cached_artifact_id?: string;
}

export interface ArtifactInfo {
  id: string;
  url: string;
  thumb_url?: string;
  width: number;
  height: number;
  variant_index: number;
  evaluator_score?: number;
  semantic_score?: number;
  perceptual_score?: number;
  meta?: Record<string, unknown>;
}

export interface StatusResponse {
  run_id: string;
  status: string;
  progress_percent: number;
  step?: string;
  message?: string;
  artifacts: ArtifactInfo[];
  cached_hit: boolean;
  seed?: number;
  model_version?: string;
  cost_cents?: number;
}

export interface PresignRequest {
  filename: string;
  content_type?: string;
  purpose?: string;
}

export interface PresignResponse {
  upload_url: string;
  public_url: string;
  key: string;
  method: string;
}

// ========== API FUNCTIONS ==========

/**
 * Create a new text-to-image generation job
 */
export async function createTextToImageJob(
  request: TextToImageRequest
): Promise<TextToImageResponse> {
  const response = await api.post<TextToImageResponse>(
    '/generate/text-to-image',
    request
  );
  return response.data;
}

/**
 * Get status of a generation run
 */
export async function getGenerationStatus(runId: string): Promise<StatusResponse> {
  const response = await api.get<StatusResponse>(`/status/${runId}`);
  return response.data;
}

/**
 * Get presigned URL for guidance image upload
 */
export async function getPresignedUploadUrl(
  request: PresignRequest
): Promise<PresignResponse> {
  const response = await api.post<PresignResponse>('/uploads/presign', request);
  return response.data;
}

/**
 * Upload file to presigned URL
 */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Look up cached prompt
 */
export async function lookupPromptCache(params: {
  prompt_hash: string;
  model_version: string;
  seed?: number;
  width?: number;
  height?: number;
}): Promise<{ cache_hit: boolean; artifact_id?: string; url?: string }> {
  const response = await api.post('/cache/lookup', null, { params });
  return response.data;
}

