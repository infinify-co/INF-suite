// Lambda function: User Signup
const pool = require('../../config/database-config');
const { hashPassword, generateRandomString } = require('../../utils/encryption');
const { isValidEmail, validatePassword, isValidPhone } = require('../../utils/validation');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwt');

/**
 * Lambda handler for user signup
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password, phone } = body;

    // Validation
    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Email and password are required'
        })
      };
    }

    if (!isValidEmail(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid email format'
        })
      };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Password validation failed',
          details: passwordValidation.errors
        })
      };
    }

    if (phone && !isValidPhone(phone)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid phone number format'
        })
      };
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'User with this email already exists'
        })
      };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, phone, email_verified)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, phone, created_at`,
      [email.toLowerCase(), passwordHash, phone || null, false]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email
    });

    // Store session
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await pool.query(
      `INSERT INTO user_sessions (user_id, access_token, refresh_token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        accessToken,
        refreshToken,
        expiresAt,
        event.requestContext?.identity?.sourceIp || null,
        event.headers?.['user-agent'] || null
      ]
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          email_verified: false
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken
        }
      })
    };

  } catch (error) {
    console.error('Signup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

