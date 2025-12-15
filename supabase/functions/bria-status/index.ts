/**
 * Bria Status Service - Supabase Edge Function
 * 
 * Provides status tracking for Bria async requests:
 * - GET /bria-status/:requestId - Get current status
 * - POST /bria-status/start_poll - Start background polling
 * 
 * Environment variables required:
 * - BRIA_API_TOKEN
 * - SUPABASE_URL (auto-provided)
 * - SUPABASE_SERVICE_ROLE_KEY (auto-provided)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const BRIA_BASE_URL = 'https://engine.prod.bria-api.com/v2';
const BRIA_API_TOKEN = Deno.env.get('BRIA_API_TOKEN') || '';

interface BriaStatusResponse {
  request_id: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'UNKNOWN';
  result?: {
    image_url?: string;
    video_url?: string;
    structured_prompt?: string;
    seed?: number;
    prompt?: string;
    refined_prompt?: string;
  } | null;
  status_payload?: Record<string, unknown>;
  error?: Record<string, unknown>;
  last_checked?: string;
}

/**
 * Normalize Bria status response into canonical format
 */
function normalizeBriaStatus(request_id: string, briaResponseData: BriaResponseData | Record<string, unknown>): BriaStatusResponse {
  const statusRaw = (briaResponseData?.status || briaResponseData?.state || '').toString().toUpperCase();
  
  let status: 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'UNKNOWN' = 'UNKNOWN';
  if (statusRaw.includes('IN_PROGRESS') || statusRaw.includes('RUNNING') || statusRaw.includes('PENDING')) {
    status = 'IN_PROGRESS';
  } else if (statusRaw.includes('COMPLETED') || statusRaw.includes('SUCCEEDED') || statusRaw.includes('DONE')) {
    status = 'COMPLETED';
  } else if (statusRaw.includes('ERROR') || statusRaw.includes('FAILED')) {
    status = 'ERROR';
  } else {
    status = (statusRaw || 'UNKNOWN') as 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'UNKNOWN';
  }

  // Extract result fields
  const payloadResult = briaResponseData?.result || briaResponseData?.outputs || briaResponseData?.output || briaResponseData;
  const result: Record<string, unknown> = {};
  
  if (payloadResult) {
    if (payloadResult.image_url) result.image_url = payloadResult.image_url;
    if (payloadResult.video_url) result.video_url = payloadResult.video_url;
    if (payloadResult.url) {
      const url = payloadResult.url;
      if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov')) {
        result.video_url = url;
      } else {
        result.image_url = url;
      }
    }
    if (payloadResult.structured_prompt) result.structured_prompt = payloadResult.structured_prompt;
    if (payloadResult.seed) result.seed = payloadResult.seed;
    if (payloadResult.prompt) result.prompt = payloadResult.prompt;
    if (payloadResult.refined_prompt) result.refined_prompt = payloadResult.refined_prompt;
  }

  return {
    request_id,
    status,
    result: Object.keys(result).length ? result : null,
    status_payload: briaResponseData,
    last_checked: new Date().toISOString(),
    error: briaResponseData?.error || (status === 'ERROR' ? briaResponseData : null)
  };
}

/**
 * Fetch status from Bria API
 */
async function fetchStatusFromBria(request_id: string): Promise<BriaStatusResponse> {
  if (!BRIA_API_TOKEN) {
    throw new Error('BRIA_API_TOKEN not configured');
  }

  try {
    const response = await fetch(`${BRIA_BASE_URL}/status/${encodeURIComponent(request_id)}`, {
      method: 'GET',
      headers: {
        'api_token': BRIA_API_TOKEN,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000) // 30s timeout
    });

    if (response.status === 404) {
      return {
        request_id,
        status: 'UNKNOWN',
        result: null,
        status_payload: null,
        last_checked: new Date().toISOString(),
        error: { code: 404, message: 'request_id not found or expired on Bria' }
      };
    }

    if (!response.ok) {
      throw new Error(`Bria API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return normalizeBriaStatus(request_id, data);
  } catch (err) {
    console.error('Error fetching status from Bria:', err);
    throw err;
  }
}

/**
 * Upsert status in database
 */
async function upsertStatus(
  supabase: SupabaseClient,
  normalized: BriaStatusResponse,
  userId?: string,
  endpointType?: string
): Promise<void> {
  const { error } = await supabase
    .from('bria_status')
    .upsert({
      request_id: normalized.request_id,
      status: normalized.status,
      result: normalized.result,
      status_payload: normalized.status_payload,
      last_checked: normalized.last_checked,
      error: normalized.error,
      user_id: userId || null,
      endpoint_type: endpointType || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'request_id'
    });

  if (error) {
    console.error('Error upserting status:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get user from auth header if present
  const authHeader = req.headers.get('Authorization');
  let userId: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    } catch (err) {
      // Ignore auth errors for now
    }
  }

  try {
    // GET /bria-status/:requestId
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[1]) {
      const requestId = pathParts[1];

      // Check database first
      const { data: dbStatus, error: dbError } = await supabase
        .from('bria_status')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (dbStatus && !dbError) {
        return new Response(
          JSON.stringify({
            request_id: dbStatus.request_id,
            status: dbStatus.status,
            result: dbStatus.result,
            status_payload: dbStatus.status_payload,
            last_checked: dbStatus.last_checked,
            error: dbStatus.error
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Not in DB, fetch from Bria
      const status = await fetchStatusFromBria(requestId);
      await upsertStatus(supabase, status, userId);

      return new Response(
        JSON.stringify(status),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // POST /bria-status/start_poll
    if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'start_poll') {
      const body = await req.json();
      const { request_id, endpoint_type } = body;

      if (!request_id) {
        return new Response(
          JSON.stringify({ error: 'request_id required' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Check if already polling
      const { data: existingPoll } = await supabase
        .from('poll_jobs')
        .select('*')
        .eq('request_id', request_id)
        .in('status', ['queued', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingPoll) {
        return new Response(
          JSON.stringify({
            started: false,
            reason: 'already_polling',
            poll_job_id: existingPoll.id
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Check if already terminal in status table
      const { data: existingStatus } = await supabase
        .from('bria_status')
        .select('*')
        .eq('request_id', request_id)
        .single();

      if (existingStatus && ['COMPLETED', 'ERROR', 'UNKNOWN'].includes(existingStatus.status)) {
        return new Response(
          JSON.stringify({
            started: false,
            reason: 'already_terminal',
            status: {
              request_id: existingStatus.request_id,
              status: existingStatus.status,
              result: existingStatus.result,
              status_payload: existingStatus.status_payload,
              last_checked: existingStatus.last_checked,
              error: existingStatus.error
            }
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Create poll job
      const { data: pollJob, error: pollError } = await supabase
        .from('poll_jobs')
        .insert({
          request_id,
          status: 'queued',
          max_attempts: 120
        })
        .select()
        .single();

      if (pollError) {
        throw pollError;
      }

      // Do initial fetch to seed cache
      try {
        const initialStatus = await fetchStatusFromBria(request_id);
        await upsertStatus(supabase, initialStatus, userId, endpoint_type);
      } catch (err) {
        console.warn('Initial status fetch failed, will be handled by poller:', err);
      }

      return new Response(
        JSON.stringify({
          started: true,
          request_id,
          poll_job_id: pollJob.id,
          message: 'Background polling started'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Status service error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

