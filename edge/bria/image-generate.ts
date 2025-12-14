/**
 * Lovable Edge Function: BRIA Image Generation
 * 
 * Generates images using BRIA's FIBO API with structured prompts.
 * Supports both text prompts and FIBO JSON structured prompts.
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING for environment-specific keys)
 * 
 * Usage:
 * POST /edge/bria/image-generate
 * {
 *   "prompt": "optional text prompt",
 *   "structured_prompt": { ... }, // FIBO JSON structure
 *   "images": ["url1", "url2"], // optional reference images
 *   "num_results": 1,
 *   "sync": false // async by default
 * }
 */

import { json } from '@lovable/cloud';
import {
  getBriaApiKey,
  getBriaHeaders,
  handleBriaError,
  parseBriaResponse,
  safeLog,
  validateRequestBody,
  type BriaErrorResponse,
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
    safeLog('image-generate', 'Request received', { hasKey: !!apiKey });

    // Parse and validate request body
    const body = await req.json();
    
    // At least one of prompt, structured_prompt, or images must be provided
    if (!body.prompt && !body.structured_prompt && !body.images) {
      return json({
        error: 'At least one of "prompt", "structured_prompt", or "images" must be provided',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    // Build BRIA API payload
    const payload: Record<string, unknown> = {
      num_results: body.num_results || 1,
      sync: body.sync || false,
    };

    if (body.prompt) payload.prompt = body.prompt;
    if (body.structured_prompt) payload.structured_prompt = body.structured_prompt;
    if (body.images && Array.isArray(body.images)) payload.images = body.images;

    // Add any additional parameters
    if (body.width) payload.width = body.width;
    if (body.height) payload.height = body.height;
    if (body.guidance_scale !== undefined) payload.guidance_scale = body.guidance_scale;
    if (body.steps !== undefined) payload.steps = body.steps;

    safeLog('image-generate', 'Calling BRIA API', {
      endpoint: '/image/generate',
      hasPrompt: !!payload.prompt,
      hasStructuredPrompt: !!payload.structured_prompt,
      numResults: payload.num_results,
      sync: payload.sync,
    });

    // Call BRIA API
    const response = await fetch(`${BRIA_BASE_URL}/image/generate`, {
      method: 'POST',
      headers: getBriaHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await parseBriaResponse(response);

    // Return safe response (never includes API keys)
    return json({
      request_id: (data as { request_id?: string }).request_id,
      status: (data as { status?: string }).status || (payload.sync ? 'COMPLETED' : 'IN_PROGRESS'),
      data: data,
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'image-generate');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}
