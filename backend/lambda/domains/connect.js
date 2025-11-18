// Lambda function: Connect Domain
// Initiates domain connection process with DNS verification

const pool = require('../../config/database-config');
const AWS = require('aws-sdk');

const route53 = new AWS.Route53({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Generate verification token
 */
function generateVerificationToken() {
  return `inf-verify-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Lambda handler for connecting a domain
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
    const { cognitoUserId, companyId, domainName } = body;

    // Validation
    if (!cognitoUserId || !domainName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'cognitoUserId and domainName are required'
        })
      };
    }

    // Validate domain name format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domainName)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid domain name format'
        })
      };
    }

    // Normalize domain name (lowercase, remove www)
    const normalizedDomain = domainName.toLowerCase().replace(/^www\./, '');

    // Check if domain already exists for this user
    const existingCheck = await pool.query(
      'SELECT id FROM domains WHERE cognito_user_id = $1 AND domain_name = $2',
      [cognitoUserId, normalizedDomain]
    );

    if (existingCheck.rows.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'Domain already connected',
          domainId: existingCheck.rows[0].id
        })
      };
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationRecord = `inf-verification=${verificationToken}`;

    // Create domain record in database
    const query = `
      INSERT INTO domains (
        cognito_user_id, company_id, domain_name, status,
        verification_method, verification_token, verification_record
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      cognitoUserId,
      companyId || null,
      normalizedDomain,
      'pending',
      'dns',
      verificationToken,
      verificationRecord
    ];

    const result = await pool.query(query, values);
    const domain = result.rows[0];

    // Log connection attempt
    await pool.query(
      `INSERT INTO domain_logs (domain_id, action, details, user_id)
       VALUES ($1, $2, $3, $4)`,
      [
        domain.id,
        'connection_initiated',
        JSON.stringify({ domainName: normalizedDomain, verificationMethod: 'dns' }),
        cognitoUserId
      ]
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        domain: {
          id: domain.id,
          domain_name: domain.domain_name,
          status: domain.status,
          verification_record: domain.verification_record,
          verification_instructions: {
            method: 'dns',
            record_type: 'TXT',
            record_name: '_inf-verification',
            record_value: verificationRecord,
            instructions: `Add a TXT record to your DNS with name "_inf-verification" and value "${verificationRecord}"`
          }
        }
      })
    };
  } catch (error) {
    console.error('Error connecting domain:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to connect domain',
        message: error.message
      })
    };
  }
};

