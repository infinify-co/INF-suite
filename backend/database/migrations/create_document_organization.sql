-- Document Organization System
-- Document categorization, tags, folders, and relationships
-- PostgreSQL-compatible for AWS RDS migration

-- Document categories table
-- Specific document types (PDF, Image, Code, etc.)
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  mime_types TEXT[], -- Associated MIME types
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for document_categories
CREATE INDEX IF NOT EXISTS idx_document_categories_slug ON document_categories(slug);

-- Document tags table
-- User-defined tags for documents
CREATE TABLE IF NOT EXISTS document_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name) -- Each user can have unique tag names
);

-- Indexes for document_tags
CREATE INDEX IF NOT EXISTS idx_document_tags_user_id ON document_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_name ON document_tags(name);

-- Junction table: document_tags to data_items
CREATE TABLE IF NOT EXISTS document_tag_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_id UUID NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
  data_item_id UUID NOT NULL REFERENCES data_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tag_id, data_item_id)
);

-- Indexes for document_tag_items
CREATE INDEX IF NOT EXISTS idx_document_tag_items_tag_id ON document_tag_items(tag_id);
CREATE INDEX IF NOT EXISTS idx_document_tag_items_data_item_id ON document_tag_items(data_item_id);

-- Document folders table
-- Virtual folder structure for organizing documents
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for document_folders
CREATE INDEX IF NOT EXISTS idx_document_folders_user_id ON document_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_id ON document_folders(parent_id);

-- Junction table: document_folders to data_items
CREATE TABLE IF NOT EXISTS document_folder_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID NOT NULL REFERENCES document_folders(id) ON DELETE CASCADE,
  data_item_id UUID NOT NULL REFERENCES data_items(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(folder_id, data_item_id) -- One item can only be in one folder at a time
);

-- Indexes for document_folder_items
CREATE INDEX IF NOT EXISTS idx_document_folder_items_folder_id ON document_folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_document_folder_items_data_item_id ON document_folder_items(data_item_id);

-- Document relationships table
-- Links between documents (e.g., site → deployment files, project → documents)
CREATE TABLE IF NOT EXISTS document_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_item_id UUID NOT NULL REFERENCES data_items(id) ON DELETE CASCADE,
  target_item_id UUID NOT NULL REFERENCES data_items(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('parent', 'child', 'related', 'version', 'attachment', 'reference')),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_item_id, target_item_id, relationship_type) -- Prevent duplicate relationships
);

-- Indexes for document_relationships
CREATE INDEX IF NOT EXISTS idx_document_relationships_source_item_id ON document_relationships(source_item_id);
CREATE INDEX IF NOT EXISTS idx_document_relationships_target_item_id ON document_relationships(target_item_id);
CREATE INDEX IF NOT EXISTS idx_document_relationships_type ON document_relationships(relationship_type);

-- Document search index table
-- Full-text search support for documents
CREATE TABLE IF NOT EXISTS document_search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_item_id UUID NOT NULL REFERENCES data_items(id) ON DELETE CASCADE,
  document_metadata_id UUID REFERENCES document_metadata(id) ON DELETE CASCADE,
  search_vector tsvector, -- Full-text search vector
  title TEXT,
  content TEXT, -- Extracted or indexed content
  tags TEXT[], -- Tags for filtering
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for document_search_index
CREATE INDEX IF NOT EXISTS idx_document_search_index_data_item_id ON document_search_index(data_item_id);
CREATE INDEX IF NOT EXISTS idx_document_search_index_search_vector ON document_search_index USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_document_search_index_tags ON document_search_index USING GIN(tags);

-- Triggers for updated_at
CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON document_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_search_index_updated_at
  BEFORE UPDATE ON document_search_index
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update search index
CREATE OR REPLACE FUNCTION update_document_search_index()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO document_search_index (data_item_id, document_metadata_id, title, content, tags, search_vector)
  SELECT 
    NEW.id,
    dm.id,
    NEW.name,
    COALESCE(dm.extracted_text, ''),
    NEW.tags,
    to_tsvector('english', 
      COALESCE(NEW.name, '') || ' ' || 
      COALESCE(NEW.description, '') || ' ' || 
      COALESCE(dm.extracted_text, '') || ' ' ||
      COALESCE(array_to_string(NEW.tags, ' '), '')
    )
  FROM document_metadata dm
  WHERE dm.data_item_id = NEW.id
  ON CONFLICT (data_item_id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    tags = EXCLUDED.tags,
    search_vector = EXCLUDED.search_vector,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search index when data_item changes
CREATE TRIGGER trigger_update_document_search_index
  AFTER INSERT OR UPDATE ON data_items
  FOR EACH ROW
  EXECUTE FUNCTION update_document_search_index();

-- Insert default document categories
INSERT INTO document_categories (name, slug, description, mime_types, icon, color, sort_order) VALUES
  ('PDF Document', 'pdf', 'PDF files', ARRAY['application/pdf'], 'file-pdf', '#DC2626', 1),
  ('Image', 'image', 'Image files', ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'], 'image', '#10B981', 2),
  ('Code', 'code', 'Source code files', ARRAY['text/plain', 'application/javascript', 'text/css', 'text/html', 'application/json'], 'code', '#6366F1', 3),
  ('Spreadsheet', 'spreadsheet', 'Spreadsheet files', ARRAY['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], 'table', '#F59E0B', 4),
  ('Word Document', 'word', 'Word processing documents', ARRAY['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], 'file-text', '#3B82F6', 5),
  ('Video', 'video', 'Video files', ARRAY['video/mp4', 'video/webm', 'video/quicktime'], 'video', '#F97316', 6),
  ('Audio', 'audio', 'Audio files', ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg'], 'music', '#EC4899', 7),
  ('Archive', 'archive', 'Compressed archives', ARRAY['application/zip', 'application/x-tar', 'application/gzip'], 'archive', '#6B7280', 8),
  ('Other', 'other', 'Other file types', ARRAY[]::TEXT[], 'file', '#9CA3AF', 9)
ON CONFLICT (slug) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE document_categories IS 'Document type categories (PDF, Image, Code, etc.)';
COMMENT ON TABLE document_tags IS 'User-defined tags for organizing documents';
COMMENT ON TABLE document_folders IS 'Virtual folder structure for document organization';
COMMENT ON TABLE document_relationships IS 'Relationships between documents (parent-child, related, etc.)';
COMMENT ON TABLE document_search_index IS 'Full-text search index for documents';

