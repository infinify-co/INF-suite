-- Supabase Database Schema for No-Code Database Builder
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- System tables for managing client databases
CREATE TABLE IF NOT EXISTS client_databases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id UUID NOT NULL REFERENCES client_databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL, -- Array of field definitions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track actual data tables
CREATE TABLE IF NOT EXISTS table_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  database_id UUID NOT NULL REFERENCES client_databases(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES client_tables(id) ON DELETE CASCADE,
  row_count INTEGER DEFAULT 0,
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared databases for collaboration
CREATE TABLE IF NOT EXISTS shared_databases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id UUID NOT NULL REFERENCES client_databases(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE, -- For public sharing links
  permission TEXT NOT NULL DEFAULT 'view', -- 'view', 'edit', 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Views for clients to save filtered views
CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES client_tables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB, -- Array of filter conditions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_databases_user_id ON client_databases(user_id);
CREATE INDEX IF NOT EXISTS idx_client_tables_database_id ON client_tables(database_id);
CREATE INDEX IF NOT EXISTS idx_table_metadata_client_id ON table_metadata(client_id);
CREATE INDEX IF NOT EXISTS idx_table_metadata_database_id ON table_metadata(database_id);
CREATE INDEX IF NOT EXISTS idx_shared_databases_database_id ON shared_databases(database_id);
CREATE INDEX IF NOT EXISTS idx_shared_databases_shared_with ON shared_databases(shared_with);
CREATE INDEX IF NOT EXISTS idx_saved_views_table_id ON saved_views(table_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON saved_views(user_id);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE client_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own databases
CREATE POLICY "Users can view own databases"
  ON client_databases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own databases"
  ON client_databases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own databases"
  ON client_databases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own databases"
  ON client_databases FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can only see tables in their databases
CREATE POLICY "Users can view own tables"
  ON client_tables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_databases
      WHERE client_databases.id = client_tables.database_id
      AND client_databases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tables"
  ON client_tables FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_databases
      WHERE client_databases.id = client_tables.database_id
      AND client_databases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tables"
  ON client_tables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM client_databases
      WHERE client_databases.id = client_tables.database_id
      AND client_databases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tables"
  ON client_tables FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM client_databases
      WHERE client_databases.id = client_tables.database_id
      AND client_databases.user_id = auth.uid()
    )
  );

-- Policy: Users can only see metadata for their tables
CREATE POLICY "Users can view own table metadata"
  ON table_metadata FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can insert own table metadata"
  ON table_metadata FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own table metadata"
  ON table_metadata FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Users can delete own table metadata"
  ON table_metadata FOR DELETE
  USING (auth.uid() = client_id);

-- Policy: Users can view shared databases they have access to
CREATE POLICY "Users can view shared databases"
  ON shared_databases FOR SELECT
  USING (
    auth.uid() = shared_with
    OR auth.uid() = shared_by
    OR share_token IS NOT NULL -- Public links (will check token in application)
  );

CREATE POLICY "Users can share databases"
  ON shared_databases FOR INSERT
  WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can update shared databases they own"
  ON shared_databases FOR UPDATE
  USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete shared databases they own"
  ON shared_databases FOR DELETE
  USING (auth.uid() = shared_by);

-- Policy: Users can view saved views for their tables
CREATE POLICY "Users can view own saved views"
  ON saved_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved views"
  ON saved_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved views"
  ON saved_views FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved views"
  ON saved_views FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create dynamic table for client data
CREATE OR REPLACE FUNCTION create_client_table(
  p_table_name TEXT,
  p_client_id UUID,
  p_database_id UUID,
  p_table_id UUID,
  p_fields JSONB
) RETURNS TEXT AS $$
DECLARE
  v_sql TEXT;
  v_field_def TEXT;
  v_field JSONB;
BEGIN
  -- Build CREATE TABLE statement
  v_sql := 'CREATE TABLE IF NOT EXISTS ' || quote_ident(p_table_name) || ' (';
  v_sql := v_sql || 'id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),';
  v_sql := v_sql || 'created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),';
  v_sql := v_sql || 'updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
  
  -- Add fields based on JSONB definition
  FOR v_field IN SELECT * FROM jsonb_array_elements(p_fields)
  LOOP
    v_field_def := '';
    
    -- Map field types
    CASE v_field->>'type'
      WHEN 'text' THEN v_field_def := 'TEXT';
      WHEN 'number' THEN v_field_def := 'NUMERIC';
      WHEN 'date' THEN v_field_def := 'DATE';
      WHEN 'datetime' THEN v_field_def := 'TIMESTAMP WITH TIME ZONE';
      WHEN 'boolean' THEN v_field_def := 'BOOLEAN';
      WHEN 'email' THEN v_field_def := 'TEXT';
      WHEN 'phone' THEN v_field_def := 'TEXT';
      ELSE v_field_def := 'TEXT';
    END CASE;
    
    v_sql := v_sql || ',' || quote_ident(v_field->>'name') || ' ' || v_field_def;
    
    -- Add NOT NULL if required
    IF (v_field->>'required')::boolean THEN
      v_sql := v_sql || ' NOT NULL';
    END IF;
    
    -- Add default value if specified
    IF v_field->>'default' IS NOT NULL THEN
      IF v_field->>'type' = 'text' OR v_field->>'type' = 'email' OR v_field->>'type' = 'phone' THEN
        v_sql := v_sql || ' DEFAULT ' || quote_literal(v_field->>'default');
      ELSE
        v_sql := v_sql || ' DEFAULT ' || (v_field->>'default');
      END IF;
    END IF;
  END LOOP;
  
  v_sql := v_sql || ');';
  
  -- Execute the CREATE TABLE
  EXECUTE v_sql;
  
  -- Enable RLS on the new table
  EXECUTE 'ALTER TABLE ' || quote_ident(p_table_name) || ' ENABLE ROW LEVEL SECURITY';
  
  -- Create RLS policy: only the client who owns it can access
  EXECUTE format(
    'CREATE POLICY "Client %s owns this table" ON %I FOR ALL USING (true)',
    p_client_id,
    p_table_name
  );
  
  -- Insert metadata
  INSERT INTO table_metadata (table_name, client_id, database_id, table_id)
  VALUES (p_table_name, p_client_id, p_database_id, p_table_id)
  ON CONFLICT (table_name) DO NOTHING;
  
  RETURN p_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to drop client table
CREATE OR REPLACE FUNCTION drop_client_table(p_table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(p_table_name) || ' CASCADE';
  
  DELETE FROM table_metadata WHERE table_name = p_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_databases_updated_at
  BEFORE UPDATE ON client_databases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_tables_updated_at
  BEFORE UPDATE ON client_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Dashboard Tables (Teams, Projects, etc.)
-- ========================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Todos table
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL
);

-- App slots table
CREATE TABLE IF NOT EXISTS app_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL,
  app_name TEXT,
  app_details TEXT,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, slot_number)
);

