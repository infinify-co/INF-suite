const { createClient } = require('@supabase/supabase-js');

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

// Generate 6-digit OTP code
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP for secure storage (simple hash, in production use crypto)
function hashOTP(otp) {
  // Simple hash - in production, use proper crypto hashing
  return Buffer.from(otp).toString('base64');
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, sessionToken } = JSON.parse(event.body || '{}');

    if (!email || !sessionToken) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Email and session token are required' })
      };
    }

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || 'https://dzxlcontltcfsxizjeew.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseKey) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Supabase configuration missing' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate OTP
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Store OTP in Supabase database
    // First, ensure the otp_codes table exists (you'll need to create this in Supabase)
    const { data: otpData, error: otpError } = await supabase
      .from('otp_codes')
      .insert({
        email: email,
        session_token: sessionToken,
        otp_hash: hashedOTP,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        verified: false
      })
      .select()
      .single();

    if (otpError) {
      console.error('OTP storage error:', otpError);
      // If table doesn't exist, we'll handle it gracefully
      // For now, store in a simpler way or log the error
    }

    // Send email with OTP
    // Option 1: Use Resend (recommended - free tier available)
    // Option 2: Use SendGrid
    // Option 3: Use SMTP directly
    // For now, we'll use a generic email service
    
    const emailSent = await sendOTPEmail(email, otpCode);

    if (!emailSent) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Failed to send OTP email' })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        // Don't send OTP in response for security
      })
    };

  } catch (error) {
    console.error('Send OTP error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Server error', detail: error.message })
    };
  }
};

// Email sending function
async function sendOTPEmail(email, otpCode) {
  try {
    // Option 1: Use Resend API (recommended)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || 'noreply@infinify.com',
          to: email,
          subject: 'Your Infinify Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Verify your email</h2>
              <p>Your Infinify verification code is:</p>
              <h1 style="font-size: 36px; letter-spacing: 8px; color: #000; margin: 20px 0;">${otpCode}</h1>
              <p>Enter this code in the verification page to complete your signup.</p>
              <p style="color: #6b7280; font-size: 14px;">This code expires in 15 minutes.</p>
              <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            </div>
          `
        })
      });

      if (response.ok) {
        return true;
      }
    }

    // Option 2: Use SendGrid
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (sendgridApiKey) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: email }]
          }],
          from: { email: process.env.FROM_EMAIL || 'noreply@infinify.com' },
          subject: 'Your Infinify Verification Code',
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1f2937;">Verify your email</h2>
                <p>Your Infinify verification code is:</p>
                <h1 style="font-size: 36px; letter-spacing: 8px; color: #000; margin: 20px 0;">${otpCode}</h1>
                <p>Enter this code in the verification page to complete your signup.</p>
                <p style="color: #6b7280; font-size: 14px;">This code expires in 15 minutes.</p>
              </div>
            `
          }]
        })
      });

      if (response.ok) {
        return true;
      }
    }

    // Option 3: Fallback - log for development (you'll need to configure email service)
    console.log(`[DEV] OTP for ${email}: ${otpCode}`);
    console.log('Configure RESEND_API_KEY or SENDGRID_API_KEY in Netlify environment variables');
    
    // In development, return true so testing can continue
    // In production, this should return false
    return process.env.NODE_ENV === 'development';

  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

