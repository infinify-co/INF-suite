// Lambda function: Get Single API Key (Passkey)
// Retrieves details for a specific API key

const pool = require('../../config/database-config');

/**
 * Lambda handler for getting a single API key
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

    // Get passkey with ownership verification
    const query = `
      SELECT 
        id, cognito_user_id, project_id, name, api_key_prefix,
        scopes, status, last_used_at, expires_at,
        created_at, updated_at, metadata
      FROM passkeys
      WHERE id = $1 AND cognito_user_id = $2
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

    const passkey = result.rows[0];

    // Get usage stats
    const usageQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(DISTINCT DATE(created_at)) as days_active,
        MAX(created_at) as last_request_at
      FROM passkey_usage_logs
      WHERE passkey_id = $1
    `;
    const usageResult = await pool.query(usageQuery, [passkeyId]);
    const usageStats = usageResult.rows[0] || {
      total_requests: 0,
      days_active: 0,
      last_request_at: null
    };

    // Parse JSON fields
    passkey.scopes = typeof passkey.scopes === 'string' ? JSON.parse(passkey.scopes) : passkey.scopes;
    passkey.metadata = typeof passkey.metadata === 'string' ? JSON.parse(passkey.metadata) : passkey.metadata;

    // NEVER return the full API key or hash
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        passkey: {
          ...passkey,
          usage_stats: {
            total_requests: parseInt(usageStats.total_requests) || 0,
            days_active: parseInt(usageStats.days_active) || 0,
            last_request_at: usageStats.last_request_at
          }
        }
      })
    };
  } catch (error) {
    console.error('Error getting passkey:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get API key',
        message: error.message
      })
    };
  }
};

