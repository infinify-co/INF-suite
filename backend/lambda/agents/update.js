// Lambda function: Update Agent
// Updates an existing agent configuration

const pool = require('../../config/database-config');
const { getOpenAIClient } = require('../../config/openai-config');

/**
 * Lambda handler for updating an agent
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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
    const { cognitoUserId, name, instructions, model, tools, metadata, status } = body;

    if (!agentId || !cognitoUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'agentId and cognitoUserId are required'
        })
      };
    }

    // Verify agent belongs to user
    const checkResult = await pool.query(
      'SELECT id, openai_agent_id, version FROM agents WHERE id = $1 AND cognito_user_id = $2',
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

    const existingAgent = checkResult.rows[0];
    const newVersion = existingAgent.version + 1;

    // Update in OpenAI if openai_agent_id exists
    if (existingAgent.openai_agent_id) {
      const client = await getOpenAIClient();
      const updateData = {};

      if (name) updateData.name = name;
      if (instructions) updateData.instructions = instructions;
      if (model) updateData.model = model;
      if (tools) updateData.tools = tools;
      if (metadata) updateData.metadata = metadata;

      if (Object.keys(updateData).length > 0) {
        await client.agents.update(existingAgent.openai_agent_id, updateData);
      }
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (instructions) {
      updates.push(`instructions = $${paramIndex++}`);
      values.push(instructions);
    }
    if (model) {
      updates.push(`model = $${paramIndex++}`);
      values.push(model);
    }
    if (tools) {
      updates.push(`tools = $${paramIndex++}`);
      values.push(JSON.stringify(tools));
    }
    if (metadata) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(metadata));
    }
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No fields to update'
        })
      };
    }

    // Increment version
    updates.push(`version = $${paramIndex++}`);
    values.push(newVersion);

    values.push(agentId);

    const query = `
      UPDATE agents
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    const updatedAgent = result.rows[0];

    // Save new version
    await pool.query(
      `INSERT INTO agent_versions (agent_id, version, name, instructions, model, tools, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        agentId,
        newVersion,
        updatedAgent.name,
        updatedAgent.instructions,
        updatedAgent.model,
        updatedAgent.tools,
        updatedAgent.metadata,
        cognitoUserId
      ]
    );

    // Log update
    await pool.query(
      `INSERT INTO agent_logs (agent_id, action, details, user_id)
       VALUES ($1, $2, $3, $4)`,
      [
        agentId,
        'updated',
        JSON.stringify({ version: newVersion, fields: Object.keys(body).filter(k => k !== 'cognitoUserId') }),
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
        agent: updatedAgent
      })
    };
  } catch (error) {
    console.error('Error updating agent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update agent',
        message: error.message
      })
    };
  }
};

