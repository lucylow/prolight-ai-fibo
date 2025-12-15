# FLUX.2 Integration Guide

This document describes the FLUX.2 integration for ProLight AI, enabling high-quality, structured JSON-controlled image generation.

## Overview

FLUX.2 (FIBO) is a state-of-the-art open-source text-to-image model trained on licensed data. It supports structured JSON prompts up to 1,000+ words, providing precise control over lighting, composition, color, and camera settings.

## Features

- **Structured JSON Prompting**: Full control via FIBO JSON format
- **Generate Mode**: Create images from structured prompts
- **Refine Mode**: Iteratively refine images with locked fields
- **Inspire Mode**: Generate variations from reference images
- **Deterministic Output**: Reproducible results with seed control
- **Cost Tracking**: Automatic credit usage recording

## Environment Variables

Add these to your Supabase project secrets (Settings → Edge Functions → Secrets):

```bash
# Required
FLUX2_API_KEY=sk_xxx                    # Your FLUX.2/Bria API key
FLUX2_API_URL=https://api.bria.ai/v1/models/flux-2  # API endpoint (adjust for your provider)

# Optional
FLUX2_COST_PER_IMAGE=0.04              # Cost per image in credits (default: 0.04)
```

### Provider-Specific URLs

- **Bria AI**: `https://api.bria.ai/v1/models/flux-2`
- **Runware**: `https://api.runware.com/v1/flux-2`
- **Custom ComfyUI Bridge**: Your custom endpoint

## API Endpoints

### Generate Image

**Endpoint**: `POST /flux2-generate`

**Request**:

```typescript
{
  prompt_json: {
    subject: { main_entity: "silver wristwatch", ... },
    camera: { fov: 55, aperture: 2.8, ... },
    lighting: { key_light: {...}, fill_light: {...}, ... },
    render: { resolution: [2048, 2048], sampler_steps: 40, ... }
  },
  seed?: number,           // Optional: for reproducibility
  steps?: number,          // Default: 40
  guidance?: number,       // Default: 7.5
  output_format?: string,  // Default: "png"
  mode?: "generate" | "refine" | "inspire"
}
```

**Response**:

```typescript
{
  image_url?: string,      // URL to generated image
  image_b64?: string,      // Base64 encoded image (if URL not available)
  image_id: string,
  json_prompt: {...},      // The structured prompt used
  cost: number,            // Cost in credits
  generation_metadata: {
    model: "flux-2",
    mode: "generate",
    timestamp: string,
    provider: "bria"
  }
}
```

## Frontend Usage

### Using the Hook

```typescript
import { useGeneration } from '@/hooks/useGeneration';

function MyComponent() {
  const { generateWithFlux2FromSetup, isGenerating } = useGeneration();

  const handleGenerate = async () => {
    try {
      const result = await generateWithFlux2FromSetup({
        seed: 12345,      // Optional: for reproducibility
        steps: 40,        // Optional: default 40
        guidance: 7.5     // Optional: default 7.5
      });
      console.log('Generated:', result);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <button onClick={handleGenerate} disabled={isGenerating}>
      {isGenerating ? 'Generating...' : 'Generate with FLUX.2'}
    </button>
  );
}
```

### Direct API Call

```typescript
import { generateWithFlux2 } from '@/services/supabaseEdgeClient';

const result = await generateWithFlux2({
  prompt_json: {
    subject: { main_entity: "product" },
    camera: { fov: 55, aperture: 2.8 },
    lighting: { key_light: {...} },
    render: { resolution: [2048, 2048] }
  },
  seed: 12345,
  steps: 40
});
```

## FIBO JSON Structure

FLUX.2 uses the FIBO (Fully Integrated Bounding Object) JSON format:

```json
{
  "subject": {
    "main_entity": "silver wristwatch",
    "attributes": ["studio", "clean", "isolated"],
    "action": "posed for professional photograph"
  },
  "camera": {
    "fov": 55,
    "aperture": 2.8,
    "focus_distance_m": 0.8,
    "shot_type": "close-up",
    "camera_angle": "45 degrees right",
    "lens_type": "85mm portrait"
  },
  "lighting": {
    "key_light": {
      "type": "area",
      "position": [0.5, 1.2, 0.8],
      "direction": [-0.3, -0.7, -0.6],
      "intensity": 1.2,
      "color_temperature": 5600,
      "softness": 0.25
    },
    "fill_light": {
      "type": "point",
      "position": [-0.8, 0.6, 1.0],
      "intensity": 0.25,
      "color_temperature": 5600,
      "softness": 0.9
    },
    "rim_light": {
      "type": "directional",
      "direction": [0.0, 0.8, -0.6],
      "intensity": 0.6,
      "color_temperature": 3200,
      "softness": 0.4
    }
  },
  "render": {
    "resolution": [2048, 2048],
    "color_space": "ACEScg",
    "bit_depth": 16,
    "sampler_steps": 40
  },
  "composition": {
    "rule_of_thirds": true,
    "depth_layers": ["foreground", "subject", "background"]
  }
}
```

