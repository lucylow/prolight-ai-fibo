# Lovable Deployment Guide - ProLight AI

Complete guide for deploying ProLight AI to Lovable with full backend and frontend integration.

## Prerequisites

1. **Lovable Account** - Sign up at [lovable.dev](https://lovable.dev)
2. **Supabase Project** - Create a project at [supabase.com](https://supabase.com)
3. **Lovable API Key** - Get from your Lovable project settings

## Step 1: Configure Supabase

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings → API

### 1.2 Deploy Edge Functions
The edge functions are located in `supabase/functions/`:
- `natural-language-lighting` - Converts natural language to lighting JSON and generates images
- `generate-lighting` - Generates images from lighting setups
- `analyze-lighting` - Analyzes lighting configurations

Deploy them using Supabase CLI:
```bash
supabase functions deploy natural-language-lighting
supabase functions deploy generate-lighting
supabase functions deploy analyze-lighting
```

Or use the Supabase dashboard to deploy each function.

## Step 2: Configure Environment Variables in Lovable

### 2.1 Frontend Environment Variables

In Lovable project settings → Environment Variables, add:

```bash
# Required - Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

**Where to find these:**
- Go to your Supabase project dashboard
- Navigate to Settings → API
- Copy the "Project URL" for `VITE_SUPABASE_URL`
- Copy the "anon public" key for `VITE_SUPABASE_PUBLISHABLE_KEY`

### 2.2 Backend Edge Function Secrets

In Supabase project settings → Edge Functions → Secrets, add:

```bash
# Required - Lovable AI Gateway
LOVABLE_API_KEY=your-lovable-api-key-here
```

**Where to find LOVABLE_API_KEY:**
- Go to your Lovable project dashboard
- Navigate to Settings → Secrets
- Create a new secret named `LOVABLE_API_KEY`
- Paste your Lovable API key (found in Settings → API Keys)

**Note:** The edge functions will automatically use this key to call the Lovable AI Gateway at `https://ai.gateway.lovable.dev/v1/chat/completions`

## Step 3: Verify Configuration

### 3.1 Test Supabase Connection

The frontend will automatically connect to Supabase using the configured environment variables. Check the browser console for any connection errors.

### 3.2 Test Edge Functions

You can test the edge functions directly:

```bash
# Test natural language lighting
curl -X POST https://your-project.supabase.co/functions/v1/natural-language-lighting \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "sceneDescription": "Portrait of a woman",
    "lightingDescription": "Soft beauty lighting",
    "subject": "woman"
  }'

# Test generate lighting
curl -X POST https://your-project.supabase.co/functions/v1/generate-lighting \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectDescription": "Portrait of a woman",
    "environment": "studio",
    "lightingSetup": {
      "key": {
        "direction": "45 degrees camera-right",
        "intensity": 0.8,
        "colorTemperature": 5600,
        "softness": 0.5,
        "distance": 1.5,
        "enabled": true
      }
    },
    "cameraSettings": {
      "shotType": "portrait",
      "cameraAngle": "eye-level",
      "fov": 50,
      "lensType": "85mm",
      "aperture": "f/2.8"
    },
    "stylePreset": "professional"
  }'
```

## Step 4: Deploy to Lovable

1. **Push your code** to the repository connected to Lovable
2. **Click Deploy** in the Lovable dashboard
3. **Wait for build** to complete (~2-3 minutes)
4. **Test the application** at your Lovable deployment URL

## Step 5: Verify Integration

### 5.1 Test Natural Language Generation
1. Navigate to `/natural-language` page
2. Enter a scene description and lighting description
3. Click "Generate"
4. Verify an image is generated

### 5.2 Test Studio Generation
1. Navigate to `/studio` page
2. Adjust lighting controls
3. Click "Generate Image"
4. Verify an image is generated

### 5.3 Check Error Handling
- If `LOVABLE_API_KEY` is missing, you should see a clear error message
- If Supabase URL/key is missing, check browser console for warnings

## Troubleshooting

### Issue: "LOVABLE_API_KEY is not configured"

**Solution:**
1. Go to Supabase project dashboard
2. Navigate to Edge Functions → Secrets
3. Add `LOVABLE_API_KEY` secret with your Lovable API key
4. Redeploy the edge functions

### Issue: "Missing VITE_SUPABASE_URL"

**Solution:**
1. Go to Lovable project settings → Environment Variables
2. Add `VITE_SUPABASE_URL` with your Supabase project URL
3. Add `VITE_SUPABASE_PUBLISHABLE_KEY` with your Supabase anon key
4. Redeploy the frontend

### Issue: CORS Errors

**Solution:**
- Edge functions already have CORS headers configured
- Ensure your Supabase project allows requests from your Lovable deployment URL
- Check Supabase project settings → API → CORS settings

### Issue: Edge Functions Not Found

**Solution:**
1. Verify edge functions are deployed in Supabase
2. Check function names match exactly: `natural-language-lighting`, `generate-lighting`, `analyze-lighting`
3. Ensure Supabase project URL is correct in frontend environment variables

### Issue: AI Service Errors

**Solution:**
- Verify `LOVABLE_API_KEY` is valid and has credits
- Check Lovable project settings → API Keys
- Ensure the key has permissions for AI Gateway access

## Architecture Overview

```
Frontend (Lovable)
  ↓
Supabase Client (configured via VITE_SUPABASE_URL)
  ↓
Supabase Edge Functions
  ├── natural-language-lighting
  ├── generate-lighting
  └── analyze-lighting
  ↓
Lovable AI Gateway (ai.gateway.lovable.dev)
  ↓
AI Models (Gemini 2.5 Flash)
```

## Environment Variables Summary

### Frontend (Lovable Environment Variables)
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon key

### Backend (Supabase Edge Function Secrets)
- `LOVABLE_API_KEY` - Your Lovable API key for AI Gateway access

## Support

For issues or questions:
1. Check browser console for frontend errors
2. Check Supabase Edge Function logs for backend errors
3. Verify all environment variables are set correctly
4. Ensure edge functions are deployed and accessible

## Next Steps

After successful deployment:
1. Test all features (natural language, studio, presets)
2. Monitor edge function logs for any errors
3. Set up monitoring/alerts for edge function failures
4. Consider adding rate limiting if needed

