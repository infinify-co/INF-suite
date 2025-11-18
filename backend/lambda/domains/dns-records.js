// Lambda function: DNS Records Management
// CRUD operations for DNS records

const pool = require('../../config/database-config');
const AWS = require('aws-sdk');

const route53 = new AWS.Route53({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Lambda handler for DNS records management
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
      'SELECT id, domain_name, route53_hosted_zone_id FROM domains WHERE id = $1 AND cognito_user_id = $2',
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

    // GET - List DNS records
    if (event.httpMethod === 'GET') {
      const recordType = event.queryStringParameters?.type;

      let query = 'SELECT * FROM dns_records WHERE domain_id = $1';
      const values = [domainId];

      if (recordType) {
        query += ' AND record_type = $2';
        values.push(recordType);
      }

      query += ' ORDER BY record_type, name';

      const result = await pool.query(query, values);

      const records = result.rows.map(row => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          records: records,
          count: records.length
        })
      };
    }

    // POST - Create DNS record
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { recordType, name, value, ttl, priority } = body;

      if (!recordType || !name || !value) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'recordType, name, and value are required'
          })
        };
      }

      // Validate record type
      const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'];
      if (!validTypes.includes(recordType.toUpperCase())) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `Invalid record type. Must be one of: ${validTypes.join(', ')}`
          })
        };
      }

      // Insert DNS record
      const insertQuery = `
        INSERT INTO dns_records (
          domain_id, record_type, name, value, ttl, priority
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const insertValues = [
        domainId,
        recordType.toUpperCase(),
        name,
        value,
        ttl || 300,
        priority || null
      ];

      const result = await pool.query(insertQuery, insertValues);
      const record = result.rows[0];

      // TODO: If Route53 hosted zone exists, create record in Route53
      // This would require the hosted zone ID and Route53 API calls

      // Log creation
      await pool.query(
        `INSERT INTO domain_logs (domain_id, action, details, user_id)
         VALUES ($1, $2, $3, $4)`,
        [
          domainId,
          'dns_record_created',
          JSON.stringify({ recordType, name, value }),
          cognitoUserId
        ]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          record: record
        })
      };
    }

    // PUT - Update DNS record
    if (event.httpMethod === 'PUT') {
      const recordId = event.pathParameters?.recordId;
      const body = JSON.parse(event.body || '{}');
      const { name, value, ttl, priority } = body;

      if (!recordId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'recordId is required'
          })
        };
      }

      const updateQuery = `
        UPDATE dns_records
        SET name = COALESCE($1, name),
            value = COALESCE($2, value),
            ttl = COALESCE($3, ttl),
            priority = COALESCE($4, priority),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND domain_id = $6
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        name || null,
        value || null,
        ttl || null,
        priority !== undefined ? priority : null,
        recordId,
        domainId
      ]);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'DNS record not found'
          })
        };
      }

      // Log update
      await pool.query(
        `INSERT INTO domain_logs (domain_id, action, details, user_id)
         VALUES ($1, $2, $3, $4)`,
        [
          domainId,
          'dns_record_updated',
          JSON.stringify({ recordId, updates: body }),
          cognitoUserId
        ]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          record: result.rows[0]
        })
      };
    }

    // DELETE - Delete DNS record
    if (event.httpMethod === 'DELETE') {
      const recordId = event.pathParameters?.recordId;

      if (!recordId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'recordId is required'
          })
        };
      }

      // Get record before deletion for logging
      const recordResult = await pool.query(
        'SELECT * FROM dns_records WHERE id = $1 AND domain_id = $2',
        [recordId, domainId]
      );

      if (recordResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'DNS record not found'
          })
        };
      }

      await pool.query('DELETE FROM dns_records WHERE id = $1 AND domain_id = $2', [recordId, domainId]);

      // Log deletion
      await pool.query(
        `INSERT INTO domain_logs (domain_id, action, details, user_id)
         VALUES ($1, $2, $3, $4)`,
        [
          domainId,
          'dns_record_deleted',
          JSON.stringify({ recordId, record: recordResult.rows[0] }),
          cognitoUserId
        ]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'DNS record deleted successfully'
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
    console.error('Error managing DNS records:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manage DNS records',
        message: error.message
      })
    };
  }
};

