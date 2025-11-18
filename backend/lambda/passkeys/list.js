// Lambda function: List API Keys (Passkeys)
// Retrieves all API keys for a user

const pool = require('../../config/database-config');

/**
 * Lambda handler for listing user's API keys
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
    const cognitoUserId = event.queryStringParameters?.cognitoUserId || 
                          event.pathParameters?.cognitoUserId;

    if (!cognitoUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'cognitoUserId is required'
        })
      };
    }

    // Optional filters
    const projectId = event.queryStringParameters?.projectId;
    const status = event.queryStringParameters?.status;

    let query = `
      SELECT 
        id, project_id, name, api_key_prefix, scopes, status,
        last_used_at, expires_at, created_at, updated_at, metadata
      FROM passkeys
      WHERE cognito_user_id = $1
    `;
    const values = [cognitoUserId];
    let paramIndex = 2;

    if (projectId) {
      query += ` AND project_id = $${paramIndex}`;
      values.push(projectId);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);

    // Parse JSON fields and ensure we never return the full key
    const passkeys = result.rows.map(row => ({
      id: row.id,
      project_id: row.project_id,
      name: row.name,
      api_key_prefix: row.api_key_prefix,
      scopes: typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes,
      status: row.status,
      last_used_at: row.last_used_at,
      expires_at: row.expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        passkeys: passkeys,
        count: passkeys.length
      })
    };
  } catch (error) {
    console.error('Error listing passkeys:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to list API keys',
        message: error.message
      })
    };
  }
};

