// OpenAI Configuration
// Store API key securely using AWS Secrets Manager or environment variables

const AWS = require('aws-sdk');

// Initialize Secrets Manager (if using AWS Secrets Manager)
const secretsManager = process.env.AWS_REGION ? new AWS.SecretsManager({
    region: process.env.AWS_REGION || 'us-east-1'
}) : null;

let cachedApiKey = null;

/**
 * Get OpenAI API key from environment variable or AWS Secrets Manager
 * @returns {Promise<string>} OpenAI API key
 */
async function getApiKey() {
    // Check cache first
    if (cachedApiKey) {
        return cachedApiKey;
    }

    // Try environment variable first (for local development)
    if (process.env.OPENAI_API_KEY) {
        cachedApiKey = process.env.OPENAI_API_KEY;
        return cachedApiKey;
    }

    // Try AWS Secrets Manager (for production)
    if (secretsManager && process.env.OPENAI_SECRET_NAME) {
        try {
            const data = await secretsManager.getSecretValue({
                SecretId: process.env.OPENAI_SECRET_NAME
            }).promise();

            const secret = JSON.parse(data.SecretString);
            cachedApiKey = secret.OPENAI_API_KEY || secret.openai_api_key;
            return cachedApiKey;
        } catch (error) {
            console.error('Error retrieving OpenAI API key from Secrets Manager:', error);
            throw new Error('Failed to retrieve OpenAI API key');
        }
    }

    throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable or configure AWS Secrets Manager.');
}

/**
 * Initialize OpenAI client
 * @returns {Promise<Object>} OpenAI client instance
 */
async function getOpenAIClient() {
    const OpenAI = require('openai');
    const apiKey = await getApiKey();
    
    return new OpenAI({
        apiKey: apiKey
    });
}

module.exports = {
    getApiKey,
    getOpenAIClient
};

