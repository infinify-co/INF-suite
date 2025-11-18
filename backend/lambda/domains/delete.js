// Lambda function: Delete Domain
// Removes a domain connection

const pool = require('../../config/database-config');

/**
 * Lambda handler for deleting a domain
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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

    // Delete all related records (cascade will handle this, but we log first)
    await pool.query(
      `INSERT INTO domain_logs (domain_id, action, details, user_id)
       VALUES ($1, $2, $3, $4)`,
      [
        domainId,
        'domain_deleted',
        JSON.stringify({ domainName: domain.domain_name }),
        cognitoUserId
      ]
    );

    // Delete domain (cascade will delete DNS records, subdomains, email forwards, and logs)
    await pool.query('DELETE FROM domains WHERE id = $1', [domainId]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Domain deleted successfully'
      })
    };
  } catch (error) {
    console.error('Error deleting domain:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete domain',
        message: error.message
      })
    };
  }
};

