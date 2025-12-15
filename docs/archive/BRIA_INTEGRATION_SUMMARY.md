# Bria Integration Summary

## ✅ What Was Integrated

This integration adds comprehensive Bria video editing and tailored generation capabilities to ProLight A.I.

### 1. Enhanced Video Editing (`supabase/functions/video-editing/index.ts`)
- ✅ Direct-to-S3 presigned URL generation (via Python backend)
- ✅ Bria video editing job creation (upscale, remove background, foreground mask)
- ✅ Server-Sent Events (SSE) for real-time job status updates
- ✅ Background polling endpoint for job status updates
- ✅ Proper SSE connection management and broadcasting

### 2. Tailored Generation (`supabase/functions/tailored-generation/index.ts`)
- ✅ Project and Dataset management (create, list)
- ✅ Advanced caption prefix generation (from 1-6 sample images)
- ✅ Image registration (single and bulk via ZIP)
- ✅ Model creation and training (Fully Automated and Expert modes)
- ✅ Image generation with tailored models
- ✅ ControlNet guidance support (canny, depth, recoloring, color_grid)
- ✅ Image Prompt Adapter support
- ✅ Reimagine with structure/portrait references
- ✅ S3 presigned URL generation for image uploads
- ✅ Background polling endpoint

### 3. Background Job Poller (`supabase/functions/poll-jobs/index.ts`)
- ✅ Polls both `video_jobs` and `tailored_jobs` tables
- ✅ Updates job status from Bria's status_url endpoints
- ✅ Extracts result URLs and stores them
- ✅ Can be called by external cron services or Supabase pg_cron

### 4. Database Migrations
- ✅ `002_create_tailored_tables.sql`: Creates tables for projects, datasets, models, and jobs
- ✅ `003_setup_job_polling_cron.sql`: Helper for setting up polling (documentation)

### 5. React API Clients
- ✅ `src/api/tailored-generation.ts`: Complete API client for tailored generation
- ✅ `src/api/video-editing.ts`: Already existed, now fully compatible

### 6. React Components
- ✅ `src/components/tailored/TailoredManager.tsx`: Comprehensive UI for managing the entire tailored generation workflow

### 7. Documentation
- ✅ `docs/BRIA_INTEGRATION_GUIDE.md`: Complete usage guide

## 📁 Files Created/Modified

### New Files
- `supabase/functions/tailored-generation/index.ts`
- `supabase/functions/poll-jobs/index.ts`
- `supabase/migrations/002_create_tailored_tables.sql`
- `supabase/migrations/003_setup_job_polling_cron.sql`
- `src/api/tailored-generation.ts`
- `src/components/tailored/TailoredManager.tsx`
- `docs/BRIA_INTEGRATION_GUIDE.md`

### Modified Files
- `supabase/functions/video-editing/index.ts` (enhanced SSE broadcasting and polling)

## 🚀 Next Steps

### 1. Deploy Edge Functions
```bash
supabase functions deploy video-editing
supabase functions deploy tailored-generation
supabase functions deploy poll-jobs
```

### 2. Run Migrations
```bash
supabase migration up
```

Or apply manually in Supabase Dashboard > SQL Editor.

### 3. Set Environment Variables
Add to Supabase Dashboard > Project Settings > Edge Functions > Secrets:
- `BRIA_API_TOKEN`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`
- `BACKEND_URL` (optional, defaults to localhost:8000)

### 4. Set Up Background Polling
Choose one:
- **Option A**: External cron service (GitHub Actions, Vercel Cron) calling `/functions/v1/poll-jobs` every 10-30 seconds
- **Option B**: Supabase pg_cron (if enabled) to call the function via HTTP
- **Option C**: Manual testing by calling the endpoint

### 5. Use in Your App

#### Video Editing
The existing `VideoEditor` page (`/src/pages/generate/VideoEditor.tsx`) already uses the video editing API.

#### Tailored Generation
Add the `TailoredManager` component to a page:

```tsx
import TailoredManager from '@/components/tailored/TailoredManager';

export default function TailoredPage() {
  return <TailoredManager />;
}
```

Or integrate it into the existing `TailoredGen` page.

## 🔑 Key Features

### Video Editing
- Direct browser-to-S3 upload (no server in between)
- Real-time status updates via SSE
- Automatic background polling
- Support for upscale, background removal, and foreground mask

### Tailored Generation
- Complete workflow: Project → Dataset → Model → Training → Generation
- Advanced prefix generation for better captions
- Bulk image upload support
- ControlNet guidance (canny, depth, etc.)
- Image Prompt Adapter for style transfer
- Reimagine with structure references

## 📚 Documentation

See `docs/BRIA_INTEGRATION_GUIDE.md` for:
- Detailed API documentation
- Code examples
- Troubleshooting guide
- Production considerations

## 🔒 Security

- All endpoints require JWT authentication
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Service role has full access for background workers

## 🧪 Testing

1. Test video editing:
   - Go to `/generate/video-edit`
   - Upload a video and select an operation
   - Monitor status via SSE

2. Test tailored generation:
   - Use `TailoredManager` component
   - Create a project → dataset → upload images → create model → train → generate

3. Test background polling:
   - Create a job
   - Call `POST /functions/v1/poll-jobs` manually
   - Check that job status updates

## 🐛 Troubleshooting

- **Jobs stuck**: Check that `poll-jobs` function is being called
- **SSE not working**: Check browser console and Edge Function logs
- **S3 presigning fails**: Verify AWS credentials and `BACKEND_URL`
- **API errors**: Check Edge Function logs in Supabase Dashboard

## 📝 Notes

- The integration uses your existing Python backend for S3 presigning (via `BACKEND_URL`)
- All Bria API calls are made server-side (API tokens never exposed to client)
- SSE connections are properly managed and cleaned up
- Background polling can be scaled by adjusting frequency or using a queue system

