// Lambda function: Get User Details
// Gets detailed information about a specific user

const pool = require('../../config/database-config');

/**
 * Lambda handler for getting user details
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    const userId = event.pathParameters?.id || event.queryStringParameters?.id;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'User ID is required'
        })
      };
    }

    const result = await pool.query(
      `SELECT 
        id, 
        cognito_user_id,
        email, 
        phone, 
        email_verified,
        business_name,
        business_username,
        business_operations,
        job_title,
        created_at, 
        updated_at, 
        last_login
      FROM users 
      WHERE id = $1 OR cognito_user_id = $1 OR email = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'User not found'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: result.rows[0]
      })
    };

  } catch (error) {
    console.error('Get user error:', error);
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

