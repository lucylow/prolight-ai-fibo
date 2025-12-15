/**
 * Lovable Edge Function: BRIA Product Shot Editing
 * 
 * Specialized product photography editing operations:
 * - Isolated product shots
 * - Product shadows
 * - Packshots
 * - Background replacement for products
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * POST /edge/bria/product-shot
 * {
 *   "asset_id": "bria_asset_id",
 *   "operation": "isolate" | "add_shadow" | "packshot" | "replace_background",
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

const VALID_OPERATIONS = [
  'isolate',
  'add_shadow',
  'packshot',
  'replace_background',
  'enhance_product',
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

    validateRequestBody(body, ['asset_id', 'operation']);

    const { asset_id, operation, params = {} } = body;

    if (!VALID_OPERATIONS.includes(operation)) {
      return json({
        error: `Invalid operation. Must be one of: ${VALID_OPERATIONS.join(', ')}`,
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    safeLog('product-shot', 'Processing product shot edit', {
      operation,
      asset_id: asset_id.substring(0, 20) + '...',
    });

    // Call BRIA Product Shot API
    const response = await fetch(`${BRIA_BASE_URL}/product/${operation}`, {
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
    const errorResponse = handleBriaError(error, 'product-shot');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

