// Lambda function: Get Agent Logs
// Retrieves activity logs for an agent

const pool = require('../../config/database-config');

/**
 * Lambda handler for getting agent logs
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
    const agentId = event.pathParameters?.agentId;
    const cognitoUserId = event.queryStringParameters?.cognitoUserId;
    const limit = parseInt(event.queryStringParameters?.limit || '50');
    const offset = parseInt(event.queryStringParameters?.offset || '0');

    if (!agentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'agentId is required'
        })
      };
    }

    // Verify agent belongs to user
    if (cognitoUserId) {
      const checkResult = await pool.query(
        'SELECT id FROM agents WHERE id = $1 AND cognito_user_id = $2',
        [agentId, cognitoUserId]
      );

      if (checkResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Agent not found'
          })
        };
      }
    }

    // Get logs
    const query = `
      SELECT id, action, details, user_id, created_at
      FROM agent_logs
      WHERE agent_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [agentId, limit, offset]);

    // Parse JSON details
    const logs = result.rows.map(row => ({
      ...row,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
    }));

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM agent_logs WHERE agent_id = $1',
      [agentId]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        logs: logs,
        total: parseInt(countResult.rows[0].total),
        limit: limit,
        offset: offset
      })
    };
  } catch (error) {
    console.error('Error getting agent logs:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get agent logs',
        message: error.message
      })
    };
  }
};

