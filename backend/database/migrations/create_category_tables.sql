-- Category-Specific Schema Organization
-- Organizes existing tables into logical PostgreSQL schemas
-- PostgreSQL-compatible for AWS RDS migration
-- Note: In Supabase, schemas work the same way as in PostgreSQL

-- Create schemas
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS databases;
CREATE SCHEMA IF NOT EXISTS projects;
CREATE SCHEMA IF NOT EXISTS sites;
CREATE SCHEMA IF NOT EXISTS agents;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS organization;

-- Move existing tables to appropriate schemas
-- Note: This uses ALTER TABLE ... SET SCHEMA which moves tables between schemas

-- Core schema: users, profiles, authentication
-- Note: auth.users is managed by Supabase, we'll create a view/compatibility layer
DO $$
BEGIN
  -- Move profiles if it exists in public schema
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles SET SCHEMA core;
  END IF;
  
  -- Create profiles in core schema if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'profiles') THEN
    CREATE TABLE core.profiles (
      id UUID PRIMARY KEY,
      email TEXT,
      full_name TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- Databases schema: client databases, tables, metadata
DO $$
BEGIN
  -- Move client_databases if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_databases') THEN
    ALTER TABLE public.client_databases SET SCHEMA databases;
  END IF;
  
  -- Move client_tables if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_tables') THEN
    ALTER TABLE public.client_tables SET SCHEMA databases;
  END IF;
  
  -- Move table_metadata if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'table_metadata') THEN
    ALTER TABLE public.table_metadata SET SCHEMA databases;
  END IF;
  
  -- Move shared_databases if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shared_databases') THEN
    ALTER TABLE public.shared_databases SET SCHEMA databases;
  END IF;
  
  -- Move saved_views if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_views') THEN
    ALTER TABLE public.saved_views SET SCHEMA databases;
  END IF;
END $$;

-- Projects schema: teams, projects, todos, notes
DO $$
BEGIN
  -- Move teams if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
    ALTER TABLE public.teams SET SCHEMA projects;
  END IF;
  
  -- Move team_members if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
    ALTER TABLE public.team_members SET SCHEMA projects;
  END IF;
  
  -- Move projects if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    ALTER TABLE public.projects SET SCHEMA projects;
  END IF;
  
  -- Move todos if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'todos') THEN
    ALTER TABLE public.todos SET SCHEMA projects;
  END IF;
  
  -- Move notes if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    ALTER TABLE public.notes SET SCHEMA projects;
  END IF;
  
  -- Move performance_metrics if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_metrics') THEN
    ALTER TABLE public.performance_metrics SET SCHEMA projects;
  END IF;
  
  -- Move app_slots if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_slots') THEN
    ALTER TABLE public.app_slots SET SCHEMA projects;
  END IF;
END $$;

-- Sites schema: sites, deployments, files, analytics
DO $$
BEGIN
  -- Move sites if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
    ALTER TABLE public.sites SET SCHEMA sites;
  END IF;
  
  -- Move site_deployments if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_deployments') THEN
    ALTER TABLE public.site_deployments SET SCHEMA sites;
  END IF;
  
  -- Move site_files if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_files') THEN
    ALTER TABLE public.site_files SET SCHEMA sites;
  END IF;
  
  -- Move site_logs if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_logs') THEN
    ALTER TABLE public.site_logs SET SCHEMA sites;
  END IF;
  
  -- Move site_analytics if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_analytics') THEN
    ALTER TABLE public.site_analytics SET SCHEMA sites;
  END IF;
  
  -- Move site_analytics_daily_summary if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_analytics_daily_summary') THEN
    ALTER TABLE public.site_analytics_daily_summary SET SCHEMA sites;
  END IF;
END $$;

-- Agents schema: agents, versions, logs
DO $$
BEGIN
  -- Move agents if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agents') THEN
    ALTER TABLE public.agents SET SCHEMA agents;
  END IF;
  
  -- Move agent_versions if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_versions') THEN
    ALTER TABLE public.agent_versions SET SCHEMA agents;
  END IF;
  
  -- Move agent_logs if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_logs') THEN
    ALTER TABLE public.agent_logs SET SCHEMA agents;
  END IF;
END $$;

-- Storage schema: file metadata, storage buckets
DO $$
BEGIN
  -- Move file_metadata if exists in public (it might have been created in previous migration)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_metadata') THEN
    ALTER TABLE public.file_metadata SET SCHEMA storage;
  END IF;
  
  -- Move storage_bucket_categories if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_bucket_categories') THEN
    ALTER TABLE public.storage_bucket_categories SET SCHEMA storage;
  END IF;
  
  -- Move file_versions if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_versions') THEN
    ALTER TABLE public.file_versions SET SCHEMA storage;
  END IF;
  
  -- Move storage_usage if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_usage') THEN
    ALTER TABLE public.storage_usage SET SCHEMA storage;
  END IF;
END $$;

