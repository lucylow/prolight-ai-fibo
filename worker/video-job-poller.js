/**
 * Background Worker: Bria Video Job Status Poller
 * 
 * Polls pending video jobs and updates their status in the database.
 * Run this as a cron job or background service.
 * 
 * Usage:
 *   node worker/video-job-poller.js
 * 
 * Or set up as a cron job:
 *   Every 10 minutes: cd /path/to/project && node worker/video-job-poller.js
 * 
 * Environment variables required:
 *   - BRIA_API_TOKEN
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - DATABASE_URL (if using direct DB connection)
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const BRIA_API_TOKEN = process.env.BRIA_API_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BRIA_API_TOKEN) {
  console.error('BRIA_API_TOKEN is required');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase credentials are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Poll a single job's status from Bria
 */
async function pollJobStatus(job) {
  try {
    const response = await axios.get(job.status_url, {
      headers: {
        'api_token': BRIA_API_TOKEN,
      },
      timeout: 30000,
    });

    const payload = response.data;
    const incomingStatus = (payload?.status || payload?.state || '').toString().toLowerCase();
    
    // Normalize status
    let normalizedStatus = job.status;
    if (['succeeded', 'completed', 'done', 'success'].includes(incomingStatus)) {
      normalizedStatus = 'succeeded';
    } else if (['failed', 'error', 'cancelled'].includes(incomingStatus)) {
      normalizedStatus = 'failed';
    } else if (incomingStatus) {
      normalizedStatus = incomingStatus;
    }

    // Extract result URL
    const resultUrl = payload?.result?.url || 
                     payload?.output?.url || 
                     payload?.artifact_url || 
                     null;

    // Update job in database
    const updateData = {
      status: normalizedStatus,
      status_payload: payload,
      updated_at: new Date().toISOString(),
    };

    if (resultUrl) {
      updateData.result = { url: resultUrl };
    }

    const { error } = await supabase
      .from('video_jobs')
      .update(updateData)
      .eq('request_id', job.request_id);

    if (error) {
      console.error(`Failed to update job ${job.request_id}:`, error);
    } else {
      console.log(`Updated job ${job.request_id}: ${normalizedStatus}`);
    }

    return { success: true, status: normalizedStatus, resultUrl };

  } catch (error) {
    console.error(`Error polling job ${job.request_id}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main polling function
 */
async function pollPendingJobs() {
  try {
    // Fetch pending jobs
    const { data: jobs, error } = await supabase
      .from('video_jobs')
      .select('*')
      .not('status', 'in', '(succeeded,failed,cancelled)')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch pending jobs:', error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('No pending jobs to poll');
      return;
    }

    console.log(`Polling ${jobs.length} pending job(s)...`);

    // Poll each job
    const results = await Promise.allSettled(
      jobs.map(job => pollJobStatus(job))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Polling complete: ${succeeded} succeeded, ${failed} failed`);

  } catch (error) {
    console.error('Polling error:', error);
  }
}

// Run polling
if (require.main === module) {
  console.log('Starting video job poller...');
  pollPendingJobs()
    .then(() => {
      console.log('Polling cycle complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { pollPendingJobs, pollJobStatus };

