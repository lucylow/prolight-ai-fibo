/**
 * Tailored Generation API Client
 * 
 * Handles:
 * - Project and Dataset management
 * - Advanced prefix generation
 * - Image registration (single and bulk)
 * - Model creation and training
 * - Image generation with tailored models
 * - Reimagine with structure/portrait references
 * - Job status polling
 */

import axios from "axios";

const API_BASE = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tailored-generation`
  : '/edge/tailored-generation';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach auth token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb-access-token') || 
                sessionStorage.getItem('sb-access-token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== TYPES ==========

export interface Project {
  id: string;
  bria_id: string;
  name: string;
  ip_type: string;
  medium: string;
  description?: string;
  metadata?: Record<string, unknown>;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Dataset {
  id: string;
  bria_id: string;
  project_id: string;
  name: string;
  description?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: string;
  bria_id: string;
  dataset_id: string;
  name: string;
  training_mode: 'fully_automated' | 'expert';
  training_version: 'light' | 'max';
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TailoredJob {
  id: string;
  type: 'training' | 'generate' | 'reimagine';
  model_id?: string;
  request_id: string;
  status_url: string;
  status: string;
  status_payload?: unknown;
  result?: {
    url?: string;
    outputs?: Array<{ url: string }>;
  };
  prompt?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GuidanceMethod {
  method: 'controlnet_canny' | 'controlnet_depth' | 'recoloring' | 'color_grid' | 'image_prompt_adapter';
  image_base64?: string;
  image_url?: string;
  scale?: number;
}

export interface ImagePromptAdapter {
  mode?: 'regular' | 'style_only';
  scale?: number;
  image_base64?: string;
  image_urls?: string[];
}

// ========== PROJECTS ==========

export async function createProject(data: {
  name: string;
  ip_type: string;
  medium: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<Project> {
  const { data: response } = await api.post('/api/tailored/projects', data);
  return response;
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get('/api/tailored/projects');
  return data;
}

// ========== DATASETS ==========

export async function createDataset(projectId: string, data: {
  name: string;
  description?: string;
}): Promise<Dataset> {
  const { data: response } = await api.post(`/api/tailored/projects/${projectId}/datasets`, data);
  return response;
}

export async function listDatasets(): Promise<Dataset[]> {
  const { data } = await api.get('/api/tailored/datasets');
  return data;
}

export async function generatePrefix(datasetId: string, sampleImageUrls: string[]): Promise<unknown> {
  const { data } = await api.post(`/api/tailored/datasets/${datasetId}/generate_prefix`, {
    sample_image_urls: sampleImageUrls,
  });
  return data;
}

export async function registerImage(datasetId: string, imageUrl: string, caption?: string): Promise<unknown> {
  const { data } = await api.post(`/api/tailored/datasets/${datasetId}/images/register`, {
    image_url: imageUrl,
    caption,
  });
  return data;
}

export async function bulkRegisterImages(datasetId: string, zipUrl: string): Promise<unknown> {
  const { data } = await api.post(`/api/tailored/datasets/${datasetId}/images/bulk_register`, {
    zip_url: zipUrl,
  });
  return data;
}

// ========== MODELS ==========

export async function createModel(data: {
  dataset_id: string;
  name: string;
  training_mode?: 'fully_automated' | 'expert';
  training_version?: 'light' | 'max';
  options?: Record<string, unknown>;
}): Promise<Model> {
  const { data: response } = await api.post('/api/tailored/models', data);
  return response;
}

export async function listModels(): Promise<Model[]> {
  const { data } = await api.get('/api/tailored/models');
  return data;
}

export async function getModel(modelId: string): Promise<unknown> {
  const { data } = await api.get(`/api/tailored/models/${modelId}`);
  return data;
}

export async function startTraining(modelId: string): Promise<{ request_id: string; status_url: string }> {
  const { data } = await api.post(`/api/tailored/models/${modelId}/start`);
  return data;
}

// ========== GENERATION ==========

export async function generateImage(data: {
  model_id: string;
  prompt: string;
  negative_prompt?: string;
  guidance_methods?: GuidanceMethod[];
  steps?: number;
  width?: number;
  height?: number;
  seed?: number;
  num_images?: number;
  image_prompt_adapter?: ImagePromptAdapter;
  [key: string]: unknown;
}): Promise<{ request_id?: string; status_url?: string; [key: string]: unknown }> {
  const { data: response } = await api.post('/api/tailored/generate', data);
  return response;
}

export async function reimagine(data: {
  model_id: string;
  reference_image_base64?: string;
  reference_image_url?: string;
  prompt: string;
  [key: string]: unknown;
}): Promise<{ request_id?: string; status_url?: string; [key: string]: unknown }> {
  const { data: response } = await api.post('/api/tailored/reimagine', data);
  return response;
}

// ========== JOBS ==========

export async function listJobs(): Promise<TailoredJob[]> {
  const { data } = await api.get('/api/tailored/jobs');
  return data;
}

export async function getJob(requestId: string): Promise<TailoredJob> {
  const { data } = await api.get(`/api/tailored/jobs/${requestId}`);
  return data;
}

// ========== S3 PRESIGN ==========

export interface PresignResponse {
  key: string;
  presignedPutUrl: string;
  presignedGetUrl: string;
}

export async function getPresignedUrl(
  filename: string,
  contentType: string = 'image/png'
): Promise<PresignResponse> {
  const { data } = await api.get('/api/tailored/s3/presign', {
    params: { filename, contentType },
  });
  return data;
}

/**
 * Upload file directly to S3 using presigned PUT URL
 */
export async function uploadToS3(
  presignedPutUrl: string,
  file: File,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  await axios.put(presignedPutUrl, file, {
    headers: {
      'Content-Type': contentType,
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
}

/**
 * Complete workflow: Upload image to S3 and register to dataset
 */
export async function uploadImageAndRegister(
  file: File,
  datasetId: string,
  caption?: string,
  onUploadProgress?: (progress: number) => void
): Promise<unknown> {
  // 1. Get presigned URLs
  const { presignedPutUrl, presignedGetUrl } = await getPresignedUrl(
    file.name,
    file.type
  );

  // 2. Upload to S3
  await uploadToS3(presignedPutUrl, file, file.type, onUploadProgress);

  // 3. Register image to dataset
  const result = await registerImage(datasetId, presignedGetUrl, caption);

  return result;
}
