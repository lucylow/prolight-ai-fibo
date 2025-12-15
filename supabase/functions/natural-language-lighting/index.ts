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

interface LightSettings {
  direction?: string;
  intensity?: number;
  colorTemperature?: number;
  color_temperature?: number;
  softness?: number;
  distance?: number;
  enabled?: boolean;
}

interface LightingSetup {
  key?: LightSettings;
  fill?: LightSettings;
  rim?: LightSettings;
  ambient?: LightSettings;
}

interface LightingJson {
  lighting_setup?: LightingSetup;
  lighting_style?: string;
  mood_description?: string;
  shadow_intensity?: number;
}

interface LightingAnalysis {
  keyFillRatio?: number;
  lightingStyle?: string;
  professionalRating?: number;
  [key: string]: unknown;
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

  let nlRequest: NaturalLanguageRequest | null = null;
  
  try {
    nlRequest = await req.json();
    console.log("Received NL request:", JSON.stringify(nlRequest));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use AI to translate natural language to structured lighting JSON
    const translationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    });

    let lightingJson: LightingJson;
    let useMockTranslation = false;

    if (!translationResponse.ok) {
      const errorText = await translationResponse.text();
      console.error("Translation error:", translationResponse.status, errorText);
      
      if (translationResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (translationResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Use mock fallback for other errors
      console.warn("Translation API failed, using mock fallback");
      lightingJson = getDefaultLighting(nlRequest.lightingDescription);
      useMockTranslation = true;
    } else {
      const translationData = await translationResponse.json();
      const translatedText = translationData.choices?.[0]?.message?.content || "";
      console.log("Translated text:", translatedText);

      // Parse the JSON from the response
      try {
        const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          lightingJson = JSON.parse(jsonMatch[0]);
          lightingJson = validateAndNormalizeLighting(lightingJson);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Parse error:", parseError);
        console.warn("Failed to parse AI response, using mock fallback");
        lightingJson = getDefaultLighting(nlRequest.lightingDescription);
        useMockTranslation = true;
      }
    }

    console.log("Parsed lighting JSON:", JSON.stringify(lightingJson));

    // Calculate lighting analysis from parsed JSON
    const lightingAnalysis = analyzeLightingFromJson(lightingJson);

    // Build professional image prompt
    const imagePrompt = buildNLImagePrompt(nlRequest, lightingJson, lightingAnalysis);
    console.log("Image prompt:", imagePrompt);

    let imageUrl: string | null = null;
    let useMockImage = false;

    try {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: imagePrompt
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error("Image generation error:", imageResponse.status, errorText);
        
        if (imageResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (imageResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Use mock fallback for other errors
        console.warn("Image generation API failed, using mock fallback");
        imageUrl = getMockImageUrl();
        useMockImage = true;
      } else {
        const imageData = await imageResponse.json();
        imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
        
        // If no image URL in response, use mock fallback
        if (!imageUrl) {
          console.warn("No image URL in AI response, using mock fallback");
          imageUrl = getMockImageUrl();
          useMockImage = true;
        }
      }
    } catch (imageError) {
      console.error("Image generation exception:", imageError);
      console.warn("Image generation failed, using mock fallback");
      imageUrl = getMockImageUrl();
      useMockImage = true;
    }

    return new Response(JSON.stringify({
      image_url: imageUrl,
      image_id: crypto.randomUUID(),
      fibo_json: lightingJson,
      lighting_analysis: lightingAnalysis,
      generation_metadata: {
        model: useMockImage ? "mock-fallback" : "google/gemini-2.5-flash-image-preview",
        original_description: nlRequest.lightingDescription,
        translated_style: lightingJson.lighting_style,
        mood: lightingJson.mood_description,
        timestamp: new Date().toISOString(),
        mock_fallback: useMockTranslation || useMockImage,
        mock_reason: useMockTranslation ? "translation_failed" : useMockImage ? "image_generation_failed" : null
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in natural-language-lighting:", error);
    
    // Use comprehensive mock fallback when everything fails
    console.warn("Critical error occurred, using comprehensive mock fallback");
    try {
      const lightingDescription = nlRequest?.lightingDescription || "professional portrait";
      const mockLightingJson = getDefaultLighting(lightingDescription);
      const mockLightingAnalysis = analyzeLightingFromJson(mockLightingJson);
      
      return new Response(JSON.stringify({
        image_url: getMockImageUrl(),
        image_id: crypto.randomUUID(),
        fibo_json: mockLightingJson,
        lighting_analysis: mockLightingAnalysis,
        generation_metadata: {
          model: "mock-fallback",
          original_description: lightingDescription,
          translated_style: mockLightingJson.lighting_style,
          mood: mockLightingJson.mood_description,
          timestamp: new Date().toISOString(),
          mock_fallback: true,
          mock_reason: "critical_error",
          error_message: error instanceof Error ? error.message : "Unknown error"
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fallbackError) {
      // If even the fallback fails, return error response
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        fallback_error: fallbackError instanceof Error ? fallbackError.message : "Fallback also failed"
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});

function validateAndNormalizeLighting(lightingJson: LightingJson): LightingJson {
  const setup = lightingJson.lighting_setup || {};
  
  const validated = {
    lighting_setup: {
      key: normalizeLight(setup.key, { direction: "45 degrees camera-right", intensity: 0.8, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true }),
      fill: normalizeLight(setup.fill, { direction: "30 degrees camera-left", intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 2.0, enabled: true }),
      rim: normalizeLight(setup.rim, { direction: "behind subject left", intensity: 0.5, colorTemperature: 3200, softness: 0.3, distance: 1.0, enabled: true }),
      ambient: normalizeLight(setup.ambient, { intensity: 0.1, colorTemperature: 5000, enabled: true, direction: "omnidirectional" })
    },
    lighting_style: lightingJson.lighting_style || "classical_portrait",
    mood_description: lightingJson.mood_description || "professional studio",
    shadow_intensity: lightingJson.shadow_intensity || 0.5
  };
  
  return validated;
}

function normalizeLight(light: LightSettings | undefined, defaults: LightSettings): LightSettings {
  if (!light) return { ...defaults, enabled: false };
  
  return {
    direction: light.direction || defaults.direction,
    intensity: Math.max(0, Math.min(1, light.intensity ?? defaults.intensity)),
    colorTemperature: Math.max(1000, Math.min(10000, light.colorTemperature || light.color_temperature || defaults.colorTemperature)),
    softness: Math.max(0, Math.min(1, light.softness ?? defaults.softness)),
    distance: Math.max(0.1, Math.min(5, light.distance ?? defaults.distance)),
    enabled: light.enabled !== false
  };
}

function getDefaultLighting(description: string): LightingJson {
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

/**
 * Generate mock image URL - returns a placeholder image service URL
 * This is used as fallback when AI image generation fails
 */
function getMockImageUrl(): string {
  // Using a placeholder image service that generates professional-looking images
  // This provides a visual fallback when AI generation is unavailable
  return "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1024&h=1024&fit=crop&auto=format";
}

function buildNLImagePrompt(request: NaturalLanguageRequest, lightingJson: LightingJson, analysis: LightingAnalysis): string {
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

function analyzeLightingFromJson(lightingJson: LightingJson): LightingAnalysis {
  const setup = lightingJson.lighting_setup || {};
  const key = setup.key || { intensity: 0.8 };
  const fill = setup.fill || { intensity: 0.4 };
  const rim = setup.rim || { intensity: 0.5 };

  const keyIntensity = key.enabled !== false ? key.intensity : 0;
  const fillIntensity = fill.enabled !== false ? fill.intensity : 0.1;
  
  const keyFillRatio = keyIntensity / Math.max(fillIntensity, 0.1);

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
