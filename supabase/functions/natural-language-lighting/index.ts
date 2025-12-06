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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const nlRequest: NaturalLanguageRequest = await req.json();
    console.log("Received NL request:", JSON.stringify(nlRequest));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // First, use AI to translate natural language to structured lighting JSON
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
            content: `You are a professional photography director and lighting expert. Convert natural language lighting descriptions into precise, structured JSON parameters for AI image generation.

CRITICAL: Always output valid JSON with this exact structure:
{
  "lighting_setup": {
    "key": {"direction": "...", "intensity": 0.X, "colorTemperature": XXXX, "softness": 0.X, "distance": X.X, "enabled": true},
    "fill": {"direction": "...", "intensity": 0.X, "colorTemperature": XXXX, "softness": 0.X, "distance": X.X, "enabled": true},
    "rim": {"direction": "...", "intensity": 0.X, "colorTemperature": XXXX, "softness": 0.X, "distance": X.X, "enabled": true},
    "ambient": {"intensity": 0.X, "colorTemperature": XXXX, "enabled": true}
  },
  "lighting_style": "...",
  "mood_description": "..."
}

Direction format: Use photographic terms like "45 degrees camera-right", "high and behind", "frontal soft", etc.
Intensity: 0.0-1.0 scale
Color temperature: 3200K (warm), 5600K (daylight), 6500K (cool)
Softness: 0.0-1.0

Common lighting setups:
- Butterfly: key=above camera, fill=below camera
- Rembrandt: key=45 degrees side creating triangle on cheek
- Split: key=directly from side
- Loop: key=45 degrees creating small nose shadow`
          },
          {
            role: "user",
            content: `Convert this lighting description to structured JSON: "${nlRequest.lightingDescription}". The scene is: ${nlRequest.sceneDescription}. Subject: ${nlRequest.subject}`
          }
        ],
      }),
    });

    if (!translationResponse.ok) {
      const errorText = await translationResponse.text();
      console.error("Translation error:", translationResponse.status, errorText);
      throw new Error("Failed to translate lighting description");
    }

    const translationData = await translationResponse.json();
    const translatedText = translationData.choices?.[0]?.message?.content || "";
    console.log("Translated text:", translatedText);

    // Parse the JSON from the response
    let lightingJson;
    try {
      const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        lightingJson = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Use default lighting if parsing fails
      lightingJson = getDefaultLighting();
    }

    console.log("Parsed lighting JSON:", JSON.stringify(lightingJson));

    // Now generate the image with the structured lighting
    const imagePrompt = `Generate a professional studio photograph:

Subject: ${nlRequest.subject}
Scene: ${nlRequest.sceneDescription}
Lighting: ${nlRequest.lightingDescription}
Style: ${nlRequest.styleIntent || 'professional photography'}
Mood: ${lightingJson.mood_description || 'professional and polished'}

Create a photorealistic, high-quality image with precise lighting control matching a ${lightingJson.lighting_style || 'professional'} setup.`;

    console.log("Image prompt:", imagePrompt);

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
      throw new Error(`Image generation error: ${errorText}`);
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // Calculate lighting analysis from parsed JSON
    const lightingAnalysis = analyzeLightingFromJson(lightingJson);

    return new Response(JSON.stringify({
      image_url: imageUrl || null,
      image_id: crypto.randomUUID(),
      fibo_json: lightingJson,
      lighting_analysis: lightingAnalysis,
      generation_metadata: {
        model: "google/gemini-2.5-flash-image-preview",
        original_description: nlRequest.lightingDescription,
        translated_style: lightingJson.lighting_style,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in natural-language-lighting:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDefaultLighting() {
  return {
    lighting_setup: {
      key: { direction: "45 degrees camera-right", intensity: 0.8, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true },
      fill: { direction: "30 degrees camera-left", intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 2.0, enabled: true },
      rim: { direction: "behind subject left", intensity: 0.6, colorTemperature: 3200, softness: 0.3, distance: 1.0, enabled: true },
      ambient: { intensity: 0.1, colorTemperature: 5000, enabled: true }
    },
    lighting_style: "classical_portrait",
    mood_description: "professional studio portrait"
  };
}

function analyzeLightingFromJson(lightingJson: any) {
  const setup = lightingJson.lighting_setup || {};
  const key = setup.key || { intensity: 0.8 };
  const fill = setup.fill || { intensity: 0.4 };

  const keyFillRatio = key.intensity / Math.max(fill.intensity || 0.1, 0.1);

  let lightingStyle = lightingJson.lighting_style || "classical_portrait";

  const idealRatio = 3.0;
  const ratioScore = 1 - Math.min(Math.abs(keyFillRatio - idealRatio) / 6, 1);
  const professionalRating = Math.round(ratioScore * 10);

  return {
    keyFillRatio: Math.round(keyFillRatio * 100) / 100,
    lightingStyle,
    contrastScore: 0.6,
    totalExposure: 0.8,
    professionalRating,
    recommendations: ["Generated from natural language description"]
  };
}
