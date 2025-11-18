// Codex Service - Frontend service for interacting with Codex API

class CodexService {
    constructor() {
        this.apiBaseUrl = window.CODEX_API_URL || '';
        this.isConfigured = this.apiBaseUrl && !this.apiBaseUrl.includes('your-api-gateway-url');
    }

    async getCognitoUserId() {
        // Get current user from Cognito
        try {
            if (window.cognitoAuthManager && window.cognitoAuthManager.getCurrentUser) {
                const user = await window.cognitoAuthManager.getCurrentUser();
                return user?.username || user?.sub || null;
            }
            // Fallback to localStorage or session
            const userInfo = localStorage.getItem('cognitoUser');
            if (userInfo) {
                const user = JSON.parse(userInfo);
                return user.username || user.sub || null;
            }
        } catch (error) {
            console.error('Error getting Cognito user:', error);
        }
        return null;
    }

    async apiRequest(endpoint, method = 'POST', body = {}) {
        if (!this.isConfigured) {
            throw new Error('Codex API is not configured. Please update codex-config.js with your API Gateway URL.');
        }

        const cognitoUserId = await this.getCognitoUserId();
        if (!cognitoUserId) {
            throw new Error('User not authenticated. Please log in.');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/${endpoint}`, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...body,
                    cognitoUserId
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Network error: Unable to reach Codex API. Please check your connection and API configuration.');
            }
            throw error;
        }
    }

    async chat(message, code = '', task = 'chat', language = '', context = '') {
        return await this.apiRequest('chat', 'POST', {
            message,
            code,
            task,
            language,
            context
        });
    }

    async generateCode(description, language = 'javascript', existingCode = '') {
        return await this.chat(description, existingCode, 'generate', language);
    }

    async explainCode(code, question = '') {
        return await this.chat(question || 'Explain this code', code, 'explain');
    }

    async refactorCode(code, language = 'javascript', requirements = '') {
        return await this.chat(requirements || 'Refactor this code', code, 'refactor', language);
    }

    async debugCode(code, language = 'javascript', issue = '') {
        return await this.chat(issue || 'Find and fix bugs', code, 'debug', language);
    }

    async translateCode(code, targetLanguage) {
        return await this.chat(targetLanguage, code, 'translate');
    }

    async documentCode(code, language = 'javascript', requirements = '') {
        return await this.chat(requirements || 'Generate documentation', code, 'document', language);
    }
}

// Initialize global Codex service
window.codexService = new CodexService();

