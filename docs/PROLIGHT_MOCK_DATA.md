# ProLight AI Mock Data Integration Guide

Complete mock data implementation for all ProLight AI APIs with FIBO integration. This guide covers all available mock functions, usage examples, and integration patterns.

## 📦 Files Overview

- **`src/services/prolightMockData.ts`** - Core mock implementations for all ProLight AI APIs
- **`src/services/prolightMockExtensions.ts`** - Extended helpers, edge cases, and advanced features
- **`src/services/prolightMocks.ts`** - Unified export for easy imports

## 🚀 Quick Start

```typescript
import { ProLightMocks } from '@/services/prolightMocks';

// Use any mock function
const result = await ProLightMocks.adsGeneration({
  product_name: "LED Lamp",
  campaign_type: 'social',
  formats: ['facebook', 'instagram'],
  aspect_ratios: ['1:1', '4:5'],
  copy_variations: 4
});
```

## 📋 Available APIs

### 1. Ads Generation API

Generate mock ad creatives for social media, display, and video campaigns.

```typescript
import { mockAdsGeneration } from '@/services/prolightMocks';

const result = await mockAdsGeneration({
  product_name: "Modern LED Lamp",
  campaign_type: 'social', // 'social' | 'display' | 'video'
  formats: ['facebook', 'instagram'],
  aspect_ratios: ['1:1', '4:5'],
  copy_variations: 4
});

// Response includes:
// - social: Facebook, Instagram formats
// - display: Banner ads (728x90, 300x250)
// - video: Video creatives (15s, 30s)
```

**Extended Features:**
- `ProLightMocks.getAdsTemplates()` - Get available ad templates
- `ProLightMocks.getBrands()` - Get brand configurations

### 2. Image Onboarding API

Onboard images to the asset library with quality scoring.

```typescript
import { mockImageOnboarding } from '@/services/prolightMocks';

const result = await mockImageOnboarding({
  images: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg'
  ],
  metadata: {
    product_id: 'prod_123',
    category: 'lighting',
    tags: ['hero', 'studio']
  }
});

// Response includes:
// - asset_library_ids: Array of generated asset IDs
// - quality_scores: Quality scores (0.7-1.0)
// - enhancements_applied: Auto enhancements
```

**Extended Features:**
- `ProLightMocks.imageOnboardingWithFailures()` - Simulate validation failures
- `ProLightMocks.registerImageFromS3()` - Register from S3 keys

### 3. Video Editing API

Mock video editing operations (trim, enhance, crop, speed change).

```typescript
import { mockVideoEditing } from '@/services/prolightMocks';

const result = await mockVideoEditing({
  video_url: 'https://example.com/video.mp4',
  edits: [
    { type: 'trim', params: { start: 0, end: 15 } },
    { type: 'enhance', params: { brightness: 1.1 } },
    { type: 'add_logo', params: { logo_url: '...' } }
  ],
  output_format: 'mp4'
});
```

**Extended Features:**
- `ProLightMocks.startVideoEditJob()` - Async job creation
- `ProLightMocks.videoStatusTimeline()` - Get status timeline

### 4. Tailored Generation API

Generate images using fine-tuned ProLight models with FIBO structured prompts.

```typescript
import { mockTailoredGeneration, FIBO_MOCK_DATA } from '@/services/prolightMocks';

const result = await mockTailoredGeneration({
  model_id: 'prolight-product-v1',
  structured_prompt: FIBO_MOCK_DATA.productShots.lamp.structured_prompt,
  num_variations: 6
});

// Response includes:
// - images: Array of generated images with seeds
// - model_used: Model identifier
// - confidence: Quality confidence scores
```

**Extended Features:**
- `ProLightMocks.startTailoredTraining()` - Start model training
- `ProLightMocks.tailoredTrainingStatus()` - Check training progress

### 5. Product Shot Editing API

Edit product shots with lighting adjustments, background replacement, and smart cropping.

```typescript
import { mockProductShotEditing } from '@/services/prolightMocks';

const result = await mockProductShotEditing({
  image_url: 'https://example.com/product.jpg',
  lighting_setup: '3-point studio',
  background: 'white seamless',
  crop: { x: 0, y: 0, width: 1024, height: 1024 }
});
```

