# Lovable API Secret Keys Integration Guide

Complete guide for integrating and managing BRIA API secret keys in Lovable Cloud with improved error handling and validation.

## Overview

This integration provides enhanced secret management for BRIA/FIBO API keys in Lovable Cloud Edge Functions, with:

- ✅ **Multiple secret name support** - Flexible naming conventions
- ✅ **Environment-specific keys** - Automatic selection based on environment
- ✅ **Comprehensive validation** - Key format and placeholder detection
- ✅ **Better error messages** - Clear instructions for setup
- ✅ **Secure logging** - Never logs secrets or sensitive data

## Secret Management

### Supported Secret Names

The integration supports multiple secret naming conventions for flexibility:

#### Development Environment
- `BRIA_API_KEY` (primary)
- `BRIA_API_TOKEN` (alternative)
- `BRIA_TOKEN` (alternative)

#### Production Environment
Priority order:
1. `PRODUCTION` (primary)
2. `BRIA_API_TOKEN_PROD`
3. `BRIA_API_KEY_PROD`
4. `BRIA_API_KEY` (fallback)

#### Staging Environment
Priority order:
1. `STAGING` (primary)
2. `BRIA_API_TOKEN_STAGING`
3. `BRIA_API_KEY_STAGING`
4. `BRIA_API_KEY` (fallback)

### Setting Up Secrets in Lovable Cloud

1. **Navigate to Project Settings**
   - Go to your Lovable Cloud project dashboard
   - Click **Settings** → **Secrets**

2. **Add Required Secrets**
   - Click **"Add New Secret"**
   - Enter the secret name (exact match required)
   - Paste your BRIA API key
   - Click **Save**

3. **Verify Secrets**
   - Secrets are encrypted and stored securely
   - They're automatically available to Edge Functions
   - No need to redeploy after adding secrets (they're injected at runtime)

### Getting Your BRIA API Key

1. Visit [bria.ai](https://bria.ai)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Copy your API token
5. Add it to Lovable Cloud secrets

## Usage in Edge Functions

### Basic Usage

```typescript
import { getBriaApiKey, getBriaHeaders } from './utils';

export default async function handler(req: Request) {
  // Get API key (automatically selects based on environment)
  const apiKey = getBriaApiKey();
  
  // Create headers
  const headers = getBriaHeaders(apiKey);
  
  // Make API call
  const response = await fetch('https://engine.prod.bria-api.com/v2/image/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ /* ... */ })
  });
}
```

### Error Handling

The improved secret management provides detailed error messages:

```typescript
try {
  const apiKey = getBriaApiKey();
} catch (error) {
  // Error message includes:
  // - Current environment
  // - List of supported secret names
  // - Instructions for adding secrets
  console.error(error.message);
}
```

### Validation

The integration includes automatic validation:

```typescript
import { isValidBriaApiKey } from './utils';

const apiKey = getBriaApiKey();

// Optional: Additional validation
if (!isValidBriaApiKey(apiKey)) {
  throw new Error('Invalid API key format');
}
```

## Environment Detection

The integration automatically detects the environment from:

1. `NODE_ENV` environment variable
2. `ENV` environment variable (fallback)
3. Defaults to `'development'` if neither is set

### Environment Priority

- **Production**: Uses `PRODUCTION` secret or falls back to `BRIA_API_KEY`
- **Staging**: Uses `STAGING` secret or falls back to `BRIA_API_KEY`
- **Development**: Uses `BRIA_API_KEY` or alternatives

## Security Features

### Secret Protection

- ✅ Secrets are never logged (even in error messages)
- ✅ Automatic sanitization of log output
- ✅ Placeholder detection (prevents using example keys)
- ✅ Format validation (minimum length checks)

### Safe Logging

The `safeLog` utility automatically removes secrets:

```typescript
import { safeLog } from './utils';

// This will NOT log the API key, even if it's in the data object
safeLog('context', 'message', {
  apiKey: getBriaApiKey(), // This will be removed
  otherData: 'visible'
});
```

## Troubleshooting

### Error: "BRIA API key not configured"

**Cause:** No valid secret found in Lovable Cloud

**Solution:**
1. Verify secret exists in Lovable Cloud → Settings → Secrets
2. Check secret name matches exactly (case-sensitive)
3. Ensure secret value is not empty
4. Try using alternative secret names if primary doesn't work

### Error: "BRIA API key appears to be invalid"

**Cause:** Key format validation failed

**Solution:**
1. Verify API key is complete (not truncated)
2. Check for extra spaces or characters
3. Ensure key is at least 10 characters long
4. Verify key doesn't contain placeholder text

### Error: "BRIA API authentication failed"

**Cause:** Invalid or expired API key

**Solution:**
1. Verify key is valid in BRIA dashboard
2. Check key hasn't expired or been revoked
3. Ensure you're using the correct environment key
4. Try regenerating the key in BRIA dashboard

### Secret Not Found After Adding

**Cause:** Secret name mismatch or environment issue

**Solution:**
1. Verify exact secret name (case-sensitive)
2. Check current environment (`NODE_ENV` or `ENV`)
3. Ensure secret is saved in Lovable Cloud
4. Try using alternative secret names

## Best Practices

### ✅ DO

- ✅ Use environment-specific keys (`PRODUCTION`, `STAGING`)
- ✅ Rotate keys regularly
- ✅ Use different keys for different environments
- ✅ Store keys only in Lovable Cloud secrets (never in code)
- ✅ Use descriptive secret names
- ✅ Monitor API usage in BRIA dashboard

### ❌ DON'T

- ❌ Never commit secrets to git
- ❌ Never log API keys (even in server logs)
- ❌ Never return API keys in API responses
- ❌ Never use placeholder/example keys
- ❌ Never share secrets between team members (use team secrets)
- ❌ Never hardcode keys in Edge Functions

## Monitoring

### Lovable Cloud Dashboard

1. **Function Logs** - View execution logs (secrets are automatically sanitized)
2. **Usage Metrics** - Track function invocations
3. **Error Rates** - Monitor authentication failures

### BRIA Dashboard

1. **API Usage** - Monitor API call volume
2. **Credits** - Track remaining credits
3. **Rate Limits** - Check current rate limit status
4. **API Keys** - Manage and rotate keys

## Migration Guide

### Upgrading from Old Integration

If you're upgrading from the old secret management:

1. **No code changes required** - The new integration is backward compatible
2. **Secrets work as-is** - Existing `BRIA_API_KEY` secrets continue to work
3. **Optional improvements**:
   - Add environment-specific keys (`PRODUCTION`, `STAGING`)
   - Use more descriptive secret names
   - Enable additional validation

### Example Migration

**Before:**
```typescript
const apiKey = process.env.BRIA_API_KEY;
if (!apiKey) {
  throw new Error('API key missing');
}
```

**After:**
```typescript
import { getBriaApiKey } from './utils';

const apiKey = getBriaApiKey(); // Automatic validation and error handling
```

## Related Documentation

- [FIBO Parameter Reference](./FIBO_PARAMETER_REFERENCE.md) - Complete parameter guide
- [Lovable Edge Functions Setup](./LOVABLE_EDGE_FUNCTIONS_SETUP.md) - Edge function setup
- [BRIA API Documentation](https://docs.bria.ai) - Official BRIA docs

## Support

For issues with:
- **Lovable Cloud Secrets** - Check [Lovable Documentation](https://docs.lovable.dev)
- **BRIA API Keys** - Check [BRIA Documentation](https://docs.bria.ai)
- **This Integration** - Review error messages for specific guidance

