// AWS Cognito Configuration
// Replace these values with your actual Cognito User Pool credentials

const COGNITO_CONFIG = {
    // Your Cognito User Pool ID (from AWS Console)
    // Format: ap-southeast-2_xxxxxxxxx
    userPoolId: 'ap-southeast-2_xxxxxxxxx', // TODO: Replace with your User Pool ID
    
    // Your Cognito App Client ID (from AWS Console)
    // Format: xxxxxxxxxxxxxxxxxxxxx
    clientId: 'xxxxxxxxxxxxxxxxxxxxx', // TODO: Replace with your Client ID
    
    // AWS Region (should match your Aurora region)
    region: 'ap-southeast-2'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = COGNITO_CONFIG;
} else {
    window.COGNITO_CONFIG = COGNITO_CONFIG;
}

