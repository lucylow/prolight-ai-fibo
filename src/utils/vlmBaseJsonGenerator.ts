/**
 * VLM Base JSON Generator
 * 
 * Uses Vision-Language Model (VLM) to generate base FIBO JSON from natural language scene descriptions.
 * The generated JSON can then be merged with precise 3D lighting controls.
 */

import { FIBOBaseJson } from "./fiboJsonBuilder";

export interface VLMBaseJsonGeneratorOptions {
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

/**
 * System prompt for VLM to generate FIBO JSON structure
 */
const FIBO_JSON_SYSTEM_PROMPT = `You are a professional photography director and lighting expert. Generate structured FIBO JSON prompts for AI image generation.

CRITICAL: Always output valid JSON with this exact structure. No additional text, no markdown formatting.

Required JSON structure:
{
  "subject": {
    "main_entity": "description of main subject",
    "attributes": ["adjective1", "adjective2"],
    "action": "what the subject is doing",
    "emotion": "emotional state",
    "mood": "overall mood"
  },
  "environment": {
    "setting": "location description",
    "time_of_day": "time period",
    "weather": "weather conditions",
    "lighting_conditions": "ambient lighting description",
    "atmosphere": "atmospheric quality"
  },
  "camera": {
    "shot_type": "close-up/medium shot/wide shot",
    "camera_angle": "eye-level/low angle/high angle",
    "fov": 85,
    "lens_type": "portrait/wide/telephoto",
    "aperture": "f/2.8",
    "focus": "focus description",
    "depth_of_field": "shallow/medium/deep"
  },
  "style_medium": "photograph",
  "artistic_style": "photography style description",
  "color_palette": {
    "white_balance": "5500K",
    "mood": "warm/cool/neutral"
  },
  "composition": {
    "rule_of_thirds": true,
    "depth_layers": ["foreground", "subject", "background"]
  }
}

NOTE: Do NOT include a "lighting" section - lighting will be added separately from 3D controls.

Generate realistic, professional descriptions that match the scene description provided.`;

/**
 * Generate base FIBO JSON from scene description using VLM
 * 
 * This function calls a VLM API to generate the base JSON structure.
 * In a real implementation, you would integrate with your VLM service (e.g., Bria VLM, Gemini, etc.)
 * 
 * @param sceneDescription - Natural language description of the scene
 * @param options - Optional configuration
 * @returns Promise resolving to base FIBO JSON (without lighting section)
 */
export async function generateBaseJsonFromScene(
  sceneDescription: string,
  options: VLMBaseJsonGeneratorOptions = {}
): Promise<FIBOBaseJson> {
  // This is a placeholder - in real implementation, you would call your VLM API
  // For now, we'll create a reasonable default structure based on the description

  // Extract key information from scene description (basic parsing)
  const lowerDesc = sceneDescription.toLowerCase();
  
  // Determine environment type
  let environment: string;
  let timeOfDay: string;
  let atmosphere: string;
  
  if (lowerDesc.includes("outdoor") || lowerDesc.includes("outside") || lowerDesc.includes("garden") || lowerDesc.includes("park")) {
    environment = "outdoor location";
    timeOfDay = lowerDesc.includes("night") ? "night" : lowerDesc.includes("sunset") ? "sunset" : lowerDesc.includes("dawn") ? "dawn" : "daytime";
    atmosphere = "natural";
  } else if (lowerDesc.includes("studio") || lowerDesc.includes("backdrop")) {
    environment = "professional studio";
    timeOfDay = "controlled lighting";
    atmosphere = "controlled";
  } else {
    environment = "indoor setting";
    timeOfDay = "controlled lighting";
    atmosphere = "indoor";
  }

  // Determine mood/emotion
  let mood = "neutral";
  let emotion = "calm";
  if (lowerDesc.includes("dramatic") || lowerDesc.includes("intense")) {
    mood = "dramatic";
    emotion = "intense";
  } else if (lowerDesc.includes("soft") || lowerDesc.includes("gentle") || lowerDesc.includes("peaceful")) {
    mood = "soft";
    emotion = "calm";
  } else if (lowerDesc.includes("professional") || lowerDesc.includes("corporate")) {
    mood = "professional";
    emotion = "confident";
  }

  // Build base JSON structure
  const baseJson: FIBOBaseJson = {
    subject: {
      main_entity: sceneDescription.split(",")[0].trim() || sceneDescription,
      attributes: ["professionally lit", "high quality", "detailed", "sharp focus"],
      action: "posed for professional photograph",
      emotion,
      mood,
    },
    environment: {
      setting: environment,
      time_of_day: timeOfDay,
      weather: environment.includes("outdoor") ? "clear" : "indoor",
      lighting_conditions: "professional studio",
      atmosphere,
    },
    camera: {
      shot_type: "medium shot",
      camera_angle: "eye-level",
      fov: 85,
      lens_type: "portrait 85mm",
      aperture: "f/2.8",
      focus: "sharp on subject",
      depth_of_field: "shallow",
    },
    style_medium: "photograph",
    artistic_style: "professional studio photography",
    color_palette: {
      white_balance: "5500K",
      mood: "neutral",
    },
    composition: {
      rule_of_thirds: true,
      depth_layers: ["foreground", "subject", "background"],
    },
    enhancements: {
      professional_grade: true,
      color_fidelity: true,
      detail_enhancement: true,
    },
  };

  // In a real implementation, you would call the VLM API here:
  /*
  const response = await fetch(options.endpoint || 'https://api.vlm-service.com/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: sceneDescription,
      system_prompt: FIBO_JSON_SYSTEM_PROMPT,
      format: 'json',
      model: options.model || 'default',
    }),
  });

  const result = await response.json();
  const vlmJson = JSON.parse(result.json_prompt || result.text);
  
  // Validate and merge with our structure
  return {
    ...baseJson,
    ...vlmJson,
    // Ensure lighting is not included (will be added separately)
    lighting: undefined,
  };
  */

  return baseJson;
}

/**
 * Call actual VLM API to generate structured JSON
 * 
 * This is the real implementation that calls your VLM service.
 * Replace with your actual VLM API integration.
 */
export async function callVLMForBaseJson(
  sceneDescription: string,
  apiKey: string,
  endpoint: string
): Promise<FIBOBaseJson> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: sceneDescription,
        system_prompt: FIBO_JSON_SYSTEM_PROMPT,
        format: "json",
        model: "structured-prompt-generator",
      }),
    });

    if (!response.ok) {
      throw new Error(`VLM API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Extract JSON from response (may be wrapped in text field)
    let jsonText = result.json_prompt || result.text || result.content;
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    // Parse JSON
    const vlmJson: FIBOBaseJson = JSON.parse(jsonText);
    
    // Remove lighting section if present (we'll add it from 3D controls)
    if (vlmJson.lighting) {
      delete vlmJson.lighting;
    }
    
    return vlmJson;
  } catch (error) {
    console.error("Error calling VLM for base JSON:", error);
    // Fallback to basic structure
    return generateBaseJsonFromScene(sceneDescription);
  }
}

/**
 * Validate base JSON structure
 */
export function validateBaseJson(json: unknown): json is FIBOBaseJson {
  if (!json || typeof json !== "object") {
    return false;
  }
  
  // Should have at least subject or environment
  return (
    (json.subject && typeof json.subject === "object") ||
    (json.environment && typeof json.environment === "object")
  );
}
