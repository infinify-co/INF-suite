-- Storage Organization System
-- Maps Supabase Storage buckets to categories and organizes file paths
-- PostgreSQL-compatible for AWS RDS migration

-- Storage bucket categories mapping
-- Maps Supabase Storage buckets to data categories
CREATE TABLE IF NOT EXISTS storage_bucket_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_name TEXT NOT NULL UNIQUE,
  category_id UUID NOT NULL REFERENCES data_categories(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  max_file_size BIGINT, -- Maximum file size in bytes
  allowed_mime_types TEXT[], -- Allowed MIME types
  path_template TEXT, -- Template for organizing files: {category}/{user_id}/{item_type}/{item_id}/{filename}
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for storage_bucket_categories
CREATE INDEX IF NOT EXISTS idx_storage_bucket_cat_bucket_name ON storage_bucket_categories(bucket_name);
CREATE INDEX IF NOT EXISTS idx_storage_bucket_cat_category_id ON storage_bucket_categories(category_id);

-- Enhanced file metadata table (extends existing file_metadata if it exists)
-- This table tracks all files in storage with category information
CREATE TABLE IF NOT EXISTS file_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  category_id UUID REFERENCES data_categories(id) ON DELETE SET NULL,
  data_item_id UUID REFERENCES data_items(id) ON DELETE SET NULL,
  bucket_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT, -- MIME type
  file_size BIGINT,
  checksum TEXT, -- File checksum for integrity verification
  storage_provider TEXT DEFAULT 'supabase' CHECK (storage_provider IN ('supabase', 's3', 'local')),
  s3_key TEXT, -- S3 key if using AWS S3
  s3_bucket TEXT, -- S3 bucket name if using AWS S3
  public_url TEXT, -- Public URL if file is publicly accessible
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bucket_name, file_path) -- One file per path in a bucket
);

-- Indexes for file_metadata
CREATE INDEX IF NOT EXISTS idx_file_metadata_user_id ON file_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_category_id ON file_metadata(category_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_data_item_id ON file_metadata(data_item_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_bucket_name ON file_metadata(bucket_name);
CREATE INDEX IF NOT EXISTS idx_file_metadata_file_path ON file_metadata(file_path);
CREATE INDEX IF NOT EXISTS idx_file_metadata_storage_provider ON file_metadata(storage_provider);
CREATE INDEX IF NOT EXISTS idx_file_metadata_s3_key ON file_metadata(s3_key) WHERE s3_key IS NOT NULL;

-- File versioning table
-- Tracks versions of files (useful for document management)
CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_metadata_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  checksum TEXT,
  created_by UUID, -- User who created this version
  change_description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(file_metadata_id, version_number)
);

-- Indexes for file_versions
CREATE INDEX IF NOT EXISTS idx_file_versions_file_metadata_id ON file_versions(file_metadata_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_version_number ON file_versions(version_number);

-- Storage usage tracking
-- Tracks storage usage per user and category
CREATE TABLE IF NOT EXISTS storage_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  category_id UUID REFERENCES data_categories(id) ON DELETE SET NULL,
  bucket_name TEXT,
  total_size BIGINT DEFAULT 0, -- Total size in bytes
  file_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id, bucket_name)
);

-- Indexes for storage_usage
CREATE INDEX IF NOT EXISTS idx_storage_usage_user_id ON storage_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_usage_category_id ON storage_usage(category_id);
CREATE INDEX IF NOT EXISTS idx_storage_usage_bucket_name ON storage_usage(bucket_name);

-- Triggers for updated_at
CREATE TRIGGER update_storage_bucket_categories_updated_at
  BEFORE UPDATE ON storage_bucket_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_metadata_updated_at
  BEFORE UPDATE ON file_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_usage_updated_at
  BEFORE UPDATE ON storage_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate organized file path
-- Path format: {category}/{user_id}/{item_type}/{item_id}/{filename}
CREATE OR REPLACE FUNCTION generate_file_path(
  p_category_slug TEXT,
  p_user_id UUID,
  p_item_type TEXT,
  p_item_id UUID,
  p_filename TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN p_category_slug || '/' || 
         p_user_id::TEXT || '/' || 
         p_item_type || '/' || 
         p_item_id::TEXT || '/' || 
         p_filename;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO storage_usage (user_id, category_id, bucket_name, total_size, file_count)
    VALUES (NEW.user_id, NEW.category_id, NEW.bucket_name, NEW.file_size, 1)
    ON CONFLICT (user_id, category_id, bucket_name) 
    DO UPDATE SET
      total_size = storage_usage.total_size + NEW.file_size,
      file_count = storage_usage.file_count + 1,
      last_calculated_at = NOW(),
      updated_at = NOW();
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update storage usage if file size changed
    IF OLD.file_size != NEW.file_size THEN
      UPDATE storage_usage
      SET total_size = total_size - OLD.file_size + NEW.file_size,
          updated_at = NOW()
      WHERE user_id = NEW.user_id 
        AND category_id = COALESCE(NEW.category_id, OLD.category_id)
        AND bucket_name = NEW.bucket_name;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE storage_usage
    SET total_size = GREATEST(0, total_size - OLD.file_size),
        file_count = GREATEST(0, file_count - 1),
        updated_at = NOW()
    WHERE user_id = OLD.user_id 
      AND category_id = OLD.category_id
      AND bucket_name = OLD.bucket_name;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update storage usage
CREATE TRIGGER trigger_update_storage_usage
  AFTER INSERT OR UPDATE OR DELETE ON file_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_usage();

-- Insert default bucket mappings
-- Map existing Supabase Storage buckets to categories
INSERT INTO storage_bucket_categories (bucket_name, category_id, is_public, path_template) 
SELECT 
  bucket_name,
  (SELECT id FROM data_categories WHERE slug = category_slug),
  is_public,
  '{category}/{user_id}/{item_type}/{item_id}/{filename}'
FROM (VALUES
  ('avatars', 'images', TRUE),
  ('project-files', 'documents', FALSE),
  ('documents', 'documents', FALSE),
  ('social-assets', 'images', TRUE)
) AS buckets(bucket_name, category_slug, is_public)
ON CONFLICT (bucket_name) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE storage_bucket_categories IS 'Maps storage buckets to data categories';
COMMENT ON TABLE file_metadata IS 'Enhanced file metadata with category and organization support';
COMMENT ON TABLE file_versions IS 'File versioning for document management';
COMMENT ON TABLE storage_usage IS 'Tracks storage usage per user and category';
COMMENT ON FUNCTION generate_file_path IS 'Generates organized file paths based on category and item structure';

