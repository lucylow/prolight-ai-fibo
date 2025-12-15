/**
 * Lovable Edge Function: BRIA Ads Generation
 * 
 * Generates advertisement images using BRIA's Ads API with templates and branding blocks.
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * POST /edge/bria/ads-generate
 * {
 *   "template_id": "optional_template_id",
 *   "branding_blocks": [...],
 *   "prompt": "ad description",
 *   "structured_prompt": { ... },
 *   ...other ad generation parameters
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

    // At least one of prompt or structured_prompt should be provided
    if (!body.prompt && !body.structured_prompt) {
      return json({
        error: 'At least one of "prompt" or "structured_prompt" must be provided',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    safeLog('ads-generate', 'Generating ad', {
      hasTemplate: !!body.template_id,
      hasBranding: !!body.branding_blocks,
      hasPrompt: !!body.prompt,
      hasStructuredPrompt: !!body.structured_prompt,
    });

    // Call BRIA Ads Generation API
    const response = await fetch(`${BRIA_BASE_URL}/ads/generate`, {
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
    const errorResponse = handleBriaError(error, 'ads-generate');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

