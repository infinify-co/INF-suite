# Custom OTP System Setup Guide

## Overview
This guide explains how to set up your own custom OTP (One-Time Password) system using Netlify Functions and Supabase, replacing Supabase's built-in OTP functionality.

## Architecture

1. **Frontend** (`sign-up.html`, `Auth.html`) → Calls Netlify Functions
2. **Netlify Functions** → Generate/verify OTP, send emails
3. **Supabase Database** → Stores OTP codes securely
4. **Email Service** → Sends OTP codes (Resend, SendGrid, or SMTP)

## Setup Steps

### 1. Create Database Table

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the SQL from `otp-schema.sql`:
   ```sql
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
   
   CREATE INDEX IF NOT EXISTS idx_otp_email_session ON otp_codes(email, session_token);
   CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
   ```

### 2. Configure Email Service

Choose one of these options:

#### Option A: Resend (Recommended - Free tier available)
1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. In Netlify Dashboard → **Site settings** → **Environment variables**:
   - `RESEND_API_KEY` = your Resend API key
   - `FROM_EMAIL` = `noreply@yourdomain.com` (verify domain first)

#### Option B: SendGrid
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key
3. In Netlify Dashboard → **Site settings** → **Environment variables**:
   - `SENDGRID_API_KEY` = your SendGrid API key
   - `FROM_EMAIL` = `noreply@yourdomain.com`

#### Option C: Custom SMTP
Modify `send-otp.js` to use nodemailer or similar SMTP library.

### 3. Configure Supabase Service Key

1. In Supabase Dashboard → **Settings** → **API**
2. Copy your **service_role** key (NOT the anon key - this has admin access)
3. In Netlify Dashboard → **Site settings** → **Environment variables**:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_KEY` = your service_role key

**⚠️ Important**: Never expose the service_role key in client-side code!

### 4. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 5. Deploy to Netlify

1. Push your code to GitHub/GitLab
2. Connect to Netlify
3. Netlify will automatically detect and deploy the functions
4. Functions will be available at:
   - `/.netlify/functions/send-otp`
   - `/.netlify/functions/verify-otp`

### 6. Test the System

1. Go to `sign-up.html`
2. Enter email, phone, password
3. Submit form
4. Check email for 6-digit OTP code
5. Enter code in `Auth.html`
6. Verify it works

## How It Works

### OTP Generation Flow
1. User signs up → `signUpOrSignIn()` creates account
2. Session token created → Stored in sessionStorage
3. `sendOTP()` called → Calls Netlify Function
4. Function generates 6-digit OTP
5. OTP hashed and stored in Supabase `otp_codes` table
6. Email sent with plain OTP code
7. User receives email with code

### OTP Verification Flow
1. User enters OTP code in `Auth.html`
2. `verifyOTP()` called → Calls Netlify Function
3. Function hashes provided OTP
4. Compares with stored hash in database
5. Checks expiration (15 minutes)
6. Marks OTP as verified
7. User authenticated → Redirects to `home.html`

## Security Features

- ✅ OTP codes hashed before storage
- ✅ 15-minute expiration
- ✅ One-time use (marked as verified after use)
- ✅ Rate limiting (can be added)
- ✅ Session token validation
- ✅ Automatic cleanup of expired OTPs

## Customization

### Change OTP Length
In `netlify/functions/send-otp.js`:
```javascript
function generateOTP() {
  // Change 100000 to 10000 for 5 digits, 1000000 for 7 digits
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```

### Change Expiration Time
In `netlify/functions/send-otp.js`:
```javascript
const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
// Change to: 10 * 60 * 1000 for 10 minutes
```

### Customize Email Template
Edit the HTML in `sendOTPEmail()` function in `send-otp.js`:
```javascript
html: `
  <div style="font-family: Arial, sans-serif;">
    <h2>Your Custom Branding</h2>
    <p>Code: <strong>${otpCode}</strong></p>
  </div>
`
```

## Troubleshooting

### OTP Not Sending
- Check Netlify Function logs: **Netlify Dashboard** → **Functions** → **Logs**
- Verify email service API key is set correctly
- Check `FROM_EMAIL` is verified in your email service

### OTP Verification Failing
- Check Supabase table exists and has data
- Verify session token matches
- Check expiration time hasn't passed
- Look at Netlify Function logs for errors

### Database Errors
- Ensure `otp_codes` table exists
- Check RLS policies allow service role access
- Verify `SUPABASE_SERVICE_KEY` is set correctly

## Cost Considerations

- **Resend**: Free tier = 3,000 emails/month
- **SendGrid**: Free tier = 100 emails/day
- **Netlify Functions**: Free tier = 125,000 invocations/month
- **Supabase**: Free tier = 500MB database

## Next Steps

1. Add rate limiting (max 3 OTPs per email per hour)
2. Add IP-based rate limiting
3. Implement OTP attempt tracking
4. Add email delivery status tracking
5. Set up monitoring/alerts

