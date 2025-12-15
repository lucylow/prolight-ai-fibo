/**
 * useFIBOAgent Hook
 * Production-ready LLM integration for translating natural language feedback to FIBO JSON diffs
 * Supports OpenAI GPT-4o-mini and Google Gemini API
 */

import { useCallback, useState } from 'react';
import type { FIBOPrompt, FIBOLighting } from '@/types/fibo';

interface FIBOLightingDiff {
  main_light?: Partial<FIBOLighting['main_light']>;
  fill_light?: Partial<FIBOLighting['fill_light']>;
  rim_light?: Partial<FIBOLighting['rim_light']>;
  ambient_light?: Partial<FIBOLighting['ambient_light']>;
  // Backward compatibility
  mainLight?: Partial<FIBOLighting['mainLight']>;
  fillLight?: Partial<FIBOLighting['fillLight']>;
  rimLight?: Partial<FIBOLighting['rimLight']>;
  ambientLight?: Partial<FIBOLighting['ambientLight']>;
}

const LLM_TRANSLATOR_SYSTEM_PROMPT = `You are ProLight AI Agent, an expert at translating natural language photography feedback into precise FIBO JSON lighting parameter changes.

RULES:
1. ONLY modify lighting parameters (main_light, fill_light, rim_light, ambient_light)
2. Return ONLY valid JSON with the changed lighting fields
3. NEVER change camera, subject, environment, or other fields
4. Use realistic photography values:
   - intensity: 0.0-2.0 (typical: 0.5-1.5)
   - colorTemperature: 2000-10000 Kelvin (warm: 3000-4000K, neutral: 5000-6000K, cool: 7000-8000K)
   - softness: 0.0-1.0 (hard: 0.0-0.3, soft: 0.5-1.0)
   - direction: one of 'front', 'front-right', 'front-left', 'right', 'left', 'back-right', 'back-left', 'back', 'top', 'bottom'

TRANSLATION EXAMPLES:
- "more dramatic" → increase rim_light intensity +0.3-0.5, decrease fill_light intensity -0.2
- "softer shadows" → increase fill_light intensity +0.2-0.3, increase key_light softness +0.2
- "golden hour" → set colorTemperature to 3000-4000K for all lights
- "studio clean" → set all lights to 5600K, even intensities around 1.0-1.2
- "high key" → increase all light intensities, especially fill_light
- "low key" → decrease fill_light, increase rim_light contrast
- "warmer" → decrease colorTemperature by 1000-2000K
- "cooler" → increase colorTemperature by 1000-2000K

Current FIBO JSON:
\`\`\`json
CURRENT_FIBO_PLACEHOLDER
\`\`\`

User instruction: "{instruction}"

Return ONLY a valid JSON object with the lighting fields to change. Example response:
{
  "rim_light": {"intensity": 1.6, "colorTemperature": 3200},
  "fill_light": {"intensity": 0.4}
}`;

/**
 * Translate natural language feedback to FIBO lighting diff using OpenAI
 */
async function translateWithOpenAI(
  currentFIBO: FIBOPrompt,
  instruction: string,
  apiKey: string
): Promise<FIBOLightingDiff> {
  const prompt = LLM_TRANSLATOR_SYSTEM_PROMPT
    .replace('CURRENT_FIBO_PLACEHOLDER', JSON.stringify({ lighting: currentFIBO.lighting }, null, 2))
    .replace('{instruction}', instruction);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a JSON-only API. Return ONLY valid JSON, no markdown, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content?.trim() || '{}';

  // Remove markdown code blocks if present
  const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(jsonContent);
  } catch (e) {
    console.error('Failed to parse OpenAI response:', jsonContent);
    throw new Error('Invalid JSON response from OpenAI');
  }
}

/**
 * Translate natural language feedback to FIBO lighting diff using Gemini
 */
