import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sceneRequest: SceneRequest = await req.json();
    console.log("Received scene request:", JSON.stringify(sceneRequest));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build FIBO-style JSON from lighting setup
    const fiboJson = buildFiboJson(sceneRequest);
    console.log("Built FIBO JSON:", JSON.stringify(fiboJson));

    // Calculate lighting analysis
    const lightingAnalysis = analyzeLighting(sceneRequest.lightingSetup);
    console.log("Lighting analysis:", JSON.stringify(lightingAnalysis));

    // Generate image using Lovable AI with image generation model
    const imagePrompt = buildImagePrompt(sceneRequest, fiboJson);
    console.log("Image prompt:", imagePrompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({
      image_url: imageUrl || null,
      image_id: crypto.randomUUID(),
      fibo_json: fiboJson,
      lighting_analysis: lightingAnalysis,
      generation_metadata: {
        model: "google/gemini-2.5-flash-image-preview",
        prompt_summary: textContent.substring(0, 200),
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in generate-lighting:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildFiboJson(request: SceneRequest) {
  const { lightingSetup, cameraSettings, subjectDescription, environment } = request;

  const lightingJson: Record<string, any> = {};
  for (const [type, settings] of Object.entries(lightingSetup)) {
    if (settings.enabled) {
      lightingJson[`${type}_light`] = {
        direction: settings.direction,
        intensity: settings.intensity,
        color_temperature: settings.colorTemperature,
        softness: settings.softness,
        distance: settings.distance
      };
    }
  }

  return {
    subject: {
      main_entity: subjectDescription,
      attributes: ["professionally lit", "high quality", "detailed"],
      action: "posing for professional photograph"
    },
    environment: {
      setting: environment,
      time_of_day: "controlled lighting",
      lighting_conditions: "professional studio"
    },
    camera: {
      shot_type: cameraSettings.shotType,
      camera_angle: cameraSettings.cameraAngle,
      fov: cameraSettings.fov,
      lens_type: cameraSettings.lensType,
      aperture: cameraSettings.aperture
    },
    lighting: lightingJson,
    style_medium: "photograph",
    artistic_style: "professional studio photography",
    enhancements: {
      hdr: request.enhanceHDR,
      professional_grade: true
    }
  };
}

function buildImagePrompt(request: SceneRequest, fiboJson: any): string {
  const { lightingSetup } = request;
  
  let lightingDesc = "";
  if (lightingSetup.key?.enabled) {
    lightingDesc += `Key light at ${lightingSetup.key.intensity * 100}% intensity from ${lightingSetup.key.direction}, ${lightingSetup.key.colorTemperature}K color temperature. `;
  }
  if (lightingSetup.fill?.enabled) {
    lightingDesc += `Fill light at ${lightingSetup.fill.intensity * 100}% intensity from ${lightingSetup.fill.direction}. `;
  }
  if (lightingSetup.rim?.enabled) {
    lightingDesc += `Rim light at ${lightingSetup.rim.intensity * 100}% intensity from ${lightingSetup.rim.direction}, warm ${lightingSetup.rim.colorTemperature}K. `;
  }

  return `Generate a professional studio photograph with the following specifications:

Subject: ${request.subjectDescription}
Environment: ${request.environment}
Camera: ${request.cameraSettings.shotType}, ${request.cameraSettings.cameraAngle} angle, ${request.cameraSettings.aperture}
Lighting Setup: ${lightingDesc}
Style: Professional photography, ${request.stylePreset || 'clean and polished'}

Create a photorealistic, high-quality studio image with precise lighting control.`;
}

function analyzeLighting(lightingSetup: Record<string, LightSettings>) {
  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  const rim = lightingSetup.rim;
  const ambient = lightingSetup.ambient;

  const keyIntensity = key?.enabled ? key.intensity : 0;
  const fillIntensity = fill?.enabled ? fill.intensity : 0.1;
  
  const keyFillRatio = keyIntensity / Math.max(fillIntensity, 0.1);
  
  let lightingStyle = "classical_portrait";
  if (keyFillRatio >= 8) lightingStyle = "high_contrast_dramatic";
  else if (keyFillRatio >= 4) lightingStyle = "dramatic";
  else if (keyFillRatio >= 2) lightingStyle = "classical_portrait";
  else if (keyFillRatio >= 1.5) lightingStyle = "soft_lighting";
  else lightingStyle = "flat_lighting";

  const intensities = [
    key?.enabled ? key.intensity : 0,
    fill?.enabled ? fill.intensity : 0,
    rim?.enabled ? rim.intensity : 0,
    ambient?.enabled ? ambient.intensity : 0
  ].filter(i => i > 0);

  const maxIntensity = Math.max(...intensities, 0.1);
  const minIntensity = Math.min(...intensities, 0);
  const contrastScore = intensities.length > 1 ? (maxIntensity - minIntensity) / maxIntensity : 0.5;

  const totalExposure = intensities.reduce((a, b) => a + b, 0);

  // Calculate professional rating
  const idealRatio = 3.0;
  const ratioScore = 1 - Math.min(Math.abs(keyFillRatio - idealRatio) / 6, 1);
  const professionalRating = Math.round((ratioScore * 0.6 + contrastScore * 0.4) * 10);

  return {
    keyFillRatio: Math.round(keyFillRatio * 100) / 100,
    lightingStyle,
    contrastScore: Math.round(contrastScore * 100) / 100,
    totalExposure: Math.min(totalExposure, 1.0),
    professionalRating,
    recommendations: generateRecommendations(keyFillRatio, key, fill, rim)
  };
}

function generateRecommendations(
  keyFillRatio: number, 
  key?: LightSettings, 
  fill?: LightSettings, 
  rim?: LightSettings
): string[] {
  const recommendations: string[] = [];

  if (keyFillRatio > 4.0) {
    recommendations.push("Consider increasing fill light intensity to reduce harsh shadows");
  } else if (keyFillRatio < 1.5) {
    recommendations.push("Increase key light intensity for more dimension and depth");
  }

  if (key && key.softness < 0.3) {
    recommendations.push("Soften key light for more flattering portraits");
  }

  if (!rim?.enabled) {
    recommendations.push("Add a rim light to separate subject from background");
  }

  if (recommendations.length === 0) {
    recommendations.push("Great lighting setup! Well balanced for professional results.");
  }

  return recommendations;
}
