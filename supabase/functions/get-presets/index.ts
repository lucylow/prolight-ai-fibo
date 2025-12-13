import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getConfig } from "../_shared/config.ts";
import { createLogger, generateRequestId } from "../_shared/logger.ts";
import { createMetricsTracker, aggregateMetrics } from "../_shared/metrics.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/response.ts";

// Comprehensive professional lighting presets library
const LIGHTING_PRESETS = [
  {
    preset_id: "butterfly_lighting",
    name: "Butterfly / Paramount",
    description: "Classical beauty lighting. Key light directly above camera creates signature butterfly-shaped shadow under nose.",
    category: "portrait_classic",
    tags: ["beauty", "glamour", "classic", "flattering"],
    lighting_setup: {
      key: { direction: "directly above camera, butterfly position", intensity: 0.8, colorTemperature: 5600, softness: 0.6, distance: 1.5, enabled: true },
      fill: { direction: "below camera (reflector position)", intensity: 0.35, colorTemperature: 5600, softness: 0.9, distance: 2.0, enabled: true },
      rim: { direction: "behind subject, slightly elevated", intensity: 0.45, colorTemperature: 5600, softness: 0.4, distance: 1.2, enabled: true },
      ambient: { intensity: 0.1, colorTemperature: 5600, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "medium close-up", cameraAngle: "eye-level", fov: 85, lensType: "portrait 85mm", aperture: "f/2.8" },
    key_fill_ratio: 2.3,
    mood: "elegant and glamorous"
  },
  {
    preset_id: "rembrandt_lighting",
    name: "Rembrandt",
    description: "Named after the painter's signature style. Key at 45° creates triangle of light on shadow-side cheek.",
    category: "portrait_classic",
    tags: ["dramatic", "artistic", "classic", "character"],
    lighting_setup: {
      key: { direction: "45 degrees camera-left, elevated 30 degrees", intensity: 0.85, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true },
      fill: { direction: "30 degrees camera-right, slightly low", intensity: 0.25, colorTemperature: 5000, softness: 0.7, distance: 2.5, enabled: true },
      rim: { direction: "behind subject camera-left", intensity: 0.5, colorTemperature: 3500, softness: 0.3, distance: 1.0, enabled: true },
      ambient: { intensity: 0.06, colorTemperature: 5000, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "medium shot", cameraAngle: "eye-level", fov: 85, lensType: "portrait 85mm", aperture: "f/4" },
    key_fill_ratio: 3.4,
    mood: "dramatic and painterly"
  },
  {
    preset_id: "loop_lighting",
    name: "Loop Lighting",
    description: "Key light at 30-45° creates small loop shadow from nose onto cheek. Most versatile portrait lighting.",
    category: "portrait_classic",
    tags: ["versatile", "natural", "flattering", "everyday"],
    lighting_setup: {
      key: { direction: "45 degrees camera-right, slightly elevated", intensity: 0.8, colorTemperature: 5600, softness: 0.55, distance: 1.5, enabled: true },
      fill: { direction: "frontal, camera-left", intensity: 0.4, colorTemperature: 5600, softness: 0.75, distance: 2.0, enabled: true },
      rim: { direction: "behind subject camera-left", intensity: 0.45, colorTemperature: 4000, softness: 0.35, distance: 1.0, enabled: true },
      ambient: { intensity: 0.12, colorTemperature: 5200, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "medium shot", cameraAngle: "eye-level", fov: 85, lensType: "portrait 85mm", aperture: "f/2.8" },
    key_fill_ratio: 2.0,
    mood: "professional and approachable"
  },
  {
    preset_id: "split_lighting",
    name: "Split Lighting",
    description: "Key at 90° illuminates exactly half the face. Maximum drama and mystery.",
    category: "portrait_dramatic",
    tags: ["dramatic", "artistic", "edgy", "editorial"],
    lighting_setup: {
      key: { direction: "90 degrees from camera (direct side)", intensity: 0.95, colorTemperature: 5600, softness: 0.25, distance: 1.2, enabled: true },
      fill: { direction: "opposite side, low intensity", intensity: 0.1, colorTemperature: 5600, softness: 0.6, distance: 3.5, enabled: true },
      rim: { direction: "behind subject, opposite to key", intensity: 0.55, colorTemperature: 3200, softness: 0.2, distance: 0.8, enabled: true },
      ambient: { intensity: 0.04, colorTemperature: 5000, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "close-up", cameraAngle: "eye-level", fov: 85, lensType: "portrait 85mm", aperture: "f/4" },
    key_fill_ratio: 9.5,
    mood: "mysterious and dramatic"
  },
  {
    preset_id: "high_key",
    name: "High Key",
    description: "Bright, even lighting with minimal shadows. Clean commercial look ideal for fashion and beauty.",
    category: "commercial",
    tags: ["bright", "clean", "commercial", "fashion", "beauty"],
    lighting_setup: {
      key: { direction: "frontal, above camera", intensity: 0.7, colorTemperature: 5600, softness: 0.9, distance: 1.8, enabled: true },
      fill: { direction: "frontal, below camera", intensity: 0.6, colorTemperature: 5600, softness: 0.95, distance: 2.0, enabled: true },
      rim: { direction: "behind both sides", intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 1.5, enabled: true },
      ambient: { intensity: 0.3, colorTemperature: 5600, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "medium shot", cameraAngle: "eye-level", fov: 85, lensType: "portrait 85mm", aperture: "f/5.6" },
    key_fill_ratio: 1.17,
    mood: "bright and optimistic"
  },
  {
    preset_id: "low_key",
    name: "Low Key",
    description: "Moody, dramatic lighting with deep shadows and high contrast. Perfect for film noir.",
    category: "dramatic",
    tags: ["moody", "dramatic", "noir", "artistic", "cinematic"],
    lighting_setup: {
      key: { direction: "45 degrees side, high position", intensity: 1.0, colorTemperature: 4500, softness: 0.2, distance: 1.0, enabled: true },
      fill: { direction: "opposite side, very low", intensity: 0.08, colorTemperature: 4500, softness: 0.5, distance: 4.0, enabled: true },
      rim: { direction: "directly behind subject", intensity: 0.65, colorTemperature: 3200, softness: 0.15, distance: 0.7, enabled: true },
      ambient: { intensity: 0.02, colorTemperature: 4000, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "medium close-up", cameraAngle: "slightly low", fov: 85, lensType: "portrait 85mm", aperture: "f/2.8" },
    key_fill_ratio: 12.5,
    mood: "dramatic and mysterious"
  },
  {
    preset_id: "clamshell",
    name: "Clamshell / Beauty",
    description: "Key above + fill below creates wraparound light that minimizes skin texture. Industry standard for beauty.",
    category: "beauty",
    tags: ["beauty", "cosmetics", "flattering", "skin", "commercial"],
    lighting_setup: {
      key: { direction: "above camera, angled down 45 degrees", intensity: 0.75, colorTemperature: 5600, softness: 0.85, distance: 1.4, enabled: true },
      fill: { direction: "below camera, angled up (reflector)", intensity: 0.55, colorTemperature: 5600, softness: 0.95, distance: 1.8, enabled: true },
      rim: { direction: "behind subject, both sides", intensity: 0.35, colorTemperature: 5600, softness: 0.5, distance: 1.3, enabled: true },
      ambient: { intensity: 0.15, colorTemperature: 5600, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "close-up", cameraAngle: "eye-level", fov: 70, lensType: "macro 100mm", aperture: "f/4" },
    key_fill_ratio: 1.36,
    mood: "flawless and polished"
  },
  {
    preset_id: "cinematic_warm",
    name: "Cinematic Warm",
    description: "Film-inspired warm tungsten key with cool fill for depth. Hollywood golden hour feel.",
    category: "cinematic",
    tags: ["cinematic", "warm", "golden", "film", "hollywood"],
    lighting_setup: {
      key: { direction: "45 degrees camera-right, through window simulation", intensity: 0.85, colorTemperature: 3200, softness: 0.6, distance: 1.5, enabled: true },
      fill: { direction: "opposite side, bounced", intensity: 0.3, colorTemperature: 6500, softness: 0.8, distance: 2.5, enabled: true },
      rim: { direction: "behind subject", intensity: 0.4, colorTemperature: 2800, softness: 0.4, distance: 1.0, enabled: true },
      ambient: { intensity: 0.08, colorTemperature: 4000, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "medium shot", cameraAngle: "eye-level", fov: 50, lensType: "cinema 35mm", aperture: "f/2" },
    key_fill_ratio: 2.83,
    mood: "warm and nostalgic"
  },
  {
    preset_id: "window_light",
    name: "Window Light (Natural)",
    description: "Simulates soft natural light from a large window. Beautiful for environmental portraits.",
    category: "natural",
    tags: ["natural", "soft", "window", "lifestyle", "environmental"],
    lighting_setup: {
      key: { direction: "90 degrees side (window simulation)", intensity: 0.75, colorTemperature: 5800, softness: 0.85, distance: 2.0, enabled: true },
      fill: { direction: "opposite wall bounce", intensity: 0.35, colorTemperature: 5500, softness: 0.95, distance: 3.5, enabled: true },
      rim: { direction: "from window edge", intensity: 0.2, colorTemperature: 6000, softness: 0.7, distance: 2.0, enabled: true },
      ambient: { intensity: 0.2, colorTemperature: 5600, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "medium shot", cameraAngle: "eye-level", fov: 50, lensType: "standard 50mm", aperture: "f/2" },
    key_fill_ratio: 2.14,
    mood: "natural and intimate"
  },
  {
    preset_id: "product_clean",
    name: "Product (Clean White)",
    description: "Even, shadowless lighting for e-commerce and catalog photography.",
    category: "product",
    tags: ["product", "ecommerce", "clean", "catalog", "white background"],
    lighting_setup: {
      key: { direction: "above product, large softbox", intensity: 0.7, colorTemperature: 5600, softness: 0.95, distance: 1.5, enabled: true },
      fill: { direction: "front sides, both directions", intensity: 0.6, colorTemperature: 5600, softness: 0.9, distance: 2.0, enabled: true },
      rim: { direction: "behind on white sweep", intensity: 0.8, colorTemperature: 5600, softness: 0.8, distance: 2.5, enabled: true },
      ambient: { intensity: 0.4, colorTemperature: 5600, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "product shot", cameraAngle: "slightly elevated", fov: 50, lensType: "macro 100mm", aperture: "f/8" },
    key_fill_ratio: 1.17,
    mood: "clean and professional"
  }
];

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = generateRequestId();
  const config = getConfig();
  const logger = createLogger('get-presets', requestId);
  const metrics = createMetricsTracker('get-presets', requestId, config.env);

  metrics.invocation();
  logger.info('request.start', { env: config.env });

  try {
    const url = new URL(req.url);
    const presetId = url.searchParams.get('id');
    const searchQuery = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    const tag = url.searchParams.get('tag');
    
    // Special endpoint for metrics
    if (url.pathname.endsWith('/metrics') || url.searchParams.get('metrics') === 'true') {
      const metricsData = aggregateMetrics();
      logger.info('metrics.retrieved', { count: metricsData.length });
      return jsonResponse({
        metrics: metricsData,
        timestamp: new Date().toISOString(),
        window: '60m'
      });
    }

    logger.info('request.parsed', { presetId, searchQuery, category, tag });

    // Get single preset by ID
    if (presetId) {
      const preset = LIGHTING_PRESETS.find(p => p.preset_id === presetId);
      if (!preset) {
        metrics.error(404, 'Preset not found');
        return errorResponse("Preset not found", 404, 'NOT_FOUND');
      }
      metrics.completed(200, { preset: presetId });
      logger.complete(200, { preset: presetId });
      return jsonResponse(preset);
    }

    let results = [...LIGHTING_PRESETS];

    // Filter by category
    if (category) {
      results = results.filter(p => p.category === category);
    }

    // Filter by tag
    if (tag) {
      const tagLower = tag.toLowerCase();
      results = results.filter(p => p.tags.some(t => t.toLowerCase().includes(tagLower)));
    }

    // Search by name/description
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        p => p.name.toLowerCase().includes(query) || 
             p.description.toLowerCase().includes(query) ||
             p.tags.some(t => t.toLowerCase().includes(query)) ||
             p.mood.toLowerCase().includes(query)
      );
    }

    const categories = [...new Set(LIGHTING_PRESETS.map(p => p.category))];
    const allTags = [...new Set(LIGHTING_PRESETS.flatMap(p => p.tags))].sort();

    metrics.completed(200, { resultCount: results.length });
    logger.complete(200, { resultCount: results.length });

    return jsonResponse({
      presets: results,
      total: results.length,
      categories,
      tags: allTags
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error('request.failed', error instanceof Error ? error : errorMessage);
    metrics.error(500, errorMessage);
    return errorResponse(errorMessage, 500);
  }
});
