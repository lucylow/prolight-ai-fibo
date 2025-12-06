import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIGHTING_PRESETS = [
  {
    preset_id: "butterfly_lighting",
    name: "Butterfly Lighting",
    description: "Classical beauty lighting with key light above camera creating butterfly shadow under nose",
    lighting_setup: {
      key: { direction: "directly above camera", intensity: 0.8, colorTemperature: 5600, softness: 0.4, distance: 1.5, enabled: true },
      fill: { direction: "below camera", intensity: 0.2, colorTemperature: 5600, softness: 0.8, distance: 2.0, enabled: true },
      rim: { direction: "behind subject", intensity: 0.5, colorTemperature: 3200, softness: 0.3, distance: 1.0, enabled: true },
      ambient: { intensity: 0.1, colorTemperature: 5000, enabled: true }
    },
    camera_settings: { shotType: "medium close-up", cameraAngle: "eye-level", fov: 85, lensType: "portrait", aperture: "f/2.8" }
  },
  {
    preset_id: "rembrandt_lighting",
    name: "Rembrandt Lighting",
    description: "Dramatic lighting with key light at 45 degrees creating triangle of light on cheek",
    lighting_setup: {
      key: { direction: "45 degrees left and above", intensity: 0.9, colorTemperature: 5600, softness: 0.6, distance: 1.5, enabled: true },
      fill: { direction: "30 degrees right", intensity: 0.3, colorTemperature: 4500, softness: 0.7, distance: 2.0, enabled: true },
      rim: { direction: "behind left", intensity: 0.4, colorTemperature: 3200, softness: 0.4, distance: 1.0, enabled: true },
      ambient: { intensity: 0.05, colorTemperature: 5000, enabled: true }
    },
    camera_settings: { shotType: "medium shot", cameraAngle: "eye-level", fov: 85, lensType: "portrait", aperture: "f/4" }
  },
  {
    preset_id: "loop_lighting",
    name: "Loop Lighting",
    description: "Key light at 45 degrees creating small loop shadow from nose",
    lighting_setup: {
      key: { direction: "45 degrees camera-right", intensity: 0.85, colorTemperature: 5600, softness: 0.5, distance: 1.5, enabled: true },
      fill: { direction: "frontal soft", intensity: 0.35, colorTemperature: 5600, softness: 0.8, distance: 2.0, enabled: true },
      rim: { direction: "behind subject left", intensity: 0.5, colorTemperature: 4000, softness: 0.3, distance: 1.0, enabled: true },
      ambient: { intensity: 0.1, colorTemperature: 5000, enabled: true }
    },
    camera_settings: { shotType: "medium shot", cameraAngle: "eye-level", fov: 85, lensType: "portrait", aperture: "f/2.8" }
  },
  {
    preset_id: "split_lighting",
    name: "Split Lighting",
    description: "Dramatic side lighting illuminating exactly half the face",
    lighting_setup: {
      key: { direction: "directly from side 90 degrees", intensity: 0.95, colorTemperature: 5600, softness: 0.3, distance: 1.2, enabled: true },
      fill: { direction: "opposite side", intensity: 0.1, colorTemperature: 5600, softness: 0.5, distance: 3.0, enabled: true },
      rim: { direction: "behind opposite side", intensity: 0.6, colorTemperature: 3200, softness: 0.2, distance: 0.8, enabled: true },
      ambient: { intensity: 0.05, colorTemperature: 5000, enabled: true }
    },
    camera_settings: { shotType: "close-up", cameraAngle: "eye-level", fov: 85, lensType: "portrait", aperture: "f/4" }
  },
  {
    preset_id: "high_key",
    name: "High Key Lighting",
    description: "Bright, even lighting with minimal shadows for clean commercial look",
    lighting_setup: {
      key: { direction: "frontal above camera", intensity: 0.7, colorTemperature: 5600, softness: 0.9, distance: 1.8, enabled: true },
      fill: { direction: "frontal below camera", intensity: 0.6, colorTemperature: 5600, softness: 0.9, distance: 2.0, enabled: true },
      rim: { direction: "behind both sides", intensity: 0.4, colorTemperature: 5600, softness: 0.7, distance: 1.5, enabled: true },
      ambient: { intensity: 0.3, colorTemperature: 5600, enabled: true }
    },
    camera_settings: { shotType: "medium shot", cameraAngle: "eye-level", fov: 85, lensType: "portrait", aperture: "f/5.6" }
  },
  {
    preset_id: "low_key",
    name: "Low Key Lighting",
    description: "Moody, dramatic lighting with deep shadows and high contrast",
    lighting_setup: {
      key: { direction: "45 degrees side high", intensity: 1.0, colorTemperature: 4500, softness: 0.2, distance: 1.0, enabled: true },
      fill: { direction: "opposite side low", intensity: 0.1, colorTemperature: 4500, softness: 0.4, distance: 3.0, enabled: true },
      rim: { direction: "behind subject", intensity: 0.7, colorTemperature: 3200, softness: 0.1, distance: 0.8, enabled: true },
      ambient: { intensity: 0.02, colorTemperature: 4000, enabled: true }
    },
    camera_settings: { shotType: "medium close-up", cameraAngle: "slightly low", fov: 85, lensType: "portrait", aperture: "f/2.8" }
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

    console.log("Get presets request - id:", presetId, "search:", searchQuery);

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

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const results = LIGHTING_PRESETS.filter(
        p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)
      );
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(LIGHTING_PRESETS), {
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
