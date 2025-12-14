# Bria Status Service Integration

This document describes the comprehensive Bria Status Service integration for ProLight A.I. The service provides unified status tracking for all Bria async requests with real-time updates via Server-Sent Events (SSE).

## Overview

The Status Service provides:
- **Unified Status Tracking**: Single `bria_status` table for all async Bria requests
- **Background Polling**: Automatic polling until terminal state (COMPLETED/ERROR/UNKNOWN)
- **Real-time Updates**: Server-Sent Events (SSE) for live status updates
- **Secure SSE Tokens**: Short-lived, single-use tokens for SSE subscriptions
- **Database Persistence**: All status updates stored in Supabase with RLS policies

## Architecture

### Database Schema

The service uses three main tables:

1. **`bria_status`**: Unified status tracking table
   - `request_id` (primary key)
   - `status`: IN_PROGRESS | COMPLETED | ERROR | UNKNOWN
   - `result`: JSONB with image_url, video_url, structured_prompt, etc.
   - `status_payload`: Full Bria API response
   - `error`: Error details if status is ERROR
   - `last_checked`: Timestamp of last status check

2. **`sse_tokens`**: Secure SSE token storage
   - Short-lived tokens (2 minutes default)
   - Single-use enforcement
   - Optional request_id binding

3. **`poll_jobs`**: Background polling job tracking
   - Links request_id to polling jobs
   - Tracks polling status (queued, active, completed, failed)

### Supabase Edge Functions

1. **`bria-status`**: Main status endpoints
   - `GET /bria-status/:requestId` - Get current status
   - `POST /bria-status/start_poll` - Start background polling

2. **`bria-status-token`**: SSE token issuance
   - `POST /bria-status-token` - Get SSE token for subscription

3. **`bria-status-subscribe`**: SSE subscription endpoint
   - `GET /bria-status-subscribe/:requestId?sse_token=...` - Real-time updates

4. **`poll-jobs`**: Background poller (updated)
   - Polls `bria_status` table for IN_PROGRESS jobs
   - Updates status until terminal state

## Setup

### 1. Run Database Migration

```bash
# Apply the migration
supabase migration up

# Or manually run the SQL
psql -h <host> -U <user> -d <database> -f supabase/migrations/004_create_bria_status_service.sql
```

### 2. Deploy Supabase Edge Functions

```bash
# Deploy all status service functions
supabase functions deploy bria-status
supabase functions deploy bria-status-token
supabase functions deploy bria-status-subscribe

# Update existing poll-jobs function
supabase functions deploy poll-jobs
```

### 3. Configure Environment Variables

Ensure these are set in your Supabase project:

- `BRIA_API_TOKEN`: Your Bria API token
- `SUPABASE_URL`: Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Auto-provided by Supabase

### 4. Set Up Cron Job (Optional)

To automatically poll pending jobs, set up a cron job:

```sql
-- Run poll-jobs function every 30 seconds
SELECT cron.schedule(
  'poll-bria-jobs',
  '*/30 * * * * *', -- Every 30 seconds
  $$
  SELECT net.http_post(
    url := 'https://<your-project>.supabase.co/functions/v1/poll-jobs',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  );
  $$
);
```

Or use external cron (GitHub Actions, Vercel Cron, etc.) to call:
```
POST https://<your-project>.supabase.co/functions/v1/poll-jobs
```

## Usage

### Frontend: React Hook

#### Basic Usage

```tsx
import { useBriaStatus } from '@/hooks/useBriaStatus';

function MyComponent() {
  const { status, isLoading, error, getStatus, startPoll } = useBriaStatus();

  const handleCheckStatus = async () => {
    try {
      const statusResponse = await getStatus('request_id_123');
      console.log('Status:', statusResponse);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleStartPoll = async () => {
    try {
      await startPoll('request_id_123', 'image_generation');
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {status && (
        <div>
          <p>Status: {status.status}</p>
          {status.result?.image_url && (
            <img src={status.result.image_url} alt="Generated" />
          )}
        </div>
      )}
      <button onClick={handleCheckStatus}>Check Status</button>
      <button onClick={handleStartPoll}>Start Polling</button>
    </div>
  );
}
```

