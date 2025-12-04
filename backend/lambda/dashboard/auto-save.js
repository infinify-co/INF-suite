// Lambda function for auto-saving dashboard sections
// Cost-efficient: Uses connection pooling and batch operations

const { Pool } = require('pg');
const awsConfig = require('../../config/aws-config');

// Connection pool (reused across invocations)
let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: awsConfig.database.host,
      port: awsConfig.database.port,
      database: awsConfig.database.database,
      user: awsConfig.database.user,
      password: awsConfig.database.password,
      ssl: awsConfig.database.ssl,
      max: 5, // Smaller pool for Lambda
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pool;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, sectionType, sectionKey, content, expectedVersion } = body;

    // Validate input
    if (!userId || !sectionType || !sectionKey || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: userId, sectionType, sectionKey, content'
        })
      };
    }

    const dbPool = getPool();
    
    // Use the save function with version checking
    const result = await dbPool.query(
      `SELECT save_dashboard_section($1, $2, $3, $4, $5) as result`,
      [userId, sectionType, sectionKey, JSON.stringify(content), expectedVersion || null]
    );

    const saveResult = result.rows[0].result;

    if (!saveResult.success) {
      return {
        statusCode: 409, // Conflict for version mismatch
        headers,
        body: JSON.stringify(saveResult)
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(saveResult)
    };

  } catch (error) {
    console.error('Auto-save error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

