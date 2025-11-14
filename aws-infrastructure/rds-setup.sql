-- AWS RDS PostgreSQL Database Setup
-- Run this in your RDS PostgreSQL instance
-- Compatible with existing schema.sql structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== AUTHENTICATION TABLES ==========

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User sessions (JWT token management)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_access_token ON user_sessions(access_token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);

-- OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  session_token TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attempts INTEGER DEFAULT 0
);

CREATE INDEX idx_otp_email ON otp_codes(email);
CREATE INDEX idx_otp_session_token ON otp_codes(session_token);
CREATE INDEX idx_otp_expires_at ON otp_codes(expires_at);
CREATE INDEX idx_otp_verified ON otp_codes(verified);

-- ========== DATABASE BUILDER TABLES ==========

-- Client databases
CREATE TABLE IF NOT EXISTS client_databases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_db_user_id ON client_databases(user_id);
CREATE INDEX idx_client_db_created_at ON client_databases(created_at);

-- Client tables (schema definitions)
CREATE TABLE IF NOT EXISTS client_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id UUID NOT NULL REFERENCES client_databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(database_id, name)
);

CREATE INDEX idx_client_tables_database_id ON client_tables(database_id);

-- Table metadata (tracks actual data tables)
CREATE TABLE IF NOT EXISTS table_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  database_id UUID NOT NULL REFERENCES client_databases(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES client_tables(id) ON DELETE CASCADE,
  row_count INTEGER DEFAULT 0,
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_table_metadata_user_id ON table_metadata(user_id);
CREATE INDEX idx_table_metadata_database_id ON table_metadata(database_id);

-- Shared databases
CREATE TABLE IF NOT EXISTS shared_databases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id UUID NOT NULL REFERENCES client_databases(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES users(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE,
  permission TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shared_db_database_id ON shared_databases(database_id);
CREATE INDEX idx_shared_db_shared_with ON shared_databases(shared_with);
CREATE INDEX idx_shared_db_share_token ON shared_databases(share_token);

-- Saved views
CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  database_id UUID NOT NULL REFERENCES client_databases(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES client_tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB,
  sort_order JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saved_views_user_id ON saved_views(user_id);
CREATE INDEX idx_saved_views_database_id ON saved_views(database_id);

-- ========== FILE STORAGE METADATA ==========

-- File metadata (actual files stored in S3)
CREATE TABLE IF NOT EXISTS file_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  s3_key TEXT NOT NULL,
  s3_bucket TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  file_size BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_file_metadata_user_id ON file_metadata(user_id);
CREATE INDEX idx_file_metadata_s3_key ON file_metadata(s3_key);

-- ========== HELPER FUNCTIONS ==========

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_databases_updated_at BEFORE UPDATE ON client_databases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_tables_updated_at BEFORE UPDATE ON client_tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired OTPs (run via scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_codes 
    WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ language 'plpgsql';

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- ========== ROW LEVEL SECURITY (Application-level) ==========
-- Note: RLS will be enforced in application code, not at database level
-- This allows for more flexible permission management

-- ========== INITIAL DATA ==========
-- No initial data needed, tables are created empty

COMMENT ON TABLE users IS 'User accounts and authentication data';
COMMENT ON TABLE user_sessions IS 'Active user sessions and JWT tokens';
COMMENT ON TABLE otp_codes IS 'One-time password codes for email verification';
COMMENT ON TABLE client_databases IS 'User-created database definitions';
COMMENT ON TABLE client_tables IS 'Table schema definitions within databases';
COMMENT ON TABLE table_metadata IS 'Metadata for dynamically created data tables';
COMMENT ON TABLE shared_databases IS 'Database sharing and collaboration';
COMMENT ON TABLE saved_views IS 'Saved filtered views of tables';
COMMENT ON TABLE file_metadata IS 'Metadata for files stored in S3';

