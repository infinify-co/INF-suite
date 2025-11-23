-- Data Categorization System
-- Creates unified categorization for all user data and documents
-- PostgreSQL-compatible for AWS RDS migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main data categories table
-- Hierarchical category system for organizing all user data
CREATE TABLE IF NOT EXISTS data_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES data_categories(id) ON DELETE SET NULL,
  icon TEXT, -- Icon identifier for UI
  color TEXT, -- Color code for UI
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE, -- System categories cannot be deleted
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for data_categories
CREATE INDEX IF NOT EXISTS idx_data_categories_parent_id ON data_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_data_categories_slug ON data_categories(slug);
CREATE INDEX IF NOT EXISTS idx_data_categories_sort_order ON data_categories(sort_order);

-- Data items table
-- Links any data item (table row, file, etc.) to a category
CREATE TABLE IF NOT EXISTS data_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References auth.users(id) in Supabase, users(id) in AWS
  category_id UUID NOT NULL REFERENCES data_categories(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'database', 'site', 'agent', 'file', 'project', etc.
  item_id UUID NOT NULL, -- ID of the actual item in its respective table
  item_table TEXT NOT NULL, -- Table name where the item exists
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[], -- Array of tags for quick searching
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_type, item_id) -- One item can only be in one category
);

-- Indexes for data_items
CREATE INDEX IF NOT EXISTS idx_data_items_user_id ON data_items(user_id);
CREATE INDEX IF NOT EXISTS idx_data_items_category_id ON data_items(category_id);
CREATE INDEX IF NOT EXISTS idx_data_items_item_type ON data_items(item_type);
CREATE INDEX IF NOT EXISTS idx_data_items_item_id ON data_items(item_id);
CREATE INDEX IF NOT EXISTS idx_data_items_item_table ON data_items(item_table);
CREATE INDEX IF NOT EXISTS idx_data_items_tags ON data_items USING GIN(tags);

-- Document metadata table
-- Enhanced metadata for all documents and files
CREATE TABLE IF NOT EXISTS document_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  data_item_id UUID REFERENCES data_items(id) ON DELETE CASCADE,
  file_path TEXT, -- Path in storage (Supabase Storage or S3)
  storage_bucket TEXT, -- Bucket name
  file_name TEXT NOT NULL,
  file_type TEXT, -- MIME type
  file_size BIGINT, -- Size in bytes
  document_type TEXT, -- 'pdf', 'image', 'code', 'spreadsheet', etc.
  mime_category TEXT, -- 'document', 'image', 'video', 'code', 'archive', etc.
  checksum TEXT, -- File checksum for integrity
  thumbnail_path TEXT, -- Path to thumbnail if applicable
  extracted_text TEXT, -- Extracted text content (for search)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for document_metadata
CREATE INDEX IF NOT EXISTS idx_document_metadata_user_id ON document_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_document_metadata_data_item_id ON document_metadata(data_item_id);
CREATE INDEX IF NOT EXISTS idx_document_metadata_document_type ON document_metadata(document_type);
CREATE INDEX IF NOT EXISTS idx_document_metadata_mime_category ON document_metadata(mime_category);
CREATE INDEX IF NOT EXISTS idx_document_metadata_file_name ON document_metadata(file_name);
CREATE INDEX IF NOT EXISTS idx_document_metadata_extracted_text ON document_metadata USING GIN(to_tsvector('english', extracted_text));

-- User data organization table
-- User-defined organization: folders, custom categories, etc.
CREATE TABLE IF NOT EXISTS user_data_organization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  organization_type TEXT NOT NULL CHECK (organization_type IN ('folder', 'collection', 'workspace')),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES user_data_organization(id) ON DELETE CASCADE,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_data_organization
CREATE INDEX IF NOT EXISTS idx_user_data_org_user_id ON user_data_organization(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_org_parent_id ON user_data_organization(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_data_org_type ON user_data_organization(organization_type);

-- Junction table: links data items to user organization folders
CREATE TABLE IF NOT EXISTS user_organization_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES user_data_organization(id) ON DELETE CASCADE,
  data_item_id UUID NOT NULL REFERENCES data_items(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, data_item_id)
);

-- Indexes for user_organization_items
CREATE INDEX IF NOT EXISTS idx_user_org_items_org_id ON user_organization_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_org_items_data_item_id ON user_organization_items(data_item_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_categories_updated_at
  BEFORE UPDATE ON data_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_items_updated_at
  BEFORE UPDATE ON data_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_metadata_updated_at
  BEFORE UPDATE ON document_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_data_org_updated_at
  BEFORE UPDATE ON user_data_organization
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default system categories
INSERT INTO data_categories (name, slug, description, is_system, sort_order, icon, color) VALUES
  ('Documents', 'documents', 'All user documents and files', TRUE, 1, 'file-text', '#3B82F6'),
  ('Databases', 'databases', 'No-code database builder projects', TRUE, 2, 'database', '#10B981'),
  ('Sites', 'sites', 'Deployed websites and applications', TRUE, 3, 'globe', '#8B5CF6'),
  ('Agents', 'agents', 'AI agents and automations', TRUE, 4, 'bot', '#F59E0B'),
  ('Projects', 'projects', 'Projects and team collaborations', TRUE, 5, 'folder', '#EF4444'),
  ('Code', 'code', 'Code files and repositories', TRUE, 6, 'code', '#6366F1'),
  ('Images', 'images', 'Images and graphics', TRUE, 7, 'image', '#EC4899'),
  ('Videos', 'videos', 'Video files', TRUE, 8, 'video', '#F97316'),
  ('Archives', 'archives', 'Compressed files and archives', TRUE, 9, 'archive', '#6B7280'),
  ('Other', 'other', 'Uncategorized items', TRUE, 10, 'file', '#9CA3AF')
ON CONFLICT (slug) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE data_categories IS 'Main categorization system for all user data';
COMMENT ON TABLE data_items IS 'Links any data item to a category';
COMMENT ON TABLE document_metadata IS 'Enhanced metadata for documents and files';
COMMENT ON TABLE user_data_organization IS 'User-defined folders and organization structures';
COMMENT ON TABLE user_organization_items IS 'Junction table linking data items to user folders';

