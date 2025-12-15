# BRIA Image Editing API v2 - Complete Integration

## Overview

This document describes the complete integration of BRIA Image Editing API v2 into the ProLight AI project. The implementation provides comprehensive image editing capabilities including background operations, content manipulation, image transformation, and automatic mask generation.

## What Was Implemented

### 1. **BriaImageEditingService** (`src/services/briaImageEditingService.ts`)

A comprehensive TypeScript service class that provides access to all BRIA Image Editing API v2 operations:

#### Operations Supported:

- ✅ **Erase** - Remove specific regions using masks
- ✅ **Generative Fill** - Generate objects in masked regions with prompts
- ✅ **Remove Background** - Remove background using RMBG 2.0
- ✅ **Replace Background** - Replace with AI-generated backgrounds
- ✅ **Erase Foreground** - Remove foreground and inpaint background
- ✅ **Blur Background** - Apply blur effect to background
- ✅ **Expand** - Expand image canvas with AI-generated content
- ✅ **Enhance** - Improve image quality and resolution
- ✅ **Crop Foreground** - Automatically crop to content
- ✅ **Increase Resolution** - Upscale images (2x or 4x)
- ✅ **Generate Masks** - Automatic mask generation for objects

#### Features:

- Full TypeScript type safety
- Async/await request handling
- Automatic status polling for async operations
- Complete lighting enhancement workflow
- Comprehensive error handling

### 2. **React Hook** (`src/hooks/useBriaImageEditing.ts`)

A React hook that provides easy access to all image editing operations:

```typescript
const {
  erase,
  generativeFill,
  removeBackground,
  replaceBackground,
  expand,
  enhance,
  blurBackground,
  eraseForeground,
  cropForeground,
  increaseResolution,
  generateMasks,
  completeLightingEnhancement,
  isLoading,
  error,
} = useBriaImageEditing();
```

### 3. **Updated Edge Function** (`edge/bria/image-edit.ts`)

Enhanced edge function that supports all v2 endpoints:

- Direct image URLs/base64 (no onboarding required)
- Proper validation for mask and prompt requirements
- Support for all v2 operations
- Async/sync response handling

### 4. **Enhanced UI Component** (`src/pages/bria/ImageEditing.tsx`)

Completely redesigned image editing interface with:

- Image upload (file or URL/base64)
- Mask upload for operations that require it
- Prompt input for generative operations
- Operation selection dropdown
- Real-time preview
- Result display with download
- History tracking
- Complete lighting workflow button

## Usage Examples

### Basic Usage

```typescript
import { useBriaImageEditing } from '@/hooks/useBriaImageEditing';

function MyComponent() {
  const { removeBackground, isLoading } = useBriaImageEditing();

  const handleRemoveBg = async () => {
    const result = await removeBackground({
      image: 'https://example.com/image.jpg',
      sync: true,
    });
    console.log('Result:', result.result?.image_url);
  };

  return (
    <button onClick={handleRemoveBg} disabled={isLoading}>
      Remove Background
    </button>
  );
}
```

### Generative Fill

```typescript
const { generativeFill } = useBriaImageEditing();

const result = await generativeFill({
  image: imageUrl,
  mask: maskUrl,
  prompt: "Add professional studio lighting",
  version: 2,
  refinePrompt: true,
  sync: true,
});
```

### Complete Lighting Workflow

```typescript
const { completeLightingEnhancement } = useBriaImageEditing();

const result = await completeLightingEnhancement(imageUrl, {
  removeBackground: true,
  replaceBackground: true,
  enhance: true,
  expandCanvas: true,
  backgroundPrompt: "Professional studio lighting with warm key light",
  expandAspectRatio: "16:9",
});

console.log("Final URL:", result.finalUrl);
console.log("Workflow steps:", result.workflow);
console.log("Timing:", result.timing);
```

## API Endpoints

All operations are accessible through the edge function at `/edge/bria/image-edit`:

```typescript
POST /edge/bria/image-edit
{
  "operation": "remove_background",
  "image": "base64_string_or_url",
  "mask": "base64_string_or_url", // for erase, gen_fill, blur_background
  "prompt": "text prompt", // for gen_fill, replace_background, expand
  // ... operation-specific parameters
}
```

## Configuration

The service uses the existing BRIA API token configuration:

- Environment variable: `BRIA_API_KEY` or `BRIA_API_TOKEN`
- Production: `PRODUCTION` or `BRIA_API_TOKEN_PROD`
- Staging: `STAGING` or `BRIA_API_TOKEN_STAGING`

No additional configuration is required - it uses the same secrets as other BRIA integrations.

## Key Features

### 1. **No Onboarding Required**

Unlike the old API, v2 endpoints accept direct image URLs or base64 strings. No need to onboard images first.

### 2. **Comprehensive Operations**

All 11 image editing operations are fully supported with proper TypeScript types.

### 3. **Async/Sync Support**

Operations can run synchronously (wait for result) or asynchronously (poll for status).

### 4. **Complete Workflow**

The `completeLightingEnhancement` method combines multiple operations for professional results:

- Remove background
- Replace with lighting-enhanced background
- Expand canvas
- Enhance quality

### 5. **Type Safety**

Full TypeScript support with interfaces for all operations and responses.

## File Structure

```
src/
├── services/
│   └── briaImageEditingService.ts    # Main service class
├── hooks/
│   └── useBriaImageEditing.ts         # React hook
└── pages/
    └── bria/
        └── ImageEditing.tsx           # UI component

edge/
└── bria/
    └── image-edit.ts                  # Edge function
```

## Next Steps

1. **Test the Integration**: Use the ImageEditing page to test all operations
2. **Add Custom Workflows**: Create additional workflow methods as needed
3. **Enhance UI**: Add more advanced controls (mask drawing, preview, etc.)
4. **Add Batch Processing**: Extend to support batch operations

## Documentation

For detailed API documentation, refer to:

- BRIA API Documentation: https://bria.ai/docs
- Service file: `src/services/briaImageEditingService.ts` (includes inline docs)
- Hook file: `src/hooks/useBriaImageEditing.ts` (includes usage examples)

## Support

All operations follow the BRIA API v2 specification. For issues:

1. Check the error messages in the UI
2. Review the browser console for detailed errors
3. Verify API token is configured correctly
4. Check BRIA API status and rate limits
