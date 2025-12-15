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

interface AnalysisRequest {
  lightingSetup: Record<string, LightSettings>;
  styleContext?: string;
}

// Professional lighting style definitions with ratio ranges
const LIGHTING_STYLES: Record<string, { ratioRange: [number, number]; description: string }> = {
  high_contrast_dramatic: { ratioRange: [8.0, Infinity], description: "Dramatic, high-contrast lighting with deep shadows" },
  dramatic: { ratioRange: [4.0, 8.0], description: "Dramatic lighting with strong shadows" },
  classical_portrait: { ratioRange: [2.0, 4.0], description: "Classical portrait lighting with balanced contrast" },
  soft_lighting: { ratioRange: [1.5, 2.0], description: "Soft, flattering lighting with gentle shadows" },
  flat_lighting: { ratioRange: [1.0, 1.5], description: "Flat, even lighting with minimal shadows" },
  ultra_soft: { ratioRange: [0.0, 1.0], description: "Very soft, almost shadowless lighting" }
};

// Professional rating configurations per style context
const PROFESSIONAL_RATINGS: Record<string, { idealRatio: [number, number]; maxScore: number }> = {
  portrait: { idealRatio: [2.0, 3.0], maxScore: 10 },
  fashion: { idealRatio: [3.0, 6.0], maxScore: 10 },
  product: { idealRatio: [1.5, 2.5], maxScore: 10 },
  dramatic: { idealRatio: [4.0, 8.0], maxScore: 10 },
  beauty: { idealRatio: [1.2, 2.0], maxScore: 10 },
  commercial: { idealRatio: [1.5, 2.5], maxScore: 10 },
  editorial: { idealRatio: [2.5, 5.0], maxScore: 10 }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both direct lightingSetup or wrapped request
    const lightingSetup: Record<string, LightSettings> = body.lightingSetup || body;
    const styleContext: string = body.styleContext || "portrait";
    
    console.log("Analyzing lighting setup:", JSON.stringify(lightingSetup));
    console.log("Style context:", styleContext);

    const analysis = analyzeLighting(lightingSetup, styleContext);
    console.log("Analysis result:", JSON.stringify(analysis));

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in analyze-lighting:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeLighting(lightingSetup: Record<string, LightSettings>, styleContext: string) {
  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  const rim = lightingSetup.rim;
  const ambient = lightingSetup.ambient;

  // Calculate key metrics
  const keyFillRatio = calculateKeyFillRatio(key, fill);
  const contrastScore = calculateContrastScore(lightingSetup);
  const totalExposure = calculateTotalExposure(lightingSetup);
  const colorAnalysis = analyzeColorTemperatures(lightingSetup);
  const shadowAnalysis = analyzeShadowCharacteristics(lightingSetup);
  
  // Determine lighting style
  const lightingStyle = determineLightingStyle(keyFillRatio);
  const lightingStyleDescription = LIGHTING_STYLES[lightingStyle]?.description || "Custom lighting setup";
  
  // Calculate professional rating
  const professionalRating = calculateProfessionalRating(keyFillRatio, contrastScore, styleContext);
  
  // Generate recommendations
  const recommendations = generateRecommendations(lightingSetup, keyFillRatio, styleContext);
  
  // Generate technical notes
  const technicalNotes = generateTechnicalNotes(lightingSetup, colorAnalysis, shadowAnalysis);
  
  // Calculate 3D light positions for visualization
  const lightPositions = calculate3DLightPositions(lightingSetup);

  return {
    keyFillRatio: Math.round(keyFillRatio * 100) / 100,
    lightingStyle,
    lightingStyleDescription,
    contrastScore: Math.round(contrastScore * 100) / 100,
    totalExposure: Math.round(Math.min(totalExposure, 1.5) * 100) / 100,
    colorAnalysis,
    shadowAnalysis,
    professionalRating: Math.round(professionalRating * 10) / 10,
    recommendations,
    technicalNotes,
    lightPositions,
    styleContext
  };
}

function calculateKeyFillRatio(key?: LightSettings, fill?: LightSettings): number {
  if (!key || !key.enabled) return 1.0;
  const fillIntensity = fill?.enabled ? fill.intensity : 0.1;
  return key.intensity / Math.max(fillIntensity, 0.1);
}

function calculateContrastScore(lightingSetup: Record<string, LightSettings>): number {
  const intensities = Object.values(lightingSetup)
    .filter(light => light?.enabled)
    .map(light => light.intensity);
  
  if (intensities.length < 2) return 0.3;
  
  const maxIntensity = Math.max(...intensities);
  const minIntensity = Math.min(...intensities);
  
  if (maxIntensity === 0) return 0.0;
  
  const rawContrast = (maxIntensity - minIntensity) / maxIntensity;
  return Math.min(rawContrast * 1.2, 1.0);
}

function calculateTotalExposure(lightingSetup: Record<string, LightSettings>): number {
  return Object.values(lightingSetup)
    .filter(light => light?.enabled)
    .reduce((sum, light) => sum + light.intensity, 0);
}

function analyzeColorTemperatures(lightingSetup: Record<string, LightSettings>) {
  const activeLights = Object.values(lightingSetup).filter(light => light?.enabled);
  
  if (activeLights.length === 0) {
    return { 
      averageTemperature: 5600, 
      temperatureRange: "5600K-5600K",
      harmonyScore: 1.0, 
      harmonyAssessment: "neutral" 
    };
  }
  
  const temps = activeLights.map(light => light.colorTemperature);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  
  // Calculate variance and harmony score
  const variance = temps.reduce((sum, temp) => sum + Math.pow(temp - avgTemp, 2), 0) / temps.length;
  const harmonyScore = Math.max(0, 1 - (variance / 2000000));
  
  // Determine harmony assessment
  let harmonyAssessment: string;
  if (harmonyScore > 0.8) harmonyAssessment = "harmonious";
  else if (harmonyScore > 0.6) harmonyAssessment = "balanced";
  else if (harmonyScore > 0.4) harmonyAssessment = "contrasting";
  else harmonyAssessment = "creative_contrast";
  
  // Determine warmth
  let warmthDescription: string;
  if (avgTemp < 3500) warmthDescription = "very warm (tungsten)";
  else if (avgTemp < 4500) warmthDescription = "warm";
  else if (avgTemp < 5500) warmthDescription = "neutral";
  else if (avgTemp < 6500) warmthDescription = "daylight";
  else warmthDescription = "cool";

  return {
    averageTemperature: Math.round(avgTemp),
    temperatureRange: `${Math.min(...temps)}K-${Math.max(...temps)}K`,
    harmonyScore: Math.round(harmonyScore * 100) / 100,
    harmonyAssessment,
    warmthDescription,
    temperatures: temps
  };
}

function analyzeShadowCharacteristics(lightingSetup: Record<string, LightSettings>) {
  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  
  if (!key || !key.enabled) {
    return { shadowIntensity: 0.1, shadowSoftness: 0.5, shadowCharacter: "soft" };
  }
  
  const fillIntensity = fill?.enabled ? fill.intensity : 0.1;
  const shadowIntensity = Math.max(0, 1 - (fillIntensity / Math.max(key.intensity, 0.1)));
  const shadowSoftness = key.softness;
  
  // Determine shadow character
  let shadowCharacter: string;
  if (shadowIntensity > 0.7 && shadowSoftness < 0.4) shadowCharacter = "hard_dramatic";
  else if (shadowIntensity > 0.7) shadowCharacter = "dramatic";
  else if (shadowIntensity > 0.4) shadowCharacter = "defined";
  else if (shadowSoftness > 0.7) shadowCharacter = "very_soft";
  else shadowCharacter = "soft";

  return {
    shadowIntensity: Math.round(shadowIntensity * 100) / 100,
    shadowSoftness: Math.round(shadowSoftness * 100) / 100,
    shadowCharacter,
    transitionQuality: shadowSoftness > 0.5 ? "gradual" : "sharp"
  };
}

function determineLightingStyle(keyFillRatio: number): string {
  for (const [style, config] of Object.entries(LIGHTING_STYLES)) {
    const [minRatio, maxRatio] = config.ratioRange;
    if (keyFillRatio >= minRatio && keyFillRatio < maxRatio) {
      return style;
    }
  }
  return "classical_portrait";
}

function calculateProfessionalRating(keyFillRatio: number, contrastScore: number, styleContext: string): number {
  const styleConfig = PROFESSIONAL_RATINGS[styleContext] || PROFESSIONAL_RATINGS.portrait;
  const [idealMin, idealMax] = styleConfig.idealRatio;
  const maxScore = styleConfig.maxScore;
  
  // Ratio score: how close to ideal ratio
  let ratioScore: number;
  if (keyFillRatio >= idealMin && keyFillRatio <= idealMax) {
    ratioScore = 1.0;
  } else {
    const distance = Math.min(Math.abs(keyFillRatio - idealMin), Math.abs(keyFillRatio - idealMax));
    ratioScore = Math.max(0, 1 - (distance / (idealMax * 2)));
  }
  
  // Combined score with weights
  return Math.min((ratioScore * 0.6 + contrastScore * 0.4) * maxScore, maxScore);
}

function generateRecommendations(
  lightingSetup: Record<string, LightSettings>,
  keyFillRatio: number,
  styleContext: string
): string[] {
  const recommendations: string[] = [];
  const key = lightingSetup.key;
  const fill = lightingSetup.fill;
  const rim = lightingSetup.rim;
  const ambient = lightingSetup.ambient;
  
  const styleConfig = PROFESSIONAL_RATINGS[styleContext] || PROFESSIONAL_RATINGS.portrait;
  const [idealMin, idealMax] = styleConfig.idealRatio;
  
  // Ratio-based recommendations
  if (keyFillRatio > idealMax) {
    recommendations.push(`Consider reducing key light or increasing fill light to achieve ideal ${styleContext} ratio (${idealMin}:1 to ${idealMax}:1)`);
  } else if (keyFillRatio < idealMin) {
    recommendations.push(`Consider increasing key light intensity for better definition in ${styleContext} photography`);
  }
  
  // Individual light recommendations
  if (key) {
    if (key.softness < 0.3) {
      recommendations.push("Soften key light for more flattering shadows and better skin texture");
    }
    if (key.intensity > 0.95) {
      recommendations.push("Key light is at maximum - consider reducing to avoid overexposure on highlights");
    }
  }
  
  if (fill && fill.enabled && fill.intensity < 0.2) {
    recommendations.push("Increase fill light to reveal more shadow detail and reduce harsh transitions");
  }
  
  if (!rim || !rim.enabled) {
    recommendations.push("Add a rim/hair light to separate subject from background and add depth");
  } else if (rim.intensity > 0.85) {
    recommendations.push("Rim light is very strong - consider reducing for more natural edge lighting");
  }
  
  if (ambient && ambient.intensity > 0.4) {
    recommendations.push("High ambient light may flatten the image - reduce for more three-dimensional look");
  }
  
  // Color temperature recommendations
  const colorAnalysis = analyzeColorTemperatures(lightingSetup);
  if (colorAnalysis.harmonyAssessment === "creative_contrast") {
    recommendations.push("Color temperatures vary significantly - ensure this is intentional for creative effect");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Excellent lighting setup! Well balanced for professional " + styleContext + " results.");
  }
  
  return recommendations;
}

function generateTechnicalNotes(
  lightingSetup: Record<string, LightSettings>,
  colorAnalysis: any,
  shadowAnalysis: any
): string[] {
  const notes: string[] = [];
  
  // Count active lights
  const activeLights = Object.values(lightingSetup).filter(light => light?.enabled).length;
  notes.push(`Active lights: ${activeLights}/4`);
  
  // Color temperature notes
  notes.push(`Color temperature range: ${colorAnalysis.temperatureRange}`);
  notes.push(`Color harmony: ${colorAnalysis.harmonyAssessment} (score: ${colorAnalysis.harmonyScore})`);
  notes.push(`Overall warmth: ${colorAnalysis.warmthDescription}`);
  
  // Shadow notes
  notes.push(`Shadow character: ${shadowAnalysis.shadowCharacter}`);
  notes.push(`Shadow transitions: ${shadowAnalysis.transitionQuality}`);
  
  // Exposure notes
  const totalExposure = calculateTotalExposure(lightingSetup);
  if (totalExposure > 1.2) {
    notes.push("⚠️ High total exposure - watch for overexposure on highlights");
  } else if (totalExposure < 0.5) {
    notes.push("⚠️ Low total exposure - consider increasing light intensities");
  } else {
    notes.push("✓ Total exposure in optimal range");
  }
  
  return notes;
}

function calculate3DLightPositions(lightingSetup: Record<string, LightSettings>): Record<string, { x: number; y: number; z: number }> {
  const positions: Record<string, { x: number; y: number; z: number }> = {};
  
  for (const [lightType, settings] of Object.entries(lightingSetup)) {
    if (!settings?.enabled) continue;
    
    const direction = settings.direction.toLowerCase();
    const distance = settings.distance || 1.5;
    
    // Convert direction description to 3D coordinates
    if (direction.includes("45 degrees") && direction.includes("right")) {
      positions[lightType] = { x: 0.7 * distance, y: 0.7, z: 0.5 * distance };
    } else if (direction.includes("45 degrees") && direction.includes("left")) {
      positions[lightType] = { x: -0.7 * distance, y: 0.7, z: 0.5 * distance };
    } else if (direction.includes("behind")) {
      positions[lightType] = { x: 0.0, y: 0.8, z: -0.8 * distance };
    } else if (direction.includes("above") || direction.includes("butterfly")) {
      positions[lightType] = { x: 0.0, y: 1.2, z: 0.3 * distance };
    } else if (direction.includes("below")) {
      positions[lightType] = { x: 0.0, y: -0.5, z: 0.5 * distance };
    } else if (direction.includes("frontal") || direction.includes("front")) {
      positions[lightType] = { x: 0.0, y: 0.5, z: 1.0 * distance };
    } else if (direction.includes("side") || direction.includes("90")) {
      positions[lightType] = { x: 1.0 * distance, y: 0.5, z: 0.0 };
    } else {
      positions[lightType] = { x: 0.5 * distance, y: 0.7, z: 0.5 * distance };
    }
  }
  
  return positions;
}
