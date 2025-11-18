// Lambda function: Subdomain Management
// Create and manage subdomains

const pool = require('../../config/database-config');

/**
 * Lambda handler for subdomain management
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

    // GET - List subdomains
    if (event.httpMethod === 'GET') {
      const result = await pool.query(
        'SELECT * FROM subdomains WHERE domain_id = $1 ORDER BY subdomain_name',
        [domainId]
      );

      const subdomains = result.rows.map(row => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          subdomains: subdomains,
          count: subdomains.length
        })
      };
    }

    // POST - Create subdomain
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { subdomainName, targetType, targetValue } = body;

      if (!subdomainName || !targetType || !targetValue) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'subdomainName, targetType, and targetValue are required'
          })
        };
      }

      // Validate subdomain name
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
      if (!subdomainRegex.test(subdomainName)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid subdomain name format'
          })
        };
      }

      // Check if subdomain already exists
      const existingCheck = await pool.query(
        'SELECT id FROM subdomains WHERE domain_id = $1 AND subdomain_name = $2',
        [domainId, subdomainName.toLowerCase()]
      );

      if (existingCheck.rows.length > 0) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: 'Subdomain already exists'
          })
        };
      }

      // Insert subdomain
      const insertQuery = `
        INSERT INTO subdomains (
          domain_id, subdomain_name, target_type, target_value
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        domainId,
        subdomainName.toLowerCase(),
        targetType,
        targetValue
      ]);

      const subdomain = result.rows[0];

      // Create CNAME DNS record for subdomain
      const fullSubdomain = `${subdomainName}.${domain.domain_name}`;
      await pool.query(
        `INSERT INTO dns_records (domain_id, record_type, name, value, ttl)
         VALUES ($1, 'CNAME', $2, $3, 300)`,
        [domainId, subdomainName, targetValue]
      );

      // Log creation
      await pool.query(
        `INSERT INTO domain_logs (domain_id, action, details, user_id)
         VALUES ($1, $2, $3, $4)`,
        [
          domainId,
          'subdomain_created',
          JSON.stringify({ subdomainName, targetType, targetValue }),
          cognitoUserId
        ]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          subdomain: {
            ...subdomain,
            full_domain: fullSubdomain
          }
        })
      };
    }

    // DELETE - Delete subdomain
    if (event.httpMethod === 'DELETE') {
      const subdomainId = event.pathParameters?.subdomainId;

      if (!subdomainId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'subdomainId is required'
          })
        };
      }

      // Get subdomain before deletion
      const subdomainResult = await pool.query(
        'SELECT * FROM subdomains WHERE id = $1 AND domain_id = $2',
        [subdomainId, domainId]
      );

      if (subdomainResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Subdomain not found'
          })
        };
      }

      const subdomain = subdomainResult.rows[0];

      // Delete associated DNS record
      await pool.query(
        'DELETE FROM dns_records WHERE domain_id = $1 AND name = $2 AND record_type = $3',
        [domainId, subdomain.subdomain_name, 'CNAME']
      );

      // Delete subdomain
      await pool.query('DELETE FROM subdomains WHERE id = $1 AND domain_id = $2', [subdomainId, domainId]);

      // Log deletion
      await pool.query(
        `INSERT INTO domain_logs (domain_id, action, details, user_id)
         VALUES ($1, $2, $3, $4)`,
        [
          domainId,
          'subdomain_deleted',
          JSON.stringify({ subdomainId, subdomainName: subdomain.subdomain_name }),
          cognitoUserId
        ]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Subdomain deleted successfully'
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
    console.error('Error managing subdomains:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manage subdomains',
        message: error.message
      })
    };
  }
};

