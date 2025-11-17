// Lambda function: List AI Agents
// Retrieves all agents for a user

const pool = require('../../config/database-config');

/**
 * Lambda handler for listing user's agents
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
    const companyId = event.queryStringParameters?.companyId;

    let query = `
      SELECT 
        id, name, model, status, version, 
        openai_agent_id, created_at, updated_at, last_activity,
        tools, metadata
      FROM agents
      WHERE cognito_user_id = $1
    `;
    const values = [cognitoUserId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (companyId) {
      query += ` AND company_id = $${paramIndex}`;
      values.push(companyId);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);

    // Parse JSON fields
    const agents = result.rows.map(row => ({
      ...row,
      tools: typeof row.tools === 'string' ? JSON.parse(row.tools) : row.tools,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        agents: agents,
        count: agents.length
      })
    };
  } catch (error) {
    console.error('Error listing agents:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to list agents',
        message: error.message
      })
    };
  }
};

