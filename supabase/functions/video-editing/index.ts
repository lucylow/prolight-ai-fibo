/**
 * Supabase Edge Function: Bria Video Editing v2
 * 
 * Features:
 * - Generate S3 presigned PUT/GET URLs for direct upload
 * - Create Bria video editing jobs (increase_resolution, remove_background, foreground_mask)
 * - SSE endpoint for job status updates
 * - Job status query endpoint
 * 
 * Environment variables required:
 * - BRIA_API_TOKEN
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION
 * - S3_BUCKET
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const BRIA_V2_BASE = 'https://engine.prod.bria-api.com/v2';
const BRIA_API_TOKEN = Deno.env.get('BRIA_API_TOKEN');
const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
const S3_BUCKET = Deno.env.get('S3_BUCKET');

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// SSE connections map: request_id -> Set<ReadableStreamDefaultController>
const sseConnections = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Broadcast SSE update to all connected clients for a job
 */
function broadcastJobUpdate(requestId: string, payload: unknown) {
  const connections = sseConnections.get(requestId);
  if (connections && connections.size > 0) {
    const encoder = new TextEncoder();
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    const encoded = encoder.encode(message);
    
    for (const controller of connections) {
      try {
        controller.enqueue(encoded);
      } catch (error) {
        console.error('Failed to send SSE update:', error);
        // Remove dead connection
        connections.delete(controller);
      }
    }
  }
}

/**
 * Generate S3 presigned URLs using AWS SDK v3
 */
