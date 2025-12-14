/**
 * Lovable Edge Function: BRIA Video Editing
 * 
 * Video editing and generation operations (beta support).
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * POST /edge/bria/video-edit
 * {
 *   "asset_id": "bria_video_asset_id",
 *   "operation": "edit_operation",
 *   "params": { ... }
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

    validateRequestBody(body, ['asset_id', 'operation']);

    const { asset_id, operation, params = {} } = body;

    safeLog('video-edit', 'Processing video edit', {
      operation,
      asset_id: asset_id.substring(0, 20) + '...',
    });

    // Call BRIA Video Editing API
    const response = await fetch(`${BRIA_BASE_URL}/video/edit/${operation}`, {
      method: 'POST',
      headers: getBriaHeaders(apiKey),
      body: JSON.stringify({
        asset_id,
        ...params,
      }),
    });

    const data = await parseBriaResponse(response);

    return json({
      request_id: (data as { request_id?: string }).request_id,
      status: (data as { status?: string }).status || 'IN_PROGRESS',
      data: data,
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'video-edit');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}
