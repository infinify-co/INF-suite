// JWT Token Utilities
const jwt = require('jsonwebtoken');
const awsConfig = require('../config/aws-config');

/**
 * Generate access token
 * @param {Object} payload - Token payload (user id, email, etc.)
 * @returns {string} JWT access token
 */
function generateAccessToken(payload) {
  return jwt.sign(
    {
      ...payload,
      type: 'access'
    },
    awsConfig.jwt.secret,
    {
      expiresIn: awsConfig.jwt.accessTokenExpiry,
      algorithm: awsConfig.jwt.algorithm
    }
  );
}

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    {
      ...payload,
      type: 'refresh'
    },
    awsConfig.jwt.secret,
    {
      expiresIn: awsConfig.jwt.refreshTokenExpiry,
      algorithm: awsConfig.jwt.algorithm
    }
  );
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, awsConfig.jwt.secret, {
      algorithms: [awsConfig.jwt.algorithm]
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  return null;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractTokenFromHeader
};

