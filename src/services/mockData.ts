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
    {
      presetId: 'split_lighting',
      name: 'Split Lighting',
      category: 'portrait',
      description: 'Dramatic split lighting with half face in shadow',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: '90 degrees side', intensity: 1.0 },
        lightingStyle: 'split',
      },
      ideal_for: ['dramatic', 'artistic', 'editorial'],
    },
    {
      presetId: 'broad_lighting',
      name: 'Broad Lighting',
      category: 'portrait',
      description: 'Broad lighting that illuminates the side of face toward camera',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: '45 degrees camera-left', intensity: 0.9 },
        lightingStyle: 'broad',
      },
      ideal_for: ['portraits', 'fashion', 'commercial'],
    },
    {
      presetId: 'short_lighting',
      name: 'Short Lighting',
      category: 'portrait',
      description: 'Short lighting that illuminates the side of face away from camera',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: '45 degrees camera-right', intensity: 1.1 },
        lightingStyle: 'short',
      },
      ideal_for: ['portraits', 'headshots', 'corporate'],
    },
    {
      presetId: 'product_luxury',
      name: 'Product Luxury',
      category: 'product',
      description: 'Premium lighting setup for luxury products',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: '60 degrees top-left', intensity: 1.3, colorTemperature: 5500 },
        lightingStyle: 'product',
      },
      ideal_for: ['luxury', 'jewelry', 'watches'],
    },
    {
      presetId: 'product_soft',
      name: 'Product Soft',
      category: 'product',
      description: 'Soft, diffused lighting for delicate products',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: 'front-top', intensity: 0.7, softness: 0.8 },
        lightingStyle: 'product',
      },
      ideal_for: ['cosmetics', 'beauty', 'fragrance'],
    },
    {
      presetId: 'product_tech',
      name: 'Product Tech',
      category: 'product',
      description: 'Clean, modern lighting for tech products',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: '45 degrees top-right', intensity: 1.0, colorTemperature: 5600 },
        lightingStyle: 'product',
      },
      ideal_for: ['electronics', 'tech', 'gadgets'],
    },
    {
      presetId: 'environmental_sunset',
      name: 'Environmental Sunset',
      category: 'environmental',
      description: 'Warm sunset lighting for lifestyle photography',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: 'window light simulation', colorTemperature: 3200, intensity: 0.9 },
        lightingStyle: 'environmental',
      },
      ideal_for: ['lifestyle', 'editorial', 'fashion'],
    },
    {
      presetId: 'environmental_overcast',
      name: 'Environmental Overcast',
      category: 'environmental',
      description: 'Soft, even overcast lighting',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: 'diffused top', intensity: 0.6, softness: 0.9 },
        lightingStyle: 'environmental',
      },
      ideal_for: ['lifestyle', 'portraits', 'editorial'],
    },
    {
      presetId: 'dramatic_high_contrast',
      name: 'Dramatic High Contrast',
      category: 'dramatic',
      description: 'High contrast dramatic lighting',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: '60 degrees side', intensity: 1.5, softness: 0.3 },
        lightingStyle: 'dramatic',
      },
      ideal_for: ['editorial', 'artistic', 'fashion'],
    },
    {
      presetId: 'commercial_flat',
      name: 'Commercial Flat',
      category: 'commercial',
      description: 'Even, flat lighting for commercial work',
      lighting_config: {
        mainLight: { ...defaultMainLight, direction: 'front', intensity: 0.8, softness: 0.7 },
        lightingStyle: 'commercial',
      },
      ideal_for: ['commercial', 'catalog', 'e-commerce'],
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
  const sceneDescriptions = [
    'Modern minimalist table lamp on white studio background',
    'Luxury wristwatch on marble surface with dramatic studio lighting',
    'Elegant diamond ring on velvet surface with soft beauty lighting',
    'Premium cosmetics product on white background with soft lighting',
    'Modern smartphone on reflective surface with studio lighting',
    'Designer handbag on marble surface with elegant lighting',
    'Professional headshot with butterfly lighting setup',
    'Product photography of luxury perfume bottle',
    'Jewelry photography with macro lighting',
    'Tech product showcase with clean studio lighting',
    'Fashion accessory on white seamless background',
    'Beauty product with soft diffused lighting',
    'Luxury timepiece with dramatic side lighting',
    'Cosmetics collection with even commercial lighting',
    'Electronics product with modern tech lighting',
    'Fashion handbag with elegant three-point lighting',
    'Portrait with Rembrandt lighting style',
    'Product shot with environmental natural lighting',
    'Commercial catalog photography with flat lighting',
    'Editorial fashion photography with dramatic lighting',
  ];

  const presetIds = [
    'butterfly_classic',
    'rembrandt_classic',
    'loop_lighting',
    'product_standard',
    'environmental_natural',
    'split_lighting',
    'product_luxury',
    'product_soft',
    'product_tech',
    'environmental_sunset',
    'dramatic_high_contrast',
    'commercial_flat',
  ];

  const items: HistoryItem[] = Array.from({ length: Math.min(pageSize, 20) }, (_, i) => {
    const sceneIndex = (page - 1) * pageSize + i;
    return {
      generation_id: generateMockId('gen'),
      timestamp: new Date(Date.now() - (sceneIndex * 3600000 + Math.random() * 1800000)).toISOString(),
      scene_description: sceneDescriptions[sceneIndex % sceneDescriptions.length],
      image_url: getPlaceholderImage(1024, 1024, `Scene+${sceneIndex + 1}`),
      cost_credits: 0.04 + Math.random() * 0.02,
      preset_id: presetIds[sceneIndex % presetIds.length],
    };
  });

  return {
    items,
    total: 50, // Total available items
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
    categories: [
      'portrait',
      'product',
      'environmental',
      'dramatic',
      'commercial',
      'beauty',
      'fashion',
      'luxury',
      'tech',
      'lifestyle',
    ],
    total: 10,
  };
};

/**
 * Mock history stats
 */
export const getMockHistoryStats = () => {
  return {
    total_generations: 127,
    total_cost_credits: 5.18,
    average_cost_per_generation: 0.041,
    preset_distribution: {
      butterfly_classic: 18,
      rembrandt_classic: 15,
      loop_lighting: 12,
      product_standard: 14,
      environmental_natural: 10,
      split_lighting: 8,
      product_luxury: 11,
      product_soft: 9,
      product_tech: 8,
      environmental_sunset: 7,
      dramatic_high_contrast: 6,
      commercial_flat: 7,
    },
    category_distribution: {
      portrait: 45,
      product: 42,
      environmental: 17,
      dramatic: 14,
      commercial: 9,
    },
    recent_activity: {
      last_7_days: 23,
      last_30_days: 67,
      last_90_days: 127,
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
