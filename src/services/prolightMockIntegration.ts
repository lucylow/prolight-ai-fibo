/**
 * ProLight AI Mock Integration Examples
 * 
 * This file demonstrates how to integrate the comprehensive ProLight mock data
 * with existing API clients and services.
 * 
 * Use these patterns to add mock support to your API calls.
 */

import { ProLightMocks, ProLightAPIResponse } from './prolightMocks';
import { shouldUseMockData } from './mockData';
import type { BriaResponse } from './briaClient';

/**
 * Example: Integrate mock data with Bria Client
 */
export async function generateImageWithMock(
  prompt: string,
  structuredPrompt?: Record<string, unknown>
): Promise<BriaResponse | ProLightAPIResponse> {
  if (shouldUseMockData()) {
    return ProLightMocks.imageGeneration({
      prompt,
      structured_prompt: structuredPrompt
    });
  }
  
  // Real API call would go here
  // return await briaClient.textToImage({ prompt, structured_prompt: structuredPrompt });
  throw new Error('Real API not implemented in example');
}

/**
 * Example: Integrate mock data with Ads Generation
 */
export async function generateAdsWithMock(
  productName: string,
  campaignType: 'social' | 'display' | 'video'
): Promise<ProLightAPIResponse> {
  if (shouldUseMockData()) {
    return ProLightMocks.adsGeneration({
      product_name: productName,
      campaign_type: campaignType,
      formats: campaignType === 'social' ? ['facebook', 'instagram'] : ['banner'],
      aspect_ratios: ['1:1', '4:5'],
      copy_variations: 4
    });
  }
  
  // Real API call would go here
  throw new Error('Real API not implemented in example');
}

/**
 * Example: Integrate mock data with Image Onboarding
 */
export async function onboardImagesWithMock(
  imageUrls: string[],
  metadata?: { product_id: string; category: string; tags: string[] }
): Promise<ProLightAPIResponse> {
  if (shouldUseMockData()) {
    return ProLightMocks.imageOnboarding({
      images: imageUrls,
      metadata
    });
  }
  
  // Real API call would go here
  throw new Error('Real API not implemented in example');
}

/**
 * Example: Integrate mock data with Video Editing
 */
export async function editVideoWithMock(
  videoUrl: string,
  edits: Array<{ type: string; params: any }>
): Promise<ProLightAPIResponse> {
  if (shouldUseMockData()) {
    return ProLightMocks.videoEditing({
      video_url: videoUrl,
      edits,
      output_format: 'mp4'
    });
  }
  
  // Real API call would go here
  throw new Error('Real API not implemented in example');
}

/**
 * Example: Integrate mock data with Tailored Generation
 */
export async function generateTailoredWithMock(
  modelId: string,
  structuredPrompt: any,
  numVariations = 4
): Promise<ProLightAPIResponse> {
  if (shouldUseMockData()) {
    return ProLightMocks.tailoredGeneration({
      model_id: modelId,
      structured_prompt: structuredPrompt,
      num_variations: numVariations
    });
  }
  
  // Real API call would go here
  throw new Error('Real API not implemented in example');
}

/**
 * Example: Integrate mock data with Product Shot Editing
 */
export async function editProductShotWithMock(
  imageUrl: string,
  options?: {
    lighting_setup?: string;
    background?: string;
    crop?: { x: number; y: number; width: number; height: number };
  }
): Promise<ProLightAPIResponse> {
  if (shouldUseMockData()) {
    return ProLightMocks.productShotEditing({
      image_url: imageUrl,
      ...options
    });
  }
  
  // Real API call would go here
  throw new Error('Real API not implemented in example');
}

/**
 * Example: Integrate mock data with Image Editing
 */
export async function editImageWithMock(
  imageUrl: string,
  operation: 'remove_bg' | 'gen_fill' | 'expand' | 'enhance',
  params?: any
): Promise<ProLightAPIResponse> {
  if (shouldUseMockData()) {
    return ProLightMocks.imageEditing({
      image_url: imageUrl,
      operation,
      params
    });
  }
  
  // Real API call would go here
  throw new Error('Real API not implemented in example');
}

/**
 * Example: Complete workflow with mock fallback
 */
export async function completeProductCampaignWithMock(
  productDescription: string
): Promise<ProLightAPIResponse> {
  if (shouldUseMockData()) {
    return ProLightMocks.agenticWorkflow.completeProductCampaign(productDescription);
  }
  
  // Real workflow would go here
  throw new Error('Real workflow not implemented in example');
}

/**
 * Example: Status polling with mock
 */
export async function pollStatusWithMock(
  requestId: string,
  maxAttempts = 10,
  intervalMs = 2000
): Promise<ProLightAPIResponse> {
  if (shouldUseMockData()) {
    // Simulate polling
    for (let i = 0; i < maxAttempts; i++) {
      const status = await ProLightMocks.statusService(requestId);
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return {
      success: false,
      data: { message: 'Polling timeout' },
      request_id: requestId,
      status: 'failed',
      mock: true,
      timing: maxAttempts * intervalMs
    };
  }
  
  // Real polling would go here
  throw new Error('Real polling not implemented in example');
}

/**
 * Example: React hook with mock support
 */
export function useProLightMock<T>(
  mockFn: () => Promise<ProLightAPIResponse>,
  realFn: () => Promise<T>
): () => Promise<ProLightAPIResponse | T> {
  return async () => {
    if (shouldUseMockData()) {
      return mockFn();
    }
    return realFn();
  };
}

/**
 * Example: Batch operations with mock
 */
export async function batchGenerateWithMock(
  prompts: string[],
  options?: { numVariations?: number; model?: string }
): Promise<ProLightAPIResponse> {
  if (shouldUseMockData()) {
    return ProLightMocks.bulkImageGeneration({
      prompt: prompts[0], // Use first prompt as base
      count: prompts.length * (options?.numVariations || 1),
      model: options?.model || 'bria-3.2'
    });
  }
  
  // Real batch operation would go here
  throw new Error('Real batch operation not implemented in example');
}

/**
 * Example: Error handling with mock fallback
 */
export async function safeApiCallWithMock<T>(
  realCall: () => Promise<T>,
  mockCall: () => Promise<ProLightAPIResponse>
): Promise<T | ProLightAPIResponse> {
  if (shouldUseMockData()) {
    return mockCall();
  }
  
  try {
    return await realCall();
  } catch (error) {
    console.warn('API call failed, falling back to mock:', error);
    return mockCall();
  }
}

/**
 * Export all integration helpers
 */
export const ProLightMockIntegration = {
  generateImage: generateImageWithMock,
  generateAds: generateAdsWithMock,
  onboardImages: onboardImagesWithMock,
  editVideo: editVideoWithMock,
  generateTailored: generateTailoredWithMock,
  editProductShot: editProductShotWithMock,
  editImage: editImageWithMock,
  completeCampaign: completeProductCampaignWithMock,
  pollStatus: pollStatusWithMock,
  batchGenerate: batchGenerateWithMock,
  safeCall: safeApiCallWithMock
};

export default ProLightMockIntegration;