## Modes

### Generate Mode

Create a new image from a structured prompt:

```typescript
await generateWithFlux2({
  prompt_json: fiboJson,
  mode: "generate",
  seed: 12345,
});
```

### Refine Mode

Refine an existing generation by updating specific fields:

```typescript
await generateWithFlux2({
  mode: "refine",
  generation_ref: "previous-generation-id",
  instruction: "warmer key light",
  locked_fields: ["subject", "camera"], // Keep these unchanged
});
```

### Inspire Mode

Generate variations from a reference image:

```typescript
// First, convert image to base64
const base64 = await imageToBase64(imageFile);

await generateWithFlux2({
  mode: "inspire",
  reference_image_base64: base64,
  prompt_json: {
    // Optional: additional creative intent
  },
});
```

## Cost Management

- Default cost: **$0.04 per image** (configurable via `FLUX2_COST_PER_IMAGE`)
- Credits are automatically deducted from user's subscription
- Caching can be implemented to avoid duplicate costs (see implementation notes)

## Error Handling

The integration includes comprehensive error handling:

- **AI_AUTH_ERROR**: API key invalid or missing
- **AI_RATE_LIMIT**: Too many requests (includes `retryAfter` seconds)
- **AI_TIMEOUT**: Request took too long (3min timeout)
- **AI_NETWORK_ERROR**: Connection issues
- **INSUFFICIENT_CREDITS**: User doesn't have enough credits
- **NO_ACTIVE_PLAN**: User needs to subscribe

All errors are user-friendly and include retry logic where appropriate.

## Best Practices

1. **Use Seeds for Reproducibility**: Always store and reuse seeds for consistent results
2. **Cache Identical Prompts**: Hash prompts to avoid duplicate API calls
3. **Batch Processing**: Use async jobs for multiple images
4. **Lock Fields in Refine**: Only change what you need to modify
5. **Monitor Costs**: Track usage via credit_usage table

## Example: Complete Workflow

```typescript
// 1. Build FIBO JSON from UI state
const fiboJson = buildFiboFromLightingSetup(lightingSetup, cameraSettings);

// 2. Generate initial image
const initial = await generateWithFlux2({
  prompt_json: fiboJson,
  seed: 12345,
  steps: 40,
});

// 3. Refine with warmer lighting
const refined = await generateWithFlux2({
  mode: "refine",
  generation_ref: initial.image_id,
  instruction: "warmer key light, 3200K",
  locked_fields: ["subject", "camera", "composition"],
});

// 4. Generate variations with different seeds
const variations = await Promise.all([
  generateWithFlux2({ prompt_json: fiboJson, seed: 12346 }),
  generateWithFlux2({ prompt_json: fiboJson, seed: 12347 }),
  generateWithFlux2({ prompt_json: fiboJson, seed: 12348 }),
]);
```

## Troubleshooting

### API Key Issues

- Verify `FLUX2_API_KEY` is set in Supabase secrets
- Check API key has proper permissions
- Ensure key hasn't expired

### Timeout Errors

- Increase timeout in edge function (default: 180s)
- Reduce `steps` parameter for faster generation
- Check network connectivity

### Credit Issues

- Verify user has active subscription
- Check credit limits in database
- Review `credit_usage` table for usage history

## Future Enhancements

- [ ] Prompt caching with hash-based deduplication
- [ ] Async job queue for batch processing
- [ ] Streaming progress updates
- [ ] WebSocket support for real-time status
- [ ] Batch generation endpoint
- [ ] Image-to-prompt extraction (inspire mode enhancement)

## References

- [FLUX.2 Documentation](https://bria.ai/docs/flux-2)
- [FIBO Schema Reference](./docs/FIBO_PARAMETER_REFERENCE.md)
- [Bria AI API Docs](https://bria.ai/docs)
