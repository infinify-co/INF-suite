// Lambda function to get user dashboard data
// Cost-efficient: Single query with JSON aggregation

const { Pool } = require('pg');
const awsConfig = require('../../config/aws-config');

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
      max: 5,
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
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const userId = event.queryStringParameters?.userId || event.pathParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'userId is required'
        })
      };
    }

    const sectionType = event.queryStringParameters?.sectionType || null;

    const dbPool = getPool();
    
    const result = await dbPool.query(
      `SELECT get_user_dashboard($1, $2) as dashboard`,
      [userId, sectionType]
    );

    const dashboard = result.rows[0].dashboard;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: dashboard
      })
    };

  } catch (error) {
    console.error('Get dashboard error:', error);
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

