// Passkeys Service
// Handles all operations for API key (Passkey) management via Lambda functions

class PasskeysService {
    constructor() {
        // API Gateway base URL - update this in passkeys-config.js or set window.PASSKEYS_API_URL
        this.apiBaseUrl = window.PASSKEYS_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
        this.passkeysEndpoint = `${this.apiBaseUrl}/passkeys`;
        this.isConfigured = this.apiBaseUrl && !this.apiBaseUrl.includes('your-api-gateway-url');
    }

    /**
     * Get current user's Cognito ID
     */
    async getCurrentUserId() {
        if (window.cognitoAuthManager && window.cognitoAuthManager.user) {
            return window.cognitoAuthManager.user.sub || window.cognitoAuthManager.user.username;
        }
        // Fallback: try to get from session
        const session = await window.cognitoAuthManager?.getCurrentSession();
        if (session) {
            return session.getIdToken().payload.sub;
        }
        throw new Error('User not authenticated');
    }

    /**
     * Make API request to Lambda function
     */
    async apiRequest(endpoint, method = 'GET', body = null) {
        if (!this.isConfigured) {
            throw new Error('API endpoint not configured. Please update passkeys-config.js with your API Gateway URL.');
        }

        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(endpoint, options);
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`API returned non-JSON response: ${text.substring(0, 100)}`);
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `API request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request error:', error);
            // Re-throw with more context if it's a network error
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to reach API endpoint. Please check your API Gateway URL.');
            }
            throw error;
        }
    }

    /**
     * Create a new API key
     */
    async createPasskey(projectId, name, scopes, expiresAt, metadata) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                projectId: projectId || null,
                name: name,
                scopes: scopes || [],
                expiresAt: expiresAt || null,
                metadata: metadata || {}
            };

            const result = await this.apiRequest(
                `${this.passkeysEndpoint}/create`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error creating passkey:', error);
            throw error;
        }
    }

    /**
     * List all API keys for current user
     */
    async listPasskeys(projectId = null) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            let url = `${this.passkeysEndpoint}/list?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            if (projectId) {
                url += `&projectId=${encodeURIComponent(projectId)}`;
            }

            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error listing passkeys:', error);
            throw error;
        }
    }

    /**
     * Get a single API key by ID
     */
    async getPasskey(passkeyId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.passkeysEndpoint}/${passkeyId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting passkey:', error);
            throw error;
        }
    }

    /**
     * Revoke an API key
     */
    async revokePasskey(passkeyId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId
            };

            const result = await this.apiRequest(
                `${this.passkeysEndpoint}/${passkeyId}/revoke`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error revoking passkey:', error);
            throw error;
        }
    }

    /**
     * Regenerate an API key
     */
    async regeneratePasskey(passkeyId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId
            };

            const result = await this.apiRequest(
                `${this.passkeysEndpoint}/${passkeyId}/regenerate`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error regenerating passkey:', error);
            throw error;
        }
    }

    /**
     * Get usage logs for an API key
     */
    async getUsageLogs(passkeyId, limit = 50, offset = 0) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.passkeysEndpoint}/${passkeyId}/usage?cognitoUserId=${encodeURIComponent(cognitoUserId)}&limit=${limit}&offset=${offset}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting usage logs:', error);
            throw error;
        }
    }

    /**
     * Format API key prefix for display
     */
    formatKeyPrefix(prefix) {
        if (!prefix) return 'N/A';
        // Show prefix with ellipsis
        return prefix + '...';
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    /**
     * Show notification (uses existing notification system if available)
     */
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            // Fallback: alert for errors
            if (type === 'error') {
                alert(message);
            }
        }
    }
}

// Initialize and expose globally
if (typeof window !== 'undefined') {
    window.passkeysService = new PasskeysService();
}

