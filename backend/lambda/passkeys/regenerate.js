// Lambda function: Regenerate API Key (Passkey)
// Regenerates an API key while maintaining project association

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
  const parts = apiKey.split('_');
  if (parts.length >= 3) {
    return parts.slice(0, 2).join('_') + '_' + parts[2].substring(0, 8);
  }
  return apiKey.substring(0, 11);
}

/**
 * Lambda handler for regenerating an API key
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
    const passkeyId = event.pathParameters?.passkeyId;
    const body = JSON.parse(event.body || '{}');
    const cognitoUserId = body.cognitoUserId || event.queryStringParameters?.cognitoUserId;

    if (!passkeyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'passkeyId is required'
        })
      };
    }

    if (!cognitoUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'cognitoUserId is required'
        })
      };
    }

    // Get existing passkey to preserve project association and settings
    const getQuery = `
      SELECT project_id, name, scopes, expires_at, metadata
      FROM passkeys
      WHERE id = $1 AND cognito_user_id = $2
    `;

    const getResult = await pool.query(getQuery, [passkeyId, cognitoUserId]);

    if (getResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'API key not found or access denied'
        })
      };
    }

    const existingPasskey = getResult.rows[0];

    // Revoke old key
    await pool.query(
      `UPDATE passkeys SET status = 'revoked', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [passkeyId]
    );

    // Generate new API key
    const apiKey = generateApiKey();
    const keyPrefix = getKeyPrefix(apiKey);
    const saltRounds = 12;
    const apiKeyHash = await bcrypt.hash(apiKey, saltRounds);

    // Create new passkey with same project association
    const createQuery = `
      INSERT INTO passkeys (
        cognito_user_id, project_id, name, api_key_hash, api_key_prefix,
        scopes, status, expires_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, api_key_prefix, scopes, status, created_at, expires_at
    `;

    const values = [
      cognitoUserId,
      existingPasskey.project_id,
      existingPasskey.name,
      apiKeyHash,
      keyPrefix,
      existingPasskey.scopes,
      'active',
      existingPasskey.expires_at,
      existingPasskey.metadata
    ];

    const createResult = await pool.query(createQuery, values);
    const newPasskey = createResult.rows[0];

    // Parse JSON fields
    newPasskey.scopes = typeof newPasskey.scopes === 'string' ? JSON.parse(newPasskey.scopes) : newPasskey.scopes;

    // Return the full new API key ONLY ONCE
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        passkey: {
          id: newPasskey.id,
          name: newPasskey.name,
          api_key: apiKey, // Full key returned only once
          api_key_prefix: newPasskey.api_key_prefix,
          scopes: newPasskey.scopes,
          status: newPasskey.status,
          expires_at: newPasskey.expires_at,
          created_at: newPasskey.created_at
        },
        warning: 'Save this API key now. You will not be able to see it again. The old key has been revoked.'
      })
    };
  } catch (error) {
    console.error('Error regenerating passkey:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to regenerate API key',
        message: error.message
      })
    };
  }
};

