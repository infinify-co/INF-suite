// Lambda function: Update User
// Updates user information in Aurora database

const pool = require('../../config/database-config');
const { isValidEmail, isValidPhone } = require('../../utils/validation');

/**
 * Lambda handler for updating user information
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
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
    const userId = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'User ID is required'
        })
      };
    }

    // Validate email if provided
    if (body.email && !isValidEmail(body.email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid email format'
        })
      };
    }

    // Validate phone if provided
    if (body.phone && !isValidPhone(body.phone)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid phone number format'
        })
      };
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 0;

    const allowedFields = [
      'email', 'phone', 'email_verified', 
      'business_name', 'business_username', 
      'business_operations', 'job_title'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${++paramCount}`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No valid fields to update'
        })
      };
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${++paramCount} OR cognito_user_id = $${paramCount}
      RETURNING id, email, phone, email_verified, business_name, business_username, business_operations, job_title, created_at, updated_at, last_login
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'User not found'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: result.rows[0],
        message: 'User updated successfully'
      })
    };

  } catch (error) {
    console.error('Update user error:', error);
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

