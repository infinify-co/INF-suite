// Lambda function: Get API Key Usage Logs
// Retrieves usage history for an API key

const pool = require('../../config/database-config');

/**
 * Lambda handler for getting usage logs
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    const cognitoUserId = event.queryStringParameters?.cognitoUserId;
    const limit = parseInt(event.queryStringParameters?.limit || '50');
    const offset = parseInt(event.queryStringParameters?.offset || '0');

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

    // Verify ownership
    const ownershipQuery = `
      SELECT id FROM passkeys
      WHERE id = $1 AND cognito_user_id = $2
    `;
    const ownershipResult = await pool.query(ownershipQuery, [passkeyId, cognitoUserId]);

    if (ownershipResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'API key not found or access denied'
        })
      };
    }

    // Get usage logs with pagination
    const query = `
      SELECT 
        id, endpoint, method, status_code, ip_address, created_at
      FROM passkey_usage_logs
      WHERE passkey_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [passkeyId, limit, offset]);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM passkey_usage_logs WHERE passkey_id = $1`;
    const countResult = await pool.query(countQuery, [passkeyId]);
    const total = parseInt(countResult.rows[0].total) || 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        logs: result.rows,
        pagination: {
          total: total,
          limit: limit,
          offset: offset,
          has_more: offset + limit < total
        }
      })
    };
  } catch (error) {
    console.error('Error getting usage logs:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get usage logs',
        message: error.message
      })
    };
  }
};

