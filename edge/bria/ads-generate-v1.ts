/**
 * Lovable Edge Function: BRIA Ads Generation API v1
 * 
 * Generates advertisement images using BRIA's Ads Generation API v1 with templates, brands, and smart images.
 * 
 * This endpoint supports:
 * - Template-based ad generation
 * - Brand consistency (logos, colors, fonts)
 * - Smart image backgrounds (lifestyle shots, expand)
 * - Content moderation
 * - Multiple scenes per template
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * POST /edge/bria/ads-generate-v1
 * {
 *   "template_id": "1062",
 *   "brand_id": "167",
 *   "smart_image": {
 *     "input_image_url": "https://...",
 *     "scene": {
 *       "operation": "lifestyle_shot_by_text",
 *       "input": "Outdoor lifestyle background..."
 *     }
 *   },
 *   "elements": [
 *     {
 *       "layer_type": "text",
 *       "content_type": "Heading #1",
 *       "content": "Sale Now!"
 *     }
 *   ],
 *   "content_moderation": false
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

const BRIA_BASE_URL = 'https://engine.prod.bria-api.com/v1';

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

    // Validate template_id is required
    if (!body.template_id) {
      return json({
        error: 'template_id is required',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    safeLog('ads-generate-v1', 'Generating ads', {
      template_id: body.template_id,
      hasBrandId: !!body.brand_id,
      hasSmartImage: !!body.smart_image,
      elementsCount: body.elements?.length || 0,
      contentModeration: body.content_moderation || false,
    });

    // Call BRIA Ads Generation API v1
    const response = await fetch(`${BRIA_BASE_URL}/ads/generate`, {
      method: 'POST',
      headers: getBriaHeaders(apiKey),
      body: JSON.stringify(body),
    });

    const data = await parseBriaResponse(response);

    // v1 API returns { result: [{ id, name, url, resolution }] }
    return json(data);

  } catch (error) {
    const errorResponse = handleBriaError(error, 'ads-generate-v1');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}
