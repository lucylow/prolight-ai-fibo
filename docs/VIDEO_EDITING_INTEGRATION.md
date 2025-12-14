# Bria Video Editing Integration Guide

This document describes the complete integration of Bria AI's Video Editing API v2 into ProLight A.I.

## Overview

The integration provides:
1. **Direct S3 Upload**: Browser uploads videos directly to S3 using presigned URLs
2. **Bria Job Creation**: Server creates asynchronous Bria video editing jobs
3. **Real-time Updates**: Server-Sent Events (SSE) for live job status updates
4. **Background Polling**: Worker service polls job status and updates database
5. **Database Storage**: Supabase stores job metadata and status

## Architecture

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │
       ├─→ Upload to S3 (presigned PUT)
       ├─→ Create job via Edge Function
       └─→ Subscribe to SSE for updates
              │
              ▼
┌─────────────────────────┐
│  Supabase Edge Function │
│  (video-editing)        │
└──────┬──────────────────┘
       │
       ├─→ Generate S3 presigned URLs
       ├─→ Create Bria jobs
       ├─→ Store jobs in Supabase DB
       └─→ Stream SSE updates
              │
              ▼
┌─────────────────────────┐
│   Background Worker     │
│  (video-job-poller.js)  │
└──────┬──────────────────┘
       │
       ├─→ Poll Bria status_url
       ├─→ Update database
       └─→ Broadcast SSE updates
```

## Components

### 1. Supabase Edge Function (`supabase/functions/video-editing/index.ts`)

Handles:
- S3 presigned URL generation (delegates to Python backend)
- Bria job creation
- Job status querying
- SSE subscriptions

**Endpoints:**
- `GET /api/s3/presign?filename=...&contentType=...` - Get presigned URLs
- `POST /api/video/jobs` - Create Bria job
- `GET /api/video/jobs/:requestId` - Get job status
- `GET /api/video/subscribe/:requestId` - SSE subscription

### 2. Frontend API Client (`src/api/video-editing.ts`)

Provides:
- `getPresignedUrls()` - Request S3 presigned URLs
- `uploadToS3()` - Upload file to S3
- `createVideoJob()` - Create Bria job
- `subscribeToJob()` - Subscribe to SSE updates
- `uploadVideoAndCreateJob()` - Complete workflow helper

### 3. Video Editor Component (`src/pages/generate/VideoEditor.tsx`)

React component that:
- Allows file selection
- Uploads to S3 with progress tracking
- Creates Bria jobs
- Subscribes to SSE for real-time updates
- Displays processed video results

### 4. Background Worker (`worker/video-job-poller.js`)

Node.js script that:
- Polls pending jobs from database
- Queries Bria status URLs
- Updates job status in database
- Can be run as cron job or background service

### 5. Database Schema (`supabase/migrations/001_create_video_jobs.sql`)

Creates `video_jobs` table with:
- `request_id` (unique, indexed)
- `status_url` (Bria status endpoint)
- `s3_key` (S3 object key)
- `operation` (increase_resolution, remove_background, etc.)
- `params` (JSONB operation parameters)
- `status` (submitted, running, succeeded, failed)
- `result` (JSONB with output URL)
- `status_payload` (full Bria response)
- Row Level Security (RLS) policies

## Setup Instructions

### 1. Environment Variables

**Supabase Edge Function:**
```bash
BRIA_API_TOKEN=your_bria_token
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BACKEND_URL=http://localhost:8000  # Python backend URL
```

**Background Worker:**
```bash
BRIA_API_TOKEN=your_bria_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Migration

Run the migration to create the `video_jobs` table:

```bash
# Using Supabase CLI
supabase migration up

# Or manually run the SQL in Supabase dashboard
```

### 3. Deploy Edge Function

```bash
# Using Supabase CLI
supabase functions deploy video-editing

# Or deploy via Supabase dashboard
```

### 4. Set Up Background Worker

**Option A: Cron Job**
```bash
# Add to crontab (runs every 10 seconds)
*/10 * * * * cd /path/to/project && node worker/video-job-poller.js
```

**Option B: PM2 (Process Manager)**
```bash
pm2 start worker/video-job-poller.js --name video-poller --cron "*/10 * * * *"
```

