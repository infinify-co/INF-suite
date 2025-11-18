// Lambda function: Email Forwarding Management
// Configure email forwarding rules

const pool = require('../../config/database-config');

/**
 * Lambda handler for email forwarding management
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const domainId = event.pathParameters?.domainId;
    const cognitoUserId = event.queryStringParameters?.cognitoUserId;

    if (!domainId || !cognitoUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'domainId and cognitoUserId are required'
        })
      };
    }

    // Verify domain ownership
    const domainCheck = await pool.query(
      'SELECT id, domain_name FROM domains WHERE id = $1 AND cognito_user_id = $2',
      [domainId, cognitoUserId]
    );

    if (domainCheck.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Domain not found or access denied'
        })
      };
    }

    const domain = domainCheck.rows[0];

    // GET - List email forwards
    if (event.httpMethod === 'GET') {
      const result = await pool.query(
        'SELECT * FROM email_forwards WHERE domain_id = $1 ORDER BY from_address',
        [domainId]
      );

      const forwards = result.rows.map(row => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          forwards: forwards,
          count: forwards.length
        })
      };
    }

    // POST - Create email forward
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { fromAddress, toAddress, isWildcard } = body;

      if (!fromAddress || !toAddress) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'fromAddress and toAddress are required'
          })
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(toAddress)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid destination email format'
          })
        };
      }

      // Validate from address (can be email or wildcard pattern)
      const isWildcardPattern = fromAddress.startsWith('*@');
      if (!isWildcardPattern && !emailRegex.test(fromAddress)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid from address format. Use email or *@domain.com for wildcard'
          })
        };
      }

      // Check if forward already exists
      const existingCheck = await pool.query(
        'SELECT id FROM email_forwards WHERE domain_id = $1 AND from_address = $2',
        [domainId, fromAddress.toLowerCase()]
      );

      if (existingCheck.rows.length > 0) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: 'Email forward already exists'
          })
        };
      }

      // Insert email forward
      const insertQuery = `
        INSERT INTO email_forwards (
          domain_id, from_address, to_address, is_wildcard
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        domainId,
        fromAddress.toLowerCase(),
        toAddress.toLowerCase(),
        isWildcardPattern || isWildcard || false
      ]);

      const forward = result.rows[0];

      // Log creation
      await pool.query(
        `INSERT INTO domain_logs (domain_id, action, details, user_id)
         VALUES ($1, $2, $3, $4)`,
        [
          domainId,
          'email_forward_created',
          JSON.stringify({ fromAddress, toAddress, isWildcard: forward.is_wildcard }),
          cognitoUserId
        ]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          forward: forward
        })
      };
    }

    // PUT - Update email forward (toggle active status)
    if (event.httpMethod === 'PUT') {
      const forwardId = event.pathParameters?.forwardId;
      const body = JSON.parse(event.body || '{}');
      const { isActive, toAddress } = body;

      if (!forwardId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'forwardId is required'
          })
        };
      }

      let updateQuery = 'UPDATE email_forwards SET updated_at = CURRENT_TIMESTAMP';
      const values = [];
      let paramIndex = 1;

      if (isActive !== undefined) {
        updateQuery += `, is_active = $${paramIndex}`;
        values.push(isActive);
        paramIndex++;
      }

      if (toAddress) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(toAddress)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Invalid destination email format'
            })
          };
        }
        updateQuery += `, to_address = $${paramIndex}`;
        values.push(toAddress.toLowerCase());
        paramIndex++;
      }

      updateQuery += ` WHERE id = $${paramIndex} AND domain_id = $${paramIndex + 1} RETURNING *`;
      values.push(forwardId, domainId);

      const result = await pool.query(updateQuery, values);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Email forward not found'
          })
        };
      }

      // Log update
      await pool.query(
        `INSERT INTO domain_logs (domain_id, action, details, user_id)
         VALUES ($1, $2, $3, $4)`,
        [
          domainId,
          'email_forward_updated',
          JSON.stringify({ forwardId, updates: body }),
          cognitoUserId
        ]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          forward: result.rows[0]
        })
      };
    }

    // DELETE - Delete email forward
    if (event.httpMethod === 'DELETE') {
      const forwardId = event.pathParameters?.forwardId;

      if (!forwardId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'forwardId is required'
          })
        };
      }

      // Get forward before deletion
      const forwardResult = await pool.query(
        'SELECT * FROM email_forwards WHERE id = $1 AND domain_id = $2',
        [forwardId, domainId]
      );

      if (forwardResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Email forward not found'
          })
        };
      }

      await pool.query('DELETE FROM email_forwards WHERE id = $1 AND domain_id = $2', [forwardId, domainId]);

      // Log deletion
      await pool.query(
        `INSERT INTO domain_logs (domain_id, action, details, user_id)
         VALUES ($1, $2, $3, $4)`,
        [
          domainId,
          'email_forward_deleted',
          JSON.stringify({ forwardId, fromAddress: forwardResult.rows[0].from_address }),
          cognitoUserId
        ]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Email forward deleted successfully'
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  } catch (error) {
    console.error('Error managing email forwarding:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manage email forwarding',
        message: error.message
      })
    };
  }
};

