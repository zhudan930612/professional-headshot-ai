-- Create user quotas table
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create generation sessions table
CREATE TABLE IF NOT EXISTS generation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  date BIGINT NOT NULL,
  style TEXT NOT NULL,
  use_case TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated images table
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES generation_sessions(session_id) ON DELETE CASCADE,
  image_id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  created_at_timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_date ON user_quotas(date);
CREATE INDEX IF NOT EXISTS idx_generation_sessions_user_id ON generation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_sessions_date ON generation_sessions(date);
CREATE INDEX IF NOT EXISTS idx_generated_images_session_id ON generated_images(session_id);

-- Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_quotas_updated_at
  BEFORE UPDATE ON user_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- NEW TABLES AND MODIFICATIONS
-- Added: 2025-12-11
-- Purpose: Support real file uploads and AI generation
-- ========================================

-- Create uploaded files table (user uploaded photos)
CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_at ON uploaded_files(created_at);

ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- Modify generation_sessions table (add new fields)
ALTER TABLE generation_sessions
ADD COLUMN IF NOT EXISTS input_file_ids TEXT[],
ADD COLUMN IF NOT EXISTS reference_template_ids TEXT[],
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_status ON generation_sessions(processing_status);

-- Modify generated_images table (add storage related fields)
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'image/jpeg';

-- Create atomic quota function (prevent concurrent quota exceed)
CREATE OR REPLACE FUNCTION increment_quota_safe(
  p_user_id TEXT,
  p_date DATE,
  p_amount INTEGER,
  p_limit INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_current_count INTEGER;
  v_new_count INTEGER;
BEGIN
  SELECT count INTO v_current_count
  FROM user_quotas
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  IF v_current_count + p_amount > p_limit THEN
    RETURN json_build_object('success', false, 'reason', 'limit_exceeded');
  END IF;

  v_new_count := v_current_count + p_amount;

  INSERT INTO user_quotas (user_id, date, count)
  VALUES (p_user_id, p_date, v_new_count)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = v_new_count, updated_at = NOW();

  RETURN json_build_object('success', true, 'new_count', v_new_count);
END;
$$ LANGUAGE plpgsql;
