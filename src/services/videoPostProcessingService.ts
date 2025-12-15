/**
 * Video Post-Processing Service
 * 
 * Handles batch processing, SSE connections, and API integration
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/post-processing';

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

export interface PostProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  input: string;
  output: string;
  type: 'image' | 'video';
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  maskMode?: 'auto' | 'brush' | 'refine';
  error?: string;
}

export interface BatchJobRequest {
  files: File[];
  operations: {
    removeBackground?: boolean;
    upscale?: boolean;
    mask?: boolean;
    maskMode?: 'auto' | 'brush' | 'refine';
  };
  lightingConfig?: {
    mainLight?: {
      direction: string;
      intensity: number;
      colorTemperature: number;
      softness: number;
    };
    fillLight?: {
      direction: string;
      intensity: number;
      colorTemperature: number;
      softness: number;
    };
    rimLight?: {
      direction: string;
      intensity: number;
      colorTemperature: number;
      softness: number;
    };
  };
}

export interface BatchJobResponse {
  job_ids: string[];
  batch_id: string;
}

export interface ProgressUpdate {
  job_id: string;
  progress: number;
  status: PostProcessingJob['status'];
  output?: string;
  error?: string;
}

/**
 * Create a batch processing job
 */
export async function createBatchJob(
  request: BatchJobRequest
): Promise<BatchJobResponse> {
  const formData = new FormData();
  
  // Append files
  request.files.forEach((file, index) => {
    formData.append(`file_${index}`, file);
  });

  // Append operations config
  formData.append('operations', JSON.stringify(request.operations));
  
  // Append lighting config if provided
  if (request.lightingConfig) {
    formData.append('lighting_config', JSON.stringify(request.lightingConfig));
  }

  const { data } = await api.post('/batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
}

/**
 * Subscribe to batch progress updates via SSE
 */
export function subscribeToBatchProgress(
  jobIds: string,
  onUpdate: (update: ProgressUpdate) => void,
  onError?: (error: Event) => void
): EventSource {
  const url = `${API_BASE}/events?job_ids=${encodeURIComponent(jobIds)}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const update: ProgressUpdate = JSON.parse(event.data);
      onUpdate(update);
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    if (onError) {
      onError(error);
    }
  };

  return eventSource;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<PostProcessingJob> {
  const { data } = await api.get(`/jobs/${jobId}`);
  return data;
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<void> {
  await api.post(`/jobs/${jobId}/cancel`);
}

/**
 * Get all jobs for current user
 */
export async function getUserJobs(): Promise<PostProcessingJob[]> {
  const { data } = await api.get('/jobs');
  return data;
}

