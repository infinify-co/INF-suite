// Lambda function: List Domains
// Retrieves all domains for a user

const pool = require('../../config/database-config');

/**
 * Lambda handler for listing user's domains
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
    const status = event.queryStringParameters?.status;

    let query = `
      SELECT 
        id, domain_name, status, verification_method, 
        verified_at, ssl_status, ssl_issued_at, ssl_expires_at,
        created_at, updated_at, metadata
      FROM domains
      WHERE cognito_user_id = $1
    `;
    const values = [cognitoUserId];

    if (status) {
      query += ` AND status = $2`;
      values.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);

    // Parse JSON fields
    const domains = result.rows.map(row => ({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        domains: domains,
        count: domains.length
      })
    };
  } catch (error) {
    console.error('Error listing domains:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to list domains',
        message: error.message
      })
    };
  }
};

