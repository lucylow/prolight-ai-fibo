/**
 * Background Job Poller
 * 
 * This function polls pending jobs from both video_jobs and tailored_jobs tables
 * and updates their status by calling Bria's status_url endpoints.
 * 
 * Can be called by:
 * - Supabase pg_cron (set up in database)
 * - External cron service (e.g., GitHub Actions, Vercel Cron)
 * - Manual trigger
 * 
 * Environment variables required:
 * - BRIA_API_TOKEN
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const BRIA_API_TOKEN = Deno.env.get('BRIA_API_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Normalize Bria status response
 */
function normalizeBriaStatus(request_id: string, briaResponseData: any): {
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'UNKNOWN';
  result: any;
  error: any;
} {
  const statusRaw = (briaResponseData?.status || briaResponseData?.state || '').toString().toUpperCase();
  
  let status: 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'UNKNOWN' = 'UNKNOWN';
  if (statusRaw.includes('IN_PROGRESS') || statusRaw.includes('RUNNING') || statusRaw.includes('PENDING')) {
    status = 'IN_PROGRESS';
  } else if (statusRaw.includes('COMPLETED') || statusRaw.includes('SUCCEEDED') || statusRaw.includes('DONE')) {
    status = 'COMPLETED';
  } else if (statusRaw.includes('ERROR') || statusRaw.includes('FAILED')) {
    status = 'ERROR';
  } else {
    status = (statusRaw || 'UNKNOWN') as any;
  }

  // Extract result fields
  const payloadResult = briaResponseData?.result || briaResponseData?.outputs || briaResponseData?.output || briaResponseData;
  const result: any = {};
  
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
    status,
    result: Object.keys(result).length ? result : null,
    error: briaResponseData?.error || (status === 'ERROR' ? briaResponseData : null)
  };
}

/**
 * Poll a single job and update status
 */
