-- User Dashboard and Auto-Save Schema
-- Extends the existing rds-setup.sql with user-specific data storage
-- Run this after rds-setup.sql

-- ========== USER PROFILE & UNIQUE USERNAMES ==========

-- Add username column to users table with unique constraint
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username)) WHERE username IS NOT NULL;

-- Function to check username availability
CREATE OR REPLACE FUNCTION check_username_available(check_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(username) = LOWER(check_username)
  );
END;
$$ LANGUAGE plpgsql;

-- ========== DASHBOARD DATA STORAGE ==========

-- User dashboard sections (stores all editable content)
CREATE TABLE IF NOT EXISTS user_dashboard_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL, -- 'home', 'operation', 'work', 'tools', etc.
  section_key TEXT NOT NULL, -- unique identifier within section (e.g., 'overview', 'widget-1')
  content JSONB NOT NULL DEFAULT '{}'::jsonb, -- flexible JSON storage for any content
  version INTEGER DEFAULT 1, -- for optimistic locking
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, section_type, section_key)
);

CREATE INDEX idx_dashboard_sections_user_id ON user_dashboard_sections(user_id);
CREATE INDEX idx_dashboard_sections_type ON user_dashboard_sections(section_type);
CREATE INDEX idx_dashboard_sections_user_type ON user_dashboard_sections(user_id, section_type);
CREATE INDEX idx_dashboard_sections_last_saved ON user_dashboard_sections(last_saved_at);

-- Auto-save history (for recovery and audit)
CREATE TABLE IF NOT EXISTS auto_save_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES user_dashboard_sections(id) ON DELETE CASCADE,
  content_snapshot JSONB NOT NULL,
  version INTEGER NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  save_method TEXT DEFAULT 'auto' -- 'auto', 'manual', 'realtime'
);

CREATE INDEX idx_auto_save_user_id ON auto_save_history(user_id);
CREATE INDEX idx_auto_save_section_id ON auto_save_history(section_id);
CREATE INDEX idx_auto_save_saved_at ON auto_save_history(saved_at);

-- Keep only last 50 auto-saves per section (cleanup function)
CREATE OR REPLACE FUNCTION cleanup_old_auto_saves()
RETURNS void AS $$
BEGIN
  DELETE FROM auto_save_history
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY section_id 
        ORDER BY saved_at DESC
      ) as rn
      FROM auto_save_history
    ) t
    WHERE rn > 50
  );
END;
$$ LANGUAGE plpgsql;

-- ========== REAL-TIME COLLABORATION ==========

-- Active editing sessions (for real-time collaboration)
CREATE TABLE IF NOT EXISTS editing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES user_dashboard_sections(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL, -- WebSocket connection ID
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, section_id, connection_id)
);

CREATE INDEX idx_editing_sessions_user_id ON editing_sessions(user_id);
CREATE INDEX idx_editing_sessions_section_id ON editing_sessions(section_id);
CREATE INDEX idx_editing_sessions_connection_id ON editing_sessions(connection_id);
CREATE INDEX idx_editing_sessions_last_activity ON editing_sessions(last_activity);

-- Cleanup stale sessions (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM editing_sessions 
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- ========== DOCK/BOTTOM NAVIGATION STATE ==========

-- User's dock/navigation preferences
CREATE TABLE IF NOT EXISTS user_dock_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  dock_items JSONB DEFAULT '[]'::jsonb, -- array of dock item configurations
  dock_order JSONB DEFAULT '[]'::jsonb, -- order of items
  dock_visibility BOOLEAN DEFAULT TRUE,
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dock_preferences_user_id ON user_dock_preferences(user_id);

-- ========== TRIGGERS ==========

-- Update updated_at for dashboard sections
CREATE TRIGGER update_dashboard_sections_updated_at 
  BEFORE UPDATE ON user_dashboard_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at for dock preferences
CREATE TRIGGER update_dock_preferences_updated_at 
  BEFORE UPDATE ON user_dock_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment version on update
CREATE OR REPLACE FUNCTION increment_dashboard_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.last_saved_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_dashboard_version_trigger
  BEFORE UPDATE ON user_dashboard_sections
  FOR EACH ROW EXECUTE FUNCTION increment_dashboard_version();

-- ========== HELPER FUNCTIONS ==========

-- Function to save dashboard section with conflict resolution
CREATE OR REPLACE FUNCTION save_dashboard_section(
  p_user_id UUID,
  p_section_type TEXT,
  p_section_key TEXT,
  p_content JSONB,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_section_id UUID;
  v_current_version INTEGER;
  v_result JSONB;
BEGIN
  -- Check if section exists
  SELECT id, version INTO v_section_id, v_current_version
  FROM user_dashboard_sections
  WHERE user_id = p_user_id 
    AND section_type = p_section_type 
    AND section_key = p_section_key;
  
  -- If version conflict and expected version provided
  IF v_section_id IS NOT NULL AND p_expected_version IS NOT NULL THEN
    IF v_current_version != p_expected_version THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'version_conflict',
        'current_version', v_current_version,
        'expected_version', p_expected_version
      );
    END IF;
  END IF;
  
  -- Insert or update
  IF v_section_id IS NULL THEN
    INSERT INTO user_dashboard_sections (user_id, section_type, section_key, content)
    VALUES (p_user_id, p_section_type, p_section_key, p_content)
    RETURNING id, version INTO v_section_id, v_current_version;
  ELSE
    UPDATE user_dashboard_sections
    SET content = p_content,
        updated_at = NOW()
    WHERE id = v_section_id
    RETURNING version INTO v_current_version;
  END IF;
  
  -- Save to history
  INSERT INTO auto_save_history (user_id, section_id, content_snapshot, version, save_method)
  VALUES (p_user_id, v_section_id, p_content, v_current_version, 'auto');
  
  RETURN jsonb_build_object(
    'success', true,
    'section_id', v_section_id,
    'version', v_current_version,
    'saved_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's dashboard data
CREATE OR REPLACE FUNCTION get_user_dashboard(
  p_user_id UUID,
  p_section_type TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'section_key', section_key,
      'content', content,
      'version', version,
      'last_saved_at', last_saved_at
    )
  ) INTO v_result
  FROM user_dashboard_sections
  WHERE user_id = p_user_id
    AND (p_section_type IS NULL OR section_type = p_section_type);
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ========== COMMENTS ==========

COMMENT ON TABLE user_dashboard_sections IS 'Stores all editable dashboard content per user and section';
COMMENT ON TABLE auto_save_history IS 'History of auto-saves for recovery and audit';
COMMENT ON TABLE editing_sessions IS 'Active editing sessions for real-time collaboration';
COMMENT ON TABLE user_dock_preferences IS 'User preferences for bottom dock/navigation';

