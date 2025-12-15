-- Migration: Create poses table
-- For SQLite
CREATE TABLE IF NOT EXISTS poses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(200) NOT NULL,
  camera_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  owner_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_poses_name ON poses(name);
CREATE INDEX IF NOT EXISTS idx_poses_owner_id ON poses(owner_id);

-- For PostgreSQL (uncomment if using PostgreSQL):
-- CREATE TABLE IF NOT EXISTS poses (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(200) NOT NULL,
--   camera_json JSONB NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--   owner_id VARCHAR(100)
-- );
-- 
-- CREATE INDEX IF NOT EXISTS idx_poses_name ON poses(name);
-- CREATE INDEX IF NOT EXISTS idx_poses_owner_id ON poses(owner_id);

