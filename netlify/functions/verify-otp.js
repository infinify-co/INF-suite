const { createClient } = require('@supabase/supabase-js');

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

// Hash OTP for comparison
function hashOTP(otp) {
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
    const { email, sessionToken, otp } = JSON.parse(event.body || '{}');

    if (!email || !sessionToken || !otp) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Email, session token, and OTP are required' })
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

    // Hash the provided OTP
    const hashedOTP = hashOTP(otp);

    // Find and verify OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('session_token', sessionToken)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Invalid or expired OTP code' })
      };
    }

    // Check if expired
    const expiresAt = new Date(otpRecord.expires_at);
    const now = new Date();
    if (now > expiresAt) {
      // Mark as expired
      await supabase
        .from('otp_codes')
        .update({ verified: true }) // Mark as used/expired
        .eq('id', otpRecord.id);

      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'OTP code has expired' })
      };
    }

    // Verify OTP hash matches
    if (otpRecord.otp_hash !== hashedOTP) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Invalid OTP code' })
      };
    }

    // Mark OTP as verified
    await supabase
      .from('otp_codes')
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    // Clean up old OTPs for this email (optional)
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', email)
      .eq('verified', true)
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Delete verified OTPs older than 24 hours

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ 
        success: true,
        message: 'OTP verified successfully'
      })
    };

  } catch (error) {
    console.error('Verify OTP error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Server error', detail: error.message })
    };
  }
};

