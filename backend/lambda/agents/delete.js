// Lambda function: Delete Agent
// Deletes an agent from OpenAI and Aurora database

const pool = require('../../config/database-config');
const { getOpenAIClient } = require('../../config/openai-config');

/**
 * Lambda handler for deleting an agent
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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
    const cognitoUserId = event.queryStringParameters?.cognitoUserId ||
                         JSON.parse(event.body || '{}').cognitoUserId;

    if (!agentId || !cognitoUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'agentId and cognitoUserId are required'
        })
      };
    }

    // Get agent details
    const agentResult = await pool.query(
      'SELECT id, openai_agent_id FROM agents WHERE id = $1 AND cognito_user_id = $2',
      [agentId, cognitoUserId]
    );

    if (agentResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Agent not found'
        })
      };
    }

    const agent = agentResult.rows[0];

    // Delete from OpenAI if exists
    if (agent.openai_agent_id) {
      try {
        const client = await getOpenAIClient();
        await client.agents.delete(agent.openai_agent_id);
      } catch (openaiError) {
        console.warn('Error deleting agent from OpenAI (may already be deleted):', openaiError);
        // Continue with database deletion even if OpenAI deletion fails
      }
    }

    // Log deletion before deleting
    await pool.query(
      `INSERT INTO agent_logs (agent_id, action, details, user_id)
       VALUES ($1, $2, $3, $4)`,
      [
        agentId,
        'deleted',
        JSON.stringify({}),
        cognitoUserId
      ]
    );

    // Delete from database (cascades to versions and logs)
    await pool.query('DELETE FROM agents WHERE id = $1', [agentId]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Agent deleted successfully'
      })
    };
  } catch (error) {
    console.error('Error deleting agent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete agent',
        message: error.message
      })
    };
  }
};

