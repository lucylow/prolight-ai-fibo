-- Create tailored_projects table
CREATE TABLE IF NOT EXISTS tailored_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bria_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ip_type TEXT NOT NULL,
  medium TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bria_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tailored_datasets table
CREATE TABLE IF NOT EXISTS tailored_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bria_id TEXT UNIQUE NOT NULL,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bria_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tailored_models table
CREATE TABLE IF NOT EXISTS tailored_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bria_id TEXT UNIQUE NOT NULL,
  dataset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  training_mode TEXT DEFAULT 'fully_automated',
  training_version TEXT DEFAULT 'light',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bria_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tailored_jobs table for async operations (training, generation, reimagine)
CREATE TABLE IF NOT EXISTS tailored_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'training', 'generate', 'reimagine'
  model_id TEXT,
  request_id TEXT UNIQUE NOT NULL,
  status_url TEXT NOT NULL,
  status TEXT DEFAULT 'submitted',
  status_payload JSONB,
  result JSONB,
  prompt TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tailored_projects_user_id ON tailored_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_tailored_projects_bria_id ON tailored_projects(bria_id);
CREATE INDEX IF NOT EXISTS idx_tailored_datasets_user_id ON tailored_datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_tailored_datasets_project_id ON tailored_datasets(project_id);
CREATE INDEX IF NOT EXISTS idx_tailored_datasets_bria_id ON tailored_datasets(bria_id);
CREATE INDEX IF NOT EXISTS idx_tailored_models_user_id ON tailored_models(user_id);
CREATE INDEX IF NOT EXISTS idx_tailored_models_dataset_id ON tailored_models(dataset_id);
CREATE INDEX IF NOT EXISTS idx_tailored_models_bria_id ON tailored_models(bria_id);
CREATE INDEX IF NOT EXISTS idx_tailored_jobs_user_id ON tailored_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_tailored_jobs_request_id ON tailored_jobs(request_id);
CREATE INDEX IF NOT EXISTS idx_tailored_jobs_status ON tailored_jobs(status);
CREATE INDEX IF NOT EXISTS idx_tailored_jobs_type ON tailored_jobs(type);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_tailored_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tailored_projects_updated_at
  BEFORE UPDATE ON tailored_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_tailored_updated_at();

CREATE TRIGGER update_tailored_datasets_updated_at
  BEFORE UPDATE ON tailored_datasets
  FOR EACH ROW
  EXECUTE FUNCTION update_tailored_updated_at();

CREATE TRIGGER update_tailored_models_updated_at
  BEFORE UPDATE ON tailored_models
  FOR EACH ROW
  EXECUTE FUNCTION update_tailored_updated_at();

CREATE TRIGGER update_tailored_jobs_updated_at
  BEFORE UPDATE ON tailored_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_tailored_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE tailored_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailored_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailored_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailored_jobs ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own projects"
  ON tailored_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON tailored_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON tailored_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON tailored_projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own datasets"
  ON tailored_datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own datasets"
  ON tailored_datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own datasets"
  ON tailored_datasets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own datasets"
  ON tailored_datasets FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own models"
  ON tailored_models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own models"
  ON tailored_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own models"
  ON tailored_models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own models"
  ON tailored_models FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own jobs"
  ON tailored_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON tailored_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON tailored_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (for background workers)
CREATE POLICY "Service role full access projects"
  ON tailored_projects FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access datasets"
  ON tailored_datasets FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access models"
  ON tailored_models FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access jobs"
  ON tailored_jobs FOR ALL
  USING (auth.role() = 'service_role');

