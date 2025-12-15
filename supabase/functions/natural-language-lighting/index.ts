import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAIGatewayClientFromEnv, AIGatewayErrorClass } from "../_shared/lovable-ai-gateway-client.ts";
import { createErrorResponseWithLogging } from "../_shared/error-handling.ts";
import { createFIBOClient } from "../_shared/fibo-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NaturalLanguageRequest {
  sceneDescription: string;
  lightingDescription: string;
  subject: string;
  styleIntent?: string;
  environment?: string;
}

// Professional photography director system prompt
const LIGHTING_SYSTEM_PROMPT = `You are a professional photography director and lighting expert with 20+ years of experience. Convert natural language lighting descriptions into precise, structured JSON parameters for AI image generation.

CRITICAL: Always output valid JSON with this exact structure. No additional text, no markdown.

{
  "lighting_setup": {
    "key": {"direction": "...", "intensity": 0.X, "colorTemperature": XXXX, "softness": 0.X, "distance": X.X, "enabled": true},
    "fill": {"direction": "...", "intensity": 0.X, "colorTemperature": XXXX, "softness": 0.X, "distance": X.X, "enabled": true},
    "rim": {"direction": "...", "intensity": 0.X, "colorTemperature": XXXX, "softness": 0.X, "distance": X.X, "enabled": true},
    "ambient": {"intensity": 0.X, "colorTemperature": XXXX, "enabled": true, "direction": "omnidirectional"}
  },
  "lighting_style": "...",
  "mood_description": "...",
  "shadow_intensity": 0.X
}

DIRECTION FORMAT: Use precise photographic terms:
- "45 degrees camera-right, elevated 30 degrees" 
- "directly above camera (butterfly position)"
- "90 degrees side (split lighting)"
- "behind subject camera-left (rim position)"
- "frontal soft, slightly elevated"

INTENSITY: 0.0-1.0 scale
- 0.1-0.3: Accent/subtle
- 0.4-0.6: Moderate
- 0.7-0.9: Strong
- 1.0: Maximum

COLOR TEMPERATURE (Kelvin):
- 2500-3200K: Warm tungsten/candlelight
- 3200-4000K: Warm white
- 4500-5000K: Cool white
- 5500-5800K: Daylight
- 6000-6500K: Cool daylight
- 7000-10000K: Blue sky/shade

SOFTNESS: 0.0-1.0
- 0.0-0.3: Hard light (small source, defined shadows)
- 0.4-0.6: Medium (moderate shadow transition)
- 0.7-1.0: Soft light (large source, gradual shadows)

CLASSIC LIGHTING PATTERNS:
- Butterfly/Paramount: Key directly above camera, creates butterfly shadow under nose
- Rembrandt: Key 45° side creating triangle of light on shadow-side cheek
- Loop: Key 30-45° creating small loop shadow from nose
- Split: Key 90° side, illuminating exactly half the face
- Broad: Key illuminating side of face closest to camera
- Short: Key illuminating side of face away from camera
- Clamshell: Key above + fill below, very flattering

Always set appropriate fill based on described mood:
- "Dramatic" = lower fill (0.1-0.3)
- "Soft/Flattering" = higher fill (0.4-0.6)
- "Flat/Commercial" = high fill (0.5-0.7)`;

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
          functionName: 'natural-language-lighting',
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
    let nlRequest: NaturalLanguageRequest;
    try {
      const text = await req.text();
      if (!text || text.trim().length === 0) {
        const errorResponse = createErrorResponseWithLogging(
          new Error('Request body is required and cannot be empty.'),
          {
            functionName: 'natural-language-lighting',
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
      nlRequest = parsed as NaturalLanguageRequest;
    } catch (parseError) {
      const errorResponse = createErrorResponseWithLogging(parseError, {
        functionName: 'natural-language-lighting',
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
    if (!nlRequest.sceneDescription || typeof nlRequest.sceneDescription !== 'string' || nlRequest.sceneDescription.trim().length === 0) {
      const errorResponse = createErrorResponseWithLogging(
        new Error('sceneDescription is required and must be a non-empty string.'),
        {
          functionName: 'natural-language-lighting',
          action: 'validateFields',
          errorCode: 'MISSING_SCENE_DESCRIPTION',
          statusCode: 400,
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!nlRequest.lightingDescription || typeof nlRequest.lightingDescription !== 'string' || nlRequest.lightingDescription.trim().length === 0) {
      const errorResponse = createErrorResponseWithLogging(
        new Error('lightingDescription is required and must be a non-empty string.'),
        {
          functionName: 'natural-language-lighting',
          action: 'validateFields',
          errorCode: 'MISSING_LIGHTING_DESCRIPTION',
          statusCode: 400,
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!nlRequest.subject || typeof nlRequest.subject !== 'string' || nlRequest.subject.trim().length === 0) {
      const errorResponse = createErrorResponseWithLogging(
        new Error('subject is required and must be a non-empty string.'),
        {
          functionName: 'natural-language-lighting',
          action: 'validateFields',
          errorCode: 'MISSING_SUBJECT',
          statusCode: 400,
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate string lengths to prevent abuse
    const MAX_LENGTH = 5000;
    if (nlRequest.sceneDescription.length > MAX_LENGTH) {
      const errorResponse = createErrorResponseWithLogging(
        new Error(`sceneDescription exceeds maximum length of ${MAX_LENGTH} characters.`),
        {
          functionName: 'natural-language-lighting',
          action: 'validateLength',
          errorCode: 'FIELD_TOO_LONG',
          statusCode: 400,
          metadata: { field: 'sceneDescription', length: nlRequest.sceneDescription.length, maxLength: MAX_LENGTH },
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (nlRequest.lightingDescription.length > MAX_LENGTH) {
      const errorResponse = createErrorResponseWithLogging(
        new Error(`lightingDescription exceeds maximum length of ${MAX_LENGTH} characters.`),
        {
          functionName: 'natural-language-lighting',
          action: 'validateLength',
          errorCode: 'FIELD_TOO_LONG',
          statusCode: 400,
          metadata: { field: 'lightingDescription', length: nlRequest.lightingDescription.length, maxLength: MAX_LENGTH },
        }
      );
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Received NL request:", JSON.stringify(nlRequest));

    // Initialize AI Gateway client
    let aiClient;
    try {
      aiClient = createAIGatewayClientFromEnv({
        timeout: 45000, // 45s timeout
        retries: 2,
        retryDelay: 1000,
      });
    } catch (error) {
      if (error instanceof AIGatewayErrorClass) {
        const errorResponse = createErrorResponseWithLogging(error, {
          functionName: 'natural-language-lighting',
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
        functionName: 'natural-language-lighting',
        action: 'initializeAIClient',
        errorCode: 'CLIENT_INIT_ERROR',
        statusCode: 500,
      });
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to translate natural language to structured lighting JSON
    let translatedText: string;
    try {
      const translationResult = await aiClient.translateText(
        LIGHTING_SYSTEM_PROMPT,
        `Convert this lighting description to professional lighting JSON:

Lighting intent: "${nlRequest.lightingDescription}"
Scene: ${nlRequest.sceneDescription}
Subject: ${nlRequest.subject}
Style: ${nlRequest.styleIntent || 'professional photography'}
Environment: ${nlRequest.environment || 'studio'}

Output ONLY the JSON object, nothing else.`,
        "google/gemini-2.5-flash"
      );
      translatedText = translationResult.textContent;
      console.log("Translated text:", translatedText);
    } catch (error) {
      if (error instanceof AIGatewayErrorClass) {
        const errorResponse = createErrorResponseWithLogging(error, {
          functionName: 'natural-language-lighting',
          action: 'translateText',
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
        functionName: 'natural-language-lighting',
        action: 'translateText',
        errorCode: 'TRANSLATION_ERROR',
        statusCode: 500,
      });
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the JSON from the response
    let lightingJson;
    try {
      const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          lightingJson = JSON.parse(jsonMatch[0]);
          lightingJson = validateAndNormalizeLighting(lightingJson);
        } catch (jsonParseError) {
          console.error("Failed to parse extracted JSON:", jsonParseError);
          console.warn("Using fallback lighting due to JSON parse error");
          lightingJson = getDefaultLighting(nlRequest.lightingDescription);
        }
      } else {
        console.warn("No JSON found in translation response, using fallback");
        lightingJson = getDefaultLighting(nlRequest.lightingDescription);
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Use fallback lighting configuration
      lightingJson = getDefaultLighting(nlRequest.lightingDescription);
    }

    console.log("Parsed lighting JSON:", JSON.stringify(lightingJson));

    // Calculate lighting analysis from parsed JSON
    const lightingAnalysis = analyzeLightingFromJson(lightingJson);

    // Build complete FIBO JSON structure
    const completeFiboJson = {
      subject: {
        main_entity: nlRequest.subject,
        attributes: ["professionally lit", "high quality", "detailed", "sharp focus"],
        action: "posed for professional photograph",
        mood: lightingJson.mood_description || "professional",
        emotion: lightingJson.mood_description?.includes("dramatic") ? "intense" : "professional"
      },
      environment: {
        setting: nlRequest.environment || "professional studio",
        time_of_day: "controlled lighting",
        lighting_conditions: "professional studio",
        atmosphere: lightingJson.mood_description || "professional"
      },
      camera: {
        shot_type: "medium shot",
        camera_angle: "eye-level",
        fov: 85,
        lens_type: "portrait",
        aperture: "f/2.8",
        focus_distance_m: 2.0,
        pitch: 0,
        yaw: 0,
        roll: 0,
        seed: Math.floor(Math.random() * 1000000)
      },
      lighting: convertLightingToFiboFormat(lightingJson.lighting_setup),
      style_medium: "photograph",
      artistic_style: nlRequest.styleIntent || "professional studio photography",
      color_palette: {
        white_balance: `${lightingJson.lighting_setup?.key?.colorTemperature || 5600}K`,
        mood: (lightingJson.lighting_setup?.key?.colorTemperature || 5600) < 4500 ? "warm" : 
              (lightingJson.lighting_setup?.key?.colorTemperature || 5600) > 6000 ? "cool" : "neutral"
      }
    };

    // Generate image using FIBO client (with fallback to AI Gateway)
    let imageUrl: string | undefined;
    let textContent: string = "";
    let generationModel: string = "unknown";
    
    try {
      // Try FIBO first
      const fiboClient = createFIBOClient({
        preferBria: true,
        preferFal: true,
        timeout: 45000,
        retries: 2,
      });

      const fiboResult = await fiboClient.generate({
        structured_prompt: completeFiboJson,
        num_results: 1,
        sync: true,
        steps: 50,
        guidance_scale: 5.0,
      });

      if (fiboResult.status === 'success' && fiboResult.image_url) {
        imageUrl = fiboResult.image_url;
        generationModel = fiboResult.model || 'FIBO';
        console.log(`Image generated using ${generationModel}`);
      } else {
        throw new Error(fiboResult.error || 'FIBO generation failed');
      }
    } catch (fiboError) {
      console.warn("FIBO generation failed, falling back to AI Gateway:", fiboError);
      
      // Fallback to AI Gateway with text prompt
      const imagePrompt = buildNLImagePrompt(nlRequest, lightingJson, lightingAnalysis);
      console.log("Image prompt:", imagePrompt);

      try {
        const imageResult = await aiClient.generateImage(
          imagePrompt,
          "google/gemini-2.5-flash-image-preview"
        );
        imageUrl = imageResult.imageUrl;
        textContent = imageResult.textContent;
        generationModel = "google/gemini-2.5-flash-image-preview";
      } catch (error) {
        if (error instanceof AIGatewayErrorClass) {
          const errorResponse = createErrorResponseWithLogging(error, {
            functionName: 'natural-language-lighting',
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
          functionName: 'natural-language-lighting',
          action: 'generateImage',
          errorCode: 'IMAGE_GENERATION_ERROR',
          statusCode: 500,
        });
        return new Response(JSON.stringify(errorResponse), {
          status: errorResponse.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate that we got an image
    if (!imageUrl) {
      const errorResponse = createErrorResponseWithLogging(
        new Error("AI service did not generate an image."),
        {
          functionName: 'natural-language-lighting',
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

    return new Response(JSON.stringify({
      image_url: imageUrl || null,
      image_id: crypto.randomUUID(),
      fibo_json: lightingJson,
      lighting_analysis: lightingAnalysis,
      generation_metadata: {
        model: generationModel,
        original_description: nlRequest.lightingDescription,
        translated_style: lightingJson.lighting_style,
        mood: lightingJson.mood_description,
        used_fibo: generationModel.includes('FIBO'),
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorResponse = createErrorResponseWithLogging(error, {
      functionName: 'natural-language-lighting',
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

interface NormalizedLighting {
  lighting_setup: {
    key: LightConfig;
    fill: LightConfig;
    rim: LightConfig;
    ambient: LightConfig;
  };
  lighting_style: string;
  mood_description: string;
  shadow_intensity: number;
}

interface LightConfig {
  direction: string;
  intensity: number;
  colorTemperature: number;
  softness: number;
  distance: number;
  enabled: boolean;
}

function validateAndNormalizeLighting(lightingJson: Record<string, unknown>): NormalizedLighting {
  if (!lightingJson || typeof lightingJson !== 'object') {
    throw new Error('Invalid lighting JSON: must be an object');
  }

  const setup = (lightingJson.lighting_setup || {}) as Record<string, unknown>;
  
  if (typeof setup !== 'object' || setup === null) {
    throw new Error('Invalid lighting_setup: must be an object');
  }

  try {
    const validated = {
      lighting_setup: {
        key: normalizeLight(setup.key, { direction: "45 degrees camera-right", intensity: 0.8, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true }),
        fill: normalizeLight(setup.fill, { direction: "30 degrees camera-left", intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 2.0, enabled: true }),
        rim: normalizeLight(setup.rim, { direction: "behind subject left", intensity: 0.5, colorTemperature: 3200, softness: 0.3, distance: 1.0, enabled: true }),
        ambient: normalizeLight(setup.ambient, { intensity: 0.1, colorTemperature: 5000, softness: 1.0, distance: 0, enabled: true, direction: "omnidirectional" })
      },
      lighting_style: typeof lightingJson.lighting_style === 'string' ? lightingJson.lighting_style : "classical_portrait",
      mood_description: typeof lightingJson.mood_description === 'string' ? lightingJson.mood_description : "professional studio",
      shadow_intensity: typeof lightingJson.shadow_intensity === 'number' 
        ? Math.max(0, Math.min(1, lightingJson.shadow_intensity))
        : 0.5
    };
    
    return validated;
  } catch (error) {
    console.error("Error validating lighting:", error);
    throw new Error(`Failed to validate lighting configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function normalizeLight(light: unknown, defaults: LightConfig): LightConfig {
  if (!light || typeof light !== 'object' || light === null) {
    return { ...defaults, enabled: false };
  }
  
  const lightObj = light as Record<string, unknown>;
  
  try {
    return {
      direction: (typeof lightObj.direction === 'string' && lightObj.direction.trim().length > 0 
        ? lightObj.direction.trim() 
        : defaults.direction),
      intensity: Math.max(0, Math.min(1, 
        typeof lightObj.intensity === 'number' && !isNaN(lightObj.intensity)
          ? lightObj.intensity 
          : defaults.intensity
      )),
      colorTemperature: Math.max(1000, Math.min(10000, 
        typeof lightObj.colorTemperature === 'number' && !isNaN(lightObj.colorTemperature)
          ? lightObj.colorTemperature :
        typeof lightObj.color_temperature === 'number' && !isNaN(lightObj.color_temperature)
          ? lightObj.color_temperature :
          defaults.colorTemperature
      )),
      softness: Math.max(0, Math.min(1, 
        typeof lightObj.softness === 'number' && !isNaN(lightObj.softness)
          ? lightObj.softness 
          : defaults.softness
      )),
      distance: Math.max(0.1, Math.min(5, 
        typeof lightObj.distance === 'number' && !isNaN(lightObj.distance)
          ? lightObj.distance 
          : defaults.distance
      )),
      enabled: lightObj.enabled !== false && lightObj.enabled !== null
    };
  } catch (error) {
    console.error("Error normalizing light:", error);
    return { ...defaults, enabled: false };
  }
}

function getDefaultLighting(description: string): NormalizedLighting {
  const desc = description.toLowerCase();
  
  // Detect lighting style from description
  if (desc.includes("dramatic") || desc.includes("moody") || desc.includes("film noir")) {
    return {
      lighting_setup: {
        key: { direction: "45 degrees side high", intensity: 0.95, colorTemperature: 4500, softness: 0.2, distance: 1.0, enabled: true },
        fill: { direction: "opposite side", intensity: 0.15, colorTemperature: 4500, softness: 0.5, distance: 3.0, enabled: true },
        rim: { direction: "behind subject", intensity: 0.7, colorTemperature: 3200, softness: 0.2, distance: 0.8, enabled: true },
        ambient: { intensity: 0.05, colorTemperature: 4000, enabled: true, direction: "omnidirectional" }
      },
      lighting_style: "dramatic",
      mood_description: "dramatic with deep shadows",
      shadow_intensity: 0.8
    };
  }
  
  if (desc.includes("soft") || desc.includes("beauty") || desc.includes("flattering")) {
    return {
      lighting_setup: {
        key: { direction: "above camera butterfly position", intensity: 0.7, colorTemperature: 5600, softness: 0.8, distance: 1.5, enabled: true },
        fill: { direction: "below camera or reflector", intensity: 0.5, colorTemperature: 5600, softness: 0.9, distance: 2.0, enabled: true },
        rim: { direction: "behind subject", intensity: 0.4, colorTemperature: 5600, softness: 0.5, distance: 1.2, enabled: true },
        ambient: { intensity: 0.15, colorTemperature: 5600, softness: 1.0, distance: 0, enabled: true, direction: "omnidirectional" }
      },
      lighting_style: "soft_beauty",
      mood_description: "soft and flattering",
      shadow_intensity: 0.3
    };
  }
  
  if (desc.includes("rembrandt")) {
    return {
      lighting_setup: {
        key: { direction: "45 degrees left and above", intensity: 0.85, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true },
        fill: { direction: "30 degrees right", intensity: 0.25, colorTemperature: 5000, softness: 0.7, distance: 2.5, enabled: true },
        rim: { direction: "behind left", intensity: 0.5, colorTemperature: 3200, softness: 0.3, distance: 1.0, enabled: true },
        ambient: { intensity: 0.08, colorTemperature: 5000, softness: 1.0, distance: 0, enabled: true, direction: "omnidirectional" }
      },
      lighting_style: "rembrandt",
      mood_description: "classic Rembrandt with triangle highlight",
      shadow_intensity: 0.6
    };
  }
  
  // Default classical portrait
  return {
    lighting_setup: {
      key: { direction: "45 degrees camera-right", intensity: 0.8, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true },
      fill: { direction: "30 degrees camera-left", intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 2.0, enabled: true },
      rim: { direction: "behind subject left", intensity: 0.5, colorTemperature: 3500, softness: 0.3, distance: 1.0, enabled: true },
      ambient: { intensity: 0.1, colorTemperature: 5000, softness: 1.0, distance: 0, enabled: true, direction: "omnidirectional" }
    },
    lighting_style: "classical_portrait",
    mood_description: "professional studio portrait",
    shadow_intensity: 0.5
  };
}

interface LightingAnalysisResult {
  keyFillRatio: number;
  lightingStyle?: string;
  professionalRating?: number;
  [key: string]: unknown;
}

/**
 * Build comprehensive image prompt leveraging FIBO's training format
 * Creates detailed structured descriptions matching FIBO's ~1000 word training captions
 */
function buildNLImagePrompt(request: NaturalLanguageRequest, lightingJson: NormalizedLighting, analysis: LightingAnalysisResult): string {
  const setup = lightingJson.lighting_setup;
  
  // Build comprehensive lighting description with technical details
  let lightingDesc = "";
  
  if (setup.key?.enabled) {
    const k = setup.key;
    const tempDesc = k.colorTemperature < 4500 ? "warm tungsten-like" : 
                     k.colorTemperature > 6000 ? "cool daylight" : "neutral daylight";
    const softnessDesc = k.softness > 0.6 ? "soft diffused with gradual shadow transitions" : 
                        k.softness < 0.3 ? "hard crisp with defined shadow edges" : 
                        "medium with moderate shadow transition";
    lightingDesc += `Key light (primary): ${Math.round(k.intensity * 100)}% intensity, ${softnessDesc}, ${tempDesc} color temperature at ${k.colorTemperature}K, positioned ${k.direction}, distance ${k.distance.toFixed(1)}m with inverse square falloff. `;
  }
  
  if (setup.fill?.enabled) {
    const f = setup.fill;
    const fillSoftness = f.softness > 0.5 ? "soft" : "medium";
    lightingDesc += `Fill light (shadow detail): ${Math.round(f.intensity * 100)}% intensity (${analysis.keyFillRatio}:1 key-to-fill ratio), ${fillSoftness} quality from ${f.direction}, ${f.colorTemperature}K color temperature. `;
  }
  
  if (setup.rim?.enabled) {
    const r = setup.rim;
    const rimTemp = r.colorTemperature < 4000 ? "warm tungsten" : "neutral daylight";
    lightingDesc += `Rim/hair light (edge separation): ${Math.round(r.intensity * 100)}% intensity, ${rimTemp} ${r.colorTemperature}K, ${r.direction} position for subject-background separation. `;
  }
  
  if (setup.ambient?.enabled) {
    lightingDesc += `Ambient fill: ${Math.round(setup.ambient.intensity * 100)}% intensity at ${setup.ambient.colorTemperature}K for overall shadow detail and base exposure. `;
  }

  // Build comprehensive subject description
  const subjectDesc = `${request.subject}, ${request.sceneDescription}`;
  
  // Build detailed technical specifications
  const technicalSpecs = [
    `${analysis.keyFillRatio}:1 key-to-fill ratio`,
    `${analysis.lightingStyle?.replace(/_/g, ' ') || 'professional'} lighting pattern`,
    `Professional rating: ${analysis.professionalRating}/10`,
    `Color temperature: ${setup.key?.colorTemperature || 5600}K`,
    `Shadow intensity: ${lightingJson.shadow_intensity.toFixed(2)}`
  ].join(", ");

  return `Generate a professional studio photograph with expert-level lighting control matching FIBO's training format:

SUBJECT DESCRIPTION:
${subjectDesc}

ENVIRONMENT:
${request.environment || 'professional studio'} with controlled lighting conditions

COMPREHENSIVE LIGHTING SETUP (${lightingJson.lighting_style?.replace(/_/g, ' ')} style):
${lightingDesc}

MOOD AND ATMOSPHERE:
${lightingJson.mood_description}

STYLE INTENT:
${request.styleIntent || 'professional photography'}

TECHNICAL SPECIFICATIONS:
${technicalSpecs}

QUALITY REQUIREMENTS:
- Photorealistic, magazine-quality image
- Precise professional lighting matching described setup
- Expert-level control over lighting parameters
- High detail and sharp focus on subject
- Natural skin tones and material rendering
- Professional studio photography standard

Create an image that demonstrates FIBO's JSON-native and disentangled control capabilities, where lighting parameters precisely control the illumination while maintaining subject and composition consistency.`;
}

/**
 * Convert normalized lighting setup to FIBO format
 */
function convertLightingToFiboFormat(lightingSetup: NormalizedLighting['lighting_setup']): Record<string, Record<string, unknown>> {
  const fiboLighting: Record<string, Record<string, unknown>> = {};

  if (lightingSetup.key?.enabled) {
    fiboLighting.main_light = {
      type: "area",
      direction: lightingSetup.key.direction,
      intensity: Math.max(0, Math.min(2.0, lightingSetup.key.intensity)),
      colorTemperature: lightingSetup.key.colorTemperature,
      color_temperature: lightingSetup.key.colorTemperature,
      softness: Math.max(0, Math.min(1.0, lightingSetup.key.softness)),
      distance: lightingSetup.key.distance,
      falloff: "inverse_square",
      enabled: true,
    };
  }

  if (lightingSetup.fill?.enabled) {
    fiboLighting.fill_light = {
      type: "area",
      direction: lightingSetup.fill.direction,
      intensity: Math.max(0, Math.min(2.0, lightingSetup.fill.intensity)),
      colorTemperature: lightingSetup.fill.colorTemperature,
      color_temperature: lightingSetup.fill.colorTemperature,
      softness: Math.max(0, Math.min(1.0, lightingSetup.fill.softness)),
      distance: lightingSetup.fill.distance,
      falloff: "inverse_square",
      enabled: true,
    };
  }

  if (lightingSetup.rim?.enabled) {
    fiboLighting.rim_light = {
      type: "area",
      direction: lightingSetup.rim.direction,
      intensity: Math.max(0, Math.min(2.0, lightingSetup.rim.intensity)),
      colorTemperature: lightingSetup.rim.colorTemperature,
      color_temperature: lightingSetup.rim.colorTemperature,
      softness: Math.max(0, Math.min(1.0, lightingSetup.rim.softness)),
      distance: lightingSetup.rim.distance,
      falloff: "inverse_square",
      enabled: true,
    };
  }

  if (lightingSetup.ambient?.enabled) {
    fiboLighting.ambient_light = {
      intensity: Math.max(0, Math.min(1.0, lightingSetup.ambient.intensity)),
      colorTemperature: lightingSetup.ambient.colorTemperature,
      color_temperature: lightingSetup.ambient.colorTemperature,
      enabled: true,
    };
  }

  return fiboLighting;
}

function analyzeLightingFromJson(lightingJson: NormalizedLighting): LightingAnalysisResult {
  if (!lightingJson || !lightingJson.lighting_setup) {
    throw new Error('Invalid lighting JSON: missing lighting_setup');
  }

  const setup = lightingJson.lighting_setup || {};
  const key = setup.key || { intensity: 0.8, enabled: true };
  const fill = setup.fill || { intensity: 0.4, enabled: true };
  const rim = setup.rim || { intensity: 0.5, enabled: true };

  // Validate intensities are numbers
  const keyIntensity = (key.enabled !== false && typeof key.intensity === 'number' && !isNaN(key.intensity))
    ? Math.max(0, Math.min(1, key.intensity))
    : 0;
  const fillIntensity = (fill.enabled !== false && typeof fill.intensity === 'number' && !isNaN(fill.intensity))
    ? Math.max(0, Math.min(1, fill.intensity))
    : 0.1;
  
  const keyFillRatio = keyIntensity / Math.max(fillIntensity, 0.1);
  
  if (!isFinite(keyFillRatio) || isNaN(keyFillRatio)) {
    console.warn("Invalid keyFillRatio calculated, using default");
    return {
      keyFillRatio: 2.0,
      lightingStyle: "classical_portrait",
      professionalRating: 7.0
    };
  }

  // Determine lighting style
  let lightingStyle = lightingJson.lighting_style || "classical_portrait";
  if (!lightingJson.lighting_style) {
    if (keyFillRatio >= 8) lightingStyle = "high_contrast_dramatic";
    else if (keyFillRatio >= 4) lightingStyle = "dramatic";
    else if (keyFillRatio >= 2) lightingStyle = "classical_portrait";
    else if (keyFillRatio >= 1.5) lightingStyle = "soft_lighting";
    else lightingStyle = "flat_lighting";
  }

  // Calculate contrast
  const intensities = [
    key.enabled !== false ? key.intensity : 0,
    fill.enabled !== false ? fill.intensity : 0,
    rim?.enabled !== false ? rim.intensity : 0,
    setup.ambient?.enabled !== false ? setup.ambient?.intensity || 0.1 : 0
  ].filter(i => i > 0);
  
  const maxInt = Math.max(...intensities, 0.1);
  const minInt = Math.min(...intensities);
  const contrastScore = intensities.length > 1 ? (maxInt - minInt) / maxInt : 0.5;

  // Professional rating
  const idealRatio = lightingStyle.includes("dramatic") ? 5.0 : 2.5;
  const ratioScore = 1 - Math.min(Math.abs(keyFillRatio - idealRatio) / 6, 1);
  const professionalRating = Math.round((ratioScore * 0.6 + contrastScore * 0.4) * 100) / 10;

  // Color analysis
  const temps = [key.colorTemperature, fill?.colorTemperature, rim?.colorTemperature].filter(t => t);
  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 5600;

  return {
    keyFillRatio: Math.round(keyFillRatio * 100) / 100,
    lightingStyle,
    contrastScore: Math.round(contrastScore * 100) / 100,
    totalExposure: Math.round(intensities.reduce((a, b) => a + b, 0) * 100) / 100,
    colorTemperature: {
      average: Math.round(avgTemp),
      warmth: avgTemp < 4500 ? "warm" : avgTemp > 6000 ? "cool" : "neutral"
    },
    professionalRating,
    mood: lightingJson.mood_description,
    recommendations: [`Translated from: "${lightingJson.mood_description}" description`]
  };
}
