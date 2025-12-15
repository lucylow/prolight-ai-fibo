# Bria Integration Guide

This guide covers the complete Bria video editing and tailored generation integration for ProLight A.I.

## Overview

The integration includes:

1. **Video Editing**: Direct-to-S3 upload, Bria video editing jobs (upscale, remove background, foreground mask), SSE status updates, and background polling
2. **Tailored Generation**: Project/dataset management, model training, image generation with ControlNet and Image Prompt Adapter support

## Architecture

### Backend (Supabase Edge Functions)

- **`video-editing`**: Handles video upload presigning, job creation, SSE subscriptions, and job status polling
- **`tailored-generation`**: Manages projects, datasets, models, training, and image generation
- **`poll-jobs`**: Background worker that polls pending jobs from both video_jobs and tailored_jobs tables

### Database Tables

- **`video_jobs`**: Stores video editing job metadata and status
- **`tailored_projects`**: Stores tailored generation projects
- **`tailored_datasets`**: Stores datasets within projects
- **`tailored_models`**: Stores trained models
- **`tailored_jobs`**: Stores async job metadata (training, generation, reimagine)

### Frontend

- **`/src/api/video-editing.ts`**: API client for video editing
- **`/src/api/tailored-generation.ts`**: API client for tailored generation
- **`/src/components/tailored/TailoredManager.tsx`**: Comprehensive UI component for managing tailored generation workflow
- **`/src/pages/generate/VideoEditor.tsx`**: Video editing UI (already exists, enhanced)

## Setup

### 1. Environment Variables

Add these to your Supabase Edge Function secrets:

```bash
# Bria API
BRIA_API_TOKEN=your_bria_token
BRIA_API_BASE=https://engine.prod.bria-api.com/v2  # optional, defaults to this

# AWS S3 (for direct uploads)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name

# Backend URL (for S3 presigning via Python backend)
BACKEND_URL=http://localhost:8000  # or your production backend URL
```

### 2. Database Migrations

Run the migrations in order:

```bash
# Already exists
supabase migration up 001_create_video_jobs

# New migrations
supabase migration up 002_create_tailored_tables
supabase migration up 003_setup_job_polling_cron
```

Or apply them manually in Supabase Dashboard > SQL Editor.

### 3. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy video-editing
supabase functions deploy tailored-generation
supabase functions deploy poll-jobs
```

### 4. Set Up Background Polling

The `poll-jobs` function can be called in several ways:

#### Option A: External Cron Service (Recommended)

Set up a cron job (GitHub Actions, Vercel Cron, etc.) to call:

```
POST https://your-project.supabase.co/functions/v1/poll-jobs
Authorization: Bearer YOUR_ANON_KEY
```

Schedule: Every 10-30 seconds

#### Option B: Supabase pg_cron (if enabled)

Enable pg_cron extension in Supabase Dashboard, then set up a cron job to call the Edge Function via HTTP.

#### Option C: Manual Trigger

Call the endpoint manually for testing:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/poll-jobs \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Usage

### Video Editing

#### 1. Upload Video and Create Job

```typescript
import { uploadVideoAndCreateJob, subscribeToJob } from "@/api/video-editing";

// Upload and create job
const job = await uploadVideoAndCreateJob(
  file,
  "increase_resolution",
  { desired_increase: 2 },
  (progress) => console.log(`Upload: ${progress}%`),
);

// Subscribe to status updates via SSE
const eventSource = subscribeToJob(job.request_id, (update) => {
  console.log("Status:", update.status);
  if (update.result?.url) {
    console.log("Result URL:", update.result.url);
  }
});
```

#### 2. Available Operations

- `increase_resolution`: Upscale video resolution
- `remove_background`: Remove background (transparent or colored)
- `foreground_mask`: Generate foreground mask

### Tailored Generation

#### 1. Complete Workflow

```typescript
import {
  createProject,
  createDataset,
  uploadImageAndRegister,
  generatePrefix,
  createModel,
  startTraining,
  generateImage,
} from "@/api/tailored-generation";

// 1. Create project
const project = await createProject({
  name: "Product Photography",
  ip_type: "stylized_scene",
  medium: "photograph",
});

// 2. Create dataset
const dataset = await createDataset(project.id, {
  name: "Watch Images",
  description: "Product shots of watches",
});

// 3. Upload images
await uploadImageAndRegister(imageFile, dataset.id);

// 4. (Optional) Generate advanced prefix
const prefix = await generatePrefix(dataset.id, [
  "https://example.com/image1.jpg",
  "https://example.com/image2.jpg",
]);

// 5. Create model
const model = await createModel({
  dataset_id: dataset.id,
  name: "watch_model_v1",
  training_mode: "fully_automated",
  training_version: "light",
});

// 6. Start training
const trainingJob = await startTraining(model.id);

// 7. Generate images (after training completes)
const result = await generateImage({
  model_id: model.id,
  prompt: "A luxury watch on a marble slab",
  guidance_methods: [
    {
      method: "controlnet_canny",
      image_url: "https://example.com/canny_edges.png",
      scale: 0.9,
    },
  ],
});
```

#### 2. Using the TailoredManager Component

```tsx
import TailoredManager from "@/components/tailored/TailoredManager";

