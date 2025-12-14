/**
 * Lovable Edge Function: BRIA Image Editing
 * 
 * Performs various image editing operations using BRIA API:
 * - remove_background
 * - expand
 * - enhance
 * - generative_fill
 * - crop
 * - mask
 * - and more
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * POST /edge/bria/image-edit
 * {
 *   "asset_id": "bria_asset_id",
 *   "operation": "remove_background", // or expand, enhance, etc.
 *   "params": { ... } // operation-specific parameters
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

// Valid image editing operations
const VALID_OPERATIONS = [
  'remove_background',
  'expand',
  'enhance',
  'generative_fill',
  'crop',
  'mask',
  'upscale',
  'color_correction',
  'noise_reduction',
];

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

    // Validate required fields
    validateRequestBody(body, ['asset_id', 'operation']);

    const { asset_id, operation, params = {} } = body;

    // Validate operation
    if (!VALID_OPERATIONS.includes(operation)) {
      return json({
        error: `Invalid operation. Must be one of: ${VALID_OPERATIONS.join(', ')}`,
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    safeLog('image-edit', 'Processing edit request', {
      operation,
      asset_id: asset_id.substring(0, 20) + '...', // Don't log full ID
    });

    // Call BRIA API
    const response = await fetch(`${BRIA_BASE_URL}/image/edit/${operation}`, {
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
    const errorResponse = handleBriaError(error, 'image-edit');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}
