/**
 * Lovable Edge Function: BRIA Tailored Generation
 * 
 * Brand-specific image generation using tailored models and image variations.
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * POST /edge/bria/tailored-gen
 * {
 *   "model_id": "brand_specific_model_id",
 *   "prompt": "text prompt",
 *   "structured_prompt": { ... },
 *   "variations": [...],
 *   ...other generation parameters
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

    // Model ID is required for tailored generation
    if (!body.model_id) {
      return json({
        error: 'model_id is required for tailored generation',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    // At least one of prompt or structured_prompt
    if (!body.prompt && !body.structured_prompt) {
      return json({
        error: 'At least one of "prompt" or "structured_prompt" must be provided',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    safeLog('tailored-gen', 'Generating tailored image', {
      model_id: body.model_id.substring(0, 20) + '...',
      hasPrompt: !!body.prompt,
      hasStructuredPrompt: !!body.structured_prompt,
    });

    // Call BRIA Tailored Generation API
    const response = await fetch(`${BRIA_BASE_URL}/text-to-image/tailored/generate`, {
      method: 'POST',
      headers: getBriaHeaders(apiKey),
      body: JSON.stringify(body),
    });

    const data = await parseBriaResponse(response);

    return json({
      request_id: (data as { request_id?: string }).request_id,
      status: (data as { status?: string }).status || 'IN_PROGRESS',
      data: data,
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'tailored-gen');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

