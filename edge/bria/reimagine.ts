/**
 * Lovable Edge Function: BRIA Reimagine API
 * 
 * Advanced image editing that generates stylized variations of existing images
 * with structured prompts. Perfect for:
 * - Product packshot variations
 * - Multi-format asset generation
 * - Style transfer with lighting control
 * - Automated crop/aspect ratio variants
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * POST /edge/bria/reimagine
 * {
 *   "asset_id": "bria_asset_id", // or "image_url": "https://..."
 *   "structured_prompt": { // FIBO JSON with lighting/composition }
 *   "prompt": "optional text prompt",
 *   "variations": 3, // number of variations to generate
 *   "sync": false // async by default
 * }
 * 
 * Response:
 * {
 *   "request_id": "abc123",
 *   "status": "IN_PROGRESS",
 *   "data": { // Bria response }
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
    const apiKey = getBriaApiKey();
    const body = await req.json();

    // Validate: need either asset_id or image_url
    if (!body.asset_id && !body.image_url) {
      return json({
        error: 'Either "asset_id" or "image_url" is required',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    // At least one of prompt or structured_prompt should be provided
    if (!body.prompt && !body.structured_prompt) {
      return json({
        error: 'At least one of "prompt" or "structured_prompt" must be provided',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    // Build payload
    const payload: Record<string, unknown> = {
      sync: body.sync || false,
    };

    if (body.asset_id) payload.asset_id = body.asset_id;
    if (body.image_url) payload.image_url = body.image_url;
    if (body.prompt) payload.prompt = body.prompt;
    if (body.structured_prompt) payload.structured_prompt = body.structured_prompt;
    if (body.variations) payload.variations = body.variations;
    if (body.width) payload.width = body.width;
    if (body.height) payload.height = body.height;

    safeLog('reimagine', 'Reimagining image', {
      hasAssetId: !!body.asset_id,
      hasImageUrl: !!body.image_url,
      hasStructuredPrompt: !!body.structured_prompt,
      variations: body.variations || 1,
    });

    // Call BRIA Reimagine API
    const response = await fetch(`${BRIA_BASE_URL}/image/edit/reimagine`, {
      method: 'POST',
      headers: getBriaHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await parseBriaResponse(response);

    return json({
      request_id: (data as { request_id?: string }).request_id,
      status: (data as { status?: string }).status || 'IN_PROGRESS',
      data: data,
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'reimagine');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}
