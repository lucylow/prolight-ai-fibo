# Lovable Edge Functions Setup Guide

Complete guide for setting up and using Lovable Cloud Edge Functions with BRIA AI integration in your ProLight AI project.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setting Up Secrets](#setting-up-secrets)
4. [Deploying Edge Functions](#deploying-edge-functions)
5. [Using Edge Functions](#using-edge-functions)
6. [Integration Examples](#integration-examples)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

## Overview

Lovable Edge Functions provide a secure, scalable way to integrate BRIA AI's visual APIs into your application. They ensure:

- ✅ API keys are never exposed to frontend code
- ✅ Secrets are encrypted and managed by Lovable Cloud
- ✅ Automatic scaling with traffic
- ✅ Built-in monitoring and logging
- ✅ Environment-specific configuration (production/staging)

## Prerequisites

1. **Lovable Cloud Account** - Sign up at [lovable.dev](https://lovable.dev)
2. **BRIA API Key** - Get your API key from [Bria AI](https://bria.ai)
3. **Lovable Project** - Your ProLight AI project deployed on Lovable Cloud

## Setting Up Secrets

### Step 1: Access Lovable Cloud Secrets

1. Go to your Lovable Cloud project dashboard
2. Navigate to **Settings** → **Secrets**
3. Click **"Add New Secret"**

### Step 2: Add Required Secrets

Add the following secrets with these exact names:

#### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `BRIA_API_KEY` | Your BRIA API token (development) | `bria_abc123...` |
| `PRODUCTION` | Production BRIA API token (optional) | `bria_prod_xyz...` |
| `STAGING` | Staging BRIA API token (optional) | `bria_staging_123...` |

**Note:** The Edge Functions will automatically select the correct key based on `NODE_ENV`:
- `production` → Uses `PRODUCTION` or falls back to `BRIA_API_KEY`
- `staging` → Uses `STAGING` or falls back to `BRIA_API_KEY`
- `development` → Uses `BRIA_API_KEY`

### Step 3: Verify Secrets

After adding secrets, verify they're accessible:

1. Deploy a test Edge Function
2. Check logs to ensure secrets are loaded (they won't be printed, but you'll see `hasKey: true` in logs)
3. Test an API call to verify authentication works

## Deploying Edge Functions

### Automatic Deployment

Edge Functions in the `/edge` directory are automatically deployed when you:

1. Push to your main branch
2. Deploy via Lovable Cloud dashboard
3. Use Lovable CLI: `lovable deploy`

### Manual Deployment

If you need to deploy manually:

```bash
# Using Lovable CLI
lovable deploy --functions edge/bria

# Or deploy all functions
lovable deploy
```

### Verify Deployment

After deployment, check:

1. **Function Status** - Go to Lovable Cloud → Functions → Check status is "Active"
2. **Logs** - View function logs to ensure no errors
3. **Test Endpoint** - Make a test request to verify it works

## Using Edge Functions

### From Frontend (React/Next.js)

#### Basic Image Generation

```typescript
async function generateImage(fiboJson: Record<string, unknown>) {
  const response = await fetch('/edge/bria/image-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structured_prompt: fiboJson,
      num_results: 1,
      sync: false // async by default
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Generation failed');
  }

  const { request_id, status, data } = await response.json();
  
  if (status === 'IN_PROGRESS') {
    // Poll for completion
    return await pollStatus(request_id);
  }
  
  return data;
}

async function pollStatus(request_id: string) {
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

    const response = await fetch(`/edge/bria/status?request_id=${request_id}`);
    const { status, data } = await response.json();

    if (status === 'COMPLETED') {
      return data;
    }

    if (status === 'ERROR') {
      throw new Error('Generation failed');
    }

    attempts++;
  }

  throw new Error('Generation timeout');
}
```

#### Image Editing Workflow

```typescript
async function editImage(imageUrl: string, operation: string) {
  // Step 1: Onboard the image
  const onboardResponse = await fetch('/edge/bria/image-onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl })
  });

  const { asset_id } = await onboardResponse.json();

  // Step 2: Perform edit operation
  const editResponse = await fetch('/edge/bria/image-edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset_id,
      operation, // e.g., 'remove_background'
      params: {}
    })
  });

  const { request_id } = await editResponse.json();

  // Step 3: Poll for completion
  return await pollStatus(request_id);
}
```

### From Supabase Edge Functions

Use the helper client:

```typescript
import { createLovableEdgeClient } from '../_shared/lovable-edge-client.ts';

const lovableClient = createLovableEdgeClient({
  baseUrl: Deno.env.get('LOVABLE_EDGE_URL') || 'https://your-project.lovable.dev'
});

// Generate image
const result = await lovableClient.generateImage({
  structured_prompt: fiboJson,
  num_results: 1
});

// Wait for completion
if (result.status === 'IN_PROGRESS' && result.request_id) {
  const completed = await lovableClient.waitForCompletion(result.request_id, {
    pollInterval: 2000,
    maxWait: 300000,
    onProgress: (status) => console.log(`Status: ${status}`)
  });
  
  return completed.data;
}
```

## Integration Examples

### Example 1: Update Supabase Function to Use Lovable Edge Functions

**Before (direct BRIA call - not recommended):**
```typescript
// ❌ Don't do this - exposes API key risk
const response = await fetch('https://engine.prod.bria-api.com/v2/image/generate', {
  headers: {
    'api_token': Deno.env.get('BRIA_API_KEY'), // ⚠️ Key in Supabase env
  },
  // ...
});
```

**After (using Lovable Edge Function):**
```typescript
// ✅ Secure - keys in Lovable Cloud
import { createLovableEdgeClient } from '../_shared/lovable-edge-client.ts';

const client = createLovableEdgeClient({
  baseUrl: Deno.env.get('LOVABLE_EDGE_URL')
});

const result = await client.generateImage({
  structured_prompt: fiboJson
});
```

### Example 2: Complete FIBO Generation Flow

```typescript
// In your Supabase function or frontend
async function generateWithFIBO(lightingSetup: Record<string, unknown>) {
  // Build FIBO JSON
  const fiboJson = {
    lighting: {
      key_light: { /* ... */ },
      fill_light: { /* ... */ },
      // ...
    },
    subject: { /* ... */ },
    environment: { /* ... */ },
    // ...
  };

  // Generate via Lovable Edge Function
  const response = await fetch('/edge/bria/image-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structured_prompt: fiboJson,
      num_results: 1,
      sync: false
    })
  });

  const { request_id, status } = await response.json();

  // Handle async response
  if (status === 'IN_PROGRESS') {
    // Set up polling or webhook
    return { request_id, status: 'processing' };
  }

  return { image_url: response.data?.image_url };
}
```

### Example 3: Product Shot Pipeline

```typescript
async function processProductShot(imageUrl: string) {
  const client = createLovableEdgeClient({
    baseUrl: Deno.env.get('LOVABLE_EDGE_URL')
  });

  // 1. Onboard
  const { asset_id } = await client.onboardImage(imageUrl);

  // 2. Isolate product
  const { request_id: isolateId } = await client.editProductShot({
    asset_id,
    operation: 'isolate',
    params: {}
  });

  const isolated = await client.waitForCompletion(isolateId);

  // 3. Add shadow
  const { request_id: shadowId } = await client.editProductShot({
    asset_id: isolated.data.asset_id,
    operation: 'add_shadow',
    params: { shadow_type: 'natural' }
  });

  return await client.waitForCompletion(shadowId);
}
```

## Troubleshooting

### Issue: "BRIA API key not configured"

**Symptoms:**
- Error: `BRIA API key not configured. Please add BRIA_API_KEY...`

**Solutions:**
1. Verify secret exists in Lovable Cloud → Settings → Secrets
2. Check secret name matches exactly: `BRIA_API_KEY`, `PRODUCTION`, or `STAGING`
3. Redeploy Edge Functions after adding secrets
4. Check `NODE_ENV` matches your secret selection logic

### Issue: "BRIA API authentication failed"

**Symptoms:**
- Error: `BRIA API authentication failed. Check your API key.`
- Status code: 401

**Solutions:**
1. Verify API key is valid in BRIA dashboard
2. Check key hasn't expired or been revoked
3. Ensure you're using correct environment key (prod vs staging)
4. Verify key format is correct (no extra spaces/characters)

### Issue: "Rate limit exceeded"

**Symptoms:**
- Error: `BRIA API rate limit exceeded`
- Status code: 429

**Solutions:**
1. Implement exponential backoff in your polling logic
2. Reduce request frequency
3. Check BRIA dashboard for usage limits
4. Consider upgrading BRIA plan if needed

### Issue: Functions not deploying

**Symptoms:**
- Functions don't appear in Lovable Cloud dashboard
- Deployment fails

**Solutions:**
1. Verify functions are in `/edge` directory
2. Check file structure matches expected format
3. Ensure `@lovable/cloud` is imported correctly
4. Check Lovable Cloud logs for deployment errors
5. Verify you have deployment permissions

### Issue: CORS errors

**Symptoms:**
- Browser console shows CORS errors
- Requests fail from frontend

**Solutions:**
1. Verify Edge Functions return CORS headers (already included)
2. Check request origin is allowed
3. Ensure OPTIONS preflight requests are handled
4. Verify frontend is calling correct endpoint URL

## Security Best Practices

### ✅ DO

- ✅ Store all API keys in Lovable Cloud secrets
- ✅ Use environment-specific keys (PRODUCTION, STAGING)
- ✅ Never log or return API keys in responses
- ✅ Validate all input parameters
- ✅ Use HTTPS for all requests
- ✅ Implement rate limiting on frontend
- ✅ Handle errors gracefully without exposing internals

### ❌ DON'T

- ❌ Never put API keys in frontend code
- ❌ Never commit secrets to git
- ❌ Never log API keys (even in server logs)
- ❌ Never return API keys in API responses
- ❌ Never use `Authorization: Bearer` for BRIA (use `api_token`)
- ❌ Never expose BRIA base URLs to frontend

## Monitoring

### Lovable Cloud Dashboard

1. **Function Logs** - View execution logs and errors
2. **Usage Metrics** - Track function invocations and costs
3. **Error Rates** - Monitor error frequency and types
4. **Performance** - Track response times and timeouts

### BRIA Dashboard

1. **API Usage** - Monitor API call volume
2. **Credits** - Track remaining credits
3. **Rate Limits** - Check current rate limit status
4. **Job Status** - View async job progress

## Next Steps

1. ✅ Set up secrets in Lovable Cloud
2. ✅ Deploy Edge Functions
3. ✅ Test with a simple image generation
4. ✅ Integrate into your Supabase functions
5. ✅ Update frontend to use Edge Functions
6. ✅ Set up monitoring and alerts
7. ✅ Document your specific use cases

## Additional Resources

- [Lovable Cloud Documentation](https://docs.lovable.dev)
- [BRIA API Documentation](https://bria.ai/docs)
- [Edge Functions README](../edge/bria/README.md)
- [ProLight AI Project Structure](../PROJECT_STRUCTURE.md)

## Support

For issues with:
- **Lovable Cloud** - Check [Lovable Documentation](https://docs.lovable.dev) or contact Lovable support
- **BRIA API** - Check [BRIA Documentation](https://bria.ai/docs) or contact BRIA support
- **This Integration** - Open an issue in your project repository
