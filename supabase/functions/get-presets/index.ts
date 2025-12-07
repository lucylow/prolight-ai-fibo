import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive professional lighting presets library
const LIGHTING_PRESETS = [
  // Portrait Classics
  {
    preset_id: "butterfly_lighting",
    name: "Butterfly / Paramount",
    description: "Classical beauty lighting. Key light directly above camera creates signature butterfly-shaped shadow under nose. Flattering for most face shapes, emphasizes cheekbones.",
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
    description: "Named after the painter's signature style. Key at 45° creates triangle of light on shadow-side cheek. Dramatic yet flattering, ideal for character portraits.",
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
    description: "Key light at 30-45° creates small loop shadow from nose onto cheek. Most versatile portrait lighting, works for almost any face.",
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
    description: "Key at 90° illuminates exactly half the face. Maximum drama and mystery. Best for artistic/editorial work.",
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
  // Commercial & Product
  {
    preset_id: "high_key",
    name: "High Key",
    description: "Bright, even lighting with minimal shadows. Clean commercial look ideal for fashion, beauty, and product photography.",
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
    description: "Moody, dramatic lighting with deep shadows and high contrast. Perfect for film noir, dramatic portraits, and artistic work.",
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
    description: "Key above + fill below creates wraparound light that minimizes skin texture. Industry standard for beauty and cosmetics photography.",
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
  // Cinematic
  {
    preset_id: "cinematic_warm",
    name: "Cinematic Warm",
    description: "Film-inspired warm tungsten key with cool fill for depth. Creates that classic Hollywood golden hour feel indoors.",
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
    preset_id: "cinematic_cool",
    name: "Cinematic Cool",
    description: "Modern thriller/sci-fi inspired cool tones with strategic warm accents. Creates tension and futuristic atmosphere.",
    category: "cinematic",
    tags: ["cinematic", "cool", "thriller", "scifi", "modern"],
    lighting_setup: {
      key: { direction: "45 degrees elevated", intensity: 0.8, colorTemperature: 7000, softness: 0.4, distance: 1.5, enabled: true },
      fill: { direction: "opposite low", intensity: 0.2, colorTemperature: 6500, softness: 0.6, distance: 3.0, enabled: true },
      rim: { direction: "behind subject, colored", intensity: 0.6, colorTemperature: 3000, softness: 0.3, distance: 0.9, enabled: true },
      ambient: { intensity: 0.05, colorTemperature: 7000, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "medium shot", cameraAngle: "slightly low", fov: 35, lensType: "cinema 24mm", aperture: "f/2.8" },
    key_fill_ratio: 4.0,
    mood: "tense and futuristic"
  },
  // Natural Light Simulation
  {
    preset_id: "window_light",
    name: "Window Light (Natural)",
    description: "Simulates soft natural light from a large window. Beautiful for environmental portraits and lifestyle photography.",
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
    preset_id: "golden_hour",
    name: "Golden Hour",
    description: "Warm backlit setup simulating late afternoon sun. Creates beautiful rim lighting and warm skin tones.",
    category: "natural",
    tags: ["golden hour", "warm", "backlit", "romantic", "outdoor"],
    lighting_setup: {
      key: { direction: "behind subject, elevated (sun position)", intensity: 0.9, colorTemperature: 3000, softness: 0.3, distance: 3.0, enabled: true },
      fill: { direction: "frontal, bounced from environment", intensity: 0.45, colorTemperature: 4500, softness: 0.8, distance: 2.0, enabled: true },
      rim: { direction: "integrated with key", intensity: 0.0, colorTemperature: 3000, softness: 0.3, distance: 1.0, enabled: false },
      ambient: { intensity: 0.25, colorTemperature: 4000, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "medium shot", cameraAngle: "eye-level", fov: 85, lensType: "portrait 85mm", aperture: "f/2" },
    key_fill_ratio: 2.0,
    mood: "warm and romantic"
  },
  // Product & E-commerce
  {
    preset_id: "product_clean",
    name: "Product (Clean White)",
    description: "Even, shadowless lighting for e-commerce and catalog photography. Ensures accurate color reproduction.",
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
  },
  {
    preset_id: "product_dramatic",
    name: "Product (Hero Shot)",
    description: "Dramatic product lighting with defined highlights and shadows. Perfect for luxury goods and hero imagery.",
    category: "product",
    tags: ["product", "luxury", "dramatic", "hero", "advertising"],
    lighting_setup: {
      key: { direction: "45 degrees elevated, strip softbox", intensity: 0.85, colorTemperature: 5600, softness: 0.4, distance: 1.2, enabled: true },
      fill: { direction: "opposite side, subtle", intensity: 0.2, colorTemperature: 5600, softness: 0.7, distance: 2.5, enabled: true },
      rim: { direction: "behind product edges", intensity: 0.7, colorTemperature: 5600, softness: 0.3, distance: 1.0, enabled: true },
      ambient: { intensity: 0.05, colorTemperature: 5000, enabled: true, direction: "omnidirectional" }
    },
    camera_settings: { shotType: "product hero", cameraAngle: "low angle", fov: 35, lensType: "tilt-shift", aperture: "f/11" },
    key_fill_ratio: 4.25,
    mood: "luxurious and aspirational"
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const presetId = url.searchParams.get('id');
    const searchQuery = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    const tag = url.searchParams.get('tag');

    console.log("Get presets request - id:", presetId, "search:", searchQuery, "category:", category, "tag:", tag);

    // Get single preset by ID
    if (presetId) {
      const preset = LIGHTING_PRESETS.find(p => p.preset_id === presetId);
      if (!preset) {
        return new Response(JSON.stringify({ error: "Preset not found" }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(preset), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // Get available categories
    const categories = [...new Set(LIGHTING_PRESETS.map(p => p.category))];
    
    // Get all available tags
    const allTags = [...new Set(LIGHTING_PRESETS.flatMap(p => p.tags))].sort();

    return new Response(JSON.stringify({
      presets: results,
      total: results.length,
      categories,
      tags: allTags
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in get-presets:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
