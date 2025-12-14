/**
 * Mock Data Service
 * Provides consistent mock data fallbacks for when API calls fail
 */

import type {
  GenerationResponse,
  PresetListResponse,
  HistoryResponse,
  HistoryItem,
  BatchJobResponse,
  LightingAnalysis,
  LightingPreset,
  GenerateRequest,
} from '@/types/fibo';

/**
 * Generate a random ID for mock data
 */
const generateMockId = (prefix: string = 'mock'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a placeholder image URL
 */
const getPlaceholderImage = (width: number = 2048, height: number = 2048, text?: string): string => {
  const textParam = text ? encodeURIComponent(text) : 'ProLight+AI';
  return `https://via.placeholder.com/${width}x${height}?text=${textParam}`;
};

/**
 * Mock generation response
 */
export const getMockGenerationResponse = (request?: GenerateRequest): GenerationResponse => {
  const sceneDesc = request?.scene_description || 'Professional product photography';
  
  return {
    generation_id: generateMockId('gen'),
    status: 'success',
    image_url: getPlaceholderImage(2048, 2048, sceneDesc),
    duration_seconds: Math.random() * 2 + 2, // 2-4 seconds
    cost_credits: 0.04,
    analysis: {
      key_to_fill_ratio: 2.5,
      color_temperature_consistency: 0.95,
      professional_rating: 8.5,
      mood_assessment: 'professional, confident',
      recommendations: [
        'Consider increasing fill light for softer shadows',
        'Maintain consistent color temperature across all lights',
      ],
    },
    timestamp: new Date().toISOString(),
  };
};

/**
 * Mock preset list response
 */
export const getMockPresetListResponse = (category?: string): PresetListResponse => {
  const defaultMainLight = {
    type: 'area' as const,
    direction: '45 degrees camera-right',
    position: [1, 1, 1] as [number, number, number],
    intensity: 0.8,
    colorTemperature: 5600,
    softness: 0.5,
    enabled: true,
    distance: 1.5,
  };

  const allPresets: LightingPreset[] = [
    {
      presetId: 'butterfly_classic',
      name: 'Butterfly Classic',
      category: 'portrait',
      description: 'Soft, flattering beauty lighting with minimal shadows',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: 'above camera' },
        lightingStyle: 'butterfly',
      },
      ideal_for: ['beauty', 'commercial', 'headshots'],
    },
    {
      presetId: 'rembrandt_classic',
      name: 'Rembrandt Classic',
      category: 'portrait',
      description: 'Dramatic side lighting with characteristic triangle',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: '45 degrees side' },
        lightingStyle: 'rembrandt',
      },
      ideal_for: ['dramatic', 'editorial', 'artistic'],
    },
    {
      presetId: 'loop_lighting',
      name: 'Loop Lighting',
      category: 'portrait',
      description: 'Classic portrait lighting with small nose shadow',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: '30 degrees camera-right' },
        lightingStyle: 'loop',
      },
      ideal_for: ['portraits', 'headshots', 'corporate'],
    },
    {
      presetId: 'product_standard',
      name: 'Product Standard',
      category: 'product',
      description: 'Clean, even lighting for product photography',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: '45 degrees top' },
        lightingStyle: 'product',
      },
      ideal_for: ['e-commerce', 'catalog', 'product'],
    },
    {
      presetId: 'environmental_natural',
      name: 'Environmental Natural',
      category: 'environmental',
      description: 'Natural-looking environmental lighting',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: 'window light simulation' },
        lightingStyle: 'environmental',
      },
      ideal_for: ['lifestyle', 'editorial', 'environmental'],
    },
  ];

  const filteredPresets = category 
    ? allPresets.filter((p) => p.category === category)
    : allPresets;

  return {
    presets: filteredPresets,
    total: filteredPresets.length,
    page: 1,
    page_size: 10,
  };
};

/**
 * Mock preset detail
 */
export const getMockPreset = (presetId: string): LightingPreset => {
  const presetList = getMockPresetListResponse();
  const found = presetList.presets.find((p) => p.presetId === presetId);
  
  if (found) {
    return found;
  }

  // Return a default preset if not found
  return {
    presetId,
    name: 'Sample Preset',
    category: 'portrait',
    description: 'A sample lighting preset',
    lighting_config: {
      mainLight: {
        type: 'area',
        direction: '45 degrees camera-right',
        position: [1, 1, 1],
        intensity: 0.8,
        colorTemperature: 5600,
        softness: 0.5,
        enabled: true,
        distance: 1.5,
      },
    },
    ideal_for: ['portraits'],
  };
};