**Extended Features:**
- `ProLightMocks.productShotBatchEdit()` - Batch edit multiple images
- Returns diff maps and quality improvements

### 6. Image Generation (FIBO) API

Generate images using FIBO text-to-image with structured prompts.

```typescript
import { mockImageGeneration } from '@/services/prolightMocks';

const result = await mockImageGeneration({
  prompt: "Modern minimalist table lamp",
  structured_prompt: {
    short_description: "Studio lamp on white background",
    lighting: { conditions: "professional studio lighting" }
  },
  aspect_ratio: '1:1',
  seed: 12345
});
```

**Extended Features:**
- `ProLightMocks.bulkImageGeneration()` - Generate multiple images with deterministic seeds

### 7. Image Editing (Bria Edit) API

Edit images with remove background, generative fill, expand, and enhance operations.

```typescript
import { mockImageEditing } from '@/services/prolightMocks';

const result = await mockImageEditing({
  image_url: 'https://example.com/image.jpg',
  operation: 'remove_bg', // 'remove_bg' | 'gen_fill' | 'expand' | 'enhance'
  params: { threshold: 0.5 }
});
```

**Extended Features:**
- `ProLightMocks.stagedImageEditing()` - Multi-stage editing pipeline
- Simulates content moderation blocking

### 8. Status Service API

Check status of async operations.

```typescript
import { mockStatusService } from '@/services/prolightMocks';

const result = await mockStatusService('request_id_123');

// Response includes:
// - status: 'pending' | 'processing' | 'completed'
// - progress: 0-100
```

**Extended Features:**
- `ProLightMocks.statusTimeline()` - Get complete status timeline
- `ProLightMocks.sseEventsForRun()` - Server-Sent Events simulation

## 🤖 Agentic Workflow

Complete product campaign orchestration with multiple API calls.

```typescript
import { ProLightMocks } from '@/services/prolightMocks';

const campaign = await ProLightMocks.agenticWorkflow.completeProductCampaign(
  "Modern LED Table Lamp"
);

// Automatically:
// 1. Generates hero shots (6 variations)
// 2. Onboards to asset library
// 3. Generates ad variants
// 4. Edits product shots
```

## 📊 Seed Data

Access mock seed data for testing:

```typescript
import { ProLightMocks } from '@/services/prolightMocks';

// Users
const users = ProLightMocks.seedData.users;

// Brands
const brands = ProLightMocks.seedData.brands;

// Ad Templates
const templates = ProLightMocks.seedData.templates;

// Assets
const assets = ProLightMocks.seedData.assets;

// Tailored Models
const models = ProLightMocks.seedData.tailoredModels;
```

## 🎯 FIBO Structured Prompts

Pre-built FIBO structured prompts for common scenarios:

```typescript
import { FIBO_MOCK_DATA } from '@/services/prolightMocks';

// Product shot example
const lampPrompt = FIBO_MOCK_DATA.productShots.lamp.structured_prompt;

// Use in generation
const result = await mockTailoredGeneration({
  model_id: 'prolight-product-v1',
  structured_prompt: lampPrompt,
  num_variations: 4
});
```

## 🔧 Advanced Features

### Full Campaign Report

Generate a complete campaign report with all assets:

```typescript
import { mockFullCampaignReport } from '@/services/prolightMocks';

const report = await mockFullCampaignReport("Modern LED Lamp");

// Includes:
// - Generated images
// - Onboarding results
// - Ad templates
// - Product edits
// - Perceptual evaluation
```

### Cost Estimation

Estimate costs for operations:

```typescript
import { ProLightMocks } from '@/services/prolightMocks';

const estimate = await ProLightMocks.costEstimate([
  { tool: 'bria.text_to_image', seconds: 10 },
  { tool: 'bria.edit', seconds: 5 }
]);
```

### Perceptual Evaluation

Evaluate image quality:

```typescript
import { ProLightMocks } from '@/services/prolightMocks';

const eval = await ProLightMocks.perceptualEval(
  'https://example.com/reference.jpg',
  [
    'https://example.com/candidate1.jpg',
    'https://example.com/candidate2.jpg'
  ]
);
```

### Webhook Delivery

Simulate webhook deliveries:

