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
    const sceneRequest: SceneRequest = await req.json();
    console.log("Received scene request:", JSON.stringify(sceneRequest));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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
        lighting_style: lightingAnalysis.lightingStyle,
        key_fill_ratio: lightingAnalysis.keyFillRatio,
        professional_rating: lightingAnalysis.professionalRating,
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
        distance: settings.distance,
        color_kelvin: settings.colorTemperature,
        falloff: "inverse_square"
      };
    }
  }

  // Extract color temperatures for white balance
  const keyTemp = lightingSetup.key?.colorTemperature || 5600;
  
  return {
    subject: {
      main_entity: subjectDescription,
      attributes: ["professionally lit", "high quality", "detailed", "sharp focus"],
      action: "posed for professional photograph",
      mood: determineMoodFromLighting(lightingSetup)
    },
    environment: {
      setting: environment,
      time_of_day: "controlled lighting",
      lighting_conditions: "professional studio",
      atmosphere: environment.includes("outdoor") ? "natural" : "controlled"
    },
    camera: {
      shot_type: cameraSettings.shotType,
      camera_angle: cameraSettings.cameraAngle,
      fov: cameraSettings.fov,
      lens_type: cameraSettings.lensType,
      aperture: cameraSettings.aperture,
      focus: "sharp on subject",
      depth_of_field: getDepthOfField(cameraSettings.aperture)
    },
    lighting: lightingJson,
    style_medium: "photograph",
    artistic_style: "professional studio photography",
    color_palette: {
      white_balance: `${keyTemp}K`,
      mood: keyTemp < 4500 ? "warm" : keyTemp > 6000 ? "cool" : "neutral"
    },
    enhancements: {
      hdr: request.enhanceHDR,
      professional_grade: true,
      color_fidelity: true,
      detail_enhancement: true,
      noise_reduction: true
    },
    composition: {
      rule_of_thirds: true,
      depth_layers: ["foreground", "subject", "background"]
    },
    negative_prompt: request.negativePrompt || "blurry, low quality, overexposed, underexposed, harsh shadows"
  };
}

function buildProfessionalImagePrompt(request: SceneRequest, fiboJson: any, analysis: any): string {
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

function getDepthOfField(aperture: string): string {
  const fNumber = parseFloat(aperture.replace('f/', ''));
  if (fNumber <= 2) return "very shallow, strong bokeh";
  if (fNumber <= 2.8) return "shallow, pleasing bokeh";
  if (fNumber <= 4) return "moderate, subject isolation";
  if (fNumber <= 5.6) return "medium depth";
  return "deep, most in focus";
}

function analyzeLighting(lightingSetup: Record<string, LightSettings>, stylePreset?: string) {
  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  const rim = lightingSetup.rim;
  const ambient = lightingSetup.ambient;

  const keyIntensity = key?.enabled ? key.intensity : 0;
  const fillIntensity = fill?.enabled ? fill.intensity : 0.1;
  
  const keyFillRatio = keyIntensity / Math.max(fillIntensity, 0.1);
  
  // Determine lighting style
  let lightingStyle = "classical_portrait";
  if (keyFillRatio >= 8) lightingStyle = "high_contrast_dramatic";
  else if (keyFillRatio >= 4) lightingStyle = "dramatic";
  else if (keyFillRatio >= 2) lightingStyle = "classical_portrait";
  else if (keyFillRatio >= 1.5) lightingStyle = "soft_lighting";
  else lightingStyle = "flat_lighting";

  // Calculate contrast score
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

  // Color temperature analysis
  const temps = [
    key?.enabled ? key.colorTemperature : null,
    fill?.enabled ? fill.colorTemperature : null,
    rim?.enabled ? rim.colorTemperature : null,
  ].filter(t => t !== null) as number[];

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
