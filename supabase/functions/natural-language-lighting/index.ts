import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getConfig, validateConfig } from "../_shared/config.ts";
import { createLogger, generateRequestId } from "../_shared/logger.ts";
import { createMetricsTracker } from "../_shared/metrics.ts";
import { fetchWithRetry } from "../_shared/retry.ts";
import { getIdempotencyKey, handleIdempotencyCheck, setInProgress, setCompleted, setFailed } from "../_shared/idempotency.ts";
import { handleCors, jsonResponse, errorResponse, handleHttpError, corsHeaders } from "../_shared/response.ts";

interface NaturalLanguageRequest {
  sceneDescription: string;
  lightingDescription: string;
  subject: string;
  styleIntent?: string;
  environment?: string;
}

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

INTENSITY: 0.0-1.0 scale (0.1-0.3: Accent, 0.4-0.6: Moderate, 0.7-0.9: Strong, 1.0: Maximum)

COLOR TEMPERATURE (Kelvin):
- 2500-3200K: Warm tungsten/candlelight
- 3200-4000K: Warm white
- 4500-5000K: Cool white
- 5500-5800K: Daylight
- 6000-6500K: Cool daylight
- 7000-10000K: Blue sky/shade

SOFTNESS: 0.0-1.0 (0.0-0.3: Hard light, 0.4-0.6: Medium, 0.7-1.0: Soft light)

CLASSIC LIGHTING PATTERNS:
- Butterfly/Paramount: Key directly above camera
- Rembrandt: Key 45° side creating triangle on cheek
- Loop: Key 30-45° creating small loop shadow
- Split: Key 90° side
- Clamshell: Key above + fill below`;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = generateRequestId();
  const config = getConfig();
  const logger = createLogger('natural-language-lighting', requestId);
  const metrics = createMetricsTracker('natural-language-lighting', requestId, config.env);

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
    validateConfig(config, ['lovableApiKey']);

    const nlRequest: NaturalLanguageRequest = await req.json();
    logger.info('request.parsed', { subject: nlRequest.subject });

    if (idempotencyKey) {
      setInProgress(idempotencyKey, requestId);
    }

    // Use AI to translate natural language to structured lighting JSON
    const translationResponse = await fetchWithRetry(
      () => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: LIGHTING_SYSTEM_PROMPT },
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
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    );

    if (!translationResponse.ok) {
      logger.error('translation.error', undefined, { status: translationResponse.status });
      if (idempotencyKey) setFailed(idempotencyKey, `Translation error: ${translationResponse.status}`);
      metrics.error(translationResponse.status, 'Translation failed');
      return handleHttpError(translationResponse);
    }

    const translationData = await translationResponse.json();
    const translatedText = translationData.choices?.[0]?.message?.content || "";

    let lightingJson;
    try {
      const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        lightingJson = JSON.parse(jsonMatch[0]);
        lightingJson = validateAndNormalizeLighting(lightingJson);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      logger.warn('parsing.fallback', { reason: 'JSON parse failed' });
      lightingJson = getDefaultLighting(nlRequest.lightingDescription);
    }

    const lightingAnalysis = analyzeLightingFromJson(lightingJson);
    const imagePrompt = buildNLImagePrompt(nlRequest, lightingJson, lightingAnalysis);

    logger.info('prompt.built', { style: lightingJson.lighting_style });

    const imageResponse = await fetchWithRetry(
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

    if (!imageResponse.ok) {
      logger.error('image.error', undefined, { status: imageResponse.status });
      if (idempotencyKey) setFailed(idempotencyKey, `Image error: ${imageResponse.status}`);
      metrics.error(imageResponse.status, 'Image generation failed');
      return handleHttpError(imageResponse);
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    const result = {
      image_url: imageUrl || null,
      image_id: requestId,
      fibo_json: lightingJson,
      lighting_analysis: lightingAnalysis,
      generation_metadata: {
        model: "google/gemini-2.5-flash-image-preview",
        original_description: nlRequest.lightingDescription,
        translated_style: lightingJson.lighting_style,
        mood: lightingJson.mood_description,
        timestamp: new Date().toISOString(),
        request_id: requestId,
        environment: config.env
      }
    };

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

function validateAndNormalizeLighting(lightingJson: Record<string, unknown>): Record<string, unknown> {
  const setup = (lightingJson.lighting_setup || {}) as Record<string, unknown>;
  
  return {
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
}

function normalizeLight(light: unknown, defaults: Record<string, unknown>): Record<string, unknown> {
  if (!light || typeof light !== 'object') return { ...defaults, enabled: false };
  
  const l = light as Record<string, unknown>;
  return {
    direction: l.direction || defaults.direction,
    intensity: Math.max(0, Math.min(1, (l.intensity as number) ?? (defaults.intensity as number))),
    colorTemperature: Math.max(1000, Math.min(10000, (l.colorTemperature || l.color_temperature || defaults.colorTemperature) as number)),
    softness: Math.max(0, Math.min(1, (l.softness as number) ?? (defaults.softness as number))),
    distance: Math.max(0.1, Math.min(5, (l.distance as number) ?? (defaults.distance as number))),
    enabled: l.enabled !== false
  };
}

function getDefaultLighting(description: string): Record<string, unknown> {
  const desc = description.toLowerCase();
  
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

function buildNLImagePrompt(request: NaturalLanguageRequest, lightingJson: Record<string, unknown>, analysis: ReturnType<typeof analyzeLightingFromJson>): string {
  const setup = lightingJson.lighting_setup as Record<string, Record<string, unknown>>;
  
  let lightingDesc = "";
  
  if (setup.key?.enabled) {
    const k = setup.key;
    lightingDesc += `Key light: ${Math.round((k.intensity as number) * 100)}% at ${k.colorTemperature}K, ${(k.softness as number) > 0.6 ? "soft" : (k.softness as number) < 0.3 ? "hard" : "medium"}, from ${k.direction}. `;
  }
  
  if (setup.fill?.enabled) {
    const f = setup.fill;
    lightingDesc += `Fill: ${Math.round((f.intensity as number) * 100)}% (${analysis.keyFillRatio}:1 ratio), from ${f.direction}. `;
  }
  
  if (setup.rim?.enabled) {
    const r = setup.rim;
    lightingDesc += `Rim: ${Math.round((r.intensity as number) * 100)}% at ${r.colorTemperature}K from ${r.direction}. `;
  }

  return `Generate a professional studio photograph with expert lighting:

