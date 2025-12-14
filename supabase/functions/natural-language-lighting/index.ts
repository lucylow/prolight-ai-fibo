import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      return new Response(JSON.stringify({ 
        error: 'Method not allowed. Only POST requests are supported.',
        errorCode: 'METHOD_NOT_ALLOWED'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    let nlRequest: NaturalLanguageRequest;
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
      const parsed = JSON.parse(text);
      nlRequest = parsed as NaturalLanguageRequest;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body. Please check your request format.',
        errorCode: 'INVALID_JSON',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields
    if (!nlRequest.sceneDescription || typeof nlRequest.sceneDescription !== 'string' || nlRequest.sceneDescription.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: 'sceneDescription is required and must be a non-empty string.',
        errorCode: 'MISSING_SCENE_DESCRIPTION'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!nlRequest.lightingDescription || typeof nlRequest.lightingDescription !== 'string' || nlRequest.lightingDescription.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: 'lightingDescription is required and must be a non-empty string.',
        errorCode: 'MISSING_LIGHTING_DESCRIPTION'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!nlRequest.subject || typeof nlRequest.subject !== 'string' || nlRequest.subject.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: 'subject is required and must be a non-empty string.',
        errorCode: 'MISSING_SUBJECT'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate string lengths to prevent abuse
    const MAX_LENGTH = 5000;
    if (nlRequest.sceneDescription.length > MAX_LENGTH) {
      return new Response(JSON.stringify({ 
        error: `sceneDescription exceeds maximum length of ${MAX_LENGTH} characters.`,
        errorCode: 'FIELD_TOO_LONG'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (nlRequest.lightingDescription.length > MAX_LENGTH) {
      return new Response(JSON.stringify({ 
        error: `lightingDescription exceeds maximum length of ${MAX_LENGTH} characters.`,
        errorCode: 'FIELD_TOO_LONG'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Received NL request:", JSON.stringify(nlRequest));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'LOVABLE_API_KEY is not configured. Please add it to your Lovable project secrets.',
        errorCode: 'CONFIG_ERROR',
        details: {
          message: 'The LOVABLE_API_KEY environment variable is required for AI image generation. Please configure it in your Lovable project settings under Secrets.',
          helpUrl: 'https://docs.lovable.dev/guides/secrets'
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper function to make AI request with retry logic
    const makeAIRequest = async (
      endpoint: string,
      payload: Record<string, unknown>,
      retries = 2
    ): Promise<{ imageUrl: string; textContent: string } | Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorText = '';
          let errorData: Record<string, unknown> | null = null;
          
          try {
            errorText = await response.text();
            errorData = JSON.parse(errorText);
          } catch {
            // If parsing fails, use raw text
          }

          console.error("AI gateway error:", response.status, errorText);
          
          if (response.status === 401) {
            return new Response(JSON.stringify({ 
              error: "AI service authentication failed. Please check API configuration.",
              errorCode: "AI_AUTH_ERROR"
            }), {
              status: 502,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After") || "60";
            return new Response(JSON.stringify({ 
              error: `AI service rate limit exceeded. Please try again in ${retryAfter} seconds.`,
              errorCode: "AI_RATE_LIMIT",
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
          
          if (response.status === 402) {
            return new Response(JSON.stringify({ 
              error: "AI service payment required. Please add credits to your workspace.",
              errorCode: "AI_PAYMENT_REQUIRED"
            }), {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (response.status >= 500 && retries > 0) {
            console.log(`Retrying AI request, ${retries} attempts remaining...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
            return makeAIRequest(endpoint, payload, retries - 1);
          }

          if (response.status >= 500) {
            return new Response(JSON.stringify({ 
              error: "AI service temporarily unavailable. Please try again later.",
              errorCode: "AI_SERVER_ERROR",
              details: errorData?.error?.message || errorText.substring(0, 200)
            }), {
              status: 502,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ 
            error: `AI service error: ${errorData?.error?.message || errorText.substring(0, 200) || 'Unknown error'}`,
            errorCode: "AI_CLIENT_ERROR",
            details: errorData
          }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          if (retries > 0) {
            console.log(`Retrying due to timeout, ${retries} attempts remaining...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
            return makeAIRequest(endpoint, payload, retries - 1);
          }
          return new Response(JSON.stringify({ 
            error: "AI service request timed out. Please try again.",
            errorCode: "AI_TIMEOUT"
          }), {
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (error instanceof TypeError && error.message.includes('fetch')) {
          if (retries > 0) {
            console.log(`Retrying due to network error, ${retries} attempts remaining...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
            return makeAIRequest(endpoint, payload, retries - 1);
          }
          return new Response(JSON.stringify({ 
            error: "Network error connecting to AI service. Please check your connection.",
            errorCode: "AI_NETWORK_ERROR"
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        throw error;
      }
    };

    // Use AI to translate natural language to structured lighting JSON
    const translationPayload = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: LIGHTING_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Convert this lighting description to professional lighting JSON:

Lighting intent: "${nlRequest.lightingDescription}"
Scene: ${nlRequest.sceneDescription}
Subject: ${nlRequest.subject}
Style: ${nlRequest.styleIntent || 'professional photography'}
Environment: ${nlRequest.environment || 'studio'}

Output ONLY the JSON object, nothing else.`
        }
      ],
    };

    const translationResponse = await makeAIRequest(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      translationPayload
    );

    // Check if translationResponse is already a Response (error case)
    if (translationResponse instanceof Response) {
      return translationResponse;
    }

    const translationData = translationResponse;
    const translatedText = translationData.choices?.[0]?.message?.content || "";
    console.log("Translated text:", translatedText);

    // Validate translation response
    if (!translationData.choices || !Array.isArray(translationData.choices) || translationData.choices.length === 0) {
      console.error("Invalid translation response structure");
      return new Response(JSON.stringify({ 
        error: "AI service returned invalid translation response. Please try again.",
        errorCode: "AI_INVALID_TRANSLATION"
      }), {
        status: 502,
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

    // Build professional image prompt
    const imagePrompt = buildNLImagePrompt(nlRequest, lightingJson, lightingAnalysis);
    console.log("Image prompt:", imagePrompt);

    // Generate image using AI
    const imagePayload = {
      model: "google/gemini-2.5-flash-image-preview",
      messages: [
        {
          role: "user",
          content: imagePrompt
        }
      ],
      modalities: ["image", "text"]
    };

    const imageResponse = await makeAIRequest(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      imagePayload
    );

    // Check if imageResponse is already a Response (error case)
    if (imageResponse instanceof Response) {
      return imageResponse;
    }

    const imageData = imageResponse;
    
    // Validate image response
    if (!imageData.choices || !Array.isArray(imageData.choices) || imageData.choices.length === 0) {
      console.error("Invalid image response structure");
      return new Response(JSON.stringify({ 
        error: "AI service returned invalid image response. Please try again.",
        errorCode: "AI_INVALID_IMAGE_RESPONSE"
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = imageData.choices[0]?.message;
    if (!message) {
      return new Response(JSON.stringify({ 
        error: "AI service returned incomplete image response. Please try again.",
        errorCode: "AI_INCOMPLETE_IMAGE_RESPONSE"
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageUrl = message.images?.[0]?.image_url?.url;

    // Validate that we got an image
    if (!imageUrl) {
      console.warn("AI response missing image URL");
      return new Response(JSON.stringify({ 
        error: "AI service did not generate an image. Please try again with a different description.",
        errorCode: "AI_NO_IMAGE",
        details: { textContent: message.content }
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      image_url: imageUrl || null,
      image_id: crypto.randomUUID(),
      fibo_json: lightingJson,
      lighting_analysis: lightingAnalysis,
      generation_metadata: {
        model: "google/gemini-2.5-flash-image-preview",
        original_description: nlRequest.lightingDescription,
        translated_style: lightingJson.lighting_style,
        mood: lightingJson.mood_description,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in natural-language-lighting:", error);
    
    // Provide more specific error messages
    let errorMessage = "An unexpected error occurred during natural language processing.";
    let errorCode = "UNKNOWN_ERROR";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes("LOVABLE_API_KEY")) {
        errorCode = "CONFIG_ERROR";
        errorMessage = "AI service configuration error. Please contact support.";
      } else if (error.message.includes("timeout") || error.message.includes("Timeout")) {
        errorCode = "TIMEOUT_ERROR";
        errorMessage = "Request timed out. Please try again.";
        statusCode = 504;
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        errorCode = "NETWORK_ERROR";
        errorMessage = "Network error. Please check your connection and try again.";
        statusCode = 503;
      } else if (error.message.includes("JSON") || error.message.includes("parse")) {
        errorCode = "PARSE_ERROR";
        errorMessage = "Failed to process AI response. Please try again with a different description.";
      }
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      errorCode,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
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

  const setup = lightingJson.lighting_setup || {};
  
  if (typeof setup !== 'object' || setup === null) {
    throw new Error('Invalid lighting_setup: must be an object');
  }

  try {
    const validated = {
      lighting_setup: {
        key: normalizeLight(setup.key, { direction: "45 degrees camera-right", intensity: 0.8, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true }),
        fill: normalizeLight(setup.fill, { direction: "30 degrees camera-left", intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 2.0, enabled: true }),
        rim: normalizeLight(setup.rim, { direction: "behind subject left", intensity: 0.5, colorTemperature: 3200, softness: 0.3, distance: 1.0, enabled: true }),
        ambient: normalizeLight(setup.ambient, { intensity: 0.1, colorTemperature: 5000, enabled: true, direction: "omnidirectional" })
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
        ambient: { intensity: 0.15, colorTemperature: 5600, enabled: true, direction: "omnidirectional" }
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
        ambient: { intensity: 0.08, colorTemperature: 5000, enabled: true, direction: "omnidirectional" }
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
      ambient: { intensity: 0.1, colorTemperature: 5000, enabled: true, direction: "omnidirectional" }
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

function buildNLImagePrompt(request: NaturalLanguageRequest, lightingJson: NormalizedLighting, analysis: LightingAnalysisResult): string {
  const setup = lightingJson.lighting_setup;
  
  let lightingDesc = "";
  
  if (setup.key?.enabled) {
    const k = setup.key;
    lightingDesc += `Key light: ${Math.round(k.intensity * 100)}% at ${k.colorTemperature}K, ${k.softness > 0.6 ? "soft" : k.softness < 0.3 ? "hard" : "medium"}, from ${k.direction}. `;
  }
  
  if (setup.fill?.enabled) {
    const f = setup.fill;
    lightingDesc += `Fill: ${Math.round(f.intensity * 100)}% (${analysis.keyFillRatio}:1 ratio), from ${f.direction}. `;
  }
  
  if (setup.rim?.enabled) {
    const r = setup.rim;
    lightingDesc += `Rim: ${Math.round(r.intensity * 100)}% at ${r.colorTemperature}K from ${r.direction}. `;
  }

  return `Generate a professional studio photograph with expert lighting:

SUBJECT: ${request.subject}
SCENE: ${request.sceneDescription}
ENVIRONMENT: ${request.environment || 'professional studio'}

LIGHTING SETUP (${lightingJson.lighting_style?.replace(/_/g, ' ')} style):
${lightingDesc}

MOOD: ${lightingJson.mood_description}
STYLE: ${request.styleIntent || 'professional photography'}

Technical specs: ${analysis.keyFillRatio}:1 key-to-fill ratio, ${analysis.lightingStyle?.replace(/_/g, ' ')} pattern, professional rating ${analysis.professionalRating}/10.

Create a photorealistic, magazine-quality image with precise professional lighting matching the described setup.`;
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
