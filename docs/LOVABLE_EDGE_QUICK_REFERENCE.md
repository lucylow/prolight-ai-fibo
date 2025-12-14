# Lovable Edge Functions - Quick Reference

Quick reference guide for using BRIA API Edge Functions in ProLight AI.

## Endpoints

| Function | Endpoint | Method | Purpose |
|----------|----------|--------|---------|
| Image Generate | `/edge/bria/image-generate` | POST | Generate images with FIBO |
| Image Edit | `/edge/bria/image-edit` | POST | Edit images (remove bg, expand, etc.) |
| Status | `/edge/bria/status` | GET/POST | Poll async job status |
| Image Onboard | `/edge/bria/image-onboard` | POST | Onboard image to BRIA |
| Ads Generate | `/edge/bria/ads-generate` | POST | Generate advertisement images |
| Product Shot | `/edge/bria/product-shot` | POST | Product photography editing |
| Tailored Gen | `/edge/bria/tailored-gen` | POST | Brand-specific generation |
| Video Edit | `/edge/bria/video-edit` | POST | Video editing (beta) |

## Secrets Required

Add these in Lovable Cloud → Settings → Secrets:

- `BRIA_API_KEY` - Development key
- `PRODUCTION` - Production key (optional)
- `STAGING` - Staging key (optional)

## Quick Examples

### Generate Image

```typescript
const res = await fetch('/edge/bria/image-generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    structured_prompt: fiboJson,
    num_results: 1,
    sync: false
  })
});

const { request_id, status } = await res.json();
```

### Poll Status

```typescript
const res = await fetch(`/edge/bria/status?request_id=${request_id}`);
const { status, data } = await res.json();
```

### Edit Image

```typescript
// 1. Onboard
const onboard = await fetch('/edge/bria/image-onboard', {
  method: 'POST',
  body: JSON.stringify({ image_url: 'https://...' })
});
const { asset_id } = await onboard.json();

// 2. Edit
const edit = await fetch('/edge/bria/image-edit', {
  method: 'POST',
  body: JSON.stringify({
    asset_id,
    operation: 'remove_background'
  })
});
const { request_id } = await edit.json();
```

## Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `BRIA_AUTH_ERROR` | 401 | Invalid API key |
| `BRIA_RATE_LIMIT` | 429 | Rate limit exceeded |
| `BRIA_NETWORK_ERROR` | 503 | Network/connection issue |
| `BRIA_TIMEOUT` | 504 | Request timeout |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |

## Status Values

- `IN_PROGRESS` - Job is processing
- `COMPLETED` - Job finished successfully
- `ERROR` - Job failed
- `UNKNOWN` - Status unknown

## Common Operations

### Image Editing Operations

- `remove_background`
- `expand`
- `enhance`
- `generative_fill`
- `crop`
- `mask`
- `upscale`
- `color_correction`
- `noise_reduction`

### Product Shot Operations

- `isolate`
- `add_shadow`
- `packshot`
- `replace_background`
- `enhance_product`

## Using from Supabase Functions

```typescript
import { createLovableEdgeClient } from '../_shared/lovable-edge-client.ts';

const client = createLovableEdgeClient({
  baseUrl: Deno.env.get('LOVABLE_EDGE_URL')
});

const result = await client.generateImage({
  structured_prompt: fiboJson
});
```

## Troubleshooting

**"BRIA API key not configured"**
→ Add `BRIA_API_KEY` secret in Lovable Cloud

**"Authentication failed"**
→ Check API key is valid and correct environment

**"Rate limit exceeded"**
→ Implement backoff, reduce frequency

**CORS errors**
→ Functions already include CORS headers

## Full Documentation

See [LOVABLE_EDGE_FUNCTIONS_SETUP.md](./LOVABLE_EDGE_FUNCTIONS_SETUP.md) for complete setup guide.