// In your page/route
<TailoredManager />;
```

The component provides a complete UI for:

- Creating and managing projects
- Creating datasets and uploading images
- Generating caption prefixes
- Creating models and starting training
- Generating images with trained models
- Monitoring job status

#### 3. Advanced Generation Features

**ControlNet Guidance:**

```typescript
await generateImage({
  model_id: "model_123",
  prompt: "Product shot with dramatic lighting",
  guidance_methods: [
    {
      method: "controlnet_canny",
      image_base64: "data:image/png;base64,...", // or image_url
      scale: 0.9,
    },
    {
      method: "controlnet_depth",
      image_url: "https://example.com/depth.png",
      scale: 0.8,
    },
  ],
});
```

**Image Prompt Adapter:**

```typescript
await generateImage({
  model_id: "model_123",
  prompt: "Product shot with soft rim light",
  image_prompt_adapter: {
    mode: "style_only",
    scale: 0.85,
    image_urls: ["https://example.com/style_ref.jpg"],
  },
});
```

**Reimagine:**

```typescript
await reimagine({
  model_id: "model_123",
  reference_image_url: "https://example.com/structure.png",
  prompt: "Turn this into a hyperrealistic photo at sunset",
});
```

## API Endpoints

### Video Editing

- `GET /functions/v1/video-editing/api/s3/presign?filename=...&contentType=...`
- `POST /functions/v1/video-editing/api/video/jobs`
- `GET /functions/v1/video-editing/api/video/jobs/:requestId`
- `GET /functions/v1/video-editing/api/video/subscribe/:requestId` (SSE)
- `POST /functions/v1/video-editing/api/video/poll` (manual polling)

### Tailored Generation

- `POST /functions/v1/tailored-generation/api/tailored/projects`
- `GET /functions/v1/tailored-generation/api/tailored/projects`
- `POST /functions/v1/tailored-generation/api/tailored/projects/:projectId/datasets`
- `GET /functions/v1/tailored-generation/api/tailored/datasets`
- `POST /functions/v1/tailored-generation/api/tailored/datasets/:datasetId/generate_prefix`
- `POST /functions/v1/tailored-generation/api/tailored/datasets/:datasetId/images/register`
- `POST /functions/v1/tailored-generation/api/tailored/datasets/:datasetId/images/bulk_register`
- `POST /functions/v1/tailored-generation/api/tailored/models`
- `GET /functions/v1/tailored-generation/api/tailored/models`
- `GET /functions/v1/tailored-generation/api/tailored/models/:modelId`
- `POST /functions/v1/tailored-generation/api/tailored/models/:modelId/start`
- `POST /functions/v1/tailored-generation/api/tailored/generate`
- `POST /functions/v1/tailored-generation/api/tailored/reimagine`
- `GET /functions/v1/tailored-generation/api/tailored/jobs`
- `GET /functions/v1/tailored-generation/api/tailored/jobs/:requestId`
- `GET /functions/v1/tailored-generation/api/tailored/s3/presign?filename=...&contentType=...`
- `POST /functions/v1/tailored-generation/api/tailored/poll` (manual polling)

### Background Polling

- `POST /functions/v1/poll-jobs` (polls both video_jobs and tailored_jobs)

## Security

- All endpoints require authentication (JWT token in Authorization header)
- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Service role has full access for background workers

## Error Handling

All API functions throw errors that can be caught and handled:

```typescript
try {
  const result = await generateImage({ ... });
} catch (error) {
  if (error.response?.data?.error) {
    console.error('API Error:', error.response.data.error);
  } else {
    console.error('Error:', error.message);
  }
}
```

## Production Considerations

1. **Rate Limiting**: Add rate limiting to prevent abuse
2. **Monitoring**: Set up logging and monitoring for job polling
3. **Retries**: Implement exponential backoff for failed API calls
4. **Queue System**: For high volume, consider using a proper queue system (BullMQ, SQS, etc.)
5. **Database**: Consider connection pooling and query optimization
6. **Caching**: Cache project/dataset/model lists to reduce database queries
7. **Webhooks**: Consider using Bria webhooks instead of polling (if available)

## Troubleshooting

### Jobs stuck in "submitted" status

- Check that the `poll-jobs` function is being called regularly
- Verify `BRIA_API_TOKEN` is set correctly
- Check Edge Function logs for errors

### SSE connections not receiving updates

- Verify SSE endpoint is accessible
- Check browser console for connection errors
- Ensure job polling is working (updates are broadcast via SSE)

### S3 presigning fails

- Verify AWS credentials are set correctly
- Check that `BACKEND_URL` points to your Python backend
- Ensure backend `/api/s3/presign` endpoint is working

## Support

For issues or questions:

1. Check Edge Function logs in Supabase Dashboard
2. Review database tables for job status
3. Test API endpoints directly with curl/Postman
4. Check Bria API documentation for endpoint changes
