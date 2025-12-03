-- Migration: Add business fields to users table
-- Run this migration to add business-related fields for Step-2 signup

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cognito_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_username TEXT,
ADD COLUMN IF NOT EXISTS business_operations TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_cognito_user_id ON users(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_users_business_username ON users(business_username);
CREATE INDEX IF NOT EXISTS idx_users_business_operations ON users(business_operations);

-- Add comments
COMMENT ON COLUMN users.cognito_user_id IS 'AWS Cognito user ID (sub claim)';
COMMENT ON COLUMN users.business_name IS 'Business name from Step-2 signup';
COMMENT ON COLUMN users.business_username IS 'Business username with @ prefix';
COMMENT ON COLUMN users.business_operations IS 'Country/region for business operations';
COMMENT ON COLUMN users.job_title IS 'User job title';

