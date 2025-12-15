# BRIA Image Generation API v2 Integration

## Overview

This document describes the complete integration of BRIA's Image Generation API v2 into ProLight AI. The v2 API provides advanced features including FIBO structured prompts, image-to-image generation, VLM bridges, and enhanced control over image generation parameters.

## Implementation Summary

### ✅ Completed Features

1. **Comprehensive Service Layer** (`src/services/briaImageGenerationV2.ts`)
   - Text-to-image generation with FIBO v2
   - Image-to-image generation
   - Structured prompt generation
   - Batch generation
   - Product shot workflows
   - Lighting variation generation
   - Complete product photography workflow

2. **Edge Functions**
   - `/edge/bria/image-generate-v2.ts` - Main v2 image generation endpoint
   - `/edge/bria/image-to-image-v2.ts` - Image-to-image transformation endpoint
   - Enhanced `/edge/bria/structured-prompt.ts` - Already exists, works with v2

3. **React Component** (`src/pages/bria/ImageGenerationV2.tsx`)
   - Full-featured UI with tabs for different generation modes
   - Text-to-image generation
   - Image-to-image generation
   - Product shot generation
   - Batch generation
   - Advanced parameter controls
   - Real-time generation status
   - Image gallery with history

4. **API Client Updates** (`src/api/bria.ts`)
   - Added `textToImageV2()` function
   - Added `imageToImageV2()` function
   - TypeScript interfaces for v2 requests/responses

5. **Routing**
   - Added route: `/bria/image-generation-v2`
   - Updated `.lovable.json` with new page
   - Integrated into main App.tsx routing

## Key Features

### 1. Text-to-Image Generation

Generate images from text prompts with full FIBO v2 support:

```typescript
const response = await service.textToImage({
  prompt: "A beautiful sunset over mountains",
  aspect_ratio: "16:9",
  guidance_scale: 5,
  steps_num: 50,
  seed: 12345,
  sync: true,
});
```

**Features:**
- Support for text prompts
- Optional structured prompts (FIBO JSON)
- Reference images
- Negative prompts
- Aspect ratio control
- Guidance scale (3-5)
- Steps control (35-50)
- Seed for deterministic generation
- Sync/async modes

### 2. Image-to-Image Generation

Transform existing images with text guidance:

```typescript
const response = await service.imageToImage({
  images: ["https://example.com/image.jpg"],
  prompt: "Add dramatic lighting",
  strength: 0.7,
  aspect_ratio: "1:1",
});
```

**Features:**
- Reference image upload
- Transformation strength control (0.0-1.0)
- Text-guided modifications
- All text-to-image parameters supported

### 3. Structured Prompt Generation

Generate FIBO JSON structures from text or images:

```typescript
const response = await service.generateStructuredPrompt({
  prompt: "Professional product shot with studio lighting",
  sync: true,
});
```

**Use Cases:**
- Inspect and edit JSON before generation
- Version control for prompts
- Hybrid deployments
- Automation workflows

### 4. Product Shot Workflows

Specialized functions for product photography:

```typescript
// Single product shot
const response = await service.generateProductShot(
  "Silver watch with leather strap",
  "Professional 3-point studio lighting",
  "white seamless backdrop",
  { aspectRatio: "1:1", quality: "premium" }
);

// Multiple lighting variations
const variations = await service.generateLightingVariations(
  "Silver watch",
  "white backdrop",
  [
    "3-point studio lighting",
    "Soft window light",
    "Dramatic rim lighting"
  ]
);

// Complete workflow
const workflow = await service.completeProductPhotographyWorkflow(
  "Silver watch",
  {
    lightingTypes: ["3-point", "window", "rim"],
    backgrounds: ["white", "gray"],
    sync: true
  }
);
```

### 5. Batch Generation

Generate multiple images from multiple prompts:

```typescript
const results = await service.batchGeneration({
  prompts: [
    "Product shot with natural lighting",
    "Product shot with studio lighting",
    "Product shot with dramatic lighting"
  ],
  aspect_ratio: "1:1",
  sync: true,
});
```

## API Endpoints

### Edge Functions

All edge functions are located in `/edge/bria/`:

1. **`/edge/bria/image-generate-v2`**
   - POST endpoint for v2 image generation
   - Supports text, images, and structured prompts
   - Returns async status URLs or sync results

2. **`/edge/bria/image-to-image-v2`**
   - POST endpoint for image-to-image transformation
   - Requires reference images
   - Supports text prompts for guidance

3. **`/edge/bria/structured-prompt`**
   - POST endpoint for structured prompt generation
   - Converts text/images to FIBO JSON
   - Can refine existing structured prompts