-- Indexes for dashboard tables
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_team_id ON performance_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_app_slots_user_id ON app_slots(user_id);

-- RLS for dashboard tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_slots ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Teams policies
CREATE POLICY "Users can view teams they belong to"
  ON teams FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team creators can update teams"
  ON teams FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Team creators can delete teams"
  ON teams FOR DELETE
  USING (auth.uid() = created_by);

-- Team members policies
CREATE POLICY "Users can view team members of their teams"
  ON team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND (teams.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Team creators can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.created_by = auth.uid()
    )
  );

CREATE POLICY "Team creators can update members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.created_by = auth.uid()
    )
  );

CREATE POLICY "Team creators can remove members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.created_by = auth.uid()
    )
  );

-- Projects policies
CREATE POLICY "Users can view projects in their teams"
  ON projects FOR SELECT
  USING (
    created_by = auth.uid()
    OR team_id IS NULL
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = projects.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (team_id IS NULL OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = projects.team_id
      AND team_members.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update their projects"
  ON projects FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their projects"
  ON projects FOR DELETE
  USING (auth.uid() = created_by);

-- Todos policies
CREATE POLICY "Users can view own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own todos"
  ON todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos"
  ON todos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos"
  ON todos FOR DELETE
  USING (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Performance metrics policies
CREATE POLICY "Users can view metrics for their teams"
  ON performance_metrics FOR SELECT
  USING (
    team_id IS NULL
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = performance_metrics.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for their teams"
  ON performance_metrics FOR INSERT
  WITH CHECK (
    team_id IS NULL
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = performance_metrics.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- App slots policies
CREATE POLICY "Users can view own app slots"
  ON app_slots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own app slots"
  ON app_slots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own app slots"
  ON app_slots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own app slots"
  ON app_slots FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_slots_updated_at
  BEFORE UPDATE ON app_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

