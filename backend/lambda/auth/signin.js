// Lambda function: User Signin
const pool = require('../../config/database-config');
const { verifyPassword } = require('../../utils/encryption');
const { isValidEmail } = require('../../utils/validation');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwt');

/**
 * Lambda handler for user signin
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

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

    // Get user
    const userResult = await pool.query(
      'SELECT id, email, password_hash, phone, email_verified, last_login FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Invalid email or password'
        })
      };
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Invalid email or password'
        })
      };
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

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
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          email_verified: user.email_verified
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken
        }
      })
    };

  } catch (error) {
    console.error('Signin error:', error);
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

