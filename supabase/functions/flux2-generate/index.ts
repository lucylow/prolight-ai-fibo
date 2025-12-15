import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Get user ID from authorization header
 */
async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Check if user has sufficient credits
 */
async function checkCredits(userId: string, creditsNeeded: number = 1): Promise<{ allowed: boolean; info?: Record<string, unknown> }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription || !subscription.plan) {
      return { allowed: false, info: { reason: 'no_active_plan' } };
    }

    const plan = subscription.plan;
    const periodStart = subscription.current_period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const periodEnd = subscription.current_period_end || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: usageData } = await supabase
      .from('credit_usage')
      .select('credits_used')
      .eq('user_id', userId)
      .gte('timestamp', periodStart)
      .lt('timestamp', periodEnd);

    const used = usageData?.reduce((sum, r) => sum + (r.credits_used || 0), 0) || 0;
    const remaining = plan.monthly_credit_limit - used;

    if (remaining >= creditsNeeded) {
      return { allowed: true };
    } else {
      return {
        allowed: false,
        info: {
          reason: 'insufficient_credits',
          remaining,
          used,
          limit: plan.monthly_credit_limit,
          required: creditsNeeded,
        },
      };
    }
  } catch (error) {
    console.error('Error checking credits:', error);
    return { allowed: false, info: { reason: 'error_checking_credits' } };
  }
}

/**
 * Record credit usage
 */
async function recordCreditUsage(
  userId: string,
  action: string,
  credits: number = 1,
  relatedRequestId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('credit_usage').insert({
      user_id: userId,
      action,
      credits_used: credits,
      related_request_id: relatedRequestId || null,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error('Error recording credit usage:', error);
  }
}

/**
 * Hash prompt for caching
 */
function hashPrompt(promptJson: Record<string, unknown>, extra: Record<string, unknown> = {}): string {
  const payload = { prompt: promptJson, extra };
  const jsonStr = JSON.stringify(payload, Object.keys(payload).sort());
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonStr);
  
  // Simple hash using Web Crypto API
  return crypto.subtle.digest('SHA-256', data).then(hash => {
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }).then(hash => hash);
}

/**
 * Convert FIBO JSON to FLUX.2 structured prompt format
 */
function convertFiboToFlux2(fiboJson: Record<string, unknown>): Record<string, unknown> {
  const flux2Prompt: Record<string, unknown> = {
    subject: fiboJson.subject || {},
    camera: fiboJson.camera || {},
    lighting: fiboJson.lighting || {},
    render: fiboJson.render || {},
  };

  // Add environment if present
  if (fiboJson.environment) {
    flux2Prompt.environment = fiboJson.environment;
  }

  // Add style if present
  if (fiboJson.style_medium) {
    flux2Prompt.style_medium = fiboJson.style_medium;
  }

  if (fiboJson.artistic_style) {
    flux2Prompt.artistic_style = fiboJson.artistic_style;
  }

  // Add composition if present
  if (fiboJson.composition) {
    flux2Prompt.composition = fiboJson.composition;
  }

  // Add color palette if present
  if (fiboJson.color_palette) {
    flux2Prompt.color_palette = fiboJson.color_palette;
  }

  return flux2Prompt;
}

/**
 * Normalize FLUX.2 API response
 */
function normalizeFlux2Response(data: unknown): {
  image_b64?: string;
  image_url?: string;
  json_prompt?: Record<string, unknown>;
  raw: unknown;
} {
  if (!data || typeof data !== 'object') {
    return { raw: data };
  }

  const response = data as Record<string, unknown>;

  // Handle different response formats
  if (response.images && Array.isArray(response.images) && response.images.length > 0) {
    const first = response.images[0];
    
    if (typeof first === 'string') {
      if (first.startsWith('http')) {
        return { image_url: first, raw: response, json_prompt: response.json_prompt as Record<string, unknown> | undefined };
      }
      if (first.startsWith('data:')) {
        const [, b64] = first.split(',');
        return { image_b64: b64, raw: response, json_prompt: response.json_prompt as Record<string, unknown> | undefined };
      }
      // Assume base64 if long enough
      if (first.length > 100) {
        return { image_b64: first, raw: response, json_prompt: response.json_prompt as Record<string, unknown> | undefined };
      }
      return { image_url: first, raw: response, json_prompt: response.json_prompt as Record<string, unknown> | undefined };
    }
    
    if (typeof first === 'object' && first !== null) {
      const imgObj = first as Record<string, unknown>;
      if (imgObj.b64_json) {
        return { image_b64: imgObj.b64_json as string, raw: response, json_prompt: response.json_prompt as Record<string, unknown> | undefined };
      }
      if (imgObj.url) {
        return { image_url: imgObj.url as string, raw: response, json_prompt: response.json_prompt as Record<string, unknown> | undefined };
      }
    }
  }

  // Direct fields
  if (response.image_url) {
    return { image_url: response.image_url as string, raw: response };
  }
  if (response.b64_image) {
    return { image_b64: response.b64_image as string, raw: response };
  }

  return { raw: response };
}

