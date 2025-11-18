-- Create passkeys table for storing API keys
CREATE TABLE IF NOT EXISTS passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_user_id TEXT NOT NULL,
    project_id UUID,
    name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    api_key_prefix TEXT NOT NULL,
    scopes JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_passkeys_cognito_user_id ON passkeys(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_project_id ON passkeys(project_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_status ON passkeys(status);
CREATE INDEX IF NOT EXISTS idx_passkeys_api_key_prefix ON passkeys(api_key_prefix);

-- Create passkey_usage_logs table for tracking API key usage
CREATE TABLE IF NOT EXISTS passkey_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passkey_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_passkey FOREIGN KEY (passkey_id) REFERENCES passkeys(id) ON DELETE CASCADE
);

-- Create indexes for usage logs
CREATE INDEX IF NOT EXISTS idx_passkey_usage_logs_passkey_id ON passkey_usage_logs(passkey_id);
CREATE INDEX IF NOT EXISTS idx_passkey_usage_logs_created_at ON passkey_usage_logs(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_passkeys_updated_at BEFORE UPDATE ON passkeys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

