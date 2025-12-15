/**
 * Supabase Edge Function: Bria Tailored Generation
 * 
 * Features:
 * - Project and Dataset management
 * - Advanced prefix generation
 * - Image registration (single and bulk)
 * - Model creation and training
 * - Image generation with tailored models (ControlNet, Image Prompt Adapter)
 * - Reimagine with structure/portrait references
 * - Background job polling
 * 
 * Environment variables required:
 * - BRIA_API_TOKEN
 * - BRIA_API_BASE (default: https://engine.prod.bria-api.com/v2)
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION
 * - S3_BUCKET
 * - BACKEND_URL (for S3 presigning)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const BRIA_API_BASE = Deno.env.get('BRIA_API_BASE') || 'https://engine.prod.bria-api.com/v2';
const BRIA_API_TOKEN = Deno.env.get('BRIA_API_TOKEN');
const BACKEND_URL = Deno.env.get('BACKEND_URL') || 'http://localhost:8000';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get user ID from auth header
 */
async function getUserId(authHeader: string | null): Promise<string | undefined> {
  if (!authHeader) return undefined;
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id;
  } catch {
    return undefined;
  }
}

/**
 * Create Bria API request
 */
async function briaRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  if (!BRIA_API_TOKEN) {
    throw new Error('BRIA_API_TOKEN not configured');
  }

  const url = `${BRIA_API_BASE}${path}`;
  const headers: Record<string, string> = {
    'api_token': BRIA_API_TOKEN,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;
  const authHeader = req.headers.get('authorization');
  const userId = await getUserId(authHeader);

  try {
    // ========== PROJECTS ==========
    
    // POST /api/tailored/projects
    if (path.includes('/projects') && req.method === 'POST' && !path.includes('/datasets')) {
      const body = await req.json();
      const { name, ip_type, medium, description, metadata } = body;

      if (!name || !ip_type || !medium) {
        return new Response(
          JSON.stringify({ error: 'name, ip_type, and medium required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const briaResp = await briaRequest('POST', '/tailored-gen/projects', body);
      const briaData = await briaResp.json();

      if (!briaResp.ok) {
        return new Response(
          JSON.stringify({ error: briaData }),
          { status: briaResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store in database
      const { error: dbError } = await supabase
        .from('tailored_projects')
        .insert({
          bria_id: briaData.id || briaData.project_id,
          name,
          ip_type,
          medium,
          description,
          metadata: metadata || {},
          user_id: userId,
          bria_response: briaData,
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Failed to store project:', dbError);
      }

      return new Response(
        JSON.stringify({ id: briaData.id || briaData.project_id, ...briaData }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /api/tailored/projects
    if (path.includes('/projects') && req.method === 'GET' && !path.includes('/datasets')) {
      const { data, error } = await supabase
        .from('tailored_projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== DATASETS ==========

    // POST /api/tailored/projects/:projectId/datasets
    if (path.includes('/projects/') && path.includes('/datasets') && req.method === 'POST') {
      const projectId = path.split('/projects/')[1]?.split('/datasets')[0];
      const body = await req.json();
      const { name, description } = body;

      if (!name) {
        return new Response(
          JSON.stringify({ error: 'name required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload = { project_id: projectId, name, description };
      const briaResp = await briaRequest('POST', '/tailored-gen/datasets', payload);
      const briaData = await briaResp.json();

      if (!briaResp.ok) {
        return new Response(
          JSON.stringify({ error: briaData }),
          { status: briaResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store in database
      const { error: dbError } = await supabase
        .from('tailored_datasets')
        .insert({
          bria_id: briaData.id || briaData.dataset_id,
          project_id: projectId,
          name,
          description,
          user_id: userId,
          bria_response: briaData,
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Failed to store dataset:', dbError);
      }

      return new Response(
        JSON.stringify({ id: briaData.id || briaData.dataset_id, project_id: projectId, ...briaData }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /api/tailored/datasets
    if (path.includes('/datasets') && req.method === 'GET' && !path.includes('/images') && !path.includes('/generate_prefix')) {
      const { data, error } = await supabase
        .from('tailored_datasets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /api/tailored/datasets/:datasetId/generate_prefix
    if (path.includes('/generate_prefix') && req.method === 'POST') {
      const datasetId = path.split('/datasets/')[1]?.split('/generate_prefix')[0];
      const body = await req.json();
      const { sample_image_urls } = body;

      if (!Array.isArray(sample_image_urls) || sample_image_urls.length === 0) {
        return new Response(
          JSON.stringify({ error: 'sample_image_urls (1-6 URLs) required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload = { dataset_id: datasetId, sample_image_urls };
      const briaResp = await briaRequest('POST', '/tailored-gen/generate_prefix', payload);
      const briaData = await briaResp.json();

      if (!briaResp.ok) {
        return new Response(
          JSON.stringify({ error: briaData }),
          { status: briaResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(briaData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /api/tailored/datasets/:datasetId/images/register
    if (path.includes('/images/register') && req.method === 'POST') {
      const datasetId = path.split('/datasets/')[1]?.split('/images')[0];
      const body = await req.json();
      const { image_url, caption } = body;

      if (!image_url) {
        return new Response(
          JSON.stringify({ error: 'image_url required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload = { image_url, caption };
      const briaResp = await briaRequest('POST', `/tailored-gen/datasets/${encodeURIComponent(datasetId)}/images`, payload);
      const briaData = await briaResp.json();

      if (!briaResp.ok) {
        return new Response(
          JSON.stringify({ error: briaData }),
          { status: briaResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(briaData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /api/tailored/datasets/:datasetId/images/bulk_register
    if (path.includes('/images/bulk_register') && req.method === 'POST') {
      const datasetId = path.split('/datasets/')[1]?.split('/images')[0];
      const body = await req.json();
      const { zip_url } = body;

      if (!zip_url) {
        return new Response(
          JSON.stringify({ error: 'zip_url required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const briaResp = await briaRequest('POST', `/tailored-gen/datasets/${encodeURIComponent(datasetId)}/images/bulk`, { zip_url });
      const briaData = await briaResp.json();

      if (!briaResp.ok) {
        return new Response(
          JSON.stringify({ error: briaData }),
          { status: briaResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(briaData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== MODELS ==========

    // POST /api/tailored/models
    if (path.includes('/models') && req.method === 'POST' && !path.includes('/start')) {
      const body = await req.json();
      const { dataset_id, name, training_mode = 'fully_automated', training_version = 'light', options = {} } = body;

      if (!dataset_id || !name) {
        return new Response(
          JSON.stringify({ error: 'dataset_id and name required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload = { dataset_id, name, training_mode, training_version, options };
      const briaResp = await briaRequest('POST', '/tailored-gen/models', payload);
      const briaData = await briaResp.json();

      if (!briaResp.ok) {
        return new Response(
          JSON.stringify({ error: briaData }),
          { status: briaResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store in database
      const { error: dbError } = await supabase
        .from('tailored_models')
        .insert({
          bria_id: briaData.id || briaData.model_id,
          dataset_id,
          name,
          training_mode,
          training_version,
          user_id: userId,
          bria_response: briaData,
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Failed to store model:', dbError);
      }

      return new Response(
        JSON.stringify({ id: briaData.id || briaData.model_id, dataset_id, ...briaData }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /api/tailored/models
    if (path.includes('/models') && req.method === 'GET' && !path.includes('/start')) {
      const { data, error } = await supabase
        .from('tailored_models')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /api/tailored/models/:modelId
    if (path.includes('/models/') && req.method === 'GET' && !path.includes('/start')) {
      const modelId = path.split('/models/')[1];
      
      const briaResp = await briaRequest('GET', `/tailored-gen/models/${encodeURIComponent(modelId)}`);
      const briaData = await briaResp.json();

      if (!briaResp.ok) {
        return new Response(
          JSON.stringify({ error: briaData }),
          { status: briaResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(briaData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /api/tailored/models/:modelId/start
    if (path.includes('/models/') && path.includes('/start') && req.method === 'POST') {
      const modelId = path.split('/models/')[1]?.split('/start')[0];

      const briaResp = await briaRequest('POST', `/tailored-gen/models/${encodeURIComponent(modelId)}/start_training`);
      const briaData = await briaResp.json();

      if (!briaResp.ok) {
        return new Response(
          JSON.stringify({ error: briaData }),
          { status: briaResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { request_id, status_url } = briaData;
      if (!request_id) {
        return new Response(
          JSON.stringify({ error: 'no request_id from Bria' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store job
      const { error: jobError } = await supabase
        .from('tailored_jobs')
        .insert({
          type: 'training',
          model_id: modelId,
          request_id,
          status_url,
          status: 'submitted',
          user_id: userId,
          created_at: new Date().toISOString(),
        });

      if (jobError) {
        console.error('Failed to store training job:', jobError);
      }

      return new Response(
        JSON.stringify({ request_id, status_url }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== GENERATION ==========

    // POST /api/tailored/generate
    if (path.includes('/generate') && req.method === 'POST' && !path.includes('/reimagine')) {
      const body = await req.json();
      const {
        model_id,
        prompt,
        negative_prompt,
        guidance_methods = [],
        steps = 28,
        width = 1024,
        height = 1024,
        seed,
        num_images = 1,
        image_prompt_adapter,
        ...additional
      } = body;

      if (!model_id || !prompt) {
        return new Response(
          JSON.stringify({ error: 'model_id and prompt required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build Bria payload
      const briaBody: Record<string, unknown> = {
        prompt,
        negative_prompt,
        steps,
        width,
        height,
        seed,
        num_images,
        ...additional,
      };

      // Add guidance methods (up to 2)
      guidance_methods.slice(0, 2).forEach((g: Record<string, unknown>, idx: number) => {
        const slot = idx + 1;
        const methodKey = `guidance_method_${slot}`;
        const scaleKey = `guidance_method_${slot}_scale`;
        const imageFileKey = `guidance_method_${slot}_image_file`;
        
        briaBody[methodKey] = g.method;
        briaBody[scaleKey] = typeof g.scale === 'number' ? g.scale : 1.0;
        
        if (g.image_base64) {
          briaBody[imageFileKey] = g.image_base64;
        } else if (g.image_url) {
          briaBody[imageFileKey] = g.image_url;
        }
      });

      // Image Prompt Adapter
      if (image_prompt_adapter) {
        const ipa = image_prompt_adapter;
        briaBody.image_prompt_mode = ipa.mode || 'regular';
        briaBody.image_prompt_scale = ipa.scale ?? 1.0;
        if (ipa.image_base64) briaBody.image_prompt_file = ipa.image_base64;
        if (ipa.image_urls) briaBody.image_prompt_urls = ipa.image_urls;
      }

      const briaResp = await briaRequest('POST', `/text-to-image/tailored/${encodeURIComponent(model_id)}`, briaBody);
      const briaData = await briaResp.json();

      if (!briaResp.ok) {
        return new Response(
          JSON.stringify({ error: briaData }),
          { status: briaResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If async response, store job
      if (briaData.request_id && briaData.status_url) {
        const { error: jobError } = await supabase
          .from('tailored_jobs')
          .insert({
            type: 'generate',
            model_id,
            request_id: briaData.request_id,
            status_url: briaData.status_url,
            status: 'submitted',
            user_id: userId,
            prompt,
            created_at: new Date().toISOString(),
          });

        if (jobError) {
          console.error('Failed to store generation job:', jobError);
        }

        return new Response(
          JSON.stringify({ request_id: briaData.request_id, status_url: briaData.status_url }),
          { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(briaData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /api/tailored/reimagine
    if (path.includes('/reimagine') && req.method === 'POST') {
      const body = await req.json();
      const { model_id, reference_image_base64, reference_image_url, prompt, ...params } = body;

      if (!model_id || !(reference_image_base64 || reference_image_url) || !prompt) {
        return new Response(
          JSON.stringify({ error: 'model_id, reference image and prompt required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const briaBody: Record<string, unknown> = {
        model_id,
        prompt,
        ...params,
      };

      if (reference_image_base64) briaBody.reference_image_file = reference_image_base64;
      if (reference_image_url) briaBody.reference_image_url = reference_image_url;

      const briaResp = await briaRequest('POST', `/reimagine/tailored/${encodeURIComponent(model_id)}`, briaBody);
      const briaData = await briaResp.json();

      if (!briaResp.ok) {
        return new Response(
          JSON.stringify({ error: briaData }),
          { status: briaResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If async response, store job
      if (briaData.request_id && briaData.status_url) {
        const { error: jobError } = await supabase
          .from('tailored_jobs')
          .insert({
            type: 'reimagine',
            model_id,
            request_id: briaData.request_id,
            status_url: briaData.status_url,
            status: 'submitted',
            user_id: userId,
            created_at: new Date().toISOString(),
          });

        if (jobError) {
          console.error('Failed to store reimagine job:', jobError);
        }

        return new Response(
          JSON.stringify({ request_id: briaData.request_id, status_url: briaData.status_url }),
          { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(briaData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== JOBS ==========

    // GET /api/tailored/jobs
    if (path.includes('/jobs') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('tailored_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /api/tailored/jobs/:requestId
    if (path.includes('/jobs/') && req.method === 'GET') {
      const requestId = path.split('/jobs/')[1];
      
      const { data, error } = await supabase
        .from('tailored_jobs')
        .select('*')
        .eq('request_id', requestId)
        .eq('user_id', userId)
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

    // POST /api/tailored/poll - Background polling endpoint
    if (path.includes('/poll') && req.method === 'POST') {
      try {
        const { data: jobs, error } = await supabase
          .from('tailored_jobs')
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

            const resultUrl = payload?.result?.url || payload?.output?.url || payload?.artifact_url || payload?.outputs?.[0]?.url || null;
            const result = resultUrl ? { url: resultUrl } : null;

            await supabase
              .from('tailored_jobs')
              .update({
                status: normalized,
                status_payload: payload,
                result,
                updated_at: new Date().toISOString(),
              })
              .eq('request_id', job.request_id);

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

    // ========== S3 PRESIGN (for image uploads) ==========

    // GET /api/tailored/s3/presign
    if (path.includes('/s3/presign') && req.method === 'GET') {
      const filename = url.searchParams.get('filename');
      const contentType = url.searchParams.get('contentType') || 'image/png';

      if (!filename) {
        return new Response(
          JSON.stringify({ error: 'filename required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delegate to Python backend
      const presignResp = await fetch(
        `${BACKEND_URL}/api/s3/presign-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, content_type: contentType, make_public: false })
        }
      );

      if (!presignResp.ok) {
        const errorText = await presignResp.text();
        return new Response(
          JSON.stringify({ error: `Presign failed: ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const presignData = await presignResp.json();

      return new Response(
        JSON.stringify({
          key: presignData.key,
          presignedPutUrl: presignData.upload_url,
          presignedGetUrl: presignData.public_url,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Tailored generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