interface Flux2GenerateRequest {
  prompt_json: Record<string, unknown>;
  seed?: number;
  steps?: number;
  guidance?: number;
  output_format?: string;
  mode?: 'generate' | 'refine' | 'inspire';
  generation_ref?: string;
  instruction?: string;
  locked_fields?: string[];
  reference_image_base64?: string;
  async_job?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed. Only POST requests are supported.',
        errorCode: 'METHOD_NOT_ALLOWED'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    let request: Flux2GenerateRequest;
    try {
      const text = await req.text();
      if (!text || text.trim().length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Request body is required and cannot be empty.',
          errorCode: 'MISSING_BODY'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      request = JSON.parse(text) as Flux2GenerateRequest;
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body.',
        errorCode: 'INVALID_JSON',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields
    if (!request.prompt_json && request.mode !== 'inspire') {
      return new Response(JSON.stringify({ 
        error: 'prompt_json is required for generate mode.',
        errorCode: 'MISSING_PROMPT'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check API key
    const FLUX2_API_KEY = Deno.env.get('FLUX2_API_KEY');
    const FLUX2_API_URL = Deno.env.get('FLUX2_API_URL') || 'https://api.bria.ai/v1/models/flux-2';
    
    if (!FLUX2_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'FLUX2_API_KEY is not configured.',
        errorCode: 'CONFIG_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check credits
    const authHeader = req.headers.get('authorization');
    const userId = await getUserId(authHeader);
    const COST_PER_IMAGE = parseFloat(Deno.env.get('FLUX2_COST_PER_IMAGE') || '0.04');
    const creditsNeeded = 1; // 1 credit per image
    
    if (userId) {
      const creditCheck = await checkCredits(userId, creditsNeeded);
      if (!creditCheck.allowed) {
        return new Response(JSON.stringify({
          error: creditCheck.info?.reason === 'insufficient_credits'
            ? `Insufficient credits. You have ${creditCheck.info.remaining} credits remaining, but ${creditsNeeded} are required.`
            : 'No active subscription plan. Please subscribe to continue using ProLight AI.',
          errorCode: creditCheck.info?.reason === 'insufficient_credits' ? 'INSUFFICIENT_CREDITS' : 'NO_ACTIVE_PLAN',
          details: creditCheck.info,
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Convert FIBO JSON to FLUX.2 format
    const flux2Prompt = request.prompt_json ? convertFiboToFlux2(request.prompt_json) : {};

    // Build payload based on mode
    const mode = request.mode || 'generate';
    const payload: Record<string, unknown> = {
      mode,
      prompt_json: flux2Prompt,
    };

    if (mode === 'generate') {
      if (request.seed !== undefined) {
        payload.seed = request.seed;
      }
      payload.steps = request.steps || 40;
      payload.guidance = request.guidance || 7.5;
      payload.output_format = request.output_format || 'png';
    } else if (mode === 'refine') {
      payload.generation_ref = request.generation_ref;
      payload.instruction = request.instruction;
      payload.locked_fields = request.locked_fields || [];
    } else if (mode === 'inspire') {
      payload.reference_image_base64 = request.reference_image_base64;
      payload.options = {};
    }

    // Call FLUX.2 API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3min timeout

    try {
      const response = await fetch(`${FLUX2_API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FLUX2_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: Record<string, unknown> | null = null;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Ignore parse errors
        }

        if (response.status === 401) {
          return new Response(JSON.stringify({ 
            error: 'FLUX.2 API authentication failed.',
            errorCode: 'AI_AUTH_ERROR'
          }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          return new Response(JSON.stringify({ 
            error: `FLUX.2 API rate limit exceeded. Please try again in ${retryAfter} seconds.`,
            errorCode: 'AI_RATE_LIMIT',
            retryAfter: parseInt(retryAfter)
          }), {
            status: 429,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': retryAfter
            },
          });
        }

        return new Response(JSON.stringify({ 
          error: `FLUX.2 API error: ${errorData?.error?.message || errorText.substring(0, 200) || 'Unknown error'}`,
          errorCode: 'AI_CLIENT_ERROR',
          details: errorData
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const normalized = normalizeFlux2Response(data);

      // If we got base64, we need to store it somewhere or return it
      // For now, we'll return the base64 in the response
      const imageId = crypto.randomUUID();

      // Record credit usage
      if (userId) {
        await recordCreditUsage(
          userId,
          'flux2_generate',
          creditsNeeded,
          imageId,
          {
            mode,
            cost: COST_PER_IMAGE,
            cached: false, // TODO: implement caching
          }
        );
      }

      return new Response(JSON.stringify({
        image_url: normalized.image_url || null,
        image_b64: normalized.image_b64 || null,
        image_id: imageId,
        json_prompt: normalized.json_prompt || flux2Prompt,
        cost: COST_PER_IMAGE,
        generation_metadata: {
          model: 'flux-2',
          mode,
          timestamp: new Date().toISOString(),
          provider: 'bria',
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return new Response(JSON.stringify({ 
          error: 'FLUX.2 API request timed out.',
          errorCode: 'AI_TIMEOUT'
        }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return new Response(JSON.stringify({ 
          error: 'Network error connecting to FLUX.2 API.',
          errorCode: 'AI_NETWORK_ERROR'
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw error;
    }

  } catch (error) {
    console.error('Error in flux2-generate:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
      errorCode: 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

