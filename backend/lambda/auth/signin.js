// Lambda function: User Signin Sync
// NOTE: With Cognito, authentication is handled in the frontend.
// This Lambda function syncs user data and updates last login in Aurora.
// It should be called after a user successfully signs in with Cognito.

const pool = require('../../config/database-config');
const { isValidEmail } = require('../../utils/validation');

/**
 * Lambda handler for syncing Cognito user session to Aurora database
 * Called after Cognito signin to update last login and sync data
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
    // Cognito user ID (sub) from authenticated session
    const { cognitoUserId, email } = body;

    if (!cognitoUserId || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Cognito user ID and email are required'
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

    // Get or create user in Aurora
    let userResult = await pool.query(
      'SELECT id, email, phone, email_verified, last_login FROM users WHERE cognito_user_id = $1 OR email = $2',
      [cognitoUserId, email.toLowerCase()]
    );

    let user;
    if (userResult.rows.length === 0) {
      // User doesn't exist in Aurora, create it
      const createResult = await pool.query(
        `INSERT INTO users (cognito_user_id, email, email_verified, last_login)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, email, phone, email_verified, last_login`,
        [cognitoUserId, email.toLowerCase(), true]
      );
      user = createResult.rows[0];
    } else {
      // Update last login
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE cognito_user_id = $1',
        [cognitoUserId]
      );
      user = userResult.rows[0];
      user.last_login = new Date();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          email_verified: user.email_verified,
          last_login: user.last_login
        },
        message: 'User session synced to Aurora'
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

