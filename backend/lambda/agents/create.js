// Lambda function: Create AI Agent
// Creates a new AI agent using OpenAI API and stores it in Aurora database

const pool = require('../../config/database-config');
const { getOpenAIClient } = require('../../config/openai-config');

/**
 * Lambda handler for creating a new AI agent
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
    const body = JSON.parse(event.body || '{}');
    const { cognitoUserId, companyId, name, instructions, model, tools, metadata } = body;

    // Validation
    if (!cognitoUserId || !name || !instructions) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'cognitoUserId, name, and instructions are required'
        })
      };
    }

    // Initialize OpenAI client
    const client = await getOpenAIClient();

    // Create agent in OpenAI
    const agentConfig = {
      name: name,
      instructions: instructions,
      model: model || 'gpt-5.1',
      tools: tools || [],
      metadata: metadata || {}
    };

    if (companyId) {
      agentConfig.metadata.companyId = companyId;
    }

    const openaiAgent = await client.agents.create(agentConfig);

    // Save agent to Aurora database
    const query = `
      INSERT INTO agents (
        cognito_user_id, company_id, name, instructions, model, 
        tools, metadata, openai_agent_id, status, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      cognitoUserId,
      companyId || null,
      name,
      instructions,
      agentConfig.model,
      JSON.stringify(agentConfig.tools),
      JSON.stringify(agentConfig.metadata),
      openaiAgent.id,
      'draft',
      1
    ];

    const result = await pool.query(query, values);
    const agent = result.rows[0];

    // Create initial version
    await pool.query(
      `INSERT INTO agent_versions (agent_id, version, name, instructions, model, tools, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        agent.id,
        1,
        name,
        instructions,
        agentConfig.model,
        JSON.stringify(agentConfig.tools),
        JSON.stringify(agentConfig.metadata),
        cognitoUserId
      ]
    );

    // Log creation
    await pool.query(
      `INSERT INTO agent_logs (agent_id, action, details, user_id)
       VALUES ($1, $2, $3, $4)`,
      [
        agent.id,
        'created',
        JSON.stringify({ name, model: agentConfig.model }),
        cognitoUserId
      ]
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        agent: {
          id: agent.id,
          name: agent.name,
          model: agent.model,
          status: agent.status,
          openai_agent_id: agent.openai_agent_id,
          created_at: agent.created_at
        }
      })
    };
  } catch (error) {
    console.error('Error creating agent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create agent',
        message: error.message
      })
    };
  }
};

