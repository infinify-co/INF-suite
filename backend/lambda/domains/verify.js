// Lambda function: Verify Domain
// Verifies domain ownership by checking DNS records

const pool = require('../../config/database-config');
const dns = require('dns').promises;

/**
 * Check DNS TXT record
 */
async function checkDNSTXTRecord(domainName, expectedValue) {
  try {
    const records = await dns.resolveTxt(`_inf-verification.${domainName}`);
    const flattenedRecords = records.flat();
    return flattenedRecords.some(record => record.includes(expectedValue));
  } catch (error) {
    console.error('DNS lookup error:', error);
    return false;
  }
}

/**
 * Lambda handler for verifying domain ownership
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const body = JSON.parse(event.body || '{}');
    const { domainId, cognitoUserId } = body;

    if (!domainId || !cognitoUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'domainId and cognitoUserId are required'
        })
      };
    }

    // Get domain record
    const domainResult = await pool.query(
      'SELECT * FROM domains WHERE id = $1 AND cognito_user_id = $2',
      [domainId, cognitoUserId]
    );

    if (domainResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Domain not found'
        })
      };
    }

    const domain = domainResult.rows[0];

    if (domain.status === 'verified' || domain.status === 'connected') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verified: true,
          domain: {
            id: domain.id,
            status: domain.status
          }
        })
      };
    }

    // Verify DNS record
    const isVerified = await checkDNSTXTRecord(domain.domain_name, domain.verification_record);

    if (isVerified) {
      // Update domain status
      await pool.query(
        `UPDATE domains 
         SET status = 'verified', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [domainId]
      );

      // Log verification
      await pool.query(
        `INSERT INTO domain_logs (domain_id, action, details, user_id)
         VALUES ($1, $2, $3, $4)`,
        [
          domainId,
          'verified',
          JSON.stringify({ method: 'dns', verificationRecord: domain.verification_record }),
          cognitoUserId
        ]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verified: true,
          domain: {
            id: domain.id,
            status: 'verified',
            verified_at: new Date().toISOString()
          }
        })
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verified: false,
          message: 'DNS verification record not found. Please ensure the TXT record is added correctly.'
        })
      };
    }
  } catch (error) {
    console.error('Error verifying domain:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to verify domain',
        message: error.message
      })
    };
  }
};

