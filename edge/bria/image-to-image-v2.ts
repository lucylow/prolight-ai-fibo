/**
 * Lovable Edge Function: BRIA Image-to-Image Generation API v2
 * 
 * Generates new images inspired by reference images using BRIA's FIBO v2 API.
 * Supports text prompts to guide the transformation.
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING for environment-specific keys)
 * 
 * Usage:
 * POST /edge/bria/image-to-image-v2
 * {
 *   "images": ["url1"], // required reference image(s)
 *   "prompt": "optional text prompt to guide transformation",
 *   "structured_prompt": { ... }, // optional FIBO JSON structure
 *   "negative_prompt": "optional",
 *   "strength": 0.7, // 0.0 to 1.0, how much to change original
 *   "aspect_ratio": "1:1",
 *   "guidance_scale": 5,
 *   "steps_num": 50,
 *   "seed": 12345,
 *   "sync": false
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
    safeLog('image-to-image-v2', 'Request received', { hasKey: !!apiKey });

    // Parse and validate request body
    const body = await req.json();
    
    // Images are required for image-to-image
    if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
      return json({
        error: 'At least one image URL is required for image-to-image generation',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    // Build BRIA API v2 payload
    const payload: Record<string, unknown> = {
      images: body.images,
      sync: body.sync !== undefined ? body.sync : false,
    };

    if (body.prompt) payload.prompt = body.prompt;
    if (body.structured_prompt) {
      payload.structured_prompt = typeof body.structured_prompt === 'string'
        ? JSON.parse(body.structured_prompt)
        : body.structured_prompt;
    }
    if (body.negative_prompt) payload.negative_prompt = body.negative_prompt;
    if (body.strength !== undefined) payload.strength = body.strength;
    if (body.aspect_ratio) payload.aspect_ratio = body.aspect_ratio;
    if (body.guidance_scale !== undefined) payload.guidance_scale = body.guidance_scale;
    if (body.steps_num !== undefined) payload.steps_num = body.steps_num;
    if (body.seed !== undefined) payload.seed = body.seed;

    safeLog('image-to-image-v2', 'Calling BRIA API v2', {
      endpoint: '/image/generate',
      hasPrompt: !!payload.prompt,
      hasStructuredPrompt: !!payload.structured_prompt,
      numImages: body.images.length,
      sync: payload.sync,
    });

    // Call BRIA API v2 (same endpoint as text-to-image, but with images)
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

    // Return safe response
    return json({
      result: result,
      request_id: requestId,
      status_url: statusUrl,
      warning: warning,
      status: payload.sync ? 'COMPLETED' : 'IN_PROGRESS',
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'image-to-image-v2');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

