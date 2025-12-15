/**
 * Lovable Edge Function: BRIA Structured Prompt Generation
 * 
 * Generates detailed FIBO JSON schemas from short text descriptions or images.
 * This implements the decoupled workflow recommended by Bria:
 * 1. Generate structured prompt from intent
 * 2. Edit/refine the JSON
 * 3. Pass to image generation
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING for environment-specific keys)
 * 
 * Usage:
 * POST /edge/bria/structured-prompt
 * {
 *   "prompt": "silver lamp with soft butterfly lighting",
 *   "images": ["url1", "url2"], // optional reference images
 *   "sync": true // whether to wait for completion
 * }
 * 
 * Response:
 * {
 *   "request_id": "abc123", // if async
 *   "status": "COMPLETED",
 *   "structured_prompt": { // full FIBO JSON }
 *   "data": { // full Bria response }
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
    safeLog('structured-prompt', 'Request received', { hasKey: !!apiKey });

    // Parse and validate request body
    const body = await req.json();
    
    // At least one of prompt or images must be provided
    if (!body.prompt && (!body.images || !Array.isArray(body.images) || body.images.length === 0)) {
      return json({
        error: 'At least one of "prompt" or "images" must be provided',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    // Build BRIA API payload
    const payload: Record<string, unknown> = {
      sync: body.sync !== undefined ? body.sync : true, // Default to sync for prompt generation
    };

    if (body.prompt) payload.prompt = body.prompt;
    if (body.images && Array.isArray(body.images)) payload.images = body.images;

    // Add any additional parameters
    if (body.style_hint) payload.style_hint = body.style_hint;
    if (body.composition_hint) payload.composition_hint = body.composition_hint;

    safeLog('structured-prompt', 'Calling BRIA API', {
      endpoint: '/structured_prompt/generate',
      hasPrompt: !!payload.prompt,
      hasImages: !!payload.images,
      sync: payload.sync,
    });

    // Call BRIA Structured Prompt Generation API
    const response = await fetch(`${BRIA_BASE_URL}/structured_prompt/generate`, {
      method: 'POST',
      headers: getBriaHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await parseBriaResponse(response);

    // Extract structured prompt from response
    const structuredPrompt = (data as { structured_prompt?: unknown }).structured_prompt;

    // Return safe response (never includes API keys)
    return json({
      request_id: (data as { request_id?: string }).request_id,
      status: (data as { status?: string }).status || (payload.sync ? 'COMPLETED' : 'IN_PROGRESS'),
      structured_prompt: structuredPrompt,
      data: data,
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'structured-prompt');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

