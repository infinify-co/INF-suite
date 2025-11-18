// Lambda function: Create API Key (Passkey)
// Creates a new API key with secure generation and hashing

const pool = require('../../config/database-config');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Generate secure API key
 * Format: pk_live_<32 random hex characters>
 */
function generateApiKey() {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `pk_live_${randomBytes}`;
}

/**
 * Get prefix from API key (first 8 characters after prefix)
 */
function getKeyPrefix(apiKey) {
  // Extract the part after "pk_live_" and take first 8 chars
  const parts = apiKey.split('_');
  if (parts.length >= 3) {
    return parts.slice(0, 2).join('_') + '_' + parts[2].substring(0, 8);
  }
  return apiKey.substring(0, 11); // Fallback
}

/**
 * Lambda handler for creating a new API key
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
    const { cognitoUserId, projectId, name, scopes, expiresAt, metadata } = body;

    // Validation
    if (!cognitoUserId || !name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'cognitoUserId and name are required'
        })
      };
    }

    // Generate API key
    const apiKey = generateApiKey();
    const keyPrefix = getKeyPrefix(apiKey);

    // Hash the API key using bcrypt
    const saltRounds = 12;
    const apiKeyHash = await bcrypt.hash(apiKey, saltRounds);

    // Prepare scopes (default to empty array if not provided)
    const scopesArray = scopes || [];
    const metadataObj = metadata || {};

    // Insert into database
    const query = `
      INSERT INTO passkeys (
        cognito_user_id, project_id, name, api_key_hash, api_key_prefix,
        scopes, status, expires_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, cognito_user_id, project_id, name, api_key_prefix,
                scopes, status, created_at, expires_at, metadata
    `;

    const values = [
      cognitoUserId,
      projectId || null,
      name,
      apiKeyHash,
      keyPrefix,
      JSON.stringify(scopesArray),
      'active',
      expiresAt || null,
      JSON.stringify(metadataObj)
    ];

    const result = await pool.query(query, values);
    const passkey = result.rows[0];

    // Parse JSON fields
    passkey.scopes = typeof passkey.scopes === 'string' ? JSON.parse(passkey.scopes) : passkey.scopes;
    passkey.metadata = typeof passkey.metadata === 'string' ? JSON.parse(passkey.metadata) : passkey.metadata;

    // Return the full API key ONLY ONCE (this is the only time it will be returned)
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        passkey: {
          id: passkey.id,
          name: passkey.name,
          project_id: passkey.project_id,
          api_key: apiKey, // Full key returned only once
          api_key_prefix: passkey.api_key_prefix,
          scopes: passkey.scopes,
          status: passkey.status,
          expires_at: passkey.expires_at,
          created_at: passkey.created_at,
          metadata: passkey.metadata
        },
        warning: 'Save this API key now. You will not be able to see it again.'
      })
    };
  } catch (error) {
    console.error('Error creating passkey:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create API key',
        message: error.message
      })
    };
  }
};