#### Real-time Updates with SSE

```tsx
import { useBriaStatus } from '@/hooks/useBriaStatus';
import { useEffect } from 'react';

function StatusTracker({ requestId }: { requestId: string }) {
  const { status, subscribe, reset } = useBriaStatus();

  useEffect(() => {
    if (!requestId) return;

    // Subscribe to real-time updates
    const unsubscribe = subscribe(requestId, {
      onUpdate: (statusUpdate) => {
        console.log('Status updated:', statusUpdate);
        // Update UI, show progress, etc.
      },
      onError: (error) => {
        console.error('SSE error:', error);
      },
      onComplete: () => {
        console.log('Status tracking completed');
      },
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      reset();
    };
  }, [requestId, subscribe, reset]);

  return (
    <div>
      {status ? (
        <div>
          <p>Status: {status.status}</p>
          {status.status === 'IN_PROGRESS' && <p>Processing...</p>}
          {status.status === 'COMPLETED' && status.result?.image_url && (
            <img src={status.result.image_url} alt="Result" />
          )}
          {status.status === 'ERROR' && (
            <p>Error: {status.error?.message || 'Unknown error'}</p>
          )}
        </div>
      ) : (
        <p>No status available</p>
      )}
    </div>
  );
}
```

#### Auto-tracking a Request

```tsx
import { useBriaStatusForRequest } from '@/hooks/useBriaStatus';

function AutoStatusTracker({ requestId }: { requestId: string | null }) {
  const { status, isLoading, error } = useBriaStatusForRequest(requestId, {
    autoPoll: true,        // Automatically start polling
    autoSubscribe: true,   // Automatically subscribe to SSE
    pollInterval: 5000,     // Poll every 5 seconds (fallback)
  });

  if (isLoading) return <p>Loading status...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!status) return <p>No status</p>;

  return (
    <div>
      <p>Status: {status.status}</p>
      {status.result?.image_url && (
        <img src={status.result.image_url} alt="Result" />
      )}
    </div>
  );
}
```

### Direct API Usage

#### Get Status

```typescript
import { briaStatusService } from '@/services/briaStatusService';

// Get current status
const status = await briaStatusService.getStatus('request_id_123');
console.log('Status:', status.status); // IN_PROGRESS, COMPLETED, ERROR, or UNKNOWN
console.log('Result:', status.result?.image_url);
```

#### Start Background Polling

```typescript
// Start polling (creates a poll_job entry)
const response = await briaStatusService.startPoll('request_id_123', 'image_generation');

if (response.started) {
  console.log('Polling started, job ID:', response.poll_job_id);
} else {
  console.log('Already polling or terminal:', response.reason);
}
```

#### Subscribe to Real-time Updates

```typescript
// Subscribe to SSE updates
const unsubscribe = briaStatusService.subscribe('request_id_123', {
  onUpdate: (status) => {
    console.log('Status update:', status);
    // Update UI
  },
  onError: (error) => {
    console.error('SSE error:', error);
  },
  onComplete: () => {
    console.log('Tracking completed');
  },
});

// Later, cleanup
unsubscribe();
```

### Complete Workflow Example

```typescript
async function generateImageWithStatusTracking() {
  // 1. Submit async Bria job
  const generateResponse = await fetch('/edge/bria/image-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structured_prompt: { /* FIBO JSON */ },
      sync: false, // Async mode
    }),
  });

  const { request_id, status_url } = await generateResponse.json();

  // 2. Start background polling
  await briaStatusService.startPoll(request_id, 'image_generation');

  // 3. Subscribe to real-time updates
  const unsubscribe = briaStatusService.subscribe(request_id, {
    onUpdate: (status) => {
      if (status.status === 'IN_PROGRESS') {
        console.log('Still processing...');
      } else if (status.status === 'COMPLETED') {
        console.log('Image ready:', status.result?.image_url);
        unsubscribe(); // Stop tracking
      } else if (status.status === 'ERROR') {
        console.error('Generation failed:', status.error);
        unsubscribe(); // Stop tracking
      }
    },
    onError: (error) => {
      console.error('Status tracking error:', error);
    },
  });

  return request_id;
}
```

