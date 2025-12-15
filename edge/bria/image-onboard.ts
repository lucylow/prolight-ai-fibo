/**
 * Lovable Edge Function: BRIA Image Onboarding
 * 
 * Onboards an image URL to BRIA's asset system for use in editing/generation workflows.
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * POST /edge/bria/image-onboard
 * {
 *   "image_url": "https://example.com/image.jpg"
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

    validateRequestBody(body, ['image_url']);

    const { image_url } = body;

    // Validate URL format
    try {
      new URL(image_url);
    } catch {
      return json({
        error: 'Invalid image_url format. Must be a valid URL.',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    safeLog('image-onboard', 'Onboarding image', {
      image_url: image_url.substring(0, 50) + '...',
    });

    // Call BRIA Image Onboarding API
    const response = await fetch(`${BRIA_BASE_URL}/image/onboard`, {
      method: 'POST',
      headers: getBriaHeaders(apiKey),
      body: JSON.stringify({ image_url }),
    });

    const data = await parseBriaResponse(response);

    return json({
      asset_id: (data as { asset_id?: string }).asset_id,
      status: (data as { status?: string }).status || 'COMPLETED',
      data: data,
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'image-onboard');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