/**
 * Mock history response
 */
export const getMockHistoryResponse = (page: number = 1, pageSize: number = 10): HistoryResponse => {
  const items: HistoryItem[] = Array.from({ length: Math.min(pageSize, 5) }, (_, i) => ({
    generation_id: generateMockId('gen'),
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    scene_description: `Sample scene ${i + 1}`,
    image_url: getPlaceholderImage(1024, 1024, `Scene+${i + 1}`),
    cost_credits: 0.04,
    preset_id: i % 2 === 0 ? 'butterfly_classic' : 'rembrandt_classic',
  }));

  return {
    items,
    total: items.length,
    page,
    page_size: pageSize,
  };
};

/**
 * Mock generation detail
 */
export const getMockGenerationDetail = (generationId: string): HistoryItem => {
  return {
    generation_id: generationId,
    timestamp: new Date().toISOString(),
    scene_description: 'Sample scene description',
    image_url: getPlaceholderImage(2048, 2048, 'Generated+Image'),
    cost_credits: 0.04,
    preset_id: 'butterfly_classic',
  };
};

/**
 * Mock batch job response
 */
export const getMockBatchJobResponse = (
  items: Array<Record<string, unknown>>,
  status: 'processing' | 'completed' | 'failed' = 'processing'
): BatchJobResponse => {
  const total = items.length;
  const completed = status === 'completed' ? total : Math.floor(total * 0.3);

  return {
    batch_id: generateMockId('batch'),
    status,
    items_total: total,
    items_completed: completed,
    total_cost: completed * 0.04,
    created_at: new Date().toISOString(),
    ...(status === 'completed' && {
      items: items.map((_, i) => ({
        generation_id: generateMockId('gen'),
        image_url: getPlaceholderImage(1024, 1024, `Item+${i + 1}`),
        status: 'completed',
      })),
    }),
  };
};

/**
 * Mock lighting analysis
 */
export const getMockLightingAnalysis = (
  lightingSetup?: Record<string, unknown>
): LightingAnalysis => {
  return {
    key_to_fill_ratio: 2.5,
    color_temperature_consistency: 0.95,
    professional_rating: 8.5,
    mood_assessment: 'professional, confident',
    recommendations: [
      'Consider increasing fill light for softer shadows',
      'Maintain consistent color temperature across all lights',
      'Adjust key light position for better subject separation',
    ],
  };
};

/**
 * Mock style recommendations
 */
export const getMockStyleRecommendations = (lightingStyle: string) => {
  return {
    description: `Professional recommendations for ${lightingStyle} lighting style`,
    key_to_fill_ratio: '2:1 to 3:1',
    tips: [
      `Position key light at 45 degrees for ${lightingStyle} style`,
      'Use fill light at 1/2 to 1/3 intensity of key light',
      'Maintain consistent color temperature (5600K recommended)',
      'Consider adding rim light for subject separation',
    ],
  };
};

/**
 * Mock categories list
 */
export const getMockCategories = () => {
  return {
    categories: ['portrait', 'product', 'environmental', 'dramatic', 'commercial'],
    total: 5,
  };
};

/**
 * Mock history stats
 */
export const getMockHistoryStats = () => {
  return {
    total_generations: 42,
    total_cost_credits: 1.68,
    average_cost_per_generation: 0.04,
    preset_distribution: {
      butterfly_classic: 15,
      rembrandt_classic: 12,
      loop_lighting: 10,
      product_standard: 5,
    },
  };
};

/**
 * Check if we should use mock data
 */
export const shouldUseMockData = (): boolean => {
  // Check environment variable
  if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
    return true;
  }

  // Check if we're in development and API is unavailable
  if (import.meta.env.DEV) {
    const mockDataEnabled = localStorage.getItem('use_mock_data');
    return mockDataEnabled === 'true';
  }

  return false;
};

/**
 * Enable/disable mock data mode
 */
export const setMockDataMode = (enabled: boolean): void => {
  localStorage.setItem('use_mock_data', enabled ? 'true' : 'false');
};
