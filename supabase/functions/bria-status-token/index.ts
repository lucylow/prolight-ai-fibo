/**
 * Bria Status SSE Token Issuance - Supabase Edge Function
 * 
 * Issues short-lived SSE tokens for secure Server-Sent Events subscriptions:
 * POST /bria-status-token
 * Body: { request_id?: string }
 * 
 * Returns: { sse_token: string, expires_at: string }
 * 
 * Environment variables required:
 * - SUPABASE_URL (auto-provided)
 * - SUPABASE_SERVICE_ROLE_KEY (auto-provided)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

const SSE_TOKEN_EXPIRES_S = 120; // 2 minutes

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
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

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get user from auth header
  const authHeader = req.headers.get('Authorization');
  let userId: string | undefined;
  
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    } catch (err) {
      // Auth is optional but recommended
      console.warn('Auth token validation failed:', err);
    }
  }

  try {
    const body = await req.json();
    const { request_id } = body;

    // Generate token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + SSE_TOKEN_EXPIRES_S * 1000);

    // Insert token into database
    const { data: tokenRow, error: insertError } = await supabase
      .from('sse_tokens')
      .insert({
        token,
        user_id: userId || null,
        request_id: request_id || null,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        sse_token: token,
        expires_at: expiresAt.toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Token issuance error:', error);
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
