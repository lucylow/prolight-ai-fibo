# Bria Video Editing - Quick Start Guide

## Overview

This integration adds Bria AI's Video Editing API v2 support to ProLight A.I., enabling:
- Direct S3 video uploads from the browser
- Asynchronous video processing (upscale, background removal, foreground masks)
- Real-time job status updates via Server-Sent Events (SSE)
- Background polling for job completion

## Quick Setup

### 1. Environment Variables

Add to your `.env` files:

**Supabase Edge Function Secrets:**
```bash
BRIA_API_TOKEN=your_bria_api_token
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
BACKEND_URL=http://localhost:8000  # Your Python backend URL
```

**Background Worker:**
```bash
BRIA_API_TOKEN=your_bria_api_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Migration

Run the migration to create the `video_jobs` table:

```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase Dashboard > SQL Editor
# Copy contents from: supabase/migrations/001_create_video_jobs.sql
```

### 3. Deploy Edge Function

```bash
supabase functions deploy video-editing
```

### 4. Install Worker Dependencies

```bash
cd worker
npm install
```

### 5. Start Background Worker

**Option A: Run manually**
```bash
node worker/video-job-poller.js
```

**Option B: Set up as cron job (every 10 seconds)**
```bash
*/10 * * * * cd /path/to/project && node worker/video-job-poller.js
```

**Option C: Use PM2**
```bash
pm2 start worker/video-job-poller.js --name video-poller --cron "*/10 * * * *"
```

## Usage

### Frontend

The updated `VideoEditor` component (`src/pages/generate/VideoEditor.tsx`) provides a complete UI for:
1. Selecting video files
2. Choosing operations (upscale, remove background, foreground mask)
3. Uploading to S3 with progress tracking
4. Viewing real-time job status
5. Displaying processed video results

Navigate to `/generate/video-editor` to use it.

### API Usage

**Upload and create job:**
```typescript
import { uploadVideoAndCreateJob, subscribeToJob } from '@/api/video-editing';

const job = await uploadVideoAndCreateJob(
  file,
  'increase_resolution',
  { desired_increase: 2 },
  (progress) => console.log(`Upload: ${progress}%`)
);

// Subscribe to updates
const eventSource = subscribeToJob(job.request_id, (update) => {
  console.log('Status:', update.status);
  if (update.result?.url) {
    console.log('Result:', update.result.url);
  }
});
```

## Supported Operations

1. **Increase Resolution** - Upscale videos up to 8K
   - `desired_increase`: 2 or 4
   - `output_container_and_codec`: mp4_h264, mp4_h265, webm_vp9, etc.

2. **Remove Background** - Remove/replace video backgrounds
   - `background_color`: Transparent, Black, White, Gray, etc.
   - `output_container_and_codec`: webm_vp9 (for transparency), mp4_h264, etc.

3. **Foreground Mask** - Generate foreground masks
   - `output_container_and_codec`: webm_vp9, etc.

## File Structure

```
prolight-ai-fibo/
├── supabase/
│   ├── functions/
│   │   └── video-editing/
│   │       └── index.ts          # Edge Function
│   └── migrations/
│       └── 001_create_video_jobs.sql
├── src/
│   ├── api/
│   │   └── video-editing.ts      # Frontend API client
│   └── pages/
│       └── generate/
│           └── VideoEditor.tsx   # React component
├── worker/
│   └── video-job-poller.js      # Background worker
└── backend/
    └── app/
        └── api/
            └── s3.py            # S3 presigned URL endpoints
```

## Testing

1. **Test S3 Upload:**
   - Navigate to `/generate/video-editor`
   - Select a video file (< 60 seconds)
   - Choose an operation
   - Click "Upload & Process"

2. **Check Job Status:**
   - Job status updates in real-time via SSE
   - Or query: `GET /api/video/jobs/{request_id}`

3. **Verify Worker:**
   - Check worker logs for polling activity
   - Verify jobs update in Supabase database

## Troubleshooting

**Upload fails:**
- Verify S3 credentials and bucket permissions
- Check CORS configuration on S3 bucket
- Ensure presigned URLs haven't expired

**Jobs not updating:**
- Verify background worker is running
- Check `BRIA_API_TOKEN` is valid
- Verify Supabase connection in worker

**SSE not working:**
- Check browser console for errors
- Verify Edge Function is deployed
- Check CORS headers in Edge Function

## Next Steps

See `docs/VIDEO_EDITING_INTEGRATION.md` for complete documentation including:
- Architecture details
- Security considerations
- Advanced configuration
- Production deployment

