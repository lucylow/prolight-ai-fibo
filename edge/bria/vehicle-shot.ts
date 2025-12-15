/**
 * Lovable Edge Function: BRIA Vehicle Shot Editing
 * 
 * Vehicle-specific product shot editing operations:
 * - Vehicle shot generation by text
 * - Vehicle segmentation
 * - Reflection generation
 * - Tire refinement
 * - Visual effects (dust, snow, fog, light leaks, lens flare)
 * - Harmonization presets
 * 
 * Secrets required:
 * - BRIA_API_KEY (or PRODUCTION/STAGING)
 * 
 * Usage:
 * POST /edge/bria/vehicle-shot
 * {
 *   "operation": "shot_by_text" | "segment" | "reflections" | "refine_tires" | "apply_effect" | "harmonize" | "complete_enhancement",
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

const BRIA_BASE_URL = 'https://engine.prod.bria-api.com/v1';

const VALID_OPERATIONS = [
  'shot_by_text',
  'segment',
  'reflections',
  'refine_tires',
  'apply_effect',
  'harmonize',
  'complete_enhancement',
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

    validateRequestBody(body, ['operation']);

    const { operation, params = {} } = body;

    if (!VALID_OPERATIONS.includes(operation)) {
      return json({
        error: `Invalid operation. Must be one of: ${VALID_OPERATIONS.join(', ')}`,
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    safeLog('vehicle-shot', `Processing vehicle shot operation: ${operation}`, {
      operation,
      hasParams: !!params && Object.keys(params).length > 0,
    });

    let endpoint = '';
    let payload: Record<string, unknown> = {};

    switch (operation) {
      case 'shot_by_text':
        validateRequestBody(params, ['image_url', 'scene_description']);
        endpoint = '/product/vehicle/shot_by_text';
        payload = {
          image_url: params.image_url,
          scene_description: params.scene_description,
          placement_type: params.placement_type || 'automatic',
          num_results: params.num_results || 4,
          mode: params.mode || 'fast',
          optimize_description: params.optimize_description !== false,
          sync: params.sync || false,
          shot_size: params.shot_size || [1000, 1000],
          content_moderation: params.content_moderation || false,
        };
        if (params.exclude_elements) payload.exclude_elements = params.exclude_elements;
        if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;
        break;

      case 'segment':
        validateRequestBody(params, ['image_url']);
        endpoint = '/product/vehicle/segment';
        payload = { image_url: params.image_url };
        break;

      case 'reflections':
        validateRequestBody(params, ['image_url', 'masks']);
        endpoint = '/product/vehicle/generate_reflections';
        payload = {
          image_url: params.image_url,
          masks: params.masks,
          layers: params.layers || false,
          content_moderation: params.content_moderation || false,
        };
        if (params.seed !== undefined) payload.seed = params.seed;
        break;

      case 'refine_tires':
        validateRequestBody(params, ['image_url', 'masks']);
        endpoint = '/product/vehicle/refine_tires';
        payload = {
          image_url: params.image_url,
          masks: params.masks,
          layers: params.layers || false,
          content_moderation: params.content_moderation || false,
        };
        break;

      case 'apply_effect':
        validateRequestBody(params, ['image_url', 'effect']);
        endpoint = '/product/vehicle/apply_effect';
        payload = {
          image_url: params.image_url,
          effect: params.effect,
          layers: params.layers || false,
          content_moderation: params.content_moderation || false,
        };
        if (params.seed !== undefined) payload.seed = params.seed;
        break;

      case 'harmonize':
        validateRequestBody(params, ['image_url', 'preset']);
        endpoint = '/product/vehicle/harmonize';
        payload = {
          image_url: params.image_url,
          preset: params.preset,
          content_moderation: params.content_moderation || false,
        };
        break;

      case 'complete_enhancement':
        validateRequestBody(params, ['image_url', 'scene_description']);
        // This is a complex workflow - we'll call the backend API instead
        // The backend handles the orchestration
        return json({
          error: 'Complete enhancement should be called via backend API endpoint',
          errorCode: 'USE_BACKEND_API',
        }, { status: 400 });

      default:
        return json({
          error: `Unsupported operation: ${operation}`,
          errorCode: 'UNSUPPORTED_OPERATION',
        }, { status: 400 });
    }

    // Call BRIA Vehicle Shot API
    const response = await fetch(`${BRIA_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getBriaHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const data = await parseBriaResponse(response);

    return json({
      request_id: (data as { request_id?: string }).request_id,
      status: (data as { status?: string }).status || 'COMPLETED',
      data: data,
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'vehicle-shot');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

