/**
 * Lovable Edge Function: BRIA Ads Status Check
 * 
 * Checks the status of a generated ad scene by probing its placeholder URL.
 * Returns whether the scene is ready, failed, or still pending.
 * 
 * Usage:
 * GET /edge/bria/ads-status?url=https://...
 * 
 * Returns:
 * {
 *   "status": "pending" | "ready" | "failed",
 *   "contentLength": number | null,
 *   "statusCode": number | null
 * }
 */

import { json } from '@lovable/cloud';
import { handleBriaError } from './utils';

/**
 * Probe URL content length - try HEAD first, fallback to GET stream
 */
async function probeUrlContentLength(url: string): Promise<{
  ok: boolean;
  contentLength: number | null;
  statusCode: number | null;
}> {
  try {
    // Try HEAD first
    const headResponse = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(15000),
    });
    
    // Check if HEAD request was successful
    if (!headResponse.ok && headResponse.status === 404) {
      // Not available yet
      return {
        ok: false,
        contentLength: null,
        statusCode: 404,
      };
    }
    
    const contentLength = headResponse.headers.get('content-length');
    if (contentLength !== null) {
      return {
        ok: true,
        contentLength: parseInt(contentLength, 10),
        statusCode: headResponse.status,
      };
    }
    
    // If HEAD doesn't provide content-length, try GET but don't download fully
    const getResponse = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(20000),
    });
    
    if (!getResponse.ok && getResponse.status === 404) {
      // Not available yet
      return {
        ok: false,
        contentLength: null,
        statusCode: 404,
      };
    }
    
    const getContentLength = getResponse.headers.get('content-length');
    if (getContentLength !== null) {
      return {
        ok: true,
        contentLength: parseInt(getContentLength, 10),
        statusCode: getResponse.status,
      };
    }
    
    // Unknown content-length but URL responded
    return {
      ok: true,
      contentLength: -1,
      statusCode: getResponse.status,
    };
  } catch (err) {
    // URL not available yet (404) or other error
    // Fetch errors don't have a response property, so we check status differently
    if (err instanceof TypeError && err.message.includes('fetch')) {
      // Network error or CORS issue
      return {
        ok: false,
        contentLength: null,
        statusCode: null,
      };
    }
    // For other errors, assume pending
    return {
      ok: false,
      contentLength: null,
      statusCode: null,
    };
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const sceneUrl = url.searchParams.get('url');

    if (!sceneUrl) {
      return json({
        error: 'url query parameter is required',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    // Basic safety: ensure it's an absolute URL
    try {
      new URL(sceneUrl);
    } catch {
      return json({
        error: 'invalid url format',
        errorCode: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    const probe = await probeUrlContentLength(sceneUrl);

    if (!probe.ok) {
      // Not available yet: pending
      return json({
        status: 'pending',
        contentLength: null,
        statusCode: probe.statusCode,
      });
    }

    const cl = probe.contentLength;
    
    if (cl === 0) {
      // Zero-byte => generation failed for this scene
      return json({
        status: 'failed',
        contentLength: 0,
        statusCode: probe.statusCode,
      });
    }

    // contentLength > 0 or unknown (-1) => ready
    return json({
      status: 'ready',
      contentLength: cl === -1 ? null : cl,
      statusCode: probe.statusCode,
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'ads-status');
    return json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}

