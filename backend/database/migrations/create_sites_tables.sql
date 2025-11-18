-- Create sites table for storing deployed sites
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    cognito_user_id TEXT NOT NULL,
    site_name TEXT NOT NULL,
    site_url TEXT, -- Generated URL like site-name.infinify.com
    custom_domain TEXT, -- Custom domain if connected
    domain_id UUID, -- Reference to domains table if custom domain is used
    deployment_type TEXT NOT NULL DEFAULT 'static' CHECK (deployment_type IN ('static', 'serverless', 'container')),
    build_command TEXT,
    output_directory TEXT DEFAULT 'dist',
    environment_variables JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'building', 'deploying', 'live', 'paused', 'failed', 'deleted')),
    s3_bucket_name TEXT, -- S3 bucket for static hosting
    cloudfront_distribution_id TEXT, -- CloudFront distribution ID
    s3_deployment_path TEXT, -- Path in S3 where files are deployed
    last_deployed_at TIMESTAMP WITH TIME ZONE,
    last_deployment_status TEXT,
    deployment_version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cognito_user_id, site_name)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sites_cognito_user_id ON sites(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_sites_company_id ON sites(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_site_url ON sites(site_url);
CREATE INDEX IF NOT EXISTS idx_sites_custom_domain ON sites(custom_domain);
CREATE INDEX IF NOT EXISTS idx_sites_domain_id ON sites(domain_id);

-- Create site_deployments table for deployment history
CREATE TABLE IF NOT EXISTS site_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL,
    deployment_version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'uploading', 'deploying', 'success', 'failed', 'rolled_back')),
    build_logs TEXT, -- Build output logs
    deployment_logs TEXT, -- Deployment logs
    s3_bucket_name TEXT,
    s3_deployment_path TEXT,
    cloudfront_distribution_id TEXT,
    file_count INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    UNIQUE(site_id, deployment_version)
);

CREATE INDEX IF NOT EXISTS idx_site_deployments_site_id ON site_deployments(site_id);
CREATE INDEX IF NOT EXISTS idx_site_deployments_status ON site_deployments(status);
CREATE INDEX IF NOT EXISTS idx_site_deployments_created_at ON site_deployments(created_at DESC);

-- Create site_files table for tracking deployed files
CREATE TABLE IF NOT EXISTS site_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL,
    deployment_id UUID NOT NULL,
    file_path TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    file_size_bytes BIGINT,
    content_type TEXT,
    etag TEXT,
    last_modified TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    CONSTRAINT fk_deployment FOREIGN KEY (deployment_id) REFERENCES site_deployments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_site_files_site_id ON site_files(site_id);
CREATE INDEX IF NOT EXISTS idx_site_files_deployment_id ON site_files(deployment_id);
CREATE INDEX IF NOT EXISTS idx_site_files_file_path ON site_files(file_path);

-- Create site_logs table for activity tracking
CREATE TABLE IF NOT EXISTS site_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_site_logs_site_id ON site_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_site_logs_created_at ON site_logs(created_at DESC);

-- Create site_analytics table for traffic and performance metrics
CREATE TABLE IF NOT EXISTS site_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL,
    event_date DATE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('pageview', 'visit', 'unique_visitor', 'bounce', 'conversion')),
    page_path TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    country_code TEXT,
    city TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'bot', 'unknown')),
    browser TEXT,
    os TEXT,
    session_id TEXT,
    user_id TEXT, -- If user is logged in
    load_time_ms INTEGER, -- Page load time in milliseconds
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_site_analytics_site_id ON site_analytics(site_id);
CREATE INDEX IF NOT EXISTS idx_site_analytics_event_date ON site_analytics(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_site_analytics_event_type ON site_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_site_analytics_page_path ON site_analytics(page_path);
CREATE INDEX IF NOT EXISTS idx_site_analytics_session_id ON site_analytics(session_id);

-- Create site_analytics_daily_summary table for aggregated daily stats
CREATE TABLE IF NOT EXISTS site_analytics_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL,
    summary_date DATE NOT NULL,
    total_pageviews INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    avg_load_time_ms INTEGER,
    top_pages JSONB DEFAULT '[]'::jsonb, -- Array of {path, views}
    top_referrers JSONB DEFAULT '[]'::jsonb, -- Array of {referrer, count}
    top_countries JSONB DEFAULT '[]'::jsonb, -- Array of {country, visitors}
    device_breakdown JSONB DEFAULT '{}'::jsonb, -- {desktop: count, mobile: count, etc}
    browser_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    UNIQUE(site_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_site_analytics_daily_summary_site_id ON site_analytics_daily_summary(site_id);
CREATE INDEX IF NOT EXISTS idx_site_analytics_daily_summary_date ON site_analytics_daily_summary(summary_date DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_sites_updated_at();

CREATE TRIGGER update_site_analytics_daily_summary_updated_at BEFORE UPDATE ON site_analytics_daily_summary
    FOR EACH ROW EXECUTE FUNCTION update_sites_updated_at();

-- Add foreign key constraint for domain_id if domains table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'domains') THEN
        ALTER TABLE sites 
        ADD CONSTRAINT fk_sites_domain 
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE SET NULL;
    END IF;
END $$;

