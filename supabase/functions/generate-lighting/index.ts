import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { createAIGatewayClientFromEnv, AIGatewayErrorClass } from "../_shared/lovable-ai-gateway-client.ts";
import { createErrorResponseWithLogging } from "../_shared/error-handling.ts";

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
async function checkCredits(userId: string, creditsNeeded: number = 1): Promise<{ allowed: boolean; info?: any }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get active subscription and plan
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

    // Calculate credits used in period
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
    // Don't throw - credit recording failure shouldn't break the request
  }
}

interface LightSettings {
  direction: string;
  intensity: number;
  colorTemperature: number;
  softness: number;
  distance: number;
  enabled: boolean;
}

interface SceneRequest {
  subjectDescription: string;
  environment: string;
  lightingSetup: Record<string, LightSettings>;
  cameraSettings: {
    shotType: string;
    cameraAngle: string;
    fov: number;
    lensType: string;
    aperture: string;
  };
  stylePreset: string;
  enhanceHDR: boolean;
  negativePrompt?: string;
}

// Professional lighting style definitions
const LIGHTING_STYLES: Record<string, { ratioRange: [number, number]; description: string }> = {
  high_contrast_dramatic: { ratioRange: [8.0, Infinity], description: "Dramatic high-contrast" },
  dramatic: { ratioRange: [4.0, 8.0], description: "Strong dramatic shadows" },
  classical_portrait: { ratioRange: [2.0, 4.0], description: "Classical balanced" },
  soft_lighting: { ratioRange: [1.5, 2.0], description: "Soft and flattering" },
  flat_lighting: { ratioRange: [1.0, 1.5], description: "Even flat lighting" },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      const errorResponse = createErrorResponseWithLogging(
        new Error('Method not allowed. Only POST requests are supported.'),
        {
          functionName: 'generate-lighting',
          action: 'validateMethod',
          errorCode: 'METHOD_NOT_ALLOWED',
          statusCode: 405,
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    let sceneRequest: SceneRequest;
    try {
      const text = await req.text();
      if (!text || text.trim().length === 0) {
        const errorResponse = createErrorResponseWithLogging(
          new Error('Request body is required and cannot be empty.'),
          {
            functionName: 'generate-lighting',
            action: 'parseBody',
            errorCode: 'MISSING_BODY',
            statusCode: 400,
          }
        );
        return new Response(JSON.stringify(errorResponse), {
          status: errorResponse.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const parsed = JSON.parse(text);
      sceneRequest = parsed as SceneRequest;
    } catch (parseError) {
      const errorResponse = createErrorResponseWithLogging(parseError, {
        functionName: 'generate-lighting',
        action: 'parseBody',
        errorCode: 'INVALID_JSON',
        statusCode: 400,
        metadata: {
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        },
      });
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields
    if (!sceneRequest.subjectDescription || typeof sceneRequest.subjectDescription !== 'string' || sceneRequest.subjectDescription.trim().length === 0) {
      const errorResponse = createErrorResponseWithLogging(
        new Error('subjectDescription is required and must be a non-empty string.'),
        {
          functionName: 'generate-lighting',
          action: 'validateFields',
          errorCode: 'MISSING_SUBJECT_DESCRIPTION',
          statusCode: 400,
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!sceneRequest.environment || typeof sceneRequest.environment !== 'string' || sceneRequest.environment.trim().length === 0) {
      const errorResponse = createErrorResponseWithLogging(
        new Error('environment is required and must be a non-empty string.'),
        {
          functionName: 'generate-lighting',
          action: 'validateFields',
          errorCode: 'MISSING_ENVIRONMENT',
          statusCode: 400,
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!sceneRequest.lightingSetup || typeof sceneRequest.lightingSetup !== 'object') {
      const errorResponse = createErrorResponseWithLogging(
        new Error('lightingSetup is required and must be an object.'),
        {
          functionName: 'generate-lighting',
          action: 'validateFields',
          errorCode: 'MISSING_LIGHTING_SETUP',
          statusCode: 400,
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate lightingSetup has at least one light
    const lightingKeys = Object.keys(sceneRequest.lightingSetup);
    if (lightingKeys.length === 0) {
      const errorResponse = createErrorResponseWithLogging(
        new Error('lightingSetup must contain at least one light configuration.'),
        {
          functionName: 'generate-lighting',
          action: 'validateFields',
          errorCode: 'EMPTY_LIGHTING_SETUP',
          statusCode: 400,
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate cameraSettings
    if (!sceneRequest.cameraSettings || typeof sceneRequest.cameraSettings !== 'object') {
      const errorResponse = createErrorResponseWithLogging(
        new Error('cameraSettings is required and must be an object.'),
        {
          functionName: 'generate-lighting',
          action: 'validateFields',
          errorCode: 'MISSING_CAMERA_SETTINGS',
          statusCode: 400,
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requiredCameraFields = ['shotType', 'cameraAngle', 'fov', 'lensType', 'aperture'];
    for (const field of requiredCameraFields) {
      if (!sceneRequest.cameraSettings[field]) {
        const errorResponse = createErrorResponseWithLogging(
          new Error(`cameraSettings.${field} is required.`),
          {
            functionName: 'generate-lighting',
            action: 'validateFields',
            errorCode: 'MISSING_CAMERA_FIELD',
            statusCode: 400,
            metadata: { field },
          }
        );
        return new Response(JSON.stringify(errorResponse), {
          status: errorResponse.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate numeric fields
    if (typeof sceneRequest.cameraSettings.fov !== 'number' || sceneRequest.cameraSettings.fov <= 0) {
      const errorResponse = createErrorResponseWithLogging(
        new Error('cameraSettings.fov must be a positive number.'),
        {
          functionName: 'generate-lighting',
          action: 'validateFields',
          errorCode: 'INVALID_FOV',
          statusCode: 400,
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate string lengths
    const MAX_LENGTH = 5000;
    if (sceneRequest.subjectDescription.length > MAX_LENGTH) {
      const errorResponse = createErrorResponseWithLogging(
        new Error(`subjectDescription exceeds maximum length of ${MAX_LENGTH} characters.`),
        {
          functionName: 'generate-lighting',
          action: 'validateLength',
          errorCode: 'FIELD_TOO_LONG',
          statusCode: 400,
          metadata: { field: 'subjectDescription', length: sceneRequest.subjectDescription.length, maxLength: MAX_LENGTH },
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Received scene request:", JSON.stringify(sceneRequest));

    // Initialize AI Gateway client
    let aiClient;
    try {
      aiClient = createAIGatewayClientFromEnv({
        timeout: 60000, // 60s timeout for image generation
        retries: 2,
        retryDelay: 1000,
      });
    } catch (error) {
      if (error instanceof AIGatewayErrorClass) {
        const errorResponse = createErrorResponseWithLogging(error, {
          functionName: 'generate-lighting',
          action: 'initializeAIClient',
          errorCode: error.errorCode,
          statusCode: error.statusCode,
          retryable: error.retryable,
          retryAfter: error.retryAfter,
          metadata: error.details,
        });
        return new Response(JSON.stringify(errorResponse), {
          status: errorResponse.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorResponse = createErrorResponseWithLogging(error, {
        functionName: 'generate-lighting',
        action: 'initializeAIClient',
        errorCode: 'CLIENT_INIT_ERROR',
        statusCode: 500,
      });
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check credits before generation
    const authHeader = req.headers.get('authorization');
    const userId = await getUserId(authHeader);
    
    if (userId) {
      // Calculate credits needed (1 base credit + additional for HDR)
      const creditsNeeded = sceneRequest.enhanceHDR ? 2 : 1;
      const creditCheck = await checkCredits(userId, creditsNeeded);
      
      if (!creditCheck.allowed) {
        const errorMessage = creditCheck.info?.reason === 'insufficient_credits'
          ? `Insufficient credits. You have ${creditCheck.info.remaining} credits remaining, but ${creditsNeeded} are required.`
          : 'No active subscription plan. Please subscribe to continue using ProLight AI.';
        const errorResponse = createErrorResponseWithLogging(
          new Error(errorMessage),
          {
            functionName: 'generate-lighting',
            action: 'checkCredits',
            errorCode: creditCheck.info?.reason === 'insufficient_credits' ? 'INSUFFICIENT_CREDITS' : 'NO_ACTIVE_PLAN',
            statusCode: 402,
            retryable: false,
            metadata: creditCheck.info,
          }
        );
        return new Response(JSON.stringify(errorResponse), {
          status: errorResponse.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Optional: Allow unauthenticated requests for demo (remove in production)
      console.warn('Warning: Request without authentication - credits not checked');
    }

    // Build FIBO-style JSON from lighting setup
    const fiboJson = buildFiboJson(sceneRequest);
    console.log("Built FIBO JSON:", JSON.stringify(fiboJson));

    // Calculate comprehensive lighting analysis
    const lightingAnalysis = analyzeLighting(sceneRequest.lightingSetup, sceneRequest.stylePreset);
    console.log("Lighting analysis:", JSON.stringify(lightingAnalysis));

    // Generate professional image prompt with detailed lighting specs
    const imagePrompt = buildProfessionalImagePrompt(sceneRequest, fiboJson, lightingAnalysis);
    console.log("Image prompt:", imagePrompt);

    // Generate image using AI Gateway client
    let imageUrl: string | undefined;
    let textContent: string = "";
    try {
      const imageResult = await aiClient.generateImage(
        imagePrompt,
        "google/gemini-2.5-flash-image-preview"
      );
      imageUrl = imageResult.imageUrl;
      textContent = imageResult.textContent;
    } catch (error) {
      if (error instanceof AIGatewayErrorClass) {
        const errorResponse = createErrorResponseWithLogging(error, {
          functionName: 'generate-lighting',
          action: 'generateImage',
          errorCode: error.errorCode,
          statusCode: error.statusCode,
          retryable: error.retryable,
          retryAfter: error.retryAfter,
          metadata: error.details,
        });
        return new Response(JSON.stringify(errorResponse), {
          status: errorResponse.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorResponse = createErrorResponseWithLogging(error, {
        functionName: 'generate-lighting',
        action: 'generateImage',
        errorCode: 'IMAGE_GENERATION_ERROR',
        statusCode: 500,
      });
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate that we got an image
    if (!imageUrl) {
      const errorResponse = createErrorResponseWithLogging(
        new Error("AI service did not generate an image."),
        {
          functionName: 'generate-lighting',
          action: 'validateImage',
          errorCode: 'AI_NO_IMAGE',
          statusCode: 502,
          retryable: true,
          metadata: { textContent: textContent?.substring(0, 200) },
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const imageId = crypto.randomUUID();

    // Record credit usage after successful generation
    if (userId) {
      const creditsNeeded = sceneRequest.enhanceHDR ? 2 : 1;
      await recordCreditUsage(
        userId,
        'generate_image',
        creditsNeeded,
        imageId,
        {
          enhanceHDR: sceneRequest.enhanceHDR,
          lighting_style: lightingAnalysis.lightingStyle,
        }
      );
    }

    return new Response(JSON.stringify({
      image_url: imageUrl || null,
      image_id: imageId,
      fibo_json: fiboJson,
      lighting_analysis: lightingAnalysis,
      generation_metadata: {
        model: "google/gemini-2.5-flash-image-preview",
        prompt_summary: textContent.substring(0, 200),
        lighting_style: lightingAnalysis.lightingStyle,
        key_fill_ratio: lightingAnalysis.keyFillRatio,
        professional_rating: lightingAnalysis.professionalRating,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorResponse = createErrorResponseWithLogging(error, {
      functionName: 'generate-lighting',
      action: 'mainHandler',
      metadata: {
        requestMethod: req.method,
        hasBody: !!req.body,
      },
    });
    return new Response(JSON.stringify(errorResponse), {
      status: errorResponse.statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Build comprehensive FIBO JSON leveraging enhanced architecture
 * Uses long structured prompts (~1000 words) matching FIBO training format
 * Leverages DimFusion conditioning and JSON-native disentangled control
 */
function buildFiboJson(request: SceneRequest) {
  const { lightingSetup, cameraSettings, subjectDescription, environment } = request;

  // Build comprehensive lighting structure with detailed parameters
  const lightingJson: Record<string, Record<string, unknown>> = {};
  for (const [type, settings] of Object.entries(lightingSetup)) {
    if (settings.enabled) {
      // Enhanced lighting description matching FIBO's training format
      lightingJson[`${type}_light`] = {
        type: "area", // Professional area light
        direction: settings.direction,
        intensity: settings.intensity,
        color_temperature: settings.colorTemperature,
        color_kelvin: settings.colorTemperature,
        softness: settings.softness,
        distance: settings.distance,
        falloff: "inverse_square",
        // Additional parameters for better conditioning
        quality: settings.softness > 0.6 ? "soft_diffused" : settings.softness < 0.3 ? "hard_crisp" : "medium",
        temperature_description: settings.colorTemperature < 4500 ? "warm_tungsten" : 
                                 settings.colorTemperature > 6000 ? "cool_daylight" : "neutral_daylight"
      };
    }
  }

  // Extract color temperatures for white balance
  const keyTemp = lightingSetup.key?.colorTemperature || 5600;
  const temps: number[] = [];
  if (lightingSetup.key?.enabled) temps.push(lightingSetup.key.colorTemperature);
  if (lightingSetup.fill?.enabled) temps.push(lightingSetup.fill.colorTemperature);
  if (lightingSetup.rim?.enabled) temps.push(lightingSetup.rim.colorTemperature);
  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 5600;
  
  // Build comprehensive subject with detailed attributes (FIBO training format)
  const subjectAttributes = [
    "professionally lit",
    "high quality",
    "detailed",
    "sharp focus",
    "expert lighting",
    "studio quality",
    "magazine editorial standard"
  ];
  
  // Add style-specific attributes
  if (request.stylePreset?.includes("fashion")) {
    subjectAttributes.push("editorial fashion", "runway quality", "high-end commercial");
  } else if (request.stylePreset?.includes("beauty")) {
    subjectAttributes.push("beauty portrait", "flattering lighting", "skin texture detail");
  } else if (request.stylePreset?.includes("product")) {
    subjectAttributes.push("product photography", "commercial grade", "catalog quality");
  }
  
  // Add lighting-specific attributes
  if (lightingSetup.key?.enabled) {
    if (lightingSetup.key.softness > 0.7) {
      subjectAttributes.push("soft diffused lighting", "gradual shadow transitions");
    } else if (lightingSetup.key.softness < 0.3) {
      subjectAttributes.push("dramatic hard lighting", "defined shadow edges");
    }
  }
  
  // Build detailed action description
  let action = "posed for professional photograph";
  if (request.stylePreset?.includes("fashion")) {
    action = "posed confidently for high-fashion editorial photograph, displaying garment details and silhouette with professional model composure";
  } else if (request.stylePreset?.includes("beauty")) {
    action = "posed naturally for beauty portrait, with attention to skin texture, facial features, and flattering angles";
  } else if (request.stylePreset?.includes("product")) {
    action = "displayed prominently for commercial product photography, showcasing design details, materials, and professional presentation";
  }
  
  // Build comprehensive environment description
  const isOutdoor = environment.toLowerCase().includes("outdoor") || 
                    environment.toLowerCase().includes("natural");
  let lightingConditions = "professional studio";
  if (isOutdoor) {
    lightingConditions = "natural daylight with controlled studio lighting enhancement";
  } else {
    lightingConditions = "controlled professional studio environment with precise lighting setup";
  }
  
  // Determine atmosphere based on lighting
  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  const ratio = key?.enabled ? key.intensity / Math.max(fill?.enabled ? fill.intensity : 0.1, 0.1) : 2.0;
  let atmosphere = "controlled";
  if (ratio > 5) {
    atmosphere = "dramatic and moody";
  } else if (ratio < 1.5) {
    atmosphere = "soft and even";
  } else {
    atmosphere = "professional and balanced";
  }
  
  return {
    subject: {
      main_entity: subjectDescription,
      attributes: subjectAttributes,
      action: action,
      mood: determineMoodFromLighting(lightingSetup),
      emotion: determineMoodFromLighting(lightingSetup).includes("dramatic") ? "intense" : 
               determineMoodFromLighting(lightingSetup).includes("warm") ? "welcoming" : "professional"
    },
    environment: {
      setting: environment,
      time_of_day: isOutdoor ? "daylight" : "controlled lighting",
      lighting_conditions: lightingConditions,
      atmosphere: atmosphere,
      interior_style: isOutdoor ? undefined : "professional photography studio",
      weather: isOutdoor ? "clear" : undefined
    },
    camera: {
      shot_type: cameraSettings.shotType,
      camera_angle: cameraSettings.cameraAngle,
      fov: cameraSettings.fov,
      lens_type: cameraSettings.lensType,
      aperture: cameraSettings.aperture,
      focus_distance_m: calculateFocusDistance(cameraSettings.fov, cameraSettings.shotType),
      pitch: 0,
      yaw: 0,
      roll: 0,
      seed: Math.floor(Math.random() * 1000000)
    },
    lighting: lightingJson,
    style_medium: "photograph",
    artistic_style: request.stylePreset || "professional studio photography",
    color_palette: {
      white_balance: `${Math.round(avgTemp)}K`,
      mood: avgTemp < 4000 ? "warm" : avgTemp > 6500 ? "cool" : "neutral",
      saturation: 1.0,
      contrast: 1.0
    },
    composition: {
      rule_of_thirds: true,
      framing: "professional composition",
      depth: getDepthOfField(cameraSettings.aperture).includes("shallow") ? "shallow" :
             getDepthOfField(cameraSettings.aperture).includes("deep") ? "deep" : "medium",
      negative_space: 0.2,
      leading_lines: ["subject focus", "lighting direction"],
      depth_layers: ["foreground", "subject", "background"]
    },
    materials: {
      surface_reflectivity: lightingSetup.key?.softness ? (1.0 - lightingSetup.key.softness) * 0.3 : 0.15,
      subsurface_scattering: lightingSetup.key?.softness && lightingSetup.key.softness > 0.6 ? true : false,
      specular_highlights: lightingSetup.key?.intensity ? lightingSetup.key.intensity * 0.8 : 0.5,
      material_response: "photorealistic"
    },
    enhancements: {
      hdr: request.enhanceHDR,
      professional_grade: true,
      color_fidelity: true,
      detail_enhancement: true,
      noise_reduction: true,
      contrast_enhance: 1.0
    },
    render: {
      resolution: [2048, 2048],
      color_space: "sRGB",
      bit_depth: request.enhanceHDR ? 16 : 8,
      samples: request.enhanceHDR ? 256 : 128,
      denoiser: "professional"
    },
    meta: {
      source: "prolight-ai-enhanced",
      version: "2.0",
      fibo_architecture: "8B-DiT-flow-matching",
      text_encoder: "SmolLM3-3B",
      conditioning: "DimFusion",
      deterministic: true
    },
    negative_prompt: request.negativePrompt || "blurry, low quality, overexposed, underexposed, harsh shadows"
  };
}

/**
 * Calculate focus distance based on FOV and shot type
 */
function calculateFocusDistance(fov: number, shotType: string): number {
  const shotTypeLower = shotType.toLowerCase();
  
  if (shotTypeLower.includes("close")) return 0.5;
  if (shotTypeLower.includes("medium")) return 1.5;
  if (shotTypeLower.includes("wide")) return 3.0;
  
  if (fov < 30) return 2.0; // Telephoto
  if (fov > 70) return 1.0; // Wide angle
  
  return 1.5; // Standard
}

interface LightingAnalysis {
  keyFillRatio: number;
  lightingStyle: string;
  professionalRating: number;
  [key: string]: unknown;
}

function buildProfessionalImagePrompt(request: SceneRequest, fiboJson: Record<string, unknown>, analysis: LightingAnalysis): string {
  const { lightingSetup, cameraSettings } = request;
  
  // Build detailed lighting description
  let lightingDesc = "";
  
  if (lightingSetup.key?.enabled) {
    const key = lightingSetup.key;
    const tempDesc = key.colorTemperature < 4500 ? "warm" : key.colorTemperature > 6000 ? "cool" : "neutral";
    const softnessDesc = key.softness > 0.6 ? "soft diffused" : key.softness < 0.3 ? "hard crisp" : "medium";
    lightingDesc += `Key light: ${Math.round(key.intensity * 100)}% intensity, ${softnessDesc} quality, ${tempDesc} ${key.colorTemperature}K, positioned ${key.direction}. `;
  }
  
  if (lightingSetup.fill?.enabled) {
    const fill = lightingSetup.fill;
    lightingDesc += `Fill light: ${Math.round(fill.intensity * 100)}% intensity (${analysis.keyFillRatio}:1 ratio), ${fill.softness > 0.5 ? "soft" : "medium"} from ${fill.direction}. `;
  }
  
  if (lightingSetup.rim?.enabled) {
    const rim = lightingSetup.rim;
    const rimTemp = rim.colorTemperature < 4000 ? "warm tungsten" : "neutral";
    lightingDesc += `Rim/hair light: ${Math.round(rim.intensity * 100)}% intensity, ${rimTemp} ${rim.colorTemperature}K, ${rim.direction} for edge separation. `;
  }
  
  if (lightingSetup.ambient?.enabled) {
    lightingDesc += `Ambient fill: ${Math.round(lightingSetup.ambient.intensity * 100)}% for shadow detail. `;
  }

  // Build camera description
  const dofDesc = getDepthOfField(cameraSettings.aperture);
  
  // Construct the professional prompt
  return `Generate a professional studio photograph with expert-level lighting control:

SUBJECT: ${request.subjectDescription}
ENVIRONMENT: ${request.environment}

CAMERA SETUP:
- Shot type: ${cameraSettings.shotType}
- Angle: ${cameraSettings.cameraAngle}
- Lens: ${cameraSettings.lensType} lens at ${cameraSettings.aperture}
- Depth of field: ${dofDesc}

LIGHTING (${analysis.lightingStyle.replace(/_/g, ' ')} style, ${analysis.keyFillRatio}:1 key-to-fill ratio):
${lightingDesc}

QUALITY: Professional photography, ${request.stylePreset || 'clean editorial'} style, sharp focus on subject, natural skin tones, ${request.enhanceHDR ? 'HDR enhanced dynamic range' : 'balanced exposure'}.

Create a photorealistic, magazine-quality studio image with precise lighting matching a professional ${analysis.lightingStyle.replace(/_/g, ' ')} setup.`;
}

function determineMoodFromLighting(lightingSetup: Record<string, LightSettings>): string {
  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  
  if (!key?.enabled) return "ambient";
  
  const ratio = key.intensity / Math.max(fill?.enabled ? fill.intensity : 0.1, 0.1);
  const avgTemp = key.colorTemperature;
  
  if (ratio > 5 && avgTemp < 4500) return "dramatic warm";
  if (ratio > 5) return "dramatic";
  if (ratio < 1.5 && avgTemp > 5500) return "clean and bright";
  if (avgTemp < 4000) return "warm and intimate";
  if (avgTemp > 6500) return "cool and modern";
  return "professional and balanced";
}

function determineLightingStyleName(lightingSetup: Record<string, LightSettings>): string {
  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  
  if (!key?.enabled) return "ambient";
  
  const ratio = key.intensity / Math.max(fill?.enabled ? fill.intensity : 0.1, 0.1);
  
  if (ratio >= 8) return "high_contrast_dramatic";
  if (ratio >= 4) return "dramatic";
  if (ratio >= 2) return "classical_portrait";
  if (ratio >= 1.5) return "soft_lighting";
  return "flat_lighting";
}

function getDepthOfField(aperture: string): string {
  const fNumber = parseFloat(aperture.replace('f/', ''));
  if (fNumber <= 2) return "very shallow, strong bokeh";
  if (fNumber <= 2.8) return "shallow, pleasing bokeh";
  if (fNumber <= 4) return "moderate, subject isolation";
  if (fNumber <= 5.6) return "medium depth";
  return "deep, most in focus";
}

function analyzeLighting(lightingSetup: Record<string, LightSettings>, stylePreset?: string) {
  if (!lightingSetup || typeof lightingSetup !== 'object') {
    throw new Error('Invalid lightingSetup: must be an object');
  }

  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  const rim = lightingSetup.rim;
  const ambient = lightingSetup.ambient;

  // Validate and normalize intensities
  const keyIntensity = (key?.enabled && typeof key.intensity === 'number' && !isNaN(key.intensity))
    ? Math.max(0, Math.min(1, key.intensity))
    : 0;
  const fillIntensity = (fill?.enabled && typeof fill.intensity === 'number' && !isNaN(fill.intensity))
    ? Math.max(0, Math.min(1, fill.intensity))
    : 0.1;
  
  const keyFillRatio = keyIntensity / Math.max(fillIntensity, 0.1);
  
  if (!isFinite(keyFillRatio) || isNaN(keyFillRatio)) {
    console.warn("Invalid keyFillRatio calculated, using default");
    return {
      keyFillRatio: 2.0,
      lightingStyle: "classical_portrait",
      contrastScore: 0.5,
      totalExposure: 0.8,
      colorTemperature: { average: 5600, warmth: "neutral" },
      professionalRating: 7.0,
      recommendations: ["Please check your lighting configuration"]
    };
  }
  
  // Determine lighting style
  let lightingStyle = "classical_portrait";
  if (keyFillRatio >= 8) lightingStyle = "high_contrast_dramatic";
  else if (keyFillRatio >= 4) lightingStyle = "dramatic";
  else if (keyFillRatio >= 2) lightingStyle = "classical_portrait";
  else if (keyFillRatio >= 1.5) lightingStyle = "soft_lighting";
  else lightingStyle = "flat_lighting";

  // Calculate contrast score with validation
  const intensities = [
    (key?.enabled && typeof key.intensity === 'number' && !isNaN(key.intensity)) ? Math.max(0, Math.min(1, key.intensity)) : 0,
    (fill?.enabled && typeof fill.intensity === 'number' && !isNaN(fill.intensity)) ? Math.max(0, Math.min(1, fill.intensity)) : 0,
    (rim?.enabled && typeof rim.intensity === 'number' && !isNaN(rim.intensity)) ? Math.max(0, Math.min(1, rim.intensity)) : 0,
    (ambient?.enabled && typeof ambient.intensity === 'number' && !isNaN(ambient.intensity)) ? Math.max(0, Math.min(1, ambient.intensity)) : 0
  ].filter(i => i > 0 && isFinite(i));

  const maxIntensity = Math.max(...intensities, 0.1);
  const minIntensity = Math.min(...intensities, 0);
  const contrastScore = intensities.length > 1 ? (maxIntensity - minIntensity) / maxIntensity : 0.5;

  const totalExposure = intensities.reduce((a, b) => a + b, 0);

  // Color temperature analysis with validation
  const temps = [
    (key?.enabled && typeof key.colorTemperature === 'number' && !isNaN(key.colorTemperature)) 
      ? Math.max(1000, Math.min(10000, key.colorTemperature)) : null,
    (fill?.enabled && typeof fill.colorTemperature === 'number' && !isNaN(fill.colorTemperature)) 
      ? Math.max(1000, Math.min(10000, fill.colorTemperature)) : null,
    (rim?.enabled && typeof rim.colorTemperature === 'number' && !isNaN(rim.colorTemperature)) 
      ? Math.max(1000, Math.min(10000, rim.colorTemperature)) : null,
  ].filter(t => t !== null && isFinite(t)) as number[];

  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 5600;

  // Calculate professional rating based on context
  const styleContext = stylePreset?.includes("dramatic") ? "dramatic" : 
                       stylePreset?.includes("fashion") ? "fashion" : 
                       stylePreset?.includes("beauty") ? "beauty" : "portrait";
  
  const idealRatios: Record<string, [number, number]> = {
    portrait: [2.0, 3.0],
    fashion: [3.0, 6.0],
    beauty: [1.2, 2.0],
    dramatic: [4.0, 8.0]
  };
  
  const [idealMin, idealMax] = idealRatios[styleContext] || idealRatios.portrait;
  
  let ratioScore: number;
  if (keyFillRatio >= idealMin && keyFillRatio <= idealMax) {
    ratioScore = 1.0;
  } else {
    const distance = Math.min(Math.abs(keyFillRatio - idealMin), Math.abs(keyFillRatio - idealMax));
    ratioScore = Math.max(0, 1 - (distance / (idealMax * 2)));
  }
  
  const professionalRating = Math.round((ratioScore * 0.6 + contrastScore * 0.4) * 100) / 10;

  return {
    keyFillRatio: Math.round(keyFillRatio * 100) / 100,
    lightingStyle,
    contrastScore: Math.round(contrastScore * 100) / 100,
    totalExposure: Math.min(totalExposure, 1.0),
    colorTemperature: {
      average: Math.round(avgTemp),
      warmth: avgTemp < 4500 ? "warm" : avgTemp > 6000 ? "cool" : "neutral"
    },
    professionalRating,
    recommendations: generateRecommendations(keyFillRatio, key, fill, rim, styleContext)
  };
}

function generateRecommendations(
  keyFillRatio: number, 
  key?: LightSettings, 
  fill?: LightSettings, 
  rim?: LightSettings,
  styleContext?: string
): string[] {
  const recommendations: string[] = [];

  if (keyFillRatio > 6.0) {
    recommendations.push("High contrast ratio - consider adding fill for softer shadows unless dramatic look intended");
  } else if (keyFillRatio < 1.5) {
    recommendations.push("Low contrast - increase key light intensity for more dimensional lighting");
  }

  if (key && key.softness < 0.3) {
    recommendations.push("Hard key light - soften for more flattering portrait results");
  }

  if (!rim?.enabled) {
    recommendations.push("Consider adding rim light for subject-background separation");
  } else if (rim.intensity > 0.85) {
    recommendations.push("Strong rim light may cause edge blowout - consider reducing intensity");
  }

  if (key && fill) {
    const tempDiff = Math.abs(key.colorTemperature - fill.colorTemperature);
    if (tempDiff > 1500) {
      recommendations.push("Large color temperature difference between key and fill - ensure this is intentional");
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(`Excellent ${styleContext || 'portrait'} lighting setup! Well balanced for professional results.`);
  }

  return recommendations;
}
