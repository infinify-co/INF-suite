// Lambda function: Deploy/Undeploy Agent
// Changes agent status between deployed and paused

const pool = require('../../config/database-config');

/**
 * Lambda handler for deploying/undeploying an agent
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const body = JSON.parse(event.body || '{}');
    const { cognitoUserId, action } = body; // action: 'deploy' or 'undeploy'

    if (!agentId || !cognitoUserId || !action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'agentId, cognitoUserId, and action (deploy/undeploy) are required'
        })
      };
    }

    if (!['deploy', 'undeploy'].includes(action)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'action must be "deploy" or "undeploy"'
        })
      };
    }

    // Verify agent belongs to user
    const checkResult = await pool.query(
      'SELECT id, status, openai_agent_id FROM agents WHERE id = $1 AND cognito_user_id = $2',
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

    const agent = checkResult.rows[0];
    const newStatus = action === 'deploy' ? 'deployed' : 'paused';

    // Update status
    const result = await pool.query(
      `UPDATE agents 
       SET status = $1, updated_at = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [newStatus, agentId]
    );

    const updatedAgent = result.rows[0];

    // Log deployment action
    await pool.query(
      `INSERT INTO agent_logs (agent_id, action, details, user_id)
       VALUES ($1, $2, $3, $4)`,
      [
        agentId,
        action,
        JSON.stringify({ previous_status: agent.status, new_status: newStatus }),
        cognitoUserId
      ]
    );

    // Parse JSON fields
    updatedAgent.tools = typeof updatedAgent.tools === 'string' ? JSON.parse(updatedAgent.tools) : updatedAgent.tools;
    updatedAgent.metadata = typeof updatedAgent.metadata === 'string' ? JSON.parse(updatedAgent.metadata) : updatedAgent.metadata;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        agent: updatedAgent,
        message: `Agent ${action === 'deploy' ? 'deployed' : 'undeployed'} successfully`
      })
    };
  } catch (error) {
    console.error('Error deploying agent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to deploy agent',
        message: error.message
      })
    };
  }
};

