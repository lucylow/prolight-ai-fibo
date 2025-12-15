-- Create video_jobs table for storing Bria video editing job metadata
CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  status_url TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  params JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'submitted',
  status_payload JSONB,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_video_jobs_request_id ON video_jobs(request_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_user_id ON video_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created_at ON video_jobs(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_video_jobs_updated_at
  BEFORE UPDATE ON video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_video_jobs_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own jobs
CREATE POLICY "Users can view own jobs"
  ON video_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own jobs
CREATE POLICY "Users can insert own jobs"
  ON video_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own jobs
CREATE POLICY "Users can update own jobs"
  ON video_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for background workers)
CREATE POLICY "Service role full access"
  ON video_jobs FOR ALL
  USING (auth.role() = 'service_role');

