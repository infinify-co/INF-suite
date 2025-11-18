// Lambda function: SSL Certificate Management
// Request and manage SSL certificates via AWS Certificate Manager

const pool = require('../../config/database-config');
const AWS = require('aws-sdk');

const acm = new AWS.ACM({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Lambda handler for SSL certificate management
 */
exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
      'SELECT id, domain_name, status, ssl_certificate_arn, ssl_status FROM domains WHERE id = $1 AND cognito_user_id = $2',
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

    // Domain must be verified before requesting SSL
    if (domain.status !== 'verified' && domain.status !== 'connected') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Domain must be verified before requesting SSL certificate'
        })
      };
    }

    // GET - Get SSL certificate status
    if (event.httpMethod === 'GET') {
      if (!domain.ssl_certificate_arn) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            ssl: {
              status: 'not_requested',
              message: 'No SSL certificate has been requested for this domain'
            }
          })
        };
      }

      try {
        // Get certificate details from ACM
        const certParams = {
          CertificateArn: domain.ssl_certificate_arn
        };

        const certData = await acm.describeCertificate(certParams).promise();
        const certificate = certData.Certificate;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            ssl: {
              status: certificate.Status.toLowerCase(),
              arn: certificate.CertificateArn,
              domain: certificate.DomainName,
              issued_at: certificate.IssuedAt,
              not_after: certificate.NotAfter,
              validation_method: certificate.DomainValidationOptions?.[0]?.ValidationMethod,
              validation_status: certificate.DomainValidationOptions?.[0]?.ValidationStatus
            }
          })
        };
      } catch (error) {
        console.error('Error fetching certificate:', error);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            ssl: {
              status: domain.ssl_status || 'unknown',
              arn: domain.ssl_certificate_arn,
              error: 'Could not fetch certificate details from ACM'
            }
          })
        };
      }
    }

    // POST - Request SSL certificate
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { includeSubdomains } = body;

      // Check if certificate already exists
      if (domain.ssl_certificate_arn && domain.ssl_status !== 'failed' && domain.ssl_status !== 'expired') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: 'SSL certificate already exists for this domain',
            certificateArn: domain.ssl_certificate_arn
          })
        };
      }

      try {
        // Request certificate from ACM
        const domainName = domain.domain_name;
        const subjectAlternativeNames = includeSubdomains ? [`*.${domainName}`] : [];

        const requestParams = {
          DomainName: domainName,
          ValidationMethod: 'DNS', // Use DNS validation
          SubjectAlternativeNames: subjectAlternativeNames.length > 0 ? subjectAlternativeNames : undefined
        };

        const certRequest = await acm.requestCertificate(requestParams).promise();
        const certificateArn = certRequest.CertificateArn;

        // Update domain record
        await pool.query(
          `UPDATE domains 
           SET ssl_certificate_arn = $1, 
               ssl_status = 'requested',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [certificateArn, domainId]
        );

        // Get validation records
        const certData = await acm.describeCertificate({ CertificateArn: certificateArn }).promise();
        const validationOptions = certData.Certificate.DomainValidationOptions || [];

        // Log SSL request
        await pool.query(
          `INSERT INTO domain_logs (domain_id, action, details, user_id)
           VALUES ($1, $2, $3, $4)`,
          [
            domainId,
            'ssl_certificate_requested',
            JSON.stringify({ certificateArn, includeSubdomains }),
            cognitoUserId
          ]
        );

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            success: true,
            ssl: {
              status: 'requested',
              certificate_arn: certificateArn,
              validation_method: 'DNS',
              validation_records: validationOptions.map(opt => ({
                domain: opt.DomainName,
                resource_record: opt.ResourceRecord
              })),
              instructions: 'Add the DNS validation records to your domain to complete SSL certificate issuance'
            }
          })
        };
      } catch (error) {
        console.error('Error requesting SSL certificate:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Failed to request SSL certificate',
            message: error.message
          })
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  } catch (error) {
    console.error('Error managing SSL certificate:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manage SSL certificate',
        message: error.message
      })
    };
  }
};

