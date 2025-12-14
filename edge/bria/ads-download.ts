/**
 * Lovable Edge Function: BRIA Ads Download Proxy
 * 
 * Proxies the final generated ad image bytes to the client.
 * This avoids exposing API tokens and handles CORS issues.
 * 
 * Usage:
 * GET /edge/bria/ads-download?url=https://...
 * 
 * Returns: Image bytes with proper Content-Type headers
 */

import { handleBriaError } from './utils';

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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
      return new Response(JSON.stringify({
        error: 'url query parameter is required',
        errorCode: 'VALIDATION_ERROR',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Basic safety: ensure it's an absolute URL
    try {
      new URL(imageUrl);
    } catch {
      return new Response(JSON.stringify({
        error: 'invalid url format',
        errorCode: 'VALIDATION_ERROR',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch image from Bria
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(JSON.stringify({ error: 'Image not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Get image data
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Return image with proper headers
    return new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageData.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    const errorResponse = handleBriaError(error, 'ads-download');
    return new Response(JSON.stringify(errorResponse), {
      status: errorResponse.statusCode || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