async function pollJob(
  table: 'video_jobs' | 'tailored_jobs' | 'bria_status',
  job: { request_id: string; status_url?: string; status: string }
): Promise<{ request_id: string; status: string; updated: boolean }> {
  try {
    // For bria_status, use the standard status endpoint
    const statusUrl = job.status_url || `https://engine.prod.bria-api.com/v2/status/${job.request_id}`;
    
    const resp = await fetch(statusUrl, {
      headers: { 'api_token': BRIA_API_TOKEN || '' },
      signal: AbortSignal.timeout(20000), // 20s timeout
    });

    if (!resp.ok) {
      if (resp.status === 404) {
        // Job not found - mark as UNKNOWN
        if (table === 'bria_status') {
          const { error } = await supabase
            .from('bria_status')
            .update({
              status: 'UNKNOWN',
              error: { code: 404, message: 'request_id not found or expired' },
              last_checked: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('request_id', job.request_id);
          return { request_id: job.request_id, status: 'UNKNOWN', updated: !error };
        }
      }
      console.warn(`Failed to poll job ${job.request_id}: ${resp.status}`);
      return { request_id: job.request_id, status: job.status, updated: false };
    }

    const payload = await resp.json();
    
    // For bria_status table, use normalized format
    if (table === 'bria_status') {
      const normalized = normalizeBriaStatus(job.request_id, payload);
      const { error } = await supabase
        .from('bria_status')
        .update({
          status: normalized.status,
          result: normalized.result,
          status_payload: payload,
          error: normalized.error,
          last_checked: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('request_id', job.request_id);

      if (error) {
        console.error(`Failed to update bria_status ${job.request_id}:`, error);
        return { request_id: job.request_id, status: job.status, updated: false };
      }

      return { request_id: job.request_id, status: normalized.status, updated: true };
    }

    // For video_jobs and tailored_jobs, use legacy format
    const incomingStatus = (payload?.status || payload?.state || '').toString().toLowerCase();
    
    let normalized = job.status;
    if (['succeeded', 'completed', 'done', 'success'].includes(incomingStatus)) {
      normalized = 'succeeded';
    } else if (['failed', 'error', 'cancelled'].includes(incomingStatus)) {
      normalized = 'failed';
    } else {
      normalized = incomingStatus || 'running';
    }

    // Extract result URL (varies by endpoint)
    const resultUrl = payload?.result?.url || 
                     payload?.output?.url || 
                     payload?.artifact_url || 
                     payload?.outputs?.[0]?.url || 
                     null;
    const result = resultUrl ? { url: resultUrl } : null;

    // Update job in database
    const updateData: Record<string, unknown> = {
      status: normalized,
      status_payload: payload,
      updated_at: new Date().toISOString(),
    };

    if (result) {
      updateData.result = result;
    }

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('request_id', job.request_id);

    if (error) {
      console.error(`Failed to update job ${job.request_id}:`, error);
      return { request_id: job.request_id, status: job.status, updated: false };
    }

    return { request_id: job.request_id, status: normalized, updated: true };
  } catch (err) {
    console.error(`Error polling job ${job.request_id}:`, err);
    return { request_id: job.request_id, status: job.status, updated: false };
  }
}

/**
 * Poll all pending jobs for a table
 */
async function pollTable(table: 'video_jobs' | 'tailored_jobs' | 'bria_status'): Promise<{
  table: string;
  total: number;
  updated: number;
  results: Array<{ request_id: string; status: string }>;
}> {
  try {
    // Get all pending jobs - different status filters for different tables
    let statusFilter: string[];
    if (table === 'bria_status') {
      statusFilter = ['IN_PROGRESS'];
    } else {
      statusFilter = ['submitted', 'running', 'queued'];
    }

    const query = supabase
      .from(table)
      .select('request_id, status_url, status')
      .in('status', statusFilter);

    // For bria_status, also check poll_jobs to only poll queued/active jobs
    if (table === 'bria_status') {
      const { data: pollJobs } = await supabase
        .from('poll_jobs')
        .select('request_id')
        .in('status', ['queued', 'active']);

      if (pollJobs && pollJobs.length > 0) {
        const requestIds = pollJobs.map(pj => pj.request_id);
        query.in('request_id', requestIds);
      } else {
        // No active poll jobs, return empty
        return { table, total: 0, updated: 0, results: [] };
      }
    }

    const { data: jobs, error } = await query;

    if (error) {
      throw error;
    }

    if (!jobs || jobs.length === 0) {
      return { table, total: 0, updated: 0, results: [] };
    }

    const results = [];
    let updated = 0;

    // Poll jobs in parallel (with concurrency limit)
    const BATCH_SIZE = 5;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(job => pollJob(table, job))
      );
      
      for (const result of batchResults) {
        results.push({ request_id: result.request_id, status: result.status });
        if (result.updated) {
          updated++;
        }

        // Update poll_jobs status if terminal
        if (table === 'bria_status' && ['COMPLETED', 'ERROR', 'UNKNOWN'].includes(result.status)) {
          await supabase
            .from('poll_jobs')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('request_id', result.request_id)
            .in('status', ['queued', 'active']);
        }
      }
    }

    return { table, total: jobs.length, updated, results };
  } catch (err) {
    console.error(`Error polling table ${table}:`, err);
    throw err;
  }
}

serve(async (req) => {
  const startTime = Date.now();

  try {
    // Update poll_jobs status to 'active' for queued jobs
    const { data: queuedJobs } = await supabase
      .from('poll_jobs')
      .select('request_id')
      .eq('status', 'queued')
      .limit(10); // Process up to 10 at a time

    if (queuedJobs && queuedJobs.length > 0) {
      const requestIds = queuedJobs.map(j => j.request_id);
      await supabase
        .from('poll_jobs')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .in('request_id', requestIds);
    }

    // Poll all tables
    const [videoResults, tailoredResults, briaStatusResults] = await Promise.all([
      pollTable('video_jobs'),
      pollTable('tailored_jobs'),
      pollTable('bria_status'),
    ]);

    const totalJobs = videoResults.total + tailoredResults.total + briaStatusResults.total;
    const totalUpdated = videoResults.updated + tailoredResults.updated + briaStatusResults.updated;
    const duration = Date.now() - startTime;

    const summary = {
      success: true,
      duration_ms: duration,
      summary: {
        total_jobs: totalJobs,
        updated: totalUpdated,
        video_jobs: videoResults,
        tailored_jobs: tailoredResults,
        bria_status: briaStatusResults,
      },
    };

    console.log('Polling complete:', JSON.stringify(summary, null, 2));

    return new Response(
      JSON.stringify(summary),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Polling error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
