-- AWS Migration Compatibility Layer
-- Migration metadata, export/import functions, and compatibility helpers
-- PostgreSQL-compatible for AWS RDS migration

-- Migration metadata table
-- Tracks migration status and progress
CREATE TABLE IF NOT EXISTS migration_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  migration_name TEXT NOT NULL UNIQUE,
  source_system TEXT NOT NULL DEFAULT 'supabase',
  target_system TEXT NOT NULL DEFAULT 'aws_rds',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  records_processed INTEGER DEFAULT 0,
  records_total INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for migration_metadata
CREATE INDEX IF NOT EXISTS idx_migration_metadata_status ON migration_metadata(status);
CREATE INDEX IF NOT EXISTS idx_migration_metadata_migration_name ON migration_metadata(migration_name);

-- Migration log table
-- Detailed log of migration operations
CREATE TABLE IF NOT EXISTS migration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  migration_id UUID NOT NULL REFERENCES migration_metadata(id) ON DELETE CASCADE,
  log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error', 'debug')),
  message TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for migration_logs
CREATE INDEX IF NOT EXISTS idx_migration_logs_migration_id ON migration_logs(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_created_at ON migration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_migration_logs_log_level ON migration_logs(log_level);

-- Data export queue table
-- Tracks data to be exported for migration
CREATE TABLE IF NOT EXISTS data_export_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  migration_id UUID NOT NULL REFERENCES migration_metadata(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  schema_name TEXT NOT NULL,
  record_id UUID,
  export_status TEXT NOT NULL DEFAULT 'pending' CHECK (export_status IN ('pending', 'exporting', 'exported', 'failed')),
  exported_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for data_export_queue
CREATE INDEX IF NOT EXISTS idx_data_export_queue_migration_id ON data_export_queue(migration_id);
CREATE INDEX IF NOT EXISTS idx_data_export_queue_export_status ON data_export_queue(export_status);
CREATE INDEX IF NOT EXISTS idx_data_export_queue_table_name ON data_export_queue(table_name);

-- Function to get migration status
CREATE OR REPLACE FUNCTION get_migration_status(p_migration_name TEXT)
RETURNS TABLE (
  migration_name TEXT,
  status TEXT,
  progress_percent NUMERIC,
  records_processed INTEGER,
  records_total INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mm.migration_name,
    mm.status,
    CASE 
      WHEN mm.records_total > 0 THEN 
        ROUND((mm.records_processed::NUMERIC / mm.records_total::NUMERIC) * 100, 2)
      ELSE 0
    END AS progress_percent,
    mm.records_processed,
    mm.records_total,
    mm.started_at,
    mm.completed_at
  FROM migration_metadata mm
  WHERE mm.migration_name = p_migration_name;
END;
$$ LANGUAGE plpgsql;

-- Function to export table data to JSON
-- This function exports a table's data in a format ready for AWS RDS import
CREATE OR REPLACE FUNCTION export_table_data(
  p_schema_name TEXT,
  p_table_name TEXT,
  p_where_clause TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_sql TEXT;
  v_result JSONB;
BEGIN
  v_sql := format('SELECT json_agg(row_to_json(t)) FROM %I.%I t', p_schema_name, p_table_name);
  
  IF p_where_clause IS NOT NULL THEN
    v_sql := v_sql || ' WHERE ' || p_where_clause;
  END IF;
  
  EXECUTE v_sql INTO v_result;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to export all user data
-- Exports all data for a specific user in a migration-ready format
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
BEGIN
  -- Export core data
  v_result := v_result || jsonb_build_object(
    'profiles', (SELECT export_table_data('core', 'profiles', format('id = %L', p_user_id)))
  );
  
  -- Export databases
  v_result := v_result || jsonb_build_object(
    'client_databases', (SELECT export_table_data('databases', 'client_databases', format('user_id = %L', p_user_id))),
    'client_tables', (SELECT export_table_data('databases', 'client_tables', 
      format('database_id IN (SELECT id FROM databases.client_databases WHERE user_id = %L)', p_user_id)))
  );
  
  -- Export projects
  v_result := v_result || jsonb_build_object(
    'projects', (SELECT export_table_data('projects', 'projects', format('created_by = %L', p_user_id))),
    'todos', (SELECT export_table_data('projects', 'todos', format('user_id = %L', p_user_id))),
    'notes', (SELECT export_table_data('projects', 'notes', format('user_id = %L', p_user_id)))
  );
  
  -- Export sites
  v_result := v_result || jsonb_build_object(
    'sites', (SELECT export_table_data('sites', 'sites', format('cognito_user_id = %L', p_user_id::TEXT)))
  );
  
  -- Export agents
  v_result := v_result || jsonb_build_object(
    'agents', (SELECT export_table_data('agents', 'agents', format('cognito_user_id = %L', p_user_id::TEXT)))
  );
  
  -- Export organization data
  v_result := v_result || jsonb_build_object(
    'data_items', (SELECT export_table_data('organization', 'data_items', format('user_id = %L', p_user_id))),
    'file_metadata', (SELECT export_table_data('storage', 'file_metadata', format('user_id = %L', p_user_id)))
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to create migration record
CREATE OR REPLACE FUNCTION create_migration(
  p_migration_name TEXT,
  p_source_system TEXT DEFAULT 'supabase',
  p_target_system TEXT DEFAULT 'aws_rds'
)
RETURNS UUID AS $$
DECLARE
  v_migration_id UUID;
BEGIN
  INSERT INTO migration_metadata (migration_name, source_system, target_system, status, started_at)
  VALUES (p_migration_name, p_source_system, p_target_system, 'in_progress', NOW())
  RETURNING id INTO v_migration_id;
  
  RETURN v_migration_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete migration
CREATE OR REPLACE FUNCTION complete_migration(
  p_migration_id UUID,
  p_status TEXT DEFAULT 'completed'
)
RETURNS VOID AS $$
BEGIN
  UPDATE migration_metadata
  SET 
    status = p_status,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_migration_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log migration event
CREATE OR REPLACE FUNCTION log_migration_event(
  p_migration_id UUID,
  p_log_level TEXT,
  p_message TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO migration_logs (migration_id, log_level, message, table_name, record_id)
  VALUES (p_migration_id, p_log_level, p_message, p_table_name, p_record_id);
END;
$$ LANGUAGE plpgsql;

-- View: Migration summary
CREATE OR REPLACE VIEW migration_summary AS
SELECT 
  mm.id,
  mm.migration_name,
  mm.source_system,
  mm.target_system,
  mm.status,
  mm.records_processed,
  mm.records_total,
  CASE 
    WHEN mm.records_total > 0 THEN 
      ROUND((mm.records_processed::NUMERIC / mm.records_total::NUMERIC) * 100, 2)
    ELSE 0
  END AS progress_percent,
  mm.started_at,
  mm.completed_at,
  mm.error_message,
  (SELECT COUNT(*) FROM migration_logs ml WHERE ml.migration_id = mm.id AND ml.log_level = 'error') AS error_count,
  (SELECT COUNT(*) FROM migration_logs ml WHERE ml.migration_id = mm.id) AS total_logs
FROM migration_metadata mm;

-- Compatibility views for AWS RDS structure
-- These views match the structure expected in AWS RDS setup

-- User compatibility view (maps Supabase auth.users to AWS users table structure)
CREATE OR REPLACE VIEW aws_users_compatibility AS
SELECT 
  u.id,
  u.email,
  u.email_verified,
  u.password_hash,
  u.phone,
  u.last_login,
  u.created_at,
  u.updated_at,
  u.metadata
FROM users u; -- This assumes a users table exists (from AWS setup)

-- If users table doesn't exist, create a view that maps from auth.users
-- Note: In Supabase, auth.users is in the auth schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    CREATE OR REPLACE VIEW aws_users_compatibility AS
    SELECT 
      au.id,
      au.email,
      au.email_confirmed_at IS NOT NULL AS email_verified,
      ''::TEXT AS password_hash, -- Password hash not accessible in Supabase
      au.phone,
      au.last_sign_in_at AS last_login,
      au.created_at,
      au.updated_at,
      COALESCE(au.raw_user_meta_data, '{}'::jsonb) AS metadata
    FROM auth.users au;
  END IF;
END $$;

-- Triggers for updated_at
CREATE TRIGGER update_migration_metadata_updated_at
  BEFORE UPDATE ON migration_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE migration_metadata IS 'Tracks migration status and progress from Supabase to AWS RDS';
COMMENT ON TABLE migration_logs IS 'Detailed logs of migration operations';
COMMENT ON TABLE data_export_queue IS 'Queue of data to be exported for migration';
COMMENT ON FUNCTION export_table_data IS 'Exports table data to JSON format for migration';
COMMENT ON FUNCTION export_user_data IS 'Exports all data for a specific user in migration-ready format';
COMMENT ON FUNCTION create_migration IS 'Creates a new migration record';
COMMENT ON FUNCTION complete_migration IS 'Marks a migration as completed';
COMMENT ON FUNCTION log_migration_event IS 'Logs a migration event';
COMMENT ON VIEW migration_summary IS 'Summary view of all migrations with progress';
COMMENT ON VIEW aws_users_compatibility IS 'Compatibility view mapping Supabase auth.users to AWS users table structure';

