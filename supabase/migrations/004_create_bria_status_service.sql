-- Create unified bria_status table for tracking all Bria async requests
-- This table works alongside video_jobs and tailored_jobs for a comprehensive status tracking system

CREATE TABLE IF NOT EXISTS bria_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  status_url TEXT,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED, ERROR, UNKNOWN
  result JSONB, -- Contains image_url, video_url, structured_prompt, seed, prompt, refined_prompt
  status_payload JSONB, -- Full response from Bria status endpoint
  error JSONB, -- Error details if status is ERROR
  last_checked TIMESTAMPTZ,
  endpoint_type TEXT, -- Optional: 'image_generation', 'video_editing', 'image_editing', etc.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}', -- Additional metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bria_status_request_id ON bria_status(request_id);
CREATE INDEX IF NOT EXISTS idx_bria_status_user_id ON bria_status(user_id);
CREATE INDEX IF NOT EXISTS idx_bria_status_status ON bria_status(status);
CREATE INDEX IF NOT EXISTS idx_bria_status_created_at ON bria_status(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bria_status_last_checked ON bria_status(last_checked);
CREATE INDEX IF NOT EXISTS idx_bria_status_endpoint_type ON bria_status(endpoint_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bria_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_bria_status_updated_at
  BEFORE UPDATE ON bria_status
  FOR EACH ROW
  EXECUTE FUNCTION update_bria_status_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE bria_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own status records
CREATE POLICY "Users can view own status"
  ON bria_status FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can insert their own status records
CREATE POLICY "Users can insert own status"
  ON bria_status FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can update their own status records
CREATE POLICY "Users can update own status"
  ON bria_status FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Service role can do everything (for background workers)
CREATE POLICY "Service role full access status"
  ON bria_status FOR ALL
  USING (auth.role() = 'service_role');

-- Create SSE tokens table for secure Server-Sent Events subscriptions
CREATE TABLE IF NOT EXISTS sse_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id TEXT, -- Optional: tie token to specific request
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for SSE tokens
CREATE INDEX IF NOT EXISTS idx_sse_tokens_token ON sse_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sse_tokens_user_id ON sse_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_sse_tokens_request_id ON sse_tokens(request_id);
CREATE INDEX IF NOT EXISTS idx_sse_tokens_expires_at ON sse_tokens(expires_at);

-- Enable RLS for SSE tokens
ALTER TABLE sse_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tokens
CREATE POLICY "Users can view own tokens"
  ON sse_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own tokens"
  ON sse_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access tokens"
  ON sse_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Create poll_jobs table for tracking background polling jobs
CREATE TABLE IF NOT EXISTS poll_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, active, completed, failed
  last_payload JSONB,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 120,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for poll_jobs
CREATE INDEX IF NOT EXISTS idx_poll_jobs_request_id ON poll_jobs(request_id);
CREATE INDEX IF NOT EXISTS idx_poll_jobs_status ON poll_jobs(status);
CREATE INDEX IF NOT EXISTS idx_poll_jobs_created_at ON poll_jobs(created_at DESC);

-- Enable RLS for poll_jobs
ALTER TABLE poll_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (background workers only)
CREATE POLICY "Service role full access poll_jobs"
  ON poll_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to clean up expired SSE tokens (can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sse_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sse_tokens
  WHERE expires_at < NOW() OR (used = TRUE AND created_at < NOW() - INTERVAL '1 hour');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

