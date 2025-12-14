# BRIA API Edge Functions

Secure Lovable Cloud Edge Functions for integrating with BRIA AI's visual API suite.

## Overview

These Edge Functions provide a secure gateway to BRIA's APIs, ensuring:
- ✅ API keys are never exposed to the frontend
- ✅ Proper authentication headers (`api_token` not `Authorization: Bearer`)
- ✅ Environment-specific secret management (PRODUCTION, STAGING, BRIA_API_KEY)
- ✅ Comprehensive error handling and logging
- ✅ CORS support for web applications

## Setup

### 1. Add Secrets to Lovable Cloud

In your Lovable Cloud project, add the following secrets:

- **BRIA_API_KEY** - Your BRIA API token (for development)
- **PRODUCTION** - Production BRIA API token (optional, for production environment)
- **STAGING** - Staging BRIA API token (optional, for staging environment)

**How to add secrets:**
1. Go to your Lovable Cloud project settings
2. Navigate to "Secrets" section
3. Click "Add New Secret"
4. Add each secret with the exact name above

### 2. Deploy Edge Functions

These functions will be automatically deployed when you push to your Lovable Cloud project. Make sure secrets are attached to your deployment.

## Available Functions

### Structured Prompt Generation ⭐ NEW
**Endpoint:** `/edge/bria/structured-prompt`

Generate detailed FIBO JSON schemas from short text descriptions or images.
This implements Bria's recommended decoupled workflow:
1. Generate structured prompt from intent
2. Edit/refine the JSON
3. Pass to image generation

```typescript
POST /edge/bria/structured-prompt
{
  "prompt": "silver lamp with soft butterfly lighting",
  "images": ["url1", "url2"], // optional reference images
  "sync": true // default true for prompt generation
}
```

**Response:**
```json
{
  "request_id": "abc123", // if async
  "status": "COMPLETED",
  "structured_prompt": { /* full FIBO JSON */ },
  "data": { /* full BRIA response */ }
}
```

**Benefits:**
- Editable JSON for UI reflection (live JSON panel)
- Better deterministic control
- Auditability
- Separation of concerns

### Image Generation
**Endpoint:** `/edge/bria/image-generate`

Generate images using BRIA's FIBO API.

```typescript
POST /edge/bria/image-generate
{
  "prompt": "optional text prompt",
  "structured_prompt": { /* FIBO JSON */ },
  "images": ["url1", "url2"], // optional reference images
  "num_results": 1,
  "sync": false // async by default
}
```

**Response:**
```json
{
  "request_id": "abc123",
  "status": "IN_PROGRESS",
  "data": { /* BRIA response */ }
}
```

### Reimagine ⭐ NEW
**Endpoint:** `/edge/bria/reimagine`

Advanced image editing that generates stylized variations of existing images
with structured prompts. Perfect for:
- Product packshot variations
- Multi-format asset generation
- Style transfer with lighting control
- Automated crop/aspect ratio variants

```typescript
POST /edge/bria/reimagine
{
  "asset_id": "bria_asset_id", // or "image_url": "https://..."
  "structured_prompt": { /* FIBO JSON with lighting/composition */ },
  "prompt": "optional text prompt",
  "variations": 3, // number of variations to generate
  "sync": false // async by default
}
```

**Response:**
```json
{
  "request_id": "abc123",
  "status": "IN_PROGRESS",
  "data": { /* BRIA response */ }
}
```

### Image Editing
**Endpoint:** `/edge/bria/image-edit`

Edit images with operations like remove background, expand, enhance, etc.

```typescript
POST /edge/bria/image-edit
{
  "asset_id": "bria_asset_id",
  "operation": "remove_background", // or expand, enhance, etc.
  "params": { /* operation-specific params */ }
}
```

**Valid operations:**
- `remove_background`
- `expand`
- `enhance`
- `generative_fill`
- `crop`
- `mask`
- `upscale`
- `color_correction`
- `noise_reduction`

### Status Polling
**Endpoint:** `/edge/bria/status`

Poll the status of async BRIA jobs.

```typescript
GET /edge/bria/status?request_id=abc123
// or
POST /edge/bria/status
{
  "request_id": "abc123"
}
```

**Response:**
```json
{
  "request_id": "abc123",
  "status": "COMPLETED", // or IN_PROGRESS, ERROR, UNKNOWN
  "data": { /* full status response */ }
}
```

### Image Onboarding
**Endpoint:** `/edge/bria/image-onboard`

Onboard an image URL to BRIA's asset system.

```typescript
POST /edge/bria/image-onboard
{
  "image_url": "https://example.com/image.jpg"
}
```

### Ads Generation
**Endpoint:** `/edge/bria/ads-generate`

Generate advertisement images with templates and branding.

```typescript
POST /edge/bria/ads-generate
{
  "template_id": "optional_template_id",
  "branding_blocks": [...],
  "prompt": "ad description",
  "structured_prompt": { /* FIBO JSON */ }
}
```

### Product Shot Editing
**Endpoint:** `/edge/bria/product-shot`

Specialized product photography editing.

```typescript
POST /edge/bria/product-shot
{
  "asset_id": "bria_asset_id",
  "operation": "isolate", // or add_shadow, packshot, etc.
  "params": { /* operation params */ }
}
```

**Valid operations:**
- `isolate`
- `add_shadow`
- `packshot`
- `replace_background`
- `enhance_product`

### Tailored Generation
**Endpoint:** `/edge/bria/tailored-gen`

Brand-specific image generation.

