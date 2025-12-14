/**
 * Enhanced Mock Data Service
 * Provides realistic mock data to make the website look more professional
 */

import type { Project, Dataset, Model, TailoredJob } from '@/api/tailored-generation';

// Generate realistic placeholder images using Unsplash Source API
const getPlaceholderImage = (width: number = 1024, height: number = 1024, seed?: string): string => {
  const seedParam = seed ? `&sig=${seed}` : '';
  return `https://source.unsplash.com/${width}x${height}/?product,photography,studio${seedParam}`;
};

// Alternative: Use placeholder.com with better styling
const getStyledPlaceholder = (width: number = 1024, height: number = 1024, text?: string): string => {
  const textParam = text ? encodeURIComponent(text) : 'ProLight+AI';
  const bgColor = '1a1a1a';
  const textColor = 'ffffff';
  return `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}?text=${textParam}`;
};

/**
 * Mock Generation Results for History Page
 */
export const mockGenerationResults = [
  {
    image_url: getPlaceholderImage(2048, 2048, 'product1'),
    image_id: 'gen_001',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    lightingAnalysis: {
      keyFillRatio: 2.5,
      lightingStyle: 'classical_portrait',
      totalExposure: 1.9,
      contrastScore: 0.75,
      professionalRating: 8.5,
    },
    fibo_json: {
      main_light: { intensity: 0.8, color_temperature: 5600 },
      fill_light: { intensity: 0.4, color_temperature: 5600 },
    },
    generation_metadata: {
      preset: 'rembrandt_classic',
      scene_description: 'Professional product photography - luxury watch',
    },
  },
  {
    image_url: getPlaceholderImage(2048, 2048, 'product2'),
    image_id: 'gen_002',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    lightingAnalysis: {
      keyFillRatio: 3.2,
      lightingStyle: 'dramatic',
      totalExposure: 2.1,
      contrastScore: 0.82,
      professionalRating: 9.0,
    },
    fibo_json: {
      main_light: { intensity: 1.0, color_temperature: 5600 },
      fill_light: { intensity: 0.3, color_temperature: 5600 },
    },
    generation_metadata: {
      preset: 'dramatic',
      scene_description: 'Dramatic portrait lighting setup',
    },
  },
  {
    image_url: getPlaceholderImage(2048, 2048, 'product3'),
    image_id: 'gen_003',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    lightingAnalysis: {
      keyFillRatio: 1.8,
      lightingStyle: 'soft_lighting',
      totalExposure: 1.6,
      contrastScore: 0.65,
      professionalRating: 7.5,
    },
    fibo_json: {
      main_light: { intensity: 0.7, color_temperature: 5600 },
      fill_light: { intensity: 0.5, color_temperature: 5600 },
    },
    generation_metadata: {
      preset: 'butterfly_classic',
      scene_description: 'Soft beauty lighting for cosmetics',
    },
  },
  {
    image_url: getPlaceholderImage(2048, 2048, 'product4'),
    image_id: 'gen_004',
    timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), // 2 days ago
    lightingAnalysis: {
      keyFillRatio: 2.8,
      lightingStyle: 'classical_portrait',
      totalExposure: 1.95,
      contrastScore: 0.78,
      professionalRating: 8.8,
    },
    fibo_json: {
      main_light: { intensity: 0.85, color_temperature: 5600 },
      fill_light: { intensity: 0.35, color_temperature: 5600 },
    },
    generation_metadata: {
      preset: 'loop_lighting',
      scene_description: 'Corporate headshot lighting',
    },
  },
  {
    image_url: getPlaceholderImage(2048, 2048, 'product5'),
    image_id: 'gen_005',
    timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), // 3 days ago
    lightingAnalysis: {
      keyFillRatio: 4.0,
      lightingStyle: 'high_contrast',
      totalExposure: 2.2,
      contrastScore: 0.88,
      professionalRating: 9.2,
    },
    fibo_json: {
      main_light: { intensity: 1.0, color_temperature: 5600 },
      fill_light: { intensity: 0.25, color_temperature: 5600 },
    },
    generation_metadata: {
      preset: 'split_lighting',
      scene_description: 'High contrast fashion photography',
    },
  },
  {
    image_url: getPlaceholderImage(2048, 2048, 'product6'),
    image_id: 'gen_006',
    timestamp: new Date(Date.now() - 5 * 24 * 3600000).toISOString(), // 5 days ago
    lightingAnalysis: {
      keyFillRatio: 1.5,
      lightingStyle: 'soft_lighting',
      totalExposure: 1.5,
      contrastScore: 0.60,
      professionalRating: 7.0,
    },
    fibo_json: {
      main_light: { intensity: 0.6, color_temperature: 5600 },
      fill_light: { intensity: 0.5, color_temperature: 5600 },
    },
    generation_metadata: {
      preset: 'highkey',
      scene_description: 'Clean product photography - white background',
    },
  },
];

