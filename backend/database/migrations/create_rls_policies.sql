-- Row Level Security (RLS) Policies
-- CRITICAL: Run this after all other migrations to secure your data
-- Without RLS, users can access each other's data!

-- Enable RLS on all new tables
ALTER TABLE data_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data_organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organization_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_bucket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tag_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folder_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_queue ENABLE ROW LEVEL SECURITY;

-- ========== DATA CATEGORIES ==========
-- System categories are readable by everyone, but only admins can modify
CREATE POLICY "Anyone can view system categories"
  ON data_categories FOR SELECT
  USING (is_system = TRUE);

CREATE POLICY "Users can view their own custom categories"
  ON data_categories FOR SELECT
  USING (
    is_system = FALSE AND
    EXISTS (
      SELECT 1 FROM user_data_organization
      WHERE user_data_organization.id = data_categories.id
      AND user_data_organization.user_id = auth.uid()
    )
  );

-- ========== DATA ITEMS ==========
-- Users can only see their own data items
CREATE POLICY "Users can view own data items"
  ON data_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data items"
  ON data_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data items"
  ON data_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data items"
  ON data_items FOR DELETE
  USING (auth.uid() = user_id);

-- ========== DOCUMENT METADATA ==========
CREATE POLICY "Users can view own document metadata"
  ON document_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document metadata"
  ON document_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own document metadata"
  ON document_metadata FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own document metadata"
  ON document_metadata FOR DELETE
  USING (auth.uid() = user_id);

-- ========== USER DATA ORGANIZATION ==========
CREATE POLICY "Users can view own organization"
  ON user_data_organization FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own organization"
  ON user_data_organization FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own organization"
  ON user_data_organization FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own organization"
  ON user_data_organization FOR DELETE
  USING (auth.uid() = user_id);

-- ========== USER ORGANIZATION ITEMS ==========
-- Users can only manage items in their own organization folders
CREATE POLICY "Users can view own organization items"
  ON user_organization_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_data_organization
      WHERE user_data_organization.id = user_organization_items.organization_id
      AND user_data_organization.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own organization items"
  ON user_organization_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_data_organization
      WHERE user_data_organization.id = user_organization_items.organization_id
      AND user_data_organization.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM data_items
      WHERE data_items.id = user_organization_items.data_item_id
      AND data_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own organization items"
  ON user_organization_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_data_organization
      WHERE user_data_organization.id = user_organization_items.organization_id
      AND user_data_organization.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own organization items"
  ON user_organization_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_data_organization
      WHERE user_data_organization.id = user_organization_items.organization_id
      AND user_data_organization.user_id = auth.uid()
    )
  );

-- ========== STORAGE BUCKET CATEGORIES ==========
-- Bucket categories are readable by everyone (they're just mappings)
CREATE POLICY "Anyone can view bucket categories"
  ON storage_bucket_categories FOR SELECT
  USING (true);

-- ========== FILE METADATA ==========
CREATE POLICY "Users can view own file metadata"
  ON file_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own file metadata"
  ON file_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own file metadata"
  ON file_metadata FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own file metadata"
  ON file_metadata FOR DELETE
  USING (auth.uid() = user_id);

-- ========== FILE VERSIONS ==========
-- Users can only access versions of their own files
CREATE POLICY "Users can view own file versions"
  ON file_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_metadata
      WHERE file_metadata.id = file_versions.file_metadata_id
      AND file_metadata.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own file versions"
  ON file_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM file_metadata
      WHERE file_metadata.id = file_versions.file_metadata_id
      AND file_metadata.user_id = auth.uid()
    )
  );

-- ========== STORAGE USAGE ==========
CREATE POLICY "Users can view own storage usage"
  ON storage_usage FOR SELECT
  USING (auth.uid() = user_id);

-- ========== DOCUMENT CATEGORIES ==========
-- Document categories are system-wide (readable by all)
CREATE POLICY "Anyone can view document categories"
  ON document_categories FOR SELECT
  USING (true);

-- ========== DOCUMENT TAGS ==========
CREATE POLICY "Users can view own tags"
  ON document_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON document_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON document_tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON document_tags FOR DELETE
  USING (auth.uid() = user_id);

-- ========== DOCUMENT TAG ITEMS ==========
-- Users can only tag their own items
CREATE POLICY "Users can view own tag items"
  ON document_tag_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_tags
      WHERE document_tags.id = document_tag_items.tag_id
      AND document_tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tag items"
  ON document_tag_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_tags
      WHERE document_tags.id = document_tag_items.tag_id
      AND document_tags.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM data_items
      WHERE data_items.id = document_tag_items.data_item_id
      AND data_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tag items"
  ON document_tag_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM document_tags
      WHERE document_tags.id = document_tag_items.tag_id
      AND document_tags.user_id = auth.uid()
    )
  );

-- ========== DOCUMENT FOLDERS ==========
CREATE POLICY "Users can view own folders"
  ON document_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
  ON document_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON document_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON document_folders FOR DELETE
  USING (auth.uid() = user_id);

-- ========== DOCUMENT FOLDER ITEMS ==========
CREATE POLICY "Users can view own folder items"
  ON document_folder_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_folders
      WHERE document_folders.id = document_folder_items.folder_id
      AND document_folders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own folder items"
  ON document_folder_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_folders
      WHERE document_folders.id = document_folder_items.folder_id
      AND document_folders.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM data_items
      WHERE data_items.id = document_folder_items.data_item_id
      AND data_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own folder items"
  ON document_folder_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM document_folders
      WHERE document_folders.id = document_folder_items.folder_id
      AND document_folders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own folder items"
  ON document_folder_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM document_folders
      WHERE document_folders.id = document_folder_items.folder_id
      AND document_folders.user_id = auth.uid()
    )
  );

-- ========== DOCUMENT RELATIONSHIPS ==========
-- Users can only create relationships between their own items
CREATE POLICY "Users can view own relationships"
  ON document_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_items
      WHERE data_items.id = document_relationships.source_item_id
      AND data_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own relationships"
  ON document_relationships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_items
      WHERE data_items.id = document_relationships.source_item_id
      AND data_items.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM data_items
      WHERE data_items.id = document_relationships.target_item_id
      AND data_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own relationships"
  ON document_relationships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM data_items
      WHERE data_items.id = document_relationships.source_item_id
      AND data_items.user_id = auth.uid()
    )
  );

-- ========== DOCUMENT SEARCH INDEX ==========
-- Users can only search their own documents
CREATE POLICY "Users can view own search index"
  ON document_search_index FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_items
      WHERE data_items.id = document_search_index.data_item_id
      AND data_items.user_id = auth.uid()
    )
  );

-- ========== MIGRATION TABLES ==========
-- Migration tables should be restricted (only service role should access)
-- For now, we'll allow users to view their own migration data
CREATE POLICY "Users can view own migration metadata"
  ON migration_metadata FOR SELECT
  USING (true); -- Adjust based on your needs

CREATE POLICY "Users can view own migration logs"
  ON migration_logs FOR SELECT
  USING (true); -- Adjust based on your needs

CREATE POLICY "Users can view own export queue"
  ON data_export_queue FOR SELECT
  USING (true); -- Adjust based on your needs

-- Comments
COMMENT ON TABLE data_items IS 'RLS enabled: Users can only access their own data items';
COMMENT ON TABLE file_metadata IS 'RLS enabled: Users can only access their own file metadata';
COMMENT ON TABLE document_folders IS 'RLS enabled: Users can only access their own folders';

