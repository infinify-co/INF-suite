-- OTP Codes Table for Custom OTP System
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  session_token TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_email_session ON otp_codes(email, session_token);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_verified ON otp_codes(verified);

-- Enable Row Level Security (RLS)
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage OTPs (for Netlify Functions)
-- Note: You'll need to use service_role key in Netlify Functions, not anon key
CREATE POLICY "Service role can manage OTPs" ON otp_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Cleanup function to remove expired OTPs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

