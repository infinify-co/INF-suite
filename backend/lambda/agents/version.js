// Lambda function: Agent Version Management
// Get version history and rollback to previous versions

const pool = require('../../config/database-config');
const { getOpenAIClient } = require('../../config/openai-config');

/**
 * Lambda handler for version management
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const { cognitoUserId, action, version } = body;

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
    const agentResult = await pool.query(
      'SELECT id, openai_agent_id, version FROM agents WHERE id = $1 AND cognito_user_id = $2',
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

    // GET: List versions
    if (event.httpMethod === 'GET') {
      const versionsResult = await pool.query(
        `SELECT id, version, name, instructions, model, tools, metadata, created_at, created_by
         FROM agent_versions
         WHERE agent_id = $1
         ORDER BY version DESC`,
        [agentId]
      );

      const versions = versionsResult.rows.map(row => ({
        ...row,
        tools: typeof row.tools === 'string' ? JSON.parse(row.tools) : row.tools,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          versions: versions,
          current_version: agent.version
        })
      };
    }

    // POST: Rollback to version
    if (event.httpMethod === 'POST' && action === 'rollback') {
      if (!version) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'version is required for rollback'
          })
        };
      }

      // Get version data
      const versionResult = await pool.query(
        `SELECT name, instructions, model, tools, metadata
         FROM agent_versions
         WHERE agent_id = $1 AND version = $2`,
        [agentId, version]
      );

      if (versionResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Version not found'
          })
        };
      }

      const versionData = versionResult.rows[0];
      const newVersion = agent.version + 1;

      // Update agent with version data
      const updateResult = await pool.query(
        `UPDATE agents
         SET name = $1, instructions = $2, model = $3, tools = $4, metadata = $5,
             version = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [
          versionData.name,
          versionData.instructions,
          versionData.model,
          versionData.tools,
          versionData.metadata,
          newVersion,
          agentId
        ]
      );

      const updatedAgent = updateResult.rows[0];

      // Update in OpenAI if exists
      if (agent.openai_agent_id) {
        const client = await getOpenAIClient();
        await client.agents.update(agent.openai_agent_id, {
          name: versionData.name,
          instructions: versionData.instructions,
          model: versionData.model,
          tools: typeof versionData.tools === 'string' ? JSON.parse(versionData.tools) : versionData.tools,
          metadata: typeof versionData.metadata === 'string' ? JSON.parse(versionData.metadata) : versionData.metadata
        });
      }

      // Save as new version
      await pool.query(
        `INSERT INTO agent_versions (agent_id, version, name, instructions, model, tools, metadata, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          agentId,
          newVersion,
          versionData.name,
          versionData.instructions,
          versionData.model,
          versionData.tools,
          versionData.metadata,
          cognitoUserId
        ]
      );

      // Log rollback
      await pool.query(
        `INSERT INTO agent_logs (agent_id, action, details, user_id)
         VALUES ($1, $2, $3, $4)`,
        [
          agentId,
          'rollback',
          JSON.stringify({ from_version: agent.version, to_version: version, new_version: newVersion }),
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
          message: `Rolled back to version ${version} and saved as version ${newVersion}`
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid action or method'
      })
    };
  } catch (error) {
    console.error('Error managing agent versions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manage agent versions',
        message: error.message
      })
    };
  }
};

