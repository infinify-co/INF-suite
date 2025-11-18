// Lambda function: Get Domain
// Retrieves a single domain by ID with full details

const pool = require('../../config/database-config');

/**
 * Lambda handler for getting a single domain
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    if (!domainId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'domainId is required'
        })
      };
    }

    let query = 'SELECT * FROM domains WHERE id = $1';
    const values = [domainId];

    if (cognitoUserId) {
      query += ' AND cognito_user_id = $2';
      values.push(cognitoUserId);
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Domain not found'
        })
      };
    }

    const domain = result.rows[0];

    // Parse JSON fields
    domain.metadata = typeof domain.metadata === 'string' ? JSON.parse(domain.metadata) : domain.metadata;

    // Get DNS records count
    const dnsCount = await pool.query(
      'SELECT COUNT(*) as count FROM dns_records WHERE domain_id = $1',
      [domainId]
    );

    // Get subdomains count
    const subdomainsCount = await pool.query(
      'SELECT COUNT(*) as count FROM subdomains WHERE domain_id = $1',
      [domainId]
    );

    // Get email forwards count
    const emailForwardsCount = await pool.query(
      'SELECT COUNT(*) as count FROM email_forwards WHERE domain_id = $1',
      [domainId]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        domain: {
          ...domain,
          stats: {
            dns_records: parseInt(dnsCount.rows[0].count),
            subdomains: parseInt(subdomainsCount.rows[0].count),
            email_forwards: parseInt(emailForwardsCount.rows[0].count)
          }
        }
      })
    };
  } catch (error) {
    console.error('Error getting domain:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get domain',
        message: error.message
      })
    };
  }
};