```typescript
import { ProLightMocks } from '@/services/prolightMocks';

const delivery = await ProLightMocks.webhookDelivery(
  'https://example.com/webhook',
  { event: 'generation.completed', data: {...} }
);
```

## 🔄 Integration with Existing Code

### Replace Real API Calls

```typescript
// Before
import { briaClient } from '@/services/briaClient';
const result = await briaClient.generateImage(...);

// After (with mock mode)
import { ProLightMocks } from '@/services/prolightMocks';
import { shouldUseMockData } from '@/services/mockData';

const result = shouldUseMockData()
  ? await ProLightMocks.imageGeneration(...)
  : await briaClient.generateImage(...);
```

### React Hook Integration

```typescript
import { useState, useEffect } from 'react';
import { ProLightMocks } from '@/services/prolightMocks';

function useMockGeneration() {
  const [result, setResult] = useState(null);
  
  useEffect(() => {
    ProLightMocks.imageGeneration({
      prompt: "Studio lamp"
    }).then(setResult);
  }, []);
  
  return result;
}
```

## 📝 Response Structure

All mock functions return `ProLightAPIResponse`:

```typescript
interface ProLightAPIResponse {
  success: boolean;
  data: any;
  request_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  mock: boolean;
  timing: number; // milliseconds
  error?: any; // Only present if failed
}
```

## 🧪 Testing Examples

### Unit Tests

```typescript
import { mockAdsGeneration } from '@/services/prolightMocks';

describe('Ads Generation', () => {
  it('should generate social media ads', async () => {
    const result = await mockAdsGeneration({
      product_name: "Test Product",
      campaign_type: 'social',
      formats: ['facebook'],
      aspect_ratios: ['1:1'],
      copy_variations: 1
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});
```

### Integration Tests

```typescript
import { ProLightMocks } from '@/services/prolightMocks';

describe('Agentic Workflow', () => {
  it('should complete full campaign', async () => {
    const campaign = await ProLightMocks.agenticWorkflow
      .completeProductCampaign("Test Product");
    
    expect(campaign.success).toBe(true);
    expect(campaign.steps_completed).toBe(4);
  });
});
```

## 🎨 UI Development

Use mocks for rapid UI development without API dependencies:

```typescript
// Component example
import { ProLightMocks } from '@/services/prolightMocks';
import { useEffect, useState } from 'react';

function AdsGenerator() {
  const [ads, setAds] = useState([]);
  
  useEffect(() => {
    ProLightMocks.adsGeneration({
      product_name: "Product Name",
      campaign_type: 'social',
      formats: ['facebook', 'instagram'],
      aspect_ratios: ['1:1', '4:5'],
      copy_variations: 4
    }).then(result => setAds(result.data));
  }, []);
  
  return <div>{/* Render ads */}</div>;
}
```

## 🔍 Debugging

All mock responses include timing information:

```typescript
const result = await ProLightMocks.imageGeneration({...});
console.log(`Mock took ${result.timing}ms`);
```

## 📚 Additional Resources

- FIBO Documentation: https://docs.bria.ai/image-generation/endpoints/reimagine-structure-reference
- Bria API Reference: https://fal.ai/models/bria/fibo/generate/api
- ProLight AI Types: `src/types/fibo.ts`

## ✅ Complete Mock Coverage

- ✅ FIBO Structured Prompts - Real JSON schemas
- ✅ Ads Generation API - Social/display/video formats
- ✅ Image Onboarding - Asset library integration
- ✅ Video Editing - Trim/enhance/crop operations
- ✅ Tailored Generation - Fine-tuned ProLight models
- ✅ Product Shot Editing - Lighting/background/crop
- ✅ Image Generation - FIBO text-to-image
- ✅ Image Editing - Bria edit operations
- ✅ Status Service - Async polling simulation
- ✅ Agentic Workflow - Complete campaign orchestration
- ✅ Extended Helpers - Edge cases, batch operations, SSE
- ✅ Seed Data - Users, brands, templates, assets
- ✅ Cost Estimation - Operation cost calculation
- ✅ Perceptual Evaluation - Image quality scoring

---

**Ready for production use!** All mocks are fully typed and ready to integrate with your existing ProLight AI application.
