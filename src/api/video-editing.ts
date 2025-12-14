/**
 * Video Editing API Client
 * 
 * Handles:
 * - S3 presigned URL generation for video uploads
 * - Creating Bria video editing jobs
 * - Subscribing to job status updates via SSE
 * - Querying job status
 */

import axios from "axios";

const API_BASE = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-editing`
  : '/edge/video-editing';

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

export interface PresignResponse {
  key: string;
  presignedPutUrl: string;
  presignedGetUrl: string;
}

export interface CreateJobRequest {
  operation: 'increase_resolution' | 'remove_background' | 'foreground_mask';
  s3_key: string;
  params?: {
    desired_increase?: number;
    output_container_and_codec?: string;
    background_color?: string;
  };
}

export interface CreateJobResponse {
  request_id: string;
  status_url: string;
}

export interface JobStatus {
  id: string;
  request_id: string;
  status_url: string;
  s3_key: string;
  operation: string;
  params: Record<string, unknown>;
  user_id?: string;
  status: string;
  status_payload?: unknown;
  result?: {
    url?: string;
    video_url?: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Get presigned URLs for S3 upload
 */
export async function getPresignedUrls(
  filename: string,
  contentType: string = 'video/mp4'
): Promise<PresignResponse> {
  const { data } = await api.get('/api/s3/presign', {
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
 * Create a Bria video editing job
 */
export async function createVideoJob(
  request: CreateJobRequest
): Promise<CreateJobResponse> {
  const { data } = await api.post('/api/video/jobs', request);
  return data;
}

/**
 * Get job status by request_id
 */
export async function getJobStatus(requestId: string): Promise<JobStatus> {
  const { data } = await api.get(`/api/video/jobs/${requestId}`);
  return data;
}

/**
 * Subscribe to job status updates via Server-Sent Events
 */
export function subscribeToJob(
  requestId: string,
  onUpdate: (data: { status: string; result?: { url?: string }; payload?: unknown }) => void,
  onError?: (error: Event) => void
): EventSource {
  const url = `${API_BASE}/api/video/subscribe/${encodeURIComponent(requestId)}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      onUpdate(payload);
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
 * Complete workflow: Upload video and create job
 */
export async function uploadVideoAndCreateJob(
  file: File,
  operation: CreateJobRequest['operation'],
  params?: CreateJobRequest['params'],
  onUploadProgress?: (progress: number) => void
): Promise<CreateJobResponse> {
  // 1. Get presigned URLs
  const { key, presignedPutUrl, presignedGetUrl } = await getPresignedUrls(
    file.name,
    file.type
  );

  // 2. Upload to S3
  await uploadToS3(presignedPutUrl, file, file.type, onUploadProgress);

  // 3. Create Bria job
  const job = await createVideoJob({
    operation,
    s3_key: key,
    params,
  });

  return job;
}