SUBJECT: ${request.subject}
SCENE: ${request.sceneDescription}
ENVIRONMENT: ${request.environment || 'professional studio'}

LIGHTING SETUP (${(lightingJson.lighting_style as string)?.replace(/_/g, ' ')} style):
${lightingDesc}

MOOD: ${lightingJson.mood_description}
STYLE: ${request.styleIntent || 'professional photography'}

Technical specs: ${analysis.keyFillRatio}:1 key-to-fill ratio, ${analysis.lightingStyle?.replace(/_/g, ' ')} pattern, professional rating ${analysis.professionalRating}/10.

Create a photorealistic, magazine-quality image with precise professional lighting matching the described setup.`;
}

function analyzeLightingFromJson(lightingJson: Record<string, unknown>) {
  const setup = (lightingJson.lighting_setup || {}) as Record<string, Record<string, unknown>>;
  const key = setup.key || { intensity: 0.8 };
  const fill = setup.fill || { intensity: 0.4 };
  const rim = setup.rim || { intensity: 0.5 };

  const keyIntensity = key.enabled !== false ? (key.intensity as number) : 0;
  const fillIntensity = fill.enabled !== false ? (fill.intensity as number) : 0.1;
  
  const keyFillRatio = keyIntensity / Math.max(fillIntensity, 0.1);

  let lightingStyle = (lightingJson.lighting_style as string) || "classical_portrait";
  if (!lightingJson.lighting_style) {
    if (keyFillRatio >= 8) lightingStyle = "high_contrast_dramatic";
    else if (keyFillRatio >= 4) lightingStyle = "dramatic";
    else if (keyFillRatio >= 2) lightingStyle = "classical_portrait";
    else if (keyFillRatio >= 1.5) lightingStyle = "soft_lighting";
    else lightingStyle = "flat_lighting";
  }

  const intensities = [
    key.enabled !== false ? (key.intensity as number) : 0,
    fill.enabled !== false ? (fill.intensity as number) : 0,
    rim?.enabled !== false ? (rim.intensity as number) : 0,
    setup.ambient?.enabled !== false ? ((setup.ambient?.intensity as number) || 0.1) : 0
  ].filter(i => i > 0);
  
  const maxInt = Math.max(...intensities, 0.1);
  const minInt = Math.min(...intensities);
  const contrastScore = intensities.length > 1 ? (maxInt - minInt) / maxInt : 0.5;

  const idealRatio = lightingStyle.includes("dramatic") ? 5.0 : 2.5;
  const ratioScore = 1 - Math.min(Math.abs(keyFillRatio - idealRatio) / 6, 1);
  const professionalRating = Math.round((ratioScore * 0.6 + contrastScore * 0.4) * 100) / 10;

  const temps = [key.colorTemperature as number, fill?.colorTemperature as number, rim?.colorTemperature as number].filter(t => t);
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
    mood: lightingJson.mood_description as string,
    recommendations: [`Translated from: "${lightingJson.mood_description}" description`]
  };
}
