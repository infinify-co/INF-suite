// AWS Cognito Authentication Manager
// Replaces Supabase authentication with AWS Cognito

// Load Cognito SDK
// Add this script tag to HTML: <script src="https://unpkg.com/amazon-cognito-identity-js@6.3.0/dist/amazon-cognito-identity.min.js"></script>

// Import Cognito classes (will be available globally after SDK loads)
const { CognitoUserPool, CognitoUser, CognitoUserAttribute, AuthenticationDetails } = window.AmazonCognitoIdentity || {};

// Authentication Manager Class
class CognitoAuthManager {
    constructor() {
        this.user = null;
        this.userPool = null;
        this.cognitoUser = null;
        this.init();
    }

    init() {
        // Initialize Cognito User Pool
        if (window.COGNITO_CONFIG && window.AmazonCognitoIdentity) {
            this.userPool = new AmazonCognitoIdentity.CognitoUserPool({
                UserPoolId: window.COGNITO_CONFIG.userPoolId,
                ClientId: window.COGNITO_CONFIG.clientId
            });

            // Check if user is already logged in
            this.checkCurrentUser();
        } else {
            console.warn('Cognito config or SDK not loaded');
        }
    }

    // Check if user is currently authenticated
    async checkCurrentUser() {
        try {
            const cognitoUser = this.userPool.getCurrentUser();
            if (cognitoUser) {
                await this.getSession(cognitoUser);
            } else {
                this.user = null;
                this.updateUI();
            }
        } catch (error) {
            console.error('Error checking current user:', error);
            this.user = null;
            this.updateUI();
        }
    }

