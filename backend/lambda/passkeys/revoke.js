// Lambda function: Revoke API Key (Passkey)
// Revokes or deletes an API key

const pool = require('../../config/database-config');

/**
 * Lambda handler for revoking an API key
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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
    const passkeyId = event.pathParameters?.passkeyId;
    const body = JSON.parse(event.body || '{}');
    const cognitoUserId = body.cognitoUserId || event.queryStringParameters?.cognitoUserId;

    if (!passkeyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'passkeyId is required'
        })
      };
    }

    if (!cognitoUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'cognitoUserId is required'
        })
      };
    }

    // Verify ownership and update status to revoked
    const query = `
      UPDATE passkeys
      SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND cognito_user_id = $2
      RETURNING id, name, status
    `;

    const result = await pool.query(query, [passkeyId, cognitoUserId]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'API key not found or access denied'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'API key revoked successfully',
        passkey: {
          id: result.rows[0].id,
          name: result.rows[0].name,
          status: result.rows[0].status
        }
      })
    };
  } catch (error) {
    console.error('Error revoking passkey:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to revoke API key',
        message: error.message
      })
    };
  }
};

