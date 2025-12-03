// Users Service - Frontend service for managing users via AWS Lambda APIs
// This service handles all user management operations

class UsersService {
    constructor() {
        // API Gateway endpoint - update this with your actual API Gateway URL
        this.apiBaseUrl = process.env.API_GATEWAY_URL || 'https://your-api-id.execute-api.ap-southeast-2.amazonaws.com/prod';
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add Cognito token if available
        if (window.cognitoAuthManager && window.cognitoAuthManager.user) {
            // Get the current session token
            const session = window.cognitoAuthManager.cognitoUser?.getSignInUserSession();
            if (session) {
                headers['Authorization'] = `Bearer ${session.getIdToken().getJwtToken()}`;
            }
        }
        
        return headers;
    }

    /**
     * List all users with pagination
     * @param {Object} options - Pagination and search options
     * @param {number} options.page - Page number (default: 1)
     * @param {number} options.limit - Items per page (default: 20, max: 100)
     * @param {string} options.search - Search query for email, business name, or username
     */
    async listUsers(options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.page) params.append('page', options.page);
            if (options.limit) params.append('limit', options.limit);
            if (options.search) params.append('search', options.search);

            const response = await fetch(
                `${this.apiBaseUrl}/users?${params.toString()}`,
                {
                    method: 'GET',
                    headers: this.getAuthHeaders()
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error listing users:', error);
            throw error;
        }
    }

    /**
     * Get user details by ID
     * @param {string} userId - User ID, Cognito user ID, or email
     */
    async getUser(userId) {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/users/${encodeURIComponent(userId)}`,
                {
                    method: 'GET',
                    headers: this.getAuthHeaders()
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('User not found');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    /**
     * Update user information
     * @param {string} userId - User ID or Cognito user ID
     * @param {Object} updates - Fields to update
     */
    async updateUser(userId, updates) {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/users/${encodeURIComponent(userId)}`,
                {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(updates)
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    /**
     * Delete a user
     * @param {string} userId - User ID or Cognito user ID
     * @param {boolean} deleteFromCognito - Whether to also delete from Cognito (default: true)
     */
    async deleteUser(userId, deleteFromCognito = true) {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/users/${encodeURIComponent(userId)}`,
                {
                    method: 'DELETE',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ deleteFromCognito })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    /**
     * Sync user from Cognito to Aurora (called after signup)
     * @param {Object} userData - User data from Cognito and Step-2 form
     */
    async syncUserFromCognito(userData) {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/auth/signup`,
                {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(userData)
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error syncing user:', error);
            throw error;
        }
    }

    /**
     * Sync user session after sign-in (updates last_login)
     * @param {Object} sessionData - Session data from Cognito
     */
    async syncUserSession(sessionData) {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/auth/signin`,
                {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(sessionData)
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error syncing session:', error);
            throw error;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UsersService;
} else {
    window.UsersService = UsersService;
    // Create global instance
    window.usersService = new UsersService();
}

