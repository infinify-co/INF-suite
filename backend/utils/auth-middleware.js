// Authentication Middleware for Lambda Functions
// Verifies AWS Cognito JWT tokens and extracts user information

const { CognitoJwtVerifier } = require('aws-jwt-verify');

// Initialize JWT verifier (will be created on first use)
let verifier = null;

function getVerifier() {
  if (!verifier) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;
    
    if (!userPoolId || !clientId) {
      throw new Error('COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set in environment variables');
    }
    
    verifier = CognitoJwtVerifier.create({
      userPoolId: userPoolId,
      tokenUse: 'id',
      clientId: clientId
    });
  }
  
  return verifier;
}

/**
 * Authenticate request by verifying Cognito JWT token
 * @param {Object} event - Lambda event object
 * @returns {Promise<Object>} Authentication result with userId and user info
 */
async function authenticateRequest(event) {
  try {
    // Extract token from Authorization header
    const authHeader = event.headers?.Authorization || 
                       event.headers?.authorization ||
                       event.headers?.['x-authorization'];
    
    if (!authHeader) {
      return {
        authenticated: false,
        error: 'Missing Authorization header'
      };
    }
    
    // Support both "Bearer <token>" and just "<token>" formats
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      token = authHeader;
    }
    
    if (!token || token.trim() === '') {
      return {
        authenticated: false,
        error: 'Invalid Authorization header format'
      };
    }
    
    // Verify token with Cognito
    const verifier = getVerifier();
    const payload = await verifier.verify(token);
    
    // Extract user ID from token (Cognito uses 'sub' claim)
    const userId = payload.sub;
    
    if (!userId) {
      return {
        authenticated: false,
        error: 'Token does not contain user ID'
      };
    }
    
    return {
      authenticated: true,
      userId: userId,
      email: payload.email || null,
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
      tokenPayload: payload
    };
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle specific error types
    if (error.name === 'TokenExpiredError' || error.message?.includes('expired')) {
      return {
        authenticated: false,
        error: 'Token has expired',
        expired: true
      };
    }
    
    if (error.name === 'NotAuthorizedException' || error.message?.includes('invalid')) {
      return {
        authenticated: false,
        error: 'Invalid token'
      };
    }
    
    return {
      authenticated: false,
      error: error.message || 'Authentication failed'
    };
  }
}

/**
 * Create standardized CORS headers
 * @param {Object} options - CORS options
 * @returns {Object} Headers object
 */
function createCorsHeaders(options = {}) {
  const origin = options.origin || '*';
  const methods = options.methods || 'GET,POST,PUT,DELETE,OPTIONS';
  const headers = options.headers || 'Content-Type,Authorization';
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
}

/**
 * Create error response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} additionalData - Additional error data
 * @returns {Object} Lambda response object
 */
function createErrorResponse(statusCode, message, additionalData = {}) {
  return {
    statusCode,
    headers: createCorsHeaders(),
    body: JSON.stringify({
      error: message,
      ...additionalData
    })
  };
}

/**
 * Create success response
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default 200)
 * @returns {Object} Lambda response object
 */
function createSuccessResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: createCorsHeaders(),
    body: JSON.stringify({
      success: true,
      ...data
    })
  };
}

/**
 * Handle CORS preflight request
 * @param {Object} event - Lambda event object
 * @returns {Object} Lambda response object
 */
function handleCorsPreflight(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: createCorsHeaders(),
      body: ''
    };
  }
  return null;
}

module.exports = {
  authenticateRequest,
  createCorsHeaders,
  createErrorResponse,
  createSuccessResponse,
  handleCorsPreflight
};
