// Passkeys API Configuration
// Set your API Gateway URL here

window.PASSKEYS_API_URL = 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';

// Or use environment-specific URLs:
// Development: 'https://dev-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev'
// Production: 'https://prod-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod'

// Default scopes/permissions for API keys
window.PASSKEYS_DEFAULT_SCOPES = [
    { value: 'users:read', label: 'Read Users' },
    { value: 'users:write', label: 'Write Users' },
    { value: 'agents:read', label: 'Read Agents' },
    { value: 'agents:write', label: 'Write Agents' },
    { value: 'ai:create', label: 'Create AI Systems' }
];

// Key prefix format
window.PASSKEYS_PREFIX_FORMAT = 'pk_live_';