    // Get user session
    async getSession(cognitoUser) {
        return new Promise((resolve, reject) => {
            cognitoUser.getSession((err, session) => {
                if (err || !session.isValid()) {
                    this.user = null;
                    this.updateUI();
                    reject(err || new Error('Invalid session'));
                    return;
                }

                // Get user attributes
                cognitoUser.getUserAttributes((err, attributes) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Convert attributes to user object
                    const userObj = {
                        id: session.getIdToken().payload.sub,
                        email: this.getAttribute(attributes, 'email'),
                        email_verified: this.getAttribute(attributes, 'email_verified') === 'true',
                        phone: this.getAttribute(attributes, 'phone_number'),
                        attributes: attributes
                    };

                    this.user = userObj;
                    this.cognitoUser = cognitoUser;
                    this.updateUI();
                    resolve(session);
                });
            });
        });
    }

    // Helper to get attribute value
    getAttribute(attributes, name) {
        const attr = attributes.find(a => a.Name === name);
        return attr ? attr.Value : null;
    }

    // Sign up new user
    async signUp(email, password, phone = null) {
        return new Promise((resolve, reject) => {
            const attributeList = [];

            // Email attribute
            attributeList.push(
                new AmazonCognitoIdentity.CognitoUserAttribute({
                    Name: 'email',
                    Value: email
                })
            );

            // Phone attribute (if provided)
            if (phone) {
                attributeList.push(
                    new AmazonCognitoIdentity.CognitoUserAttribute({
                        Name: 'phone_number',
                        Value: phone
                    })
                );
            }

            // Sign up user
            this.userPool.signUp(email, password, attributeList, null, (err, result) => {
                if (err) {
                    const errorMessage = this.getErrorMessage(err);
                    if (typeof showNotification === 'function') {
                        showNotification(errorMessage, 'error');
                    }
                    reject(new Error(errorMessage));
                    return;
                }

                // User created successfully
                const cognitoUser = result.user;
                
                // Initialize backup database for new user
                if (window.backupService) {
                    setTimeout(async () => {
                        try {
                            await window.backupService.initializeBackupDatabase();
                            console.log('Backup database initialized for new user');
                        } catch (err) {
                            console.error('Error initializing backup database:', err);
                        }
                    }, 1000);
                }

                if (typeof showNotification === 'function') {
                    showNotification('Check your email for verification code!', 'success');
                }

                resolve({
                    user: {
                        username: cognitoUser.getUsername(),
                        email: email,
                        phone: phone
                    },
                    userSub: result.userSub
                });
            });
        });
    }

    // Sign in user
    async signIn(email, password) {
        return new Promise((resolve, reject) => {
            const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
                Username: email,
                Password: password
            });

            const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
                Username: email,
                Pool: this.userPool
            });

            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: async (result) => {
                    // Get user attributes
                    cognitoUser.getUserAttributes((err, attributes) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        const userObj = {
                            id: result.getIdToken().payload.sub,
                            email: this.getAttribute(attributes, 'email'),
                            email_verified: this.getAttribute(attributes, 'email_verified') === 'true',
                            phone: this.getAttribute(attributes, 'phone_number'),
                            attributes: attributes
                        };

                        this.user = userObj;
                        this.cognitoUser = cognitoUser;
                        this.updateUI();

                        // Update last login
                        await this.updateLastLogin(userObj.id);

                        if (typeof showNotification === 'function') {
                            showNotification('Successfully logged in!', 'success');
                        }

                        resolve({
                            user: userObj,
                            session: result
                        });
                    });
                },
                onFailure: (err) => {
                    const errorMessage = this.getErrorMessage(err);
                    if (typeof showNotification === 'function') {
                        showNotification(errorMessage, 'error');
                    }
                    reject(new Error(errorMessage));
                },
                newPasswordRequired: (userAttributes, requiredAttributes) => {
                    // Handle new password required (first time login)
                    reject(new Error('New password required. Please use password reset.'));
                }
            });
        });
    }

    // Verify email with code
    async verifyEmail(email, verificationCode) {
        return new Promise((resolve, reject) => {
            const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
                Username: email,
                Pool: this.userPool
            });

            cognitoUser.confirmRegistration(verificationCode, true, (err, result) => {
                if (err) {
                    const errorMessage = this.getErrorMessage(err);
                    if (typeof showNotification === 'function') {
                        showNotification(errorMessage, 'error');
                    }
                    reject(new Error(errorMessage));
                    return;
                }

                if (typeof showNotification === 'function') {
                    showNotification('Email verified successfully!', 'success');
                }

                resolve(result);
            });
        });
    }

    // Resend verification code
    async resendVerificationCode(email) {
        return new Promise((resolve, reject) => {
            const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
                Username: email,
                Pool: this.userPool
            });

            cognitoUser.resendConfirmationCode((err, result) => {
                if (err) {
                    const errorMessage = this.getErrorMessage(err);
                    if (typeof showNotification === 'function') {
                        showNotification(errorMessage, 'error');
                    }
                    reject(new Error(errorMessage));
                    return;
                }

                if (typeof showNotification === 'function') {
                    showNotification('Verification code sent! Check your email.', 'success');
                }

                resolve(result);
            });
        });
    }

    // Forgot password (initiate reset)
    async forgotPassword(email) {
        return new Promise((resolve, reject) => {
            const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
                Username: email,
                Pool: this.userPool
            });

            cognitoUser.forgotPassword({
                onSuccess: (data) => {
                    if (typeof showNotification === 'function') {
                        showNotification('Password reset code sent to your email!', 'success');
                    }
                    resolve(data);
                },
                onFailure: (err) => {
                    const errorMessage = this.getErrorMessage(err);
                    if (typeof showNotification === 'function') {
                        showNotification(errorMessage, 'error');
                    }
                    reject(new Error(errorMessage));
                }
            });
        });
    }

    // Confirm password reset
    async confirmPassword(email, verificationCode, newPassword) {
        return new Promise((resolve, reject) => {
            const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
                Username: email,
                Pool: this.userPool
            });

            cognitoUser.confirmPassword(verificationCode, newPassword, {
                onSuccess: () => {
                    if (typeof showNotification === 'function') {
                        showNotification('Password reset successfully!', 'success');
                    }
                    resolve({ success: true });
                },
                onFailure: (err) => {
                    const errorMessage = this.getErrorMessage(err);
                    if (typeof showNotification === 'function') {
                        showNotification(errorMessage, 'error');
                    }
                    reject(new Error(errorMessage));
                }
            });
        });
    }

    // Sign out
    async signOut() {
        try {
            if (this.cognitoUser) {
                this.cognitoUser.signOut();
            } else {
                const cognitoUser = this.userPool.getCurrentUser();
                if (cognitoUser) {
                    cognitoUser.signOut();
                }
            }

            this.user = null;
            this.cognitoUser = null;
            this.updateUI();

            if (typeof showNotification === 'function') {
                showNotification('Successfully logged out!', 'success');
            }
        } catch (error) {
            console.error('Sign out error:', error);
            if (typeof showNotification === 'function') {
                showNotification(error.message, 'error');
            }
            throw error;
        }
    }

    // Update password
    async updatePassword(oldPassword, newPassword) {
        return new Promise((resolve, reject) => {
            if (!this.cognitoUser) {
                this.cognitoUser = this.userPool.getCurrentUser();
            }

            if (!this.cognitoUser) {
                reject(new Error('User not authenticated'));
                return;
            }

            this.cognitoUser.changePassword(oldPassword, newPassword, (err, result) => {
                if (err) {
                    const errorMessage = this.getErrorMessage(err);
                    if (typeof showNotification === 'function') {
                        showNotification(errorMessage, 'error');
                    }
                    reject(new Error(errorMessage));
                    return;
                }

                if (typeof showNotification === 'function') {
                    showNotification('Password updated successfully!', 'success');
                }

                resolve(result);
            });
        });
    }

    // Update user attributes
    async updateProfile(updates) {
        return new Promise((resolve, reject) => {
            if (!this.cognitoUser) {
                this.cognitoUser = this.userPool.getCurrentUser();
            }

            if (!this.cognitoUser) {
                reject(new Error('User not authenticated'));
                return;
            }

            const attributeList = [];
            for (const [key, value] of Object.entries(updates)) {
                attributeList.push(
                    new AmazonCognitoIdentity.CognitoUserAttribute({
                        Name: key,
                        Value: value
                    })
                );
            }

            this.cognitoUser.updateAttributes(attributeList, (err, result) => {
                if (err) {
                    const errorMessage = this.getErrorMessage(err);
                    if (typeof showNotification === 'function') {
                        showNotification(errorMessage, 'error');
                    }
                    reject(new Error(errorMessage));
                    return;
                }

                // Refresh user data
                this.checkCurrentUser();

                if (typeof showNotification === 'function') {
                    showNotification('Profile updated successfully!', 'success');
                }

                resolve(result);
            });
        });
    }

    // Update last login timestamp
    async updateLastLogin(userId) {
        try {
            const now = Date.now();
            localStorage.setItem(`lastLogin_${userId}`, now.toString());
            return { success: true };
        } catch (error) {
            console.error('Update last login error:', error);
            return { success: false, error };
        }
    }

    // Check if user has logged in recently
    async hasRecentLogin(days = 3) {
        try {
            if (!this.user) {
                return false;
            }

            const lastLoginStr = localStorage.getItem(`lastLogin_${this.user.id}`);
            if (!lastLoginStr) {
                return false;
            }

            const lastLogin = parseInt(lastLoginStr, 10);
            const now = Date.now();
            const daysInMs = days * 24 * 60 * 60 * 1000;
            const daysAgo = now - daysInMs;

            return lastLogin >= daysAgo;
        } catch (error) {
            console.error('Check recent login error:', error);
            return false;
        }
    }

    // OTP functionality (custom implementation)
    // For Cognito, we'll use verification codes
    async sendOTP(email) {
        // Use resend verification code
        return await this.resendVerificationCode(email);
    }

    async verifyOTP(email, sessionToken, otpCode) {
        // Use email verification
        try {
            await this.verifyEmail(email, otpCode);
            
            // After verification, sign in the user
            // Note: User needs to sign in after verification
            return {
                success: true,
                user: this.user
            };
        } catch (error) {
            throw error;
        }
    }

    // Sign up or sign in (convenience method)
    async signUpOrSignIn(email, password, phone) {
        try {
            // Try to sign in first
            try {
                const result = await this.signIn(email, password);
                // Update phone if provided
                if (phone && this.user) {
                    try {
                        await this.updateProfile({ phone_number: phone });
                    } catch (phoneError) {
                        console.warn('Could not update phone number:', phoneError);
                    }
                }
                return { type: 'login', user: this.user };
            } catch (signInError) {
                // User doesn't exist, try signup
                const result = await this.signUp(email, password, phone);
                return { type: 'signup', user: result.user };
            }
        } catch (error) {
            throw error;
        }
    }

    // Session token management (for OTP flow compatibility)
    createVerificationSession(email, type = 'signup') {
        const token = this.generateUUID();
        const sessionData = {
            token: token,
            email: email,
            type: type,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };
        
        sessionStorage.setItem(`otp_session_${token}`, JSON.stringify(sessionData));
        return token;
    }

    validateSessionToken(token) {
        try {
            const sessionData = sessionStorage.getItem(`otp_session_${token}`);
            if (!sessionData) {
                return { valid: false, error: 'Invalid or expired session token' };
            }
            
            const session = JSON.parse(sessionData);
            const now = new Date();
            const expiresAt = new Date(session.expiresAt);
            
            if (now > expiresAt) {
                sessionStorage.removeItem(`otp_session_${token}`);
                return { valid: false, error: 'Session token has expired' };
            }
            
            return { valid: true, session: session };
        } catch (error) {
            return { valid: false, error: 'Invalid session token format' };
        }
    }

    clearSessionToken(token) {
        sessionStorage.removeItem(`otp_session_${token}`);
    }

    getCurrentSessionToken(email) {
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('otp_session_')) {
                try {
                    const sessionData = JSON.parse(sessionStorage.getItem(key));
                    if (sessionData.email === email) {
                        return sessionData.token;
                    }
                } catch (e) {
                    // Skip invalid entries
                }
            }
        }
        return null;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Helper to get user-friendly error messages
    getErrorMessage(err) {
        if (!err) return 'An error occurred';
        
        const errorCode = err.code || err.name;
        const errorMessage = err.message || err.toString();

        // Map Cognito error codes to user-friendly messages
        const errorMap = {
            'NotAuthorizedException': 'Invalid email or password',
            'UserNotFoundException': 'User not found',
            'UserNotConfirmedException': 'Please verify your email first',
            'UsernameExistsException': 'An account with this email already exists',
            'InvalidPasswordException': 'Password does not meet requirements',
            'InvalidParameterException': 'Invalid input provided',
            'CodeMismatchException': 'Invalid verification code',
            'ExpiredCodeException': 'Verification code has expired',
            'LimitExceededException': 'Too many attempts. Please try again later',
            'TooManyRequestsException': 'Too many requests. Please try again later'
        };

        return errorMap[errorCode] || errorMessage;
    }

    // Update UI based on auth state
    updateUI() {
        const loginBtn = document.querySelector('.nav-signin');
        const modal = document.getElementById('loginModal');
        
        if (this.user) {
            if (loginBtn) {
                loginBtn.textContent = 'Log out';
                loginBtn.onclick = () => this.signOut();
            }
            if (modal) {
                modal.style.display = 'none';
            }
        } else {
            if (loginBtn) {
                loginBtn.textContent = 'Log in';
                loginBtn.onclick = () => this.openModal();
            }
        }
    }

    openModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize auth manager when Cognito SDK is loaded
let authManager = null;

function initializeCognitoAuth() {
    if (window.AmazonCognitoIdentity && window.COGNITO_CONFIG) {
        authManager = new CognitoAuthManager();
        window.authManager = authManager;
        window.cognitoAuthManager = authManager;
    } else {
        console.warn('Cognito SDK or config not loaded yet');
        // Retry after a short delay
        setTimeout(initializeCognitoAuth, 500);
    }
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCognitoAuth);
} else {
    initializeCognitoAuth();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CognitoAuthManager;
}

