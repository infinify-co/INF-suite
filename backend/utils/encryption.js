// Encryption Utilities
const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate secure random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash OTP code for storage
 * @param {string} otp - OTP code
 * @param {string} salt - Optional salt
 * @returns {string} Hashed OTP
 */
function hashOTP(otp, salt = null) {
  const hash = crypto.createHash('sha256');
  if (salt) {
    hash.update(otp + salt);
  } else {
    hash.update(otp);
  }
  return hash.digest('hex');
}

/**
 * Generate 6-digit OTP code
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateRandomString,
  hashOTP,
  generateOTP
};

