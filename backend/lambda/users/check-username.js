// Lambda function to check username availability
// Cost-efficient: Simple query with index

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
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const username = body.username || event.queryStringParameters?.username;

    if (!username) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Username is required'
        })
      };
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          available: false,
          error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'
        })
      };
    }

    const dbPool = getPool();
    
    // Check availability using the function
    const result = await dbPool.query(
      `SELECT check_username_available($1) as available`,
      [username]
    );

    const available = result.rows[0].available;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        available,
        username
      })
    };

  } catch (error) {
    console.error('Check username error:', error);
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