async function translateWithGemini(
  currentFIBO: FIBOPrompt,
  instruction: string,
  apiKey: string
): Promise<FIBOLightingDiff> {
  const prompt = LLM_TRANSLATOR_SYSTEM_PROMPT
    .replace('CURRENT_FIBO_PLACEHOLDER', JSON.stringify({ lighting: currentFIBO.lighting }, null, 2))
    .replace('{instruction}', instruction);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';

  // Remove markdown code blocks if present
  const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(jsonContent);
  } catch (e) {
    console.error('Failed to parse Gemini response:', jsonContent);
    throw new Error('Invalid JSON response from Gemini');
  }
}

/**
 * Translate using backend API endpoint (if available)
 */
async function translateWithBackendAPI(
  currentFIBO: FIBOPrompt,
  instruction: string
): Promise<FIBOLightingDiff> {
  const response = await fetch('/api/gemini/fibo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: instruction,
      currentFIBO: currentFIBO,
      system: LLM_TRANSLATOR_SYSTEM_PROMPT,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  
  // If the backend returns a full FIBO, extract just the lighting diff
  if (data.fibo?.lighting) {
    return data.fibo.lighting;
  }
  
  return data.lightingDiff || data;
}

/**
 * Main hook for FIBO agentic iteration
 */
export function useFIBOAgent() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Translate natural language feedback to FIBO lighting diff
   */
  const translateFeedback = useCallback(
    async (currentFIBO: FIBOPrompt, instruction: string): Promise<FIBOLightingDiff> => {
      setIsTranslating(true);
      setError(null);

      try {
        // Priority order: Backend API > OpenAI > Gemini
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
        const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;

        // Try backend API first (if available)
        try {
          return await translateWithBackendAPI(currentFIBO, instruction);
        } catch (backendError) {
          console.warn('Backend API not available, trying direct API:', backendError);
        }

        // Try OpenAI
        if (openaiKey) {
          try {
            return await translateWithOpenAI(currentFIBO, instruction, openaiKey);
          } catch (openaiError) {
            console.warn('OpenAI API failed, trying Gemini:', openaiError);
            if (geminiKey) {
              return await translateWithGemini(currentFIBO, instruction, geminiKey);
            }
            throw openaiError;
          }
        }

        // Try Gemini
        if (geminiKey) {
          return await translateWithGemini(currentFIBO, instruction, geminiKey);
        }

        // Fallback to mock (for development)
        console.warn('No LLM API keys found. Using mock translation.');
        return await mockTranslation(currentFIBO, instruction);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Translation error:', err);
        
        // Fallback to mock on error
        console.warn('Falling back to mock translation due to error');
        return await mockTranslation(currentFIBO, instruction);
      } finally {
        setIsTranslating(false);
      }
    },
    []
  );

  return {
    translateFeedback,
    isTranslating,
    error,
  };
}

/**
 * Mock translation for development/fallback
 */
async function mockTranslation(
  currentFIBO: FIBOPrompt,
  instruction: string
): Promise<FIBOLightingDiff> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 300));

  const lowerInstruction = instruction.toLowerCase();
  const mockResponses: Record<string, FIBOLightingDiff> = {
    dramatic: {
      rim_light: { intensity: 1.8, colorTemperature: 3200 },
      fill_light: { intensity: 0.3 },
    },
    softer: {
      main_light: { softness: 0.6, intensity: 1.0 },
      fill_light: { intensity: 0.9 },
    },
    'golden hour': {
      main_light: { colorTemperature: 3500 },
      rim_light: { colorTemperature: 3200, intensity: 1.4 },
    },
    studio: {
      main_light: { intensity: 1.4, colorTemperature: 5600 },
      fill_light: { intensity: 0.8, colorTemperature: 5600 },
      rim_light: { intensity: 0.6, colorTemperature: 5600 },
    },
  };

  // Check for partial matches
  for (const [key, value] of Object.entries(mockResponses)) {
    if (lowerInstruction.includes(key)) {
      return value;
    }
  }

  // Default response
  return mockResponses.studio;
}
