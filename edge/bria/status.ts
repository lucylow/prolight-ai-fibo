/**
 * Lovable Edge Function: BRIA Status Polling
 * 
 * Polls the status of async BRIA API jobs (image generation, editing, etc.)
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * GET /edge/bria/status?request_id=abc123
 * or
 * POST /edge/bria/status
 * { "request_id": "abc123" }
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const apiKey = getBriaApiKey();

    // Get request_id from query params (GET) or body (POST)
    let request_id: string;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      request_id = url.searchParams.get('request_id') || '';
    } else if (req.method === 'POST') {
      const body = await req.json();
      request_id = body.request_id;
    } else {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    if (!request_id) {
      return json({
        error: 'request_id is required',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    safeLog('status', 'Polling job status', {
      request_id: request_id.substring(0, 20) + '...',
    });

    // Call BRIA Status API
    const response = await fetch(`${BRIA_BASE_URL}/status/${request_id}`, {
      method: 'GET',
      headers: getBriaHeaders(apiKey),
    });

    const data = await parseBriaResponse(response);

    return json({
      request_id,
      status: (data as { status?: string }).status || 'UNKNOWN',
      data: data,
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'status');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