**Option C: Docker Container**
```dockerfile
# Add to docker-compose.yml
video-poller:
  image: node:18
  working_dir: /app
  volumes:
    - ./worker:/app
  command: node video-job-poller.js
  environment:
    - BRIA_API_TOKEN=${BRIA_API_TOKEN}
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
  restart: unless-stopped
```

### 5. Install Dependencies

```bash
# Worker dependencies
cd worker
npm install

# Frontend dependencies (already installed)
# Backend dependencies (already installed)
```

## Usage

### Frontend Usage

```tsx
import { uploadVideoAndCreateJob, subscribeToJob } from '@/api/video-editing';

// Upload and create job
const job = await uploadVideoAndCreateJob(
  file,
  'increase_resolution',
  { desired_increase: 2 },
  (progress) => console.log(`Upload: ${progress}%`)
);

// Subscribe to updates
const eventSource = subscribeToJob(
  job.request_id,
  (update) => {
    console.log('Status:', update.status);
    if (update.result?.url) {
      console.log('Result URL:', update.result.url);
    }
  }
);
```

### Backend API

**Get Presigned URLs:**
```bash
GET /api/s3/presign?filename=video.mp4&contentType=video/mp4
```

**Create Job:**
```bash
POST /api/video/jobs
{
  "operation": "increase_resolution",
  "s3_key": "prolight/uploads/1234567890-video.mp4",
  "params": {
    "desired_increase": 2,
    "output_container_and_codec": "mp4_h265"
  }
}
```

**Get Job Status:**
```bash
GET /api/video/jobs/{request_id}
```

## Supported Operations

### 1. Increase Resolution
- Upscales videos up to 8K (7680x4320)
- Parameters:
  - `desired_increase`: 2 or 4 (default: 2)
  - `output_container_and_codec`: mp4_h264, mp4_h265, webm_vp9, etc.

### 2. Remove Background
- Removes or replaces video backgrounds
- Parameters:
  - `background_color`: Transparent, Black, White, Gray, etc.
  - `output_container_and_codec`: webm_vp9 (for transparency), mp4_h264, etc.

### 3. Foreground Mask
- Generates foreground masks for compositing
- Parameters:
  - `output_container_and_codec`: webm_vp9, etc.

## Limitations

- Maximum input duration: 60 seconds
- Maximum input resolution: 16K (16000x16000)
- Maximum output resolution: 8K (7680x4320)
- Supported formats: .mp4, .mov, .webm, .avi, .gif
- Supported codecs: H.264, H.265 (HEVC), VP9, AV1, PhotoJPEG

## Security Considerations

1. **S3 Presigned URLs**: Short-lived (15 min for PUT, 1 hour for GET)
2. **Row Level Security**: Users can only access their own jobs
3. **API Tokens**: Never expose `BRIA_API_TOKEN` to frontend
4. **Service Role Key**: Only use in backend/worker contexts

## Troubleshooting

### SSE Connection Fails
- Check CORS headers in Edge Function
- Verify authentication token is valid
- Check browser console for errors
- Fallback to polling if SSE unavailable

### Jobs Not Updating
- Verify background worker is running
- Check `BRIA_API_TOKEN` is valid
- Verify Supabase connection
- Check job `status_url` is accessible

### Upload Fails
- Verify S3 credentials are correct
- Check presigned URL hasn't expired
- Verify file size is within limits
- Check CORS configuration on S3 bucket

### Database Errors
- Verify migration was run successfully
- Check RLS policies allow access
- Verify service role key has permissions

## Next Steps

1. **Add Authentication**: Protect endpoints with JWT/auth middleware
2. **Add Webhooks**: Use Bria webhooks instead of polling (if available)
3. **Add Retry Logic**: Implement exponential backoff for failed jobs
4. **Add Notifications**: Email/SMS notifications when jobs complete
5. **Add Analytics**: Track job success rates and processing times
6. **Add Queue Management**: Use BullMQ for job queue management
7. **Add Video Preview**: Show video thumbnails in job list
8. **Add Batch Processing**: Process multiple videos in parallel

## Related Files

- `supabase/functions/video-editing/index.ts` - Edge Function
- `src/api/video-editing.ts` - Frontend API client
- `src/pages/generate/VideoEditor.tsx` - React component
- `worker/video-job-poller.js` - Background worker
- `supabase/migrations/001_create_video_jobs.sql` - Database schema
- `backend/app/api/s3.py` - S3 presigned URL endpoints