async function generatePresignedUrls(key: string, contentType: string, expiresIn: number = 3600) {
  const crypto = await import('https://deno.land/std@0.168.0/crypto/mod.ts');
  
  // For Deno, we'll use a simpler approach with AWS Signature V4
  // In production, consider using AWS SDK for Deno or a backend service
  const timestamp = Math.floor(Date.now() / 1000);
  const dateStamp = new Date(timestamp * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  
  // Generate presigned PUT URL
  const putUrl = await generatePresignedUrl('PUT', key, contentType, timestamp, expiresIn);
  
  // Generate presigned GET URL (for Bria to fetch)
  const getUrl = await generatePresignedUrl('GET', key, contentType, timestamp, expiresIn);
  
  return { presignedPutUrl: putUrl, presignedGetUrl: getUrl };
}

/**
 * Generate AWS Signature V4 presigned URL
 * Simplified version - in production, use AWS SDK
 */
async function generatePresignedUrl(
  method: string,
  key: string,
  contentType: string,
  timestamp: number,
  expiresIn: number
): Promise<string> {
  // This is a simplified version. For production, use AWS SDK or call backend API
  // For now, we'll return a placeholder that should be handled by backend
  const endpoint = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  
  // Note: Actual presigning requires AWS Signature V4 which is complex
  // In production, delegate to Python backend or use AWS SDK
  return endpoint;
}

/**
 * Create Bria video editing job
 */
async function createBriaJob(
  operation: string,
  videoUrl: string,
  params: Record<string, unknown>
): Promise<{ request_id: string; status_url: string }> {
  if (!BRIA_API_TOKEN) {
    throw new Error('BRIA_API_TOKEN not configured');
  }

  let endpointPath = '';
  let body: Record<string, unknown> = { video: videoUrl };

  if (operation === 'increase_resolution') {
    endpointPath = '/video/edit/increase_resolution';
    body = {
      video: videoUrl,
      desired_increase: params.desired_increase || 2,
      output_container_and_codec: params.output_container_and_codec || 'mp4_h264',
    };
  } else if (operation === 'remove_background') {
    endpointPath = '/video/edit/remove_background';
    body = {
      video: videoUrl,
      background_color: params.background_color || 'Transparent',
      output_container_and_codec: params.output_container_and_codec || 'webm_vp9',
    };
  } else if (operation === 'foreground_mask') {
    endpointPath = '/video/edit/foreground_mask';
    body = {
      video: videoUrl,
      output_container_and_codec: params.output_container_and_codec || 'webm_vp9',
    };
  } else {
    throw new Error(`Unsupported operation: ${operation}`);
  }

  const response = await fetch(`${BRIA_V2_BASE}${endpointPath}`, {
    method: 'POST',
    headers: {
      'api_token': BRIA_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bria API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  if (!data.request_id || !data.status_url) {
    throw new Error('Invalid Bria response: missing request_id or status_url');
  }

  return { request_id: data.request_id, status_url: data.status_url };
}

/**
 * Store job in database
 */
async function storeJob(
  requestId: string,
  statusUrl: string,
  s3Key: string,
  operation: string,
  params: Record<string, unknown>,
  userId?: string
) {
  const { error } = await supabase
    .from('video_jobs')
    .insert({
      request_id: requestId,
      status_url: statusUrl,
      s3_key: s3Key,
      operation,
      params,
      user_id: userId,
      status: 'submitted',
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to store job:', error);
    // Continue even if storage fails
  }
}

/**
 * Update job status and broadcast to SSE clients
 */
async function updateJobStatus(
  requestId: string,
  status: string,
  result: Record<string, unknown> | null,
  statusPayload: unknown
) {
  const { error } = await supabase
    .from('video_jobs')
    .update({
      status,
      result,
      status_payload: statusPayload,
      updated_at: new Date().toISOString(),
    })
    .eq('request_id', requestId);

  if (error) {
    console.error('Failed to update job:', error);
    return;
  }

  // Broadcast update to SSE clients
  broadcastJobUpdate(requestId, {
    request_id: requestId,
    status,
    result,
    payload: statusPayload,
  });
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // GET /api/s3/presign?filename=...&contentType=...
    if (path.includes('/presign') && req.method === 'GET') {
      const filename = url.searchParams.get('filename');
      const contentType = url.searchParams.get('contentType') || 'video/mp4';
      
      if (!filename) {
        return new Response(
          JSON.stringify({ error: 'filename required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delegate to Python backend for actual presigning
      const backendUrl = Deno.env.get('BACKEND_URL') || 'http://localhost:8000';
      
      // Get presigned PUT URL
      const presignResponse = await fetch(
        `${backendUrl}/api/s3/presign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, content_type: contentType })
        }
      );
      
      if (!presignResponse.ok) {
        const errorText = await presignResponse.text();
        throw new Error(`Failed to get presigned URLs from backend: ${errorText}`);
      }
      
      const presignData = await presignResponse.json();
      
      // Also generate presigned GET for Bria
      const getPresignResponse = await fetch(
        `${backendUrl}/api/s3/presign-get?key=${encodeURIComponent(presignData.key)}`,
        { method: 'GET' }
      );
      
      let presignedGetUrl = presignData.public_url;
      if (getPresignResponse.ok) {
        const getData = await getPresignResponse.json();
        presignedGetUrl = getData.url;
      }

      return new Response(
        JSON.stringify({
          key: presignData.key,
          presignedPutUrl: presignData.upload_url,
          presignedGetUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /api/video/jobs
    if (path.includes('/jobs') && req.method === 'POST') {
      const body = await req.json();
      const { operation, s3_key, params = {} } = body;

      if (!operation || !s3_key) {
        return new Response(
          JSON.stringify({ error: 'operation and s3_key required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user from auth header
      const authHeader = req.headers.get('authorization');
      let userId: string | undefined;
      if (authHeader) {
        // Extract user ID from token (simplified - implement proper JWT verification)
        try {
          const token = authHeader.replace('Bearer ', '');
          // In production, verify JWT and extract user_id
          // For now, we'll get it from Supabase auth
          const { data: { user } } = await supabase.auth.getUser(token);
          userId = user?.id;
        } catch {
          // Continue without user ID
        }
      }

      // Generate presigned GET URL for Bria
      const backendUrl = Deno.env.get('BACKEND_URL') || 'http://localhost:8000';
      const getPresignResponse = await fetch(
        `${backendUrl}/api/s3/presign-get?key=${encodeURIComponent(s3_key)}`,
        { method: 'GET' }
      );
      
      let videoUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3_key}`;
      if (getPresignResponse.ok) {
        const getData = await getPresignResponse.json();
        videoUrl = getData.url;
      }

      // Create Bria job
      const { request_id, status_url } = await createBriaJob(operation, videoUrl, params);

      // Store job
      await storeJob(request_id, status_url, s3_key, operation, params, userId);

      return new Response(
        JSON.stringify({ request_id, status_url }),
        { 
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // GET /api/video/jobs/:requestId
    if (path.includes('/jobs/') && req.method === 'GET') {
      const requestId = path.split('/jobs/')[1];
      
      const { data, error } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /api/video/subscribe/:requestId (SSE)
    if (path.includes('/subscribe/') && req.method === 'GET') {
      const requestId = path.split('/subscribe/')[1];
      
      // Set SSE headers
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          
          // Send initial connection message
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ msg: 'connected', request_id: requestId })}\n\n`));

          // Add to connections map
          if (!sseConnections.has(requestId)) {
            sseConnections.set(requestId, new Set());
          }
          sseConnections.get(requestId)!.add(controller);

          // Cleanup on close
          req.signal.addEventListener('abort', () => {
            const conns = sseConnections.get(requestId);
            if (conns) {
              conns.delete(controller);
              if (conns.size === 0) {
                sseConnections.delete(requestId);
              }
            }
            try {
              controller.close();
            } catch {
              // Already closed
            }
          });
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // POST /api/video/poll - Background polling endpoint (can be called by cron)
    if (path.includes('/poll') && req.method === 'POST') {
      try {
        // Get all pending jobs
        const { data: jobs, error } = await supabase
          .from('video_jobs')
          .select('*')
          .in('status', ['submitted', 'running', 'queued']);

        if (error) {
          throw error;
        }

        if (!jobs || jobs.length === 0) {
          return new Response(
            JSON.stringify({ message: 'No pending jobs', count: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const results = [];
        for (const job of jobs) {
          try {
            const resp = await fetch(job.status_url, {
              headers: { 'api_token': BRIA_API_TOKEN || '' },
            });

            if (!resp.ok) {
              console.warn(`Failed to poll job ${job.request_id}: ${resp.status}`);
              continue;
            }

            const payload = await resp.json();
            const incomingStatus = (payload?.status || payload?.state || '').toString().toLowerCase();
            
            let normalized = job.status;
            if (['succeeded', 'completed', 'done', 'success'].includes(incomingStatus)) {
              normalized = 'succeeded';
            } else if (['failed', 'error', 'cancelled'].includes(incomingStatus)) {
              normalized = 'failed';
            } else {
              normalized = incomingStatus || 'running';
            }

            const resultUrl = payload?.result?.url || payload?.output?.url || payload?.artifact_url || null;
            const result = resultUrl ? { url: resultUrl } : null;

            await updateJobStatus(job.request_id, normalized, result, payload);
            results.push({ request_id: job.request_id, status: normalized });
          } catch (err) {
            console.error(`Error polling job ${job.request_id}:`, err);
          }
        }

        return new Response(
          JSON.stringify({ message: 'Polling complete', count: results.length, results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Polling error:', error);
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Polling failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Video editing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Background polling endpoint (can be called by cron or scheduled function)
 * POST /api/video/poll - polls all pending jobs
 */
if (path.includes('/poll') && req.method === 'POST') {
  try {
    // Get all pending jobs
    const { data: jobs, error } = await supabase
      .from('video_jobs')
      .select('*')
      .in('status', ['submitted', 'running', 'queued']);

    if (error) {
      throw error;
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    for (const job of jobs) {
      try {
        const resp = await fetch(job.status_url, {
          headers: { 'api_token': BRIA_API_TOKEN || '' },
        });

        if (!resp.ok) {
          console.warn(`Failed to poll job ${job.request_id}: ${resp.status}`);
          continue;
        }

        const payload = await resp.json();
        const incomingStatus = (payload?.status || payload?.state || '').toString().toLowerCase();
        
        let normalized = job.status;
        if (['succeeded', 'completed', 'done', 'success'].includes(incomingStatus)) {
          normalized = 'succeeded';
        } else if (['failed', 'error', 'cancelled'].includes(incomingStatus)) {
          normalized = 'failed';
        } else {
          normalized = incomingStatus || 'running';
        }

        const resultUrl = payload?.result?.url || payload?.output?.url || payload?.artifact_url || null;
        const result = resultUrl ? { url: resultUrl } : null;

        await updateJobStatus(job.request_id, normalized, result, payload);
        results.push({ request_id: job.request_id, status: normalized });
      } catch (err) {
        console.error(`Error polling job ${job.request_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Polling complete', count: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Polling error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Polling failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

