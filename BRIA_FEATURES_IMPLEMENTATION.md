# Bria AI Features Implementation

This document describes the comprehensive implementation of Bria AI features for image and video generation/editing.

## Overview

The implementation includes:
1. **Backend Bria Client** - Enhanced with all new API methods
2. **Frontend Service & Hooks** - React hooks for Bria API calls
3. **Frontend Pages** - Complete UI for all Bria features
4. **Routes** - All pages integrated into the app routing

## Features Implemented

### 1. Image Generation with Bria Models
**Route:** `/bria/image-generation`

- Generate images using Bria's pre-trained V1/V2 models
- Support for text prompts and FIBO JSON structured prompts
- Model version selection (V1/V2)
- Deterministic outputs with seed support
- Synchronous and asynchronous generation modes
- Multiple results generation

**Components:**
- `src/pages/bria/ImageGeneration.tsx`

### 2. Tailored Models
**Route:** `/bria/tailored-models`

- Train custom models that preserve visual IP
- Generate images using trained models
- Model training interface (connects to backend API)
- Brand-specific image generation
- Consistent visual style preservation

**Components:**
- `src/pages/bria/TailoredModels.tsx`

### 3. Ads Generation
**Route:** `/bria/ads-generation`

- Automate ad creation at scale
- Template support
- Brand consistency (logos, fonts, colors)
- Multiple ad sizes generation
- Brand ID support for consistent branding

**Components:**
- `src/pages/bria/AdsGeneration.tsx`

### 4. Product Imagery Editing
**Route:** `/bria/product-imagery`

- Professional packshots creation
- Product isolation
- Shadow addition
- Background replacement
- Product enhancement
- Lifestyle image creation

**Components:**
- `src/pages/bria/ProductImagery.tsx`

### 5. Image Editing & Transformation
**Route:** `/bria/image-editing`

- Remove background
- Expand images
- Enhance quality
- Generative fill
- Crop operations
- Masking
- Upscaling
- Color correction
- Noise reduction

**Components:**
- `src/pages/bria/ImageEditing.tsx`

### 6. Video Editing
**Route:** `/bria/video-editing`

- 8K upscaling
- Background removal
- Quality enhancement
- Foreground masking
- Asynchronous job monitoring

**Components:**
- `src/pages/bria/VideoEditing.tsx`

## Backend Implementation

### Enhanced Bria Client
**File:** `backend/clients/bria_client.py`

New methods added:
- `text_to_image()` - V1/V2 model generation
- `train_tailored_model()` - Custom model training
- `get_tailored_model_status()` - Training status
- `list_tailored_models()` - List all models
- `tailored_text_to_image()` - Generate with tailored model
- `reimagine()` - Reimagine images with tailored models
- `generate_ads()` - Ads generation
- `product_shot_edit()` - Product imagery editing
- `edit_image()` - Image editing operations
- `onboard_image()` - Image onboarding
- `edit_video()` - Video editing operations

## Frontend Implementation

### Bria Service
**File:** `src/services/briaClient.ts`

Complete TypeScript service for Bria API calls:
- Type-safe request/response interfaces
- Error handling
- Status polling
- All Bria endpoints covered

### Bria Hook
**File:** `src/hooks/useBria.ts`

React hook providing:
- `textToImage()` - Image generation
- `onboardImage()` - Image onboarding
- `editImage()` - Image editing
- `productShotEdit()` - Product editing
- `tailoredGeneration()` - Tailored generation
- `generateAds()` - Ads generation
- `editVideo()` - Video editing
- `getStatus()` - Status checking
- `pollStatus()` - Status polling with timeout

## Edge Functions

All edge functions are already implemented in `edge/bria/`:
- `image-generate.ts` - Image generation
- `image-onboard.ts` - Image onboarding
- `image-edit.ts` - Image editing
- `product-shot.ts` - Product editing
- `tailored-gen.ts` - Tailored generation
- `ads-generate.ts` - Ads generation
- `video-edit.ts` - Video editing
- `status.ts` - Status polling
- `utils.ts` - Shared utilities