## Status Values

The service normalizes Bria status responses into these values:

- **`IN_PROGRESS`**: Request is being processed
  - Continue polling or wait for SSE updates
  - Status will change to COMPLETED or ERROR

- **`COMPLETED`**: Request completed successfully
  - `result` contains `image_url`, `video_url`, or `structured_prompt`
  - May include `seed`, `prompt`, `refined_prompt`

- **`ERROR`**: Processing failed
  - `error` object contains failure details
  - Stop polling

- **`UNKNOWN`**: Unexpected error or request not found
  - May indicate request expired or internal error
  - Contact support with `request_id`

## Result Structure

When `status === 'COMPLETED'`, the `result` object may contain:

```typescript
{
  image_url?: string;           // For image generation/editing
  video_url?: string;            // For video editing
  structured_prompt?: string;    // For structured prompt generation
  seed?: number;                // Deterministic seed (if supported)
  prompt?: string;               // Original prompt
  refined_prompt?: string;       // System-enhanced prompt
}
```

## Security

- **RLS Policies**: All tables have Row Level Security enabled
- **SSE Tokens**: Short-lived (2 minutes), single-use tokens
- **Authentication**: Endpoints respect Supabase auth tokens
- **Service Role**: Background workers use service role key

## Monitoring

### Check Polling Status

```sql
-- View active poll jobs
SELECT * FROM poll_jobs 
WHERE status IN ('queued', 'active')
ORDER BY created_at DESC;

-- View recent status updates
SELECT request_id, status, last_checked, updated_at
FROM bria_status
WHERE status = 'IN_PROGRESS'
ORDER BY last_checked DESC;
```

### Clean Up Expired Tokens

```sql
-- Manually clean up expired SSE tokens
SELECT cleanup_expired_sse_tokens();
```

Or set up a cron job:

```sql
SELECT cron.schedule(
  'cleanup-sse-tokens',
  '0 * * * *', -- Every hour
  $$ SELECT cleanup_expired_sse_tokens(); $$
);
```

## Troubleshooting

### Status Stuck in IN_PROGRESS

1. Check if poll job exists:
   ```sql
   SELECT * FROM poll_jobs WHERE request_id = 'your_request_id';
   ```

2. Manually trigger poll:
   ```bash
   curl -X POST https://<project>.supabase.co/functions/v1/poll-jobs
   ```

3. Check Bria API directly:
   ```bash
   curl -H "api_token: YOUR_TOKEN" \
     https://engine.prod.bria-api.com/v2/status/your_request_id
   ```

### SSE Connection Fails

1. Verify token is valid (not expired, not used)
2. Check CORS settings in Supabase
3. Ensure EventSource is supported (all modern browsers)
4. Check browser console for connection errors

### Status Not Updating

1. Verify `poll-jobs` function is running (check cron or manual trigger)
2. Check Supabase function logs for errors
3. Verify `BRIA_API_TOKEN` is set correctly
4. Check `bria_status` table for recent `last_checked` timestamps

## Integration with Existing Code

The status service works alongside existing job tables (`video_jobs`, `tailored_jobs`). You can:

1. **Use both systems**: Keep existing tables for specific workflows, use `bria_status` for unified tracking
2. **Migrate gradually**: Start using `bria_status` for new features, migrate existing code over time
3. **Hybrid approach**: Use `bria_status` for status tracking, keep job tables for workflow-specific metadata

## Next Steps

- Set up cron job for automatic polling
- Monitor status update frequency and adjust poll intervals
- Add webhook support (if Bria provides webhooks)
- Implement retry logic for failed status checks
- Add metrics/monitoring for status service health
