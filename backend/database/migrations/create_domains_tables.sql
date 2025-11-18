-- Create domains table for storing connected domains
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    cognito_user_id TEXT NOT NULL,
    domain_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'verified', 'connected', 'failed', 'disconnected')),
    verification_method TEXT CHECK (verification_method IN ('dns', 'http', 'email')),
    verification_token TEXT,
    verification_record TEXT, -- DNS TXT record value for verification
    verified_at TIMESTAMP WITH TIME ZONE,
    route53_hosted_zone_id TEXT,
    ssl_certificate_arn TEXT,
    ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'requested', 'issued', 'failed', 'expired')),
    ssl_issued_at TIMESTAMP WITH TIME ZONE,
    ssl_expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cognito_user_id, domain_name)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_domains_cognito_user_id ON domains(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_domains_company_id ON domains(company_id);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_domain_name ON domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_domains_ssl_status ON domains(ssl_status);

-- Create dns_records table for DNS record management
CREATE TABLE IF NOT EXISTS dns_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL,
    record_type TEXT NOT NULL CHECK (record_type IN ('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA')),
    name TEXT NOT NULL, -- e.g., "www", "blog", "@" for root
    value TEXT NOT NULL,
    ttl INTEGER DEFAULT 300,
    priority INTEGER, -- For MX records
    route53_record_id TEXT, -- AWS Route53 record ID
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_domain FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dns_records_domain_id ON dns_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_dns_records_type ON dns_records(record_type);
CREATE INDEX IF NOT EXISTS idx_dns_records_name ON dns_records(name);

-- Create subdomains table for subdomain management
CREATE TABLE IF NOT EXISTS subdomains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL,
    subdomain_name TEXT NOT NULL, -- e.g., "blog", "api", "www"
    target_type TEXT NOT NULL CHECK (target_type IN ('ip', 'cname', 's3', 'cloudfront', 'load_balancer')),
    target_value TEXT NOT NULL,
    ssl_certificate_arn TEXT,
    ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'requested', 'issued', 'failed', 'expired')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_domain FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    UNIQUE(domain_id, subdomain_name)
);

CREATE INDEX IF NOT EXISTS idx_subdomains_domain_id ON subdomains(domain_id);
CREATE INDEX IF NOT EXISTS idx_subdomains_name ON subdomains(subdomain_name);

-- Create email_forwards table for email forwarding configuration
CREATE TABLE IF NOT EXISTS email_forwards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL,
    from_address TEXT NOT NULL, -- e.g., "info@example.com" or "*@example.com" for wildcard
    to_address TEXT NOT NULL, -- Destination email
    is_wildcard BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_domain FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_forwards_domain_id ON email_forwards(domain_id);
CREATE INDEX IF NOT EXISTS idx_email_forwards_from_address ON email_forwards(from_address);
CREATE INDEX IF NOT EXISTS idx_email_forwards_active ON email_forwards(is_active);

-- Create domain_logs table for activity tracking
CREATE TABLE IF NOT EXISTS domain_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_domain FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_domain_logs_domain_id ON domain_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_logs_created_at ON domain_logs(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains
    FOR EACH ROW EXECUTE FUNCTION update_domains_updated_at();

CREATE TRIGGER update_dns_records_updated_at BEFORE UPDATE ON dns_records
    FOR EACH ROW EXECUTE FUNCTION update_domains_updated_at();

CREATE TRIGGER update_subdomains_updated_at BEFORE UPDATE ON subdomains
    FOR EACH ROW EXECUTE FUNCTION update_domains_updated_at();

CREATE TRIGGER update_email_forwards_updated_at BEFORE UPDATE ON email_forwards
    FOR EACH ROW EXECUTE FUNCTION update_domains_updated_at();

