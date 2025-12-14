/**
 * ProLight AI Mock Data - Complete Integration
 * 
 * This file provides a unified export of all ProLight AI mock data and services.
 * Use this for easy imports across your application.
 * 
 * @example
 * ```typescript
 * import { ProLightMocks } from '@/services/prolightMocks';
 * 
 * // Use basic mocks
 * const result = await ProLightMocks.adsGeneration({ ... });
 * 
 * // Use extended mocks
 * const templates = await ProLightMocks.getAdsTemplates();
 * 
 * // Use agentic workflow
 * const campaign = await ProLightMocks.agenticWorkflow.completeProductCampaign("Product Name");
 * ```
 */

import ProLightMockProvider, { 
  ProLightAPIResponse,
  FIBO_MOCK_DATA,
  ProLightAgenticWorkflow,
  mockAdsGeneration,
  mockImageOnboarding,
  mockVideoEditing,
  mockTailoredGeneration,
  mockProductShotEditing,
  mockImageGeneration,
  mockImageEditing,
  mockStatusService
} from './prolightMockData';

import {
  ADDITIONAL_MOCK_DATA,
  extendMockProvider,
  mockFullCampaignReport,
  MOCK_USERS,
  MOCK_BRANDS,
  MOCK_AD_TEMPLATES,
  MOCK_ASSETS,
  MOCK_TAILORED_MODELS
} from './prolightMockExtensions';

// Extended provider with all additional mocks
const ExtendedMockProvider = extendMockProvider(ProLightMockProvider);

/**
 * Complete ProLight AI Mock Provider
 * Includes all basic and extended mock functions
 */
export const ProLightMocks = {
  // Basic API mocks
  ...ExtendedMockProvider,
  
  // Agentic workflow
  agenticWorkflow: new ProLightAgenticWorkflow(),
  
  // Extended helpers
  mockFullCampaignReport,
  
  // Seed data
  seedData: {
    users: MOCK_USERS,
    brands: MOCK_BRANDS,
    templates: MOCK_AD_TEMPLATES,
    assets: MOCK_ASSETS,
    tailoredModels: MOCK_TAILORED_MODELS
  },
  
  // FIBO structured prompts
  fiboData: FIBO_MOCK_DATA
};

// Re-export types for convenience
export type {
  ProLightAPIResponse
};

// Re-export individual functions for granular imports
export {
  mockAdsGeneration,
  mockImageOnboarding,
  mockVideoEditing,
  mockTailoredGeneration,
  mockProductShotEditing,
  mockImageGeneration,
  mockImageEditing,
  mockStatusService,
  ProLightAgenticWorkflow,
  FIBO_MOCK_DATA,
  ADDITIONAL_MOCK_DATA,
  extendMockProvider,
  mockFullCampaignReport
};

export default ProLightMocks;
