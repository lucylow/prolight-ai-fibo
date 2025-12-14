/**
 * Lovable Edge Function: BRIA Image Generation API v2
 * 
 * Generates images using BRIA's FIBO v2 API with support for:
 * - Text prompts
 * - Reference images
 * - Structured prompts (FIBO JSON)
 * - Image-to-image generation
 * 
 * This endpoint implements the v2 /image/generate endpoint with full FIBO support.
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING for environment-specific keys)
 * 
 * Usage:
 * POST /edge/bria/image-generate-v2
 * {
 *   "prompt": "optional text prompt",
 *   "images": ["url1"], // optional reference images
 *   "structured_prompt": { ... }, // optional FIBO JSON structure
 *   "negative_prompt": "optional",
 *   "aspect_ratio": "1:1",
 *   "guidance_scale": 5,
 *   "steps_num": 50,
 *   "seed": 12345,
 *   "sync": false,
 *   "model_version": "FIBO"
 * }
 */

import { json } from '@lovable/cloud';
import {
  getBriaApiKey,
  getBriaHeaders,
  handleBriaError,
  parseBriaResponse,
  safeLog,
} from './utils';

const BRIA_BASE_URL = 'https://engine.prod.bria-api.com/v2';

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get API key from Lovable secrets
    const apiKey = getBriaApiKey();
    safeLog('image-generate-v2', 'Request received', { hasKey: !!apiKey });

    // Parse and validate request body
    const body = await req.json();
    
    // At least one of prompt, structured_prompt, or images must be provided
    if (!body.prompt && !body.structured_prompt && (!body.images || !Array.isArray(body.images) || body.images.length === 0)) {
      return json({
        error: 'At least one of "prompt", "structured_prompt", or "images" must be provided',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    // Build BRIA API v2 payload
    const payload: Record<string, unknown> = {
      sync: body.sync !== undefined ? body.sync : false,
    };

    if (body.prompt) payload.prompt = body.prompt;
    if (body.images && Array.isArray(body.images)) payload.images = body.images;
    if (body.structured_prompt) {
      // If structured_prompt is a string, parse it; otherwise use as-is
      payload.structured_prompt = typeof body.structured_prompt === 'string'
        ? JSON.parse(body.structured_prompt)
        : body.structured_prompt;
    }
    if (body.negative_prompt) payload.negative_prompt = body.negative_prompt;
    if (body.aspect_ratio) payload.aspect_ratio = body.aspect_ratio;
    if (body.guidance_scale !== undefined) payload.guidance_scale = body.guidance_scale;
    if (body.steps_num !== undefined) payload.steps_num = body.steps_num;
    if (body.seed !== undefined) payload.seed = body.seed;
    if (body.model_version) payload.model_version = body.model_version;
    if (body.ip_signal !== undefined) payload.ip_signal = body.ip_signal;
    if (body.prompt_content_moderation !== undefined) {
      payload.prompt_content_moderation = body.prompt_content_moderation;
    }
    if (body.visual_input_content_moderation !== undefined) {
      payload.visual_input_content_moderation = body.visual_input_content_moderation;
    }
    if (body.visual_output_content_moderation !== undefined) {
      payload.visual_output_content_moderation = body.visual_output_content_moderation;
    }

    safeLog('image-generate-v2', 'Calling BRIA API v2', {
      endpoint: '/image/generate',
      hasPrompt: !!payload.prompt,
      hasStructuredPrompt: !!payload.structured_prompt,
      hasImages: !!payload.images,
      sync: payload.sync,
    });

    // Call BRIA API v2
    const response = await fetch(`${BRIA_BASE_URL}/image/generate`, {
      method: 'POST',
      headers: getBriaHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await parseBriaResponse(response);

    // Extract response data
    const result = (data as { result?: unknown }).result;
    const requestId = (data as { request_id?: string }).request_id || '';
    const statusUrl = (data as { status_url?: string }).status_url;
    const warning = (data as { warning?: string }).warning;

    // Return safe response (never includes API keys)
    return json({
      result: result,
      request_id: requestId,
      status_url: statusUrl,
      warning: warning,
      status: payload.sync ? 'COMPLETED' : 'IN_PROGRESS',
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'image-generate-v2');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}
