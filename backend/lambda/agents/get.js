// Lambda function: Get Single Agent
// Retrieves details for a specific agent

const pool = require('../../config/database-config');

/**
 * Lambda handler for getting a single agent
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

    if (!agentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'agentId is required'
        })
      };
    }

    let query = `
      SELECT 
        id, cognito_user_id, company_id, name, instructions, model,
        tools, metadata, openai_agent_id, status, version,
        created_at, updated_at, last_activity
      FROM agents
      WHERE id = $1
    `;

    const values = [agentId];
    if (cognitoUserId) {
      query += ' AND cognito_user_id = $2';
      values.push(cognitoUserId);
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Agent not found'
        })
      };
    }

    const agent = result.rows[0];

    // Parse JSON fields
    agent.tools = typeof agent.tools === 'string' ? JSON.parse(agent.tools) : agent.tools;
    agent.metadata = typeof agent.metadata === 'string' ? JSON.parse(agent.metadata) : agent.metadata;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        agent: agent
      })
    };
  } catch (error) {
    console.error('Error getting agent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get agent',
        message: error.message
      })
    };
  }
};