4. **`/edge/bria/status`**
   - GET endpoint for checking async job status
   - Polls for completion
   - Returns progress updates

## Usage Examples

### Basic Text-to-Image

```typescript
import { BriaImageGenerationV2Service } from '@/services/briaImageGenerationV2';

const service = new BriaImageGenerationV2Service({
  apiToken: '', // Handled by edge functions
  baseUrl: '/edge/bria',
});

const result = await service.textToImage({
  prompt: "A photorealistic product shot of a silver watch",
  aspect_ratio: "1:1",
  guidance_scale: 5,
  steps_num: 50,
  sync: true,
});

console.log(result.result?.image_url);
```

### Image-to-Image with Reference

```typescript
const result = await service.imageToImage({
  images: ["https://example.com/product.jpg"],
  prompt: "Add professional studio lighting with soft shadows",
  strength: 0.7,
  aspect_ratio: "1:1",
  sync: true,
});
```

### Product Photography Workflow

```typescript
const workflow = await service.completeProductPhotographyWorkflow(
  "Premium leather wallet",
  {
    lightingTypes: [
      "Professional 3-point studio lighting",
      "Soft window light",
      "Dramatic rim lighting"
    ],
    backgrounds: [
      "white seamless backdrop",
      "neutral gray background"
    ],
    sync: true
  }
);

// Returns array of variations with metadata
workflow.variations.forEach(variation => {
  console.log(variation.lighting, variation.background, variation.imageUrl);
});
```

## UI Component

The `ImageGenerationV2` component provides a complete interface:

- **Tabs** for different generation modes:
  - Text to Image
  - Image to Image
  - Product Shot
  - Batch Generation

- **Advanced Controls:**
  - Aspect ratio selection
  - Guidance scale slider (3-5)
  - Steps slider (35-50)
  - Seed input for deterministic generation
  - Sync/async toggle

- **Features:**
  - Real-time generation status
  - Image gallery with download
  - Generation history
  - Structured prompt viewing/copying
  - Product shot workflow automation

## Configuration

### Environment Variables

Edge functions use Lovable Cloud secrets:

- `BRIA_API_KEY` - Main API key
- `PRODUCTION` - Production environment key
- `STAGING` - Staging environment key

### API Base URL

All v2 endpoints use:
```
https://engine.prod.bria-api.com/v2
```

## Response Format

### Success Response

```typescript
{
  result: {
    image_url?: string;
    images?: Array<{ url: string; seed: number }>;
    seed?: number;
    structured_prompt?: string | object;
  };
  request_id: string;
  status_url?: string; // For async requests
  warning?: string; // IP content warnings
  status: "COMPLETED" | "IN_PROGRESS";
}
```

### Async Status Polling

For async requests, poll the status endpoint:

```typescript
const status = await service.checkStatus(requestId, maxRetries, pollInterval);
```

## Error Handling

All functions include comprehensive error handling:

- Network errors
- Authentication errors
- Rate limiting
- Validation errors
- Timeout handling

Errors are logged and user-friendly messages are displayed via toast notifications.

## Best Practices

1. **Use Sync Mode for Quick Results**
   - Set `sync: true` for immediate results
   - Use async mode for long-running generations

2. **Seed for Reproducibility**
   - Use seeds for consistent results
   - Save seeds with generated images

3. **Batch Processing**
   - Add delays between batch requests
   - Monitor rate limits

4. **Structured Prompts**
   - Generate structured prompts first
   - Edit JSON for precise control
   - Reuse for variations

5. **Product Photography**
   - Use workflow functions for multiple variations
   - Save lighting/background combinations
   - Compare results side-by-side

## Integration with ProLight AI

The v2 integration seamlessly works with existing ProLight AI features:

- **Lighting Analysis**: Use generated images for analysis
- **Presets**: Save generation parameters as presets
- **History**: Track all generated images
- **Workflows**: Integrate with existing product photography workflows

## Next Steps

Potential enhancements:

1. **FIBO Structured Prompt Editor**
   - Visual JSON editor
   - Template library
   - Validation and preview

2. **Advanced Workflows**
   - Multi-step generation pipelines
   - A/B testing framework
   - Automated quality scoring

3. **Integration Features**
   - Direct integration with lighting analysis
   - Preset generation from images
   - Automated workflow suggestions

## Documentation References

- [BRIA API Documentation](https://docs.bria.ai)
- [FIBO Parameter Reference](./FIBO_PARAMETER_REFERENCE.md)
- [BRIA Integration Guide](./BRIA_INTEGRATION_IMPROVEMENTS.md)

## Support

For issues or questions:
- Check edge function logs in Lovable Cloud
- Review API response errors
- Consult BRIA API documentation
- Check ProLight AI documentation