/**
 * Mock Projects for TailoredManager
 */
export const mockProjects: Project[] = [
  {
    id: 'proj_001',
    bria_id: 'bria_proj_001',
    name: 'Luxury Watch Collection',
    ip_type: 'stylized_scene',
    medium: 'photograph',
    description: 'Professional product photography for luxury timepieces',
    metadata: { category: 'jewelry', style: 'premium' },
    created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
  },
  {
    id: 'proj_002',
    bria_id: 'bria_proj_002',
    name: 'Fashion Editorial',
    ip_type: 'stylized_scene',
    medium: 'photograph',
    description: 'High-fashion editorial lighting setups',
    metadata: { category: 'fashion', style: 'editorial' },
    created_at: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
  },
  {
    id: 'proj_003',
    bria_id: 'bria_proj_003',
    name: 'Beauty & Cosmetics',
    ip_type: 'stylized_scene',
    medium: 'photograph',
    description: 'Soft lighting for beauty product photography',
    metadata: { category: 'beauty', style: 'soft' },
    created_at: new Date(Date.now() - 21 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
  },
];

/**
 * Mock Datasets for TailoredManager
 */
export const mockDatasets: Dataset[] = [
  {
    id: 'ds_001',
    bria_id: 'bria_ds_001',
    project_id: 'bria_proj_001',
    name: 'Watch Dataset v1',
    description: 'Collection of luxury watch product shots',
    created_at: new Date(Date.now() - 6 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
  },
  {
    id: 'ds_002',
    bria_id: 'bria_ds_002',
    project_id: 'bria_proj_001',
    name: 'Watch Dataset v2',
    description: 'Updated collection with new angles',
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
  },
  {
    id: 'ds_003',
    bria_id: 'bria_ds_003',
    project_id: 'bria_proj_002',
    name: 'Fashion Editorial Set 1',
    description: 'Editorial lighting setups for fashion shoots',
    created_at: new Date(Date.now() - 12 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
  },
  {
    id: 'ds_004',
    bria_id: 'bria_ds_004',
    project_id: 'bria_proj_003',
    name: 'Beauty Products Collection',
    description: 'Soft lighting setups for cosmetics',
    created_at: new Date(Date.now() - 18 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 24 * 3600000).toISOString(),
  },
];

/**
 * Mock Models for TailoredManager
 */
export const mockModels: Model[] = [
  {
    id: 'model_001',
    bria_id: 'bria_model_001',
    dataset_id: 'bria_ds_001',
    name: 'Luxury Watch Model v1',
    training_mode: 'fully_automated',
    training_version: 'light',
    created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
  },
  {
    id: 'model_002',
    bria_id: 'bria_model_002',
    dataset_id: 'bria_ds_001',
    name: 'Luxury Watch Model v2',
    training_mode: 'expert',
    training_version: 'max',
    created_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'model_003',
    bria_id: 'bria_model_003',
    dataset_id: 'bria_ds_003',
    name: 'Fashion Editorial Model',
    training_mode: 'fully_automated',
    training_version: 'light',
    created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
  },
  {
    id: 'model_004',
    bria_id: 'bria_model_004',
    dataset_id: 'bria_ds_004',
    name: 'Beauty Products Model',
    training_mode: 'fully_automated',
    training_version: 'light',
    created_at: new Date(Date.now() - 15 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
  },
];

/**
 * Mock Jobs for TailoredManager
 */
export const mockJobs: TailoredJob[] = [
  {
    id: 'job_001',
    type: 'training',
    model_id: 'bria_model_003',
    request_id: 'req_training_001',
    status_url: 'https://api.bria.ai/v2/tailored/status/req_training_001',
    status: 'training',
    status_payload: { progress: 65 },
    prompt: undefined,
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'job_002',
    type: 'generate',
    model_id: 'bria_model_001',
    request_id: 'req_gen_001',
    status_url: 'https://api.bria.ai/v2/tailored/status/req_gen_001',
    status: 'succeeded',
    status_payload: { progress: 100 },
    result: { url: getPlaceholderImage(1024, 1024, 'generated1') },
    prompt: 'A luxury watch on a marble surface with dramatic studio lighting',
    created_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
  },
  {
    id: 'job_003',
    type: 'generate',
    model_id: 'bria_model_002',
    request_id: 'req_gen_002',
    status_url: 'https://api.bria.ai/v2/tailored/status/req_gen_002',
    status: 'succeeded',
    status_payload: { progress: 100 },
    result: { url: getPlaceholderImage(1024, 1024, 'generated2') },
    prompt: 'Professional product shot of a luxury timepiece with soft fill lighting',
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'job_004',
    type: 'reimagine',
    model_id: 'bria_model_004',
    request_id: 'req_reimagine_001',
    status_url: 'https://api.bria.ai/v2/tailored/status/req_reimagine_001',
    status: 'processing',
    status_payload: { progress: 45 },
    prompt: 'Reimagine with warmer color temperature and softer shadows',
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

/**
 * Mock Dashboard Stats
 */
export const mockDashboardStats = {
  totalGenerations: 47,
  totalProjects: 3,
  totalModels: 4,
  recentActivity: [
    {
      type: 'generation',
      description: 'Generated image with Luxury Watch Model v2',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
    {
      type: 'training',
      description: 'Started training Fashion Editorial Model',
      timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    },
    {
      type: 'project',
      description: 'Created new project: Beauty & Cosmetics',
      timestamp: new Date(Date.now() - 21 * 24 * 3600000).toISOString(),
    },
  ],
};

/**
 * Check if mock data should be used
 */
export const shouldUseMockData = (): boolean => {
  // In development, use mock data by default
  if (import.meta.env.DEV) {
    const mockDataEnabled = localStorage.getItem('use_mock_data');
    return mockDataEnabled !== 'false'; // Default to true in dev
  }
  
  // Check environment variable
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
};

/**
 * Initialize mock data in stores
 * This should be called on app startup to populate empty stores
 */
export const initializeMockData = () => {
  if (!shouldUseMockData()) {
    return;
  }

  // Store flag to indicate mock data is being used
  localStorage.setItem('mock_data_initialized', 'true');
  
  // Check if lighting store has any generation results
  // If not, we'll populate it (this will be handled by the store itself on first load)
  try {
    const stored = localStorage.getItem('lighting-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      const state = parsed.state;
      // If no generation results exist, the store will use mock data on initialization
      if (!state || !state.generationResults || state.generationResults.length === 0) {
        // The store initialization will handle this
      }
    }
  } catch (e) {
    // Ignore errors
  }
};

/**
 * Get mock data initialization status
 */
export const isMockDataInitialized = (): boolean => {
  return localStorage.getItem('mock_data_initialized') === 'true';
};