-- Organization schema: categorization, organization tables
DO $$
BEGIN
  -- Move data_categories if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'data_categories') THEN
    ALTER TABLE public.data_categories SET SCHEMA organization;
  END IF;
  
  -- Move data_items if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'data_items') THEN
    ALTER TABLE public.data_items SET SCHEMA organization;
  END IF;
  
  -- Move document_metadata if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_metadata') THEN
    ALTER TABLE public.document_metadata SET SCHEMA organization;
  END IF;
  
  -- Move user_data_organization if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_data_organization') THEN
    ALTER TABLE public.user_data_organization SET SCHEMA organization;
  END IF;
  
  -- Move user_organization_items if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_organization_items') THEN
    ALTER TABLE public.user_organization_items SET SCHEMA organization;
  END IF;
  
  -- Move document_categories if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_categories') THEN
    ALTER TABLE public.document_categories SET SCHEMA organization;
  END IF;
  
  -- Move document_tags if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_tags') THEN
    ALTER TABLE public.document_tags SET SCHEMA organization;
  END IF;
  
  -- Move document_tag_items if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_tag_items') THEN
    ALTER TABLE public.document_tag_items SET SCHEMA organization;
  END IF;
  
  -- Move document_folders if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_folders') THEN
    ALTER TABLE public.document_folders SET SCHEMA organization;
  END IF;
  
  -- Move document_folder_items if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_folder_items') THEN
    ALTER TABLE public.document_folder_items SET SCHEMA organization;
  END IF;
  
  -- Move document_relationships if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_relationships') THEN
    ALTER TABLE public.document_relationships SET SCHEMA organization;
  END IF;
  
  -- Move document_search_index if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_search_index') THEN
    ALTER TABLE public.document_search_index SET SCHEMA organization;
  END IF;
END $$;

-- Create views in public schema for backward compatibility
-- These views allow existing code to continue working while using new schema structure

-- Core views
CREATE OR REPLACE VIEW public.profiles AS SELECT * FROM core.profiles;

-- Databases views
CREATE OR REPLACE VIEW public.client_databases AS SELECT * FROM databases.client_databases;
CREATE OR REPLACE VIEW public.client_tables AS SELECT * FROM databases.client_tables;
CREATE OR REPLACE VIEW public.table_metadata AS SELECT * FROM databases.table_metadata;
CREATE OR REPLACE VIEW public.shared_databases AS SELECT * FROM databases.shared_databases;
CREATE OR REPLACE VIEW public.saved_views AS SELECT * FROM databases.saved_views;

-- Projects views
CREATE OR REPLACE VIEW public.teams AS SELECT * FROM projects.teams;
CREATE OR REPLACE VIEW public.team_members AS SELECT * FROM projects.team_members;
CREATE OR REPLACE VIEW public.projects AS SELECT * FROM projects.projects;
CREATE OR REPLACE VIEW public.todos AS SELECT * FROM projects.todos;
CREATE OR REPLACE VIEW public.notes AS SELECT * FROM projects.notes;
CREATE OR REPLACE VIEW public.performance_metrics AS SELECT * FROM projects.performance_metrics;
CREATE OR REPLACE VIEW public.app_slots AS SELECT * FROM projects.app_slots;

-- Sites views
CREATE OR REPLACE VIEW public.sites AS SELECT * FROM sites.sites;
CREATE OR REPLACE VIEW public.site_deployments AS SELECT * FROM sites.site_deployments;
CREATE OR REPLACE VIEW public.site_files AS SELECT * FROM sites.site_files;
CREATE OR REPLACE VIEW public.site_logs AS SELECT * FROM sites.site_logs;
CREATE OR REPLACE VIEW public.site_analytics AS SELECT * FROM sites.site_analytics;
CREATE OR REPLACE VIEW public.site_analytics_daily_summary AS SELECT * FROM sites.site_analytics_daily_summary;

-- Agents views
CREATE OR REPLACE VIEW public.agents AS SELECT * FROM agents.agents;
CREATE OR REPLACE VIEW public.agent_versions AS SELECT * FROM agents.agent_versions;
CREATE OR REPLACE VIEW public.agent_logs AS SELECT * FROM agents.agent_logs;

-- Storage views
CREATE OR REPLACE VIEW public.file_metadata AS SELECT * FROM storage.file_metadata;
CREATE OR REPLACE VIEW public.storage_bucket_categories AS SELECT * FROM storage.storage_bucket_categories;
CREATE OR REPLACE VIEW public.file_versions AS SELECT * FROM storage.file_versions;
CREATE OR REPLACE VIEW public.storage_usage AS SELECT * FROM storage.storage_usage;

-- Organization views
CREATE OR REPLACE VIEW public.data_categories AS SELECT * FROM organization.data_categories;
CREATE OR REPLACE VIEW public.data_items AS SELECT * FROM organization.data_items;
CREATE OR REPLACE VIEW public.document_metadata AS SELECT * FROM organization.document_metadata;
CREATE OR REPLACE VIEW public.user_data_organization AS SELECT * FROM organization.user_data_organization;
CREATE OR REPLACE VIEW public.user_organization_items AS SELECT * FROM organization.user_organization_items;
CREATE OR REPLACE VIEW public.document_categories AS SELECT * FROM organization.document_categories;
CREATE OR REPLACE VIEW public.document_tags AS SELECT * FROM organization.document_tags;
CREATE OR REPLACE VIEW public.document_tag_items AS SELECT * FROM organization.document_tag_items;
CREATE OR REPLACE VIEW public.document_folders AS SELECT * FROM organization.document_folders;
CREATE OR REPLACE VIEW public.document_folder_items AS SELECT * FROM organization.document_folder_items;
CREATE OR REPLACE VIEW public.document_relationships AS SELECT * FROM organization.document_relationships;
CREATE OR REPLACE VIEW public.document_search_index AS SELECT * FROM organization.document_search_index;

-- Comments for documentation
COMMENT ON SCHEMA core IS 'Core user and authentication data';
COMMENT ON SCHEMA databases IS 'No-code database builder tables';
COMMENT ON SCHEMA projects IS 'Projects, teams, todos, and notes';
COMMENT ON SCHEMA sites IS 'Site deployments and analytics';
COMMENT ON SCHEMA agents IS 'AI agents and automations';
COMMENT ON SCHEMA storage IS 'File storage metadata and organization';
COMMENT ON SCHEMA organization IS 'Data categorization and organization system';

