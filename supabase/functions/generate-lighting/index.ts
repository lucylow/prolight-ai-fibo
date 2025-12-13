import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getConfig, validateConfig } from "../_shared/config.ts";
import { createLogger, generateRequestId } from "../_shared/logger.ts";
import { createMetricsTracker } from "../_shared/metrics.ts";
import { fetchWithRetry } from "../_shared/retry.ts";
import { getIdempotencyKey, handleIdempotencyCheck, setInProgress, setCompleted, setFailed } from "../_shared/idempotency.ts";
import { handleCors, jsonResponse, errorResponse, handleHttpError, corsHeaders } from "../_shared/response.ts";

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

const LIGHTING_STYLES: Record<string, { ratioRange: [number, number]; description: string }> = {
  high_contrast_dramatic: { ratioRange: [8.0, Infinity], description: "Dramatic high-contrast" },
  dramatic: { ratioRange: [4.0, 8.0], description: "Strong dramatic shadows" },
  classical_portrait: { ratioRange: [2.0, 4.0], description: "Classical balanced" },
  soft_lighting: { ratioRange: [1.5, 2.0], description: "Soft and flattering" },
  flat_lighting: { ratioRange: [1.0, 1.5], description: "Even flat lighting" },
};

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Initialize request context
  const requestId = generateRequestId();
  const config = getConfig();
  const logger = createLogger('generate-lighting', requestId);
  const metrics = createMetricsTracker('generate-lighting', requestId, config.env);

  // Check idempotency
  const idempotencyKey = getIdempotencyKey(req);
  const cachedResponse = handleIdempotencyCheck(idempotencyKey, corsHeaders);
  if (cachedResponse) {
    metrics.cacheHit();
    logger.info('request.cache_hit', { idempotencyKey });
    return cachedResponse;
  }

  metrics.invocation(idempotencyKey || undefined);
  logger.info('request.start', { env: config.env });

  try {
    // Validate configuration
    validateConfig(config, ['lovableApiKey']);

    const sceneRequest: SceneRequest = await req.json();
    logger.info('request.parsed', { subject: sceneRequest.subjectDescription });

    // Mark as in progress if idempotency key provided
    if (idempotencyKey) {
      setInProgress(idempotencyKey, requestId);
    }

    // Build FIBO-style JSON from lighting setup
    const fiboJson = buildFiboJson(sceneRequest);
    const lightingAnalysis = analyzeLighting(sceneRequest.lightingSetup, sceneRequest.stylePreset);
    const imagePrompt = buildProfessionalImagePrompt(sceneRequest, fiboJson, lightingAnalysis);

    logger.info('prompt.built', { 
      style: lightingAnalysis.lightingStyle,
      ratio: lightingAnalysis.keyFillRatio 
    });

    // Call AI with retry
    const response = await fetchWithRetry(
      () => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"]
        }),
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    );

    if (!response.ok) {
      logger.error('ai.error', undefined, { status: response.status });
      if (idempotencyKey) setFailed(idempotencyKey, `AI error: ${response.status}`);
      metrics.error(response.status, `AI gateway error: ${response.status}`);
      return handleHttpError(response);
    }

    const data = await response.json();
    logger.info('ai.response_received');

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = data.choices?.[0]?.message?.content || "";

    const result = {
      image_url: imageUrl || null,
      image_id: requestId,
      fibo_json: fiboJson,
      lighting_analysis: lightingAnalysis,
      generation_metadata: {
        model: "google/gemini-2.5-flash-image-preview",
        prompt_summary: textContent.substring(0, 200),
        lighting_style: lightingAnalysis.lightingStyle,
        key_fill_ratio: lightingAnalysis.keyFillRatio,
        professional_rating: lightingAnalysis.professionalRating,
        timestamp: new Date().toISOString(),
        request_id: requestId,
        environment: config.env
      }
    };

    // Store completed result
    if (idempotencyKey) {
      setCompleted(idempotencyKey, result);
    }

    metrics.completed(200, { hasImage: !!imageUrl });
    logger.complete(200, { imageGenerated: !!imageUrl });

    return jsonResponse(result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error('request.failed', error instanceof Error ? error : errorMessage);
    metrics.error(500, errorMessage);
    
    if (idempotencyKey) setFailed(idempotencyKey, errorMessage);
    
    return errorResponse(errorMessage, 500);
  }
});

function buildFiboJson(request: SceneRequest) {
  const { lightingSetup, cameraSettings, subjectDescription, environment } = request;

  const lightingJson: Record<string, unknown> = {};
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

function buildProfessionalImagePrompt(request: SceneRequest, _fiboJson: unknown, analysis: ReturnType<typeof analyzeLighting>): string {
  const { lightingSetup, cameraSettings } = request;
  
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

  const dofDesc = getDepthOfField(cameraSettings.aperture);
  
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

  const temps = [
    key?.enabled ? key.colorTemperature : null,
    fill?.enabled ? fill.colorTemperature : null,
    rim?.enabled ? rim.colorTemperature : null,
  ].filter(t => t !== null) as number[];

  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 5600;

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
