# Bria Ads Generation API v1 Integration

This document describes the integration of Bria's Ads Generation API v1 into the ProLight project.

## Overview

The v1 Ads Generation API enables creating multiple ad scenes (variations) using templates, brands, and smart image backgrounds. The integration includes:

- **Edge Functions**: Serverless functions that proxy requests to Bria's API
- **Frontend API Client**: TypeScript functions for calling the edge functions
- **React Component**: Full-featured UI with polling and scene display

## Architecture

### Edge Functions

Located in `edge/bria/`:

1. **`ads-generate-v1.ts`**: Submits ad generation requests to Bria's v1 API
   - Endpoint: `POST /edge/bria/ads-generate-v1`
   - Returns: `{ result: [{ id, name, url, resolution }] }`

2. **`ads-status.ts`**: Checks the status of a generated scene URL
   - Endpoint: `GET /edge/bria/ads-status?url=...`
   - Returns: `{ status: 'pending'|'ready'|'failed', contentLength, statusCode }`

3. **`ads-download.ts`**: Proxies final image bytes to the client
   - Endpoint: `GET /edge/bria/ads-download?url=...`
   - Returns: Image bytes with proper headers

### Frontend API Client

Located in `src/api/bria.ts`:

```typescript
// Generate ads
const response = await generateAdsV1({
  template_id: "1062",
  brand_id: "167",
  smart_image: { ... },
  elements: [ ... ],
  content_moderation: false
});

// Check status
const status = await checkAdsStatus(sceneUrl);

// Download image
const blob = await downloadAdsImage(sceneUrl);
```

### React Component

Located in `src/pages/bria/AdsGenerationV1.tsx`:

- Form for configuring ad generation
- Real-time polling with exponential backoff
- Scene-by-scene status display
- Image preview and download
- Progress indicators

## Usage

### Access the UI

Navigate to `/bria/ads-generation-v1` in your application.

### Public Templates & Brands

For testing, you can use these public IDs:

**Templates:**
- `1062`: Requires a brand ID
- `1061`: Brand-independent (doesn't require brand ID)

**Brands:**
- `167`, `166`, `122`, `121`, `120`: Compatible with template 1062

### Example Request

```typescript
const payload = {
  template_id: "1062",
  brand_id: "167",
  content_moderation: false,
  smart_image: {
    input_image_url: "https://images.unsplash.com/photo-1518544882205-450b760f8b7a",
    scene: {
      operation: "lifestyle_shot_by_text",
      input: "Outdoor lifestyle background, shallow depth of field, warm late-afternoon light"
    }
  },
  elements: [
    {
      layer_type: "text",
      content_type: "Heading #1",
      content: "ProLight — Precision Lighting"
    },
    {
      layer_type: "text",
      content_type: "Body #1",
      content: "Control lighting for product photography — simulate key/fill/rim"
    }
  ]
};
```

## How It Works

1. **Submission**: User submits a generation request via the UI
2. **API Call**: Frontend calls `/edge/bria/ads-generate-v1` with the payload
3. **Placeholder URLs**: Bria immediately returns placeholder URLs for each scene
4. **Polling**: Frontend polls each scene URL via `/edge/bria/ads-status`
5. **Ready Detection**: When `contentLength > 0`, the scene is ready
6. **Download**: Frontend downloads the image via `/edge/bria/ads-download`
7. **Display**: Image is displayed in the UI with download option

## Status States

- **pending**: Scene is still being generated (polling continues)
- **ready**: Scene is complete and image is available
- **failed**: Generation failed (zero-byte placeholder)
- **timeout**: Polling exceeded maximum attempts

## Polling Configuration

- **Max Attempts**: 60 polls per scene
- **Initial Interval**: 2 seconds
- **Backoff**: Exponential (multiplier: 1.5, max: 60s)

## Smart Image Feature

The smart image feature allows embedding objects/products into generated backgrounds:

- **`lifestyle_shot_by_text`**: Generate a background from a text prompt
- **`expand_image`**: Extend the existing background

The `input_image_url` should point to a publicly accessible image (product, presenter, etc.).

## Content Moderation

When `content_moderation: true`:
- Input images are checked for inappropriate content
- If any input fails, the entire request returns 422
- Generated ads that fail moderation are replaced with zero-byte files

## Environment Variables

The edge functions require a Bria API token:

- `BRIA_API_KEY` (development)
- `PRODUCTION` (production environment)
- `STAGING` (staging environment)
- `BRIA_API_TOKEN` (alternative name)

Set these in your Lovable Cloud project secrets.

## API Differences: v1 vs v2

| Feature | v1 API | v2 API |
|---------|--------|--------|
| Endpoint | `/v1/ads/generate` | `/v2/ads/generate` |
| Response | Immediate placeholder URLs | Request ID for polling |
| Scenes | Multiple scenes per template | Single result |
| Smart Image | Built-in support | Via branding blocks |
| Polling | Client-side URL polling | Server-side status polling |

## Troubleshooting

### No scenes returned
- Check that `template_id` is valid
- Verify `brand_id` matches template requirements (if template requires brand)

### Scenes stuck in "pending"
- Check network connectivity
- Verify Bria API token is valid
- Check browser console for errors
- Scene may still be generating (can take several minutes)

### Download fails
- Verify the scene URL is accessible
- Check CORS settings
- Ensure image hasn't expired (Bria URLs may have TTL)

### Zero-byte files
- Generation failed for that scene
- Check if content moderation blocked it
- Verify input image URL is accessible

## Future Enhancements

- Server-side polling with WebSocket/SSE updates
- Batch generation for multiple variations
- Template/brand selection UI
- Image upload for smart_image
- Caching of generated scenes
- Integration with ProLight lighting simulator for background prompts