## Usage Examples

### Generate Image with V2 Model
```typescript
import { useBria } from '@/hooks/useBria';

const { textToImage } = useBria();

const result = await textToImage({
  prompt: "A beautiful sunset over mountains",
  model_version: "v2",
  num_results: 1,
  sync: false,
  seed: 12345
});
```

### Edit Product Image
```typescript
import { useBria } from '@/hooks/useBria';

const { onboardImage, productShotEdit } = useBria();

// First onboard the image
const onboardResult = await onboardImage("https://example.com/product.jpg");
const assetId = onboardResult.data.asset_id;

// Then edit it
const editResult = await productShotEdit({
  asset_id: assetId,
  operation: "isolate",
  params: {}
});
```

### Generate Ads
```typescript
import { useBria } from '@/hooks/useBria';

const { generateAds } = useBria();

const result = await generateAds({
  prompt: "Promote our new product",
  brand_id: "brand_123",
  branding_blocks: [
    { type: "logo", url: "https://example.com/logo.png" },
    { type: "color", name: "primary", value: "#FF0000" }
  ],
  sizes: [
    { width: 1200, height: 628 },
    { width: 1080, height: 1080 }
  ]
});
```

## Routes

All routes are accessible at:
- `/bria/image-generation` - Image generation
- `/bria/tailored-models` - Tailored models
- `/bria/ads-generation` - Ads generation
- `/bria/product-imagery` - Product editing
- `/bria/image-editing` - Image editing
- `/bria/video-editing` - Video editing

## API Endpoints

All frontend calls go through edge functions at `/edge/bria/`:
- `/edge/bria/image-generate` - Image generation
- `/edge/bria/image-onboard` - Image onboarding
- `/edge/bria/image-edit` - Image editing
- `/edge/bria/product-shot` - Product editing
- `/edge/bria/tailored-gen` - Tailored generation
- `/edge/bria/ads-generate` - Ads generation
- `/edge/bria/video-edit` - Video editing
- `/edge/bria/status` - Status polling

## Configuration

### Environment Variables

Edge functions require these secrets in Lovable Cloud:
- `BRIA_API_KEY` - Development API key
- `PRODUCTION` - Production API key (optional)
- `STAGING` - Staging API key (optional)

### Base URL

Bria API base URL: `https://engine.prod.bria-api.com/v2`

## Error Handling

All functions include comprehensive error handling:
- Authentication errors
- Rate limiting
- Network errors
- Timeout handling
- Validation errors

Error responses follow this structure:
```typescript
{
  error: string;
  errorCode: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}
```

## Status Polling

For asynchronous operations, use the status polling:
```typescript
const { pollStatus } = useBria();

// Poll until completion (default: 2s interval, 5min timeout)
const result = await pollStatus(requestId);

// Custom polling
const result = await pollStatus(requestId, 3000, 600000); // 3s interval, 10min timeout
```

## Next Steps

1. **Add Navigation Links** - Add menu items in MainLayout to access Bria pages
2. **Enhance Status Monitoring** - Add real-time status updates for async jobs
3. **Add Image Gallery** - Display generated images in a gallery view
4. **Add Model Management** - UI for managing trained models
5. **Add Batch Operations** - Support for batch image/video processing
6. **Add History** - Track all Bria operations in history

## Testing

To test the implementation:

1. Ensure Bria API key is configured in Lovable Cloud secrets
2. Navigate to any Bria page (e.g., `/bria/image-generation`)
3. Enter a prompt and generate
4. Check edge function logs for API calls
5. Monitor status for async operations

## Documentation

For more details on Bria API:
- Edge Functions README: `edge/bria/README.md`
- Bria API Documentation: https://bria.ai/docs
