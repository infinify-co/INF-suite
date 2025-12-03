// Lambda function: List Users
// Lists all users from Aurora database with pagination

const pool = require('../../config/database-config');

/**
 * Lambda handler for listing users
 * Supports pagination and filtering
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page) || 1;
    const limit = Math.min(parseInt(queryParams.limit) || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;
    const search = queryParams.search || '';

    let query = `
      SELECT 
        id, 
        cognito_user_id,
        email, 
        phone, 
        email_verified,
        business_name,
        business_username,
        business_operations,
        job_title,
        created_at, 
        updated_at, 
        last_login
      FROM users
    `;
    const params = [];
    let paramCount = 0;

    // Add search filter if provided
    if (search) {
      query += ` WHERE email ILIKE $${++paramCount} OR business_name ILIKE $${paramCount} OR business_username ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    if (search) {
      countQuery += ` WHERE email ILIKE $1 OR business_name ILIKE $1 OR business_username ILIKE $1`;
    }

    const [usersResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, search ? [`%${search}%`] : [])
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        users: usersResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      })
    };

  } catch (error) {
    console.error('List users error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

