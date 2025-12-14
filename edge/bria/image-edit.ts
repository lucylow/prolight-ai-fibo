/**
 * Lovable Edge Function: BRIA Image Editing API v2
 * 
 * Performs various image editing operations using BRIA API v2:
 * - erase - Remove regions using mask
 * - gen_fill - Generate objects in masked region
 * - remove_background - Remove background (RMBG 2.0)
 * - replace_background - Replace with AI-generated background
 * - erase_foreground - Remove foreground and inpaint background
 * - blur_background - Blur background
 * - expand - Expand image canvas
 * - enhance - Enhance image quality
 * - increase_resolution - Upscale image
 * - crop_foreground - Auto crop to content
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * POST /edge/bria/image-edit
 * {
 *   "operation": "remove_background",
 *   "image": "base64_string_or_url",
 *   "mask": "base64_string_or_url", // for erase, gen_fill, blur_background
 *   "prompt": "text prompt", // for gen_fill, replace_background, expand
 *   ... // operation-specific parameters
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

const BRIA_BASE_URL = 'https://engine.prod.bria-api.com/v2/image/edit';

// Valid image editing operations (v2 endpoints)
const VALID_OPERATIONS = [
  'erase',
  'gen_fill',
  'remove_background',
  'replace_background',
  'erase_foreground',
  'blur_background',
  'expand',
  'enhance',
  'increase_resolution',
  'crop_foreground',
];

// Operations that require a mask
const MASK_REQUIRED_OPERATIONS = ['erase', 'gen_fill', 'blur_background'];

// Operations that require a prompt
const PROMPT_REQUIRED_OPERATIONS = ['gen_fill'];

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
    validateRequestBody(body, ['operation', 'image']);

    const { operation, image, ...params } = body;

    // Validate operation
    if (!VALID_OPERATIONS.includes(operation)) {
      return json({
        error: `Invalid operation. Must be one of: ${VALID_OPERATIONS.join(', ')}`,
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    // Validate mask for operations that require it
    if (MASK_REQUIRED_OPERATIONS.includes(operation) && !params.mask) {
      return json({
        error: `Operation '${operation}' requires a 'mask' parameter`,
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    // Validate prompt for operations that require it
    if (PROMPT_REQUIRED_OPERATIONS.includes(operation) && !params.prompt) {
      return json({
        error: `Operation '${operation}' requires a 'prompt' parameter`,
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    safeLog('image-edit', 'Processing edit request', {
      operation,
      hasImage: !!image,
      hasMask: !!params.mask,
      hasPrompt: !!params.prompt,
    });

    // Build payload for BRIA API
    const payload: Record<string, unknown> = {
      image,
      ...params,
    };

    // Call BRIA API v2 endpoint
    const endpoint = `/${operation}`;
    const response = await fetch(`${BRIA_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getBriaHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await parseBriaResponse(response);

    // Handle both sync (200) and async (202) responses
    const result = {
      request_id: (data as { request_id?: string }).request_id || '',
      status: response.status === 202 ? 'IN_PROGRESS' : 'COMPLETED',
      status_url: (data as { status_url?: string }).status_url,
      result: (data as { result?: unknown }).result,
      data: data,
    };

    return json(result);

  } catch (error) {
    const errorResponse = handleBriaError(error, 'image-edit');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}