```typescript
POST /edge/bria/tailored-gen
{
  "model_id": "brand_specific_model_id",
  "prompt": "text prompt",
  "structured_prompt": { /* FIBO JSON */ }
}
```

### Video Editing
**Endpoint:** `/edge/bria/video-edit`

Video editing operations (beta).

```typescript
POST /edge/bria/video-edit
{
  "asset_id": "bria_video_asset_id",
  "operation": "edit_operation",
  "params": { /* operation params */ }
}
```

## Usage from Frontend

### Recommended: Decoupled Workflow

This is Bria's recommended pattern for production use:

```typescript
// Step 1: Generate structured prompt from intent
const promptResponse = await fetch('/edge/bria/structured-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "silver lamp with soft butterfly lighting"
  })
});

const { structured_prompt } = await promptResponse.json();

// Step 2: Edit/refine the JSON (show in UI for user editing)
structured_prompt.lighting = { /* custom lighting override */ };

// Step 3: Generate image with refined structured prompt
const imageResponse = await fetch('/edge/bria/image-generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    structured_prompt: structured_prompt,
    num_results: 1,
    sync: false
  })
});

const { request_id, status } = await imageResponse.json();

// Step 4: Poll for completion
if (status === 'IN_PROGRESS') {
  const statusResponse = await fetch(`/edge/bria/status?request_id=${request_id}`);
  const statusData = await statusResponse.json();
  // Handle status updates
}
```

### Using TypeScript Client SDK

For a better developer experience, use the TypeScript client:

```typescript
import { BriaClient } from '../lib/bria-client';

const client = new BriaClient();

// Complete workflow
const { structured_prompt, result } = await client.generateFromPrompt(
  "silver lamp with soft butterfly lighting",
  {
    onStructuredPrompt: (prompt) => {
      // Show in UI for editing
      setEditablePrompt(prompt);
    },
    onProgress: (status) => {
      // Show progress
      console.log('Progress:', status.status);
    }
  }
);
```

### Example: Generate Image (Direct)

```typescript
const response = await fetch('/edge/bria/image-generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    structured_prompt: {
      lighting: { /* FIBO lighting setup */ },
      subject: { /* subject description */ },
      // ... other FIBO fields
    },
    num_results: 1,
    sync: false
  })
});

const { request_id, status } = await response.json();

// Poll for completion
if (status === 'IN_PROGRESS') {
  const statusResponse = await fetch(`/edge/bria/status?request_id=${request_id}`);
  const statusData = await statusResponse.json();
  // Handle status updates
}
```

### Example: Reimagine Image

```typescript
// Generate variations with custom lighting
const reimagineResponse = await fetch('/edge/bria/reimagine', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    asset_id: "bria_asset_id",
    structured_prompt: {
      lighting: { /* custom lighting */ },
      composition: { /* custom composition */ }
    },
    variations: 3,
    sync: false
  })
});

const { request_id } = await reimagineResponse.json();
// Poll for completion...
```

### Example: Edit Image

```typescript
// First onboard the image
const onboardResponse = await fetch('/edge/bria/image-onboard', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image_url: 'https://example.com/product.jpg'
  })
});

const { asset_id } = await onboardResponse.json();

// Then edit it
const editResponse = await fetch('/edge/bria/image-edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    asset_id,
    operation: 'remove_background',
    params: {}
  })
});

const { request_id } = await editResponse.json();
```

## Error Handling

All functions return structured error responses:

```json
{
  "error": "Human-readable error message",
  "errorCode": "BRIA_AUTH_ERROR",
  "statusCode": 401,
  "details": { /* optional additional details */ }
}
```

**Common error codes:**
- `BRIA_AUTH_ERROR` - Authentication failed (401)
- `BRIA_RATE_LIMIT` - Rate limit exceeded (429)
- `BRIA_NETWORK_ERROR` - Network/connection error (503)
- `BRIA_TIMEOUT` - Request timeout (504)
- `VALIDATION_ERROR` - Invalid request parameters (400)
- `BRIA_UNKNOWN_ERROR` - Unknown error (500)

## Security Best Practices

1. **Never expose API keys** - All keys are stored in Lovable Cloud secrets
2. **Use environment-specific keys** - PRODUCTION for prod, STAGING for staging
3. **Validate all inputs** - Functions validate request bodies
4. **Safe logging** - Secrets are never logged
5. **CORS enabled** - Functions support CORS for web apps

## Integration with Supabase Functions

You can call these Edge Functions from your Supabase Edge Functions:

```typescript
// In your Supabase function
const briaResponse = await fetch('https://your-lovable-project.lovable.dev/edge/bria/image-generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    structured_prompt: fiboJson,
    num_results: 1
  })
});
```

## Monitoring

- Check Lovable Cloud logs for function execution
- Monitor error rates and response times
- Track API usage via BRIA dashboard
- Set up alerts for authentication failures

## Troubleshooting

### "BRIA API key not configured"
- Ensure secrets are added in Lovable Cloud
- Verify secret names match exactly (BRIA_API_KEY, PRODUCTION, STAGING)
- Redeploy functions after adding secrets

### "BRIA API authentication failed"
- Verify your API key is valid
- Check that you're using the correct environment key
- Ensure key hasn't expired or been revoked

### "Rate limit exceeded"
- Implement exponential backoff
- Reduce request frequency
- Check BRIA dashboard for usage limits

## Support

For BRIA API documentation, visit: https://bria.ai/docs

For Lovable Cloud documentation, visit: https://docs.lovable.dev
