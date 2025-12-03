// Lambda function: User Signup Sync
// NOTE: With Cognito, authentication is handled in the frontend.
// This Lambda function syncs user data from Cognito to Aurora database.
// It should be called after a user successfully signs up in Cognito.

const pool = require('../../config/database-config');
const { isValidEmail, isValidPhone } = require('../../utils/validation');

/**
 * Lambda handler for syncing Cognito user to Aurora database
 * Called after Cognito signup to store additional user data
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
    // Cognito user ID (sub) and email from Cognito
    const { 
      cognitoUserId, 
      email, 
      phone, 
      emailVerified,
      businessName,
      businessUsername,
      businessOperations,
      jobTitle
    } = body;

    // Validation
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

    if (phone && !isValidPhone(phone)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid phone number format'
        })
      };
    }

    // Check if user already exists in Aurora
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE cognito_user_id = $1 OR email = $2',
      [cognitoUserId, email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      // Update existing user
      const result = await pool.query(
        `UPDATE users 
         SET email = $1, phone = $2, email_verified = $3, 
             business_name = $5, business_username = $6, 
             business_operations = $7, job_title = $8, updated_at = NOW()
         WHERE cognito_user_id = $4 OR email = $1
         RETURNING id, email, phone, email_verified, business_name, business_username, business_operations, job_title, created_at`,
        [
          email.toLowerCase(), 
          phone || null, 
          emailVerified || false, 
          cognitoUserId,
          businessName || null,
          businessUsername || null,
          businessOperations || null,
          jobTitle || null
        ]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: result.rows[0],
          message: 'User synced successfully'
        })
      };
    }

    // Create new user in Aurora (sync from Cognito)
    const result = await pool.query(
      `INSERT INTO users (cognito_user_id, email, phone, email_verified, business_name, business_username, business_operations, job_title)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, phone, email_verified, business_name, business_username, business_operations, job_title, created_at`,
      [
        cognitoUserId, 
        email.toLowerCase(), 
        phone || null, 
        emailVerified || false,
        businessName || null,
        businessUsername || null,
        businessOperations || null,
        jobTitle || null
      ]
    );

    const user = result.rows[0];

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        user: user,
        message: 'User synced from Cognito to Aurora'
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

