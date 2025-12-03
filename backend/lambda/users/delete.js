// Lambda function: Delete User
// Deletes a user from Aurora database (and optionally from Cognito)

const pool = require('../../config/database-config');
const AWS = require('aws-sdk');

/**
 * Lambda handler for deleting a user
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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
    const userId = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');
    const deleteFromCognito = body.deleteFromCognito !== false; // Default true

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'User ID is required'
        })
      };
    }

    // Get user info before deletion
    const userResult = await pool.query(
      'SELECT cognito_user_id, email FROM users WHERE id = $1 OR cognito_user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'User not found'
        })
      };
    }

    const user = userResult.rows[0];

    // Delete from Aurora
    await pool.query(
      'DELETE FROM users WHERE id = $1 OR cognito_user_id = $1',
      [userId]
    );

    // Optionally delete from Cognito
    if (deleteFromCognito && user.cognito_user_id) {
      try {
        const cognito = new AWS.CognitoIdentityServiceProvider({
          region: process.env.COGNITO_REGION || 'ap-southeast-2'
        });

        await cognito.adminDeleteUser({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: user.cognito_user_id
        }).promise();
      } catch (cognitoError) {
        console.error('Error deleting from Cognito:', cognitoError);
        // Continue even if Cognito deletion fails
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User deleted successfully'
      })
    };

  } catch (error) {
    console.error('Delete user error:', error);
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

