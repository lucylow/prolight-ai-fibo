/**
 * Bria Status SSE Subscription - Supabase Edge Function
 * 
 * Provides Server-Sent Events (SSE) for real-time status updates:
 * GET /bria-status-subscribe/:requestId?sse_token=...
 * 
 * Clients must first obtain an SSE token via POST /bria-status/token
 * 
 * Environment variables required:
 * - SUPABASE_URL (auto-provided)
 * - SUPABASE_SERVICE_ROLE_KEY (auto-provided)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  // Handle CORS preflight
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
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p);
  const requestId = pathParts[pathParts.length - 1];
  const sseToken = url.searchParams.get('sse_token');

  if (!requestId) {
    return new Response(
      JSON.stringify({ error: 'requestId required' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  if (!sseToken) {
    return new Response(
      JSON.stringify({ error: 'sse_token required' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Validate and consume token
    const { data: tokenRow, error: tokenError } = await supabase
      .from('sse_tokens')
      .select('*')
      .eq('token', sseToken)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: 'Invalid sse_token' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Check if token is expired
    if (new Date(tokenRow.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'sse_token expired' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Check if token is already used
    if (tokenRow.used) {
      return new Response(
        JSON.stringify({ error: 'sse_token already used' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Check if token is tied to a specific request_id
    if (tokenRow.request_id && tokenRow.request_id !== requestId) {
      return new Response(
        JSON.stringify({ error: 'sse_token not valid for this request_id' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Mark token as used
    await supabase
      .from('sse_tokens')
      .update({ used: true })
      .eq('token', sseToken);

    // Set up SSE response
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial status if available
        const { data: initialStatus } = await supabase
          .from('bria_status')
          .select('*')
          .eq('request_id', requestId)
          .single();

        if (initialStatus) {
          const encoder = new TextEncoder();
          const data = JSON.stringify({
            initial: true,
            payload: {
              request_id: initialStatus.request_id,
              status: initialStatus.status,
              result: initialStatus.result,
              status_payload: initialStatus.status_payload,
              last_checked: initialStatus.last_checked,
              error: initialStatus.error
            }
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } else {
          const encoder = new TextEncoder();
          const data = JSON.stringify({
            initial: true,
            payload: { request_id: requestId, status: 'UNKNOWN' }
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        // Set up polling to send updates
        let intervalId: number | null = null;
        let lastStatus: string | null = null;

        const pollStatus = async () => {
          try {
            const { data: status } = await supabase
              .from('bria_status')
              .select('*')
              .eq('request_id', requestId)
              .single();

            if (status && status.status !== lastStatus) {
              lastStatus = status.status;
              const encoder = new TextEncoder();
              const data = JSON.stringify({
                request_id: status.request_id,
                status: status.status,
                result: status.result,
                status_payload: status.status_payload,
                last_checked: status.last_checked,
                error: status.error
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));

              // If terminal, stop polling
              if (['COMPLETED', 'ERROR', 'UNKNOWN'].includes(status.status)) {
                if (intervalId !== null) {
                  clearInterval(intervalId);
                }
                controller.close();
              }
            }
          } catch (err) {
            console.error('SSE poll error:', err);
          }
        };

        // Poll every 2 seconds
        intervalId = setInterval(pollStatus, 2000) as unknown as number;

        // Clean up on close
        req.signal.addEventListener('abort', () => {
          if (intervalId !== null) {
            clearInterval(intervalId);
          }
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('SSE error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
