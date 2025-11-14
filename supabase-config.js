// Configuration: Cloud Mode Toggle
// Set to false to use local storage instead of cloud services
const CLOUD_MODE_ENABLED = false; // Set to false to turn off cloud mode

// Supabase Configuration (only used if CLOUD_MODE_ENABLED is true)
const SUPABASE_URL = 'https://dzxlcontltcfsxizjeew.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eGxjb250bHRjZnN4aXpqZWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTQ1MzYsImV4cCI6MjA3NDQ3MDUzNn0.9eqEkL_kxuzhQyIrIFzTs9GBxq_CQCzk1cHqw2Q5Pgs';

// Initialize Supabase client (only if cloud mode is enabled)
let supabase = null;
let actualCloudMode = CLOUD_MODE_ENABLED;

// Check if Supabase library is available (it might be loaded from CDN)
if (CLOUD_MODE_ENABLED) {
    // Check for Supabase in different possible locations
    const SupabaseClient = (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) 
        ? window.supabase 
        : (typeof supabase !== 'undefined' && supabase.createClient) 
            ? supabase 
            : null;
    
    if (SupabaseClient && SupabaseClient.createClient) {
        try {
            supabase = SupabaseClient.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('☁️ Cloud mode enabled - using Supabase');
        } catch (e) {
            console.warn('Failed to initialize Supabase, falling back to local mode:', e);
            actualCloudMode = false;
        }
    } else {
        console.warn('Supabase library not found, falling back to local mode');
        actualCloudMode = false;
    }
}

if (!actualCloudMode) {
    // Create a mock Supabase client for local mode
    supabase = {
        auth: {
            getUser: async () => {
                const userStr = localStorage.getItem('local_user');
                return { 
                    data: { user: userStr ? JSON.parse(userStr) : null }, 
                    error: null 
                };
            },
            signUp: async (credentials) => {
                // Store user locally
                const user = {
                    id: 'local_' + Date.now(),
                    email: credentials.email,
                    created_at: new Date().toISOString()
                };
                localStorage.setItem('local_user', JSON.stringify(user));
                return { data: { user }, error: null };
            },
            signInWithPassword: async (credentials) => {
                // Check local storage for user
                const userStr = localStorage.getItem('local_user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    // Simple password check (stored in localStorage)
                    const storedPassword = localStorage.getItem('local_password_' + user.email);
                    if (storedPassword === credentials.password || !storedPassword) {
                        localStorage.setItem('local_user', JSON.stringify(user));
                        return { data: { user }, error: null };
                    }
                }
                return { data: { user: null }, error: { message: 'Invalid credentials' } };
            },
            signOut: async () => {
                localStorage.removeItem('local_user');
                return { error: null };
            },
            updateUser: async (updates) => {
                const userStr = localStorage.getItem('local_user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    Object.assign(user, updates.data || {});
                    localStorage.setItem('local_user', JSON.stringify(user));
                }
                return { error: null };
            },
            resetPasswordForEmail: async () => ({ error: null }),
            resend: async () => ({ error: null }),
            onAuthStateChange: (callback) => {
                // Mock auth state change listener
                const userStr = localStorage.getItem('local_user');
                const user = userStr ? JSON.parse(userStr) : null;
                if (callback) callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
                return { data: { subscription: null } };
            }
        },
        from: (table) => {
            // Local storage-based table operations
            const getTableData = () => {
                const data = localStorage.getItem('local_db_' + table);
                return data ? JSON.parse(data) : [];
            };
            const saveTableData = (data) => {
                localStorage.setItem('local_db_' + table, JSON.stringify(data));
            };
            
            return {
                select: (columns = '*') => ({
                    eq: (col, val) => ({
                        order: (col, opts) => {
                            const data = getTableData();
                            const filtered = val ? data.filter(row => row[col] === val) : data;
                            return { data: filtered, error: null };
                        },
                        single: () => {
                            const data = getTableData();
                            const found = val ? data.find(row => row[col] === val) : data[0];
                            return { data: found || null, error: found ? null : { message: 'Not found' } };
                        },
                        data: val ? getTableData().filter(row => row[col] === val) : getTableData(),
                        error: null
                    }),
                    order: (col, opts) => ({
                        data: getTableData(),
                        error: null
                    }),
                    data: getTableData(),
                    error: null
                }),
                insert: (rows) => ({
                    select: (columns) => ({
                        single: () => {
                            const data = getTableData();
                            const newRow = { ...rows[0], id: 'local_' + Date.now(), created_at: new Date().toISOString() };
                            data.push(newRow);
                            saveTableData(data);
                            return { data: newRow, error: null };
                        },
                        data: rows.map(r => ({ ...r, id: 'local_' + Date.now(), created_at: new Date().toISOString() })),
                        error: null
                    })
                }),
                update: (updates) => ({
                    eq: (col, val) => ({
                        select: (columns) => ({
                            single: () => {
                                const data = getTableData();
                                const index = data.findIndex(row => row[col] === val);
                                if (index >= 0) {
                                    data[index] = { ...data[index], ...updates };
                                    saveTableData(data);
                                    return { data: data[index], error: null };
                                }
                                return { data: null, error: { message: 'Not found' } };
                            }
                        })
                    })
                }),
                delete: () => ({
                    eq: (col, val) => {
                        const data = getTableData();
                        const filtered = data.filter(row => row[col] !== val);
                        saveTableData(filtered);
                        return { error: null };
                    }
                }),
                upsert: (rows, opts) => ({
                    onConflict: (conflict) => ({
                        select: (columns) => ({
                            single: () => {
                                const data = getTableData();
                                const row = rows[0];
                                const index = data.findIndex(r => r.id === row.id);
                                if (index >= 0) {
                                    data[index] = { ...data[index], ...row };
                                } else {
                                    data.push({ ...row, id: row.id || 'local_' + Date.now(), created_at: new Date().toISOString() });
                                }
                                saveTableData(data);
                                return { data: data[index >= 0 ? index : data.length - 1], error: null };
                            }
                        })
                    })
                })
            };
        }
    };
    console.log('🔒 Cloud mode disabled - using local storage');
}

// Authentication functions
class AuthManager {
    constructor() {
        this.user = null;
        this.init();
    }

    async init() {
        // Check if user is already logged in
        const { data: { user } } = await supabase.auth.getUser();
        this.user = user;
        this.updateUI();
    }

    async signUp(email, password) {
        try {
            if (!actualCloudMode) {
                // Local mode: store user and password in localStorage
                const user = {
                    id: 'local_' + Date.now(),
                    email: email,
                    created_at: new Date().toISOString()
                };
                localStorage.setItem('local_user', JSON.stringify(user));
                localStorage.setItem('local_password_' + email, password);
                this.user = user;
                this.updateUI();
                showNotification('Account created successfully! (Local mode)', 'success');
                return { user, error: null };
            }
            
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            if (data.user) {
                // Initialize backup database for new user
                if (window.backupService) {
                    // Wait a bit for user to be fully created, then initialize backup
                    setTimeout(async () => {
                        try {
                            await window.backupService.initializeBackupDatabase();
                            console.log('Backup database initialized for new user');
                        } catch (err) {
                            console.error('Error initializing backup database:', err);
                        }
                    }, 1000);
                }
                
                showNotification('Check your email for verification link!', 'success');
                return data;
            }
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        }
    }

    async signIn(email, password) {
        try {
            if (!actualCloudMode) {
                // Local mode: check localStorage for user
                const userStr = localStorage.getItem('local_user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    const storedPassword = localStorage.getItem('local_password_' + email);
                    if (user.email === email && (storedPassword === password || !storedPassword)) {
                        this.user = user;
                        this.updateUI();
                        await this.updateLastLogin(user.id);
                        showNotification('Successfully logged in! (Local mode)', 'success');
                        return { user, error: null };
                    }
                }
                throw new Error('Invalid email or password');
            }
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            this.user = data.user;
            this.updateUI();
            
            // Update last login timestamp
            if (this.user) {
                await this.updateLastLogin(this.user.id);
            }
            
            showNotification('Successfully logged in!', 'success');
            return data;
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        }
    }

    // Update last login timestamp
    async updateLastLogin(userId) {
        try {
            const now = Date.now();
            // Store in localStorage
            localStorage.setItem(`lastLogin_${userId}`, now.toString());
            
            // Also store in user metadata
            const { error } = await supabase.auth.updateUser({
                data: { lastLogin: now }
            });
            
            if (error) {
                console.warn('Could not update last login in metadata:', error);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Update last login error:', error);
            // Don't throw - this is not critical
            return { success: false, error };
        }
    }

    // Check if user has logged in within specified days
    async hasRecentLogin(days = 3) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                return false;
            }
            
            // Check localStorage first
            const lastLoginStr = localStorage.getItem(`lastLogin_${user.id}`);
            let lastLogin = null;
            
            if (lastLoginStr) {
                lastLogin = parseInt(lastLoginStr, 10);
            } else if (user.user_metadata && user.user_metadata.lastLogin) {
                // Fallback to user metadata
                lastLogin = user.user_metadata.lastLogin;
            } else {
                // If no last login recorded, check session creation time
                // Supabase sessions have expires_at, but we'll use current time as fallback
                return false; // No login record, require sign in
            }
            
            const now = Date.now();
            const daysInMs = days * 24 * 60 * 60 * 1000;
            const threeDaysAgo = now - daysInMs;
            
            return lastLogin >= threeDaysAgo;
        } catch (error) {
            console.error('Check recent login error:', error);
            return false; // On error, require sign in
        }
    }

    async signOut() {
        try {
            if (!actualCloudMode) {
                // Local mode: just clear local user
                localStorage.removeItem('local_user');
                this.user = null;
                this.updateUI();
                showNotification('Successfully logged out! (Local mode)', 'success');
                return;
            }
            
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            this.user = null;
            this.updateUI();
            showNotification('Successfully logged out!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });
            
            if (error) throw error;
            
            showNotification('Password reset email sent! Check your inbox.', 'success');
            return { error: null };
        } catch (error) {
            showNotification(error.message, 'error');
            return { error };
        }
    }

    async updatePassword(newPassword) {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
            
            showNotification('Password updated successfully!', 'success');
            return { error: null };
        } catch (error) {
            showNotification(error.message, 'error');
            return { error };
        }
    }

    async updateProfile(updates) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Update user metadata
            const { error } = await supabase.auth.updateUser({
                data: updates
            });
            
            if (error) throw error;
            
            // Also update profile in database if it exists
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    ...updates,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (profileError) {
                console.warn('Profile update error:', profileError);
                // Don't throw, metadata update succeeded
            }

            this.user = { ...this.user, user_metadata: { ...this.user?.user_metadata, ...updates } };
            showNotification('Profile updated successfully!', 'success');
            return { error: null };
        } catch (error) {
            showNotification(error.message, 'error');
            return { error };
        }
    }

    async updateEmail(newEmail) {
        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail
            });
            
            if (error) throw error;
            
            showNotification('Verification email sent to new address!', 'success');
            return { error: null };
        } catch (error) {
            showNotification(error.message, 'error');
            return { error };
        }
    }

    async resendVerificationEmail() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: user.email
            });
            
            if (error) throw error;
            
            showNotification('Verification email sent!', 'success');
            return { error: null };
        } catch (error) {
            showNotification(error.message, 'error');
            return { error };
        }
    }

    // Generate UUID v4 for session tokens
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Create verification session with unique token
    createVerificationSession(email, type = 'signup') {
        const token = this.generateUUID();
        const sessionData = {
            token: token,
            email: email,
            type: type,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
        };
        
        // Store in sessionStorage
        sessionStorage.setItem(`otp_session_${token}`, JSON.stringify(sessionData));
        
        return token;
    }

    // Validate verification session token
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

    // Clear session token after successful verification
    clearSessionToken(token) {
        sessionStorage.removeItem(`otp_session_${token}`);
    }

    // Send OTP email via Custom Netlify Function
    async sendOTP(email) {
        try {
            // Get current session token from storage
            const sessionToken = this.getCurrentSessionToken(email);
            if (!sessionToken) {
                throw new Error('No active session. Please sign up again.');
            }

            // Call custom Netlify Function
            const netlifyFunctionUrl = '/.netlify/functions/send-otp';
            const response = await fetch(netlifyFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    sessionToken: sessionToken
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send OTP');
            }

            return { success: true, method: 'custom_otp' };
        } catch (error) {
            console.error('OTP send error:', error);
            throw error;
        }
    }

    // Helper to get current session token for email
    getCurrentSessionToken(email) {
        // Find session token in sessionStorage
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

    // Verify OTP code via Custom Netlify Function
    async verifyOTP(email, sessionToken, otp) {
        try {
            // First validate session token
            const validation = this.validateSessionToken(sessionToken);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            // Call custom Netlify Function to verify OTP
            const netlifyFunctionUrl = '/.netlify/functions/verify-otp';
            const response = await fetch(netlifyFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    sessionToken: sessionToken,
                    otp: otp
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid or expired OTP code');
            }

            // OTP verified successfully
            // Now we need to authenticate the user with Supabase
            // Since we're using custom OTP, we'll sign in the user directly
            // (The user should already be created from sign-up flow)
            
            // Get user from Supabase by email
            const { data: { user } } = await supabase.auth.getUser();
            
            // If user is not authenticated, we need to sign them in
            // For custom OTP, we'll use the password they set during signup
            // But we don't have it here, so we'll need to handle this differently
            
            // Alternative: Create a session after OTP verification
            // For now, we'll mark the user as verified and they can proceed
            // You may want to store a temporary auth token or use Supabase's admin API
            
            // Clear session token after successful verification
            this.clearSessionToken(sessionToken);
            
            // Update last login if user exists
            if (user) {
                this.user = user;
                this.updateUI();
                await this.updateLastLogin(user.id);
            }
            
            return { success: true, user: user };
        } catch (error) {
            console.error('OTP verify error:', error);
            throw error;
        }
    }

    // Store phone number in user metadata
    async storePhoneNumber(userId, phone) {
        try {
            const { error } = await supabase.auth.updateUser({
                data: { phone: phone }
            });
            
            if (error) throw error;
            
            // Also try to update profile table if it exists
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    phone: phone,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });
            
            if (profileError) {
                console.warn('Profile update error (table may not exist):', profileError);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Store phone error:', error);
            throw error;
        }
    }

    // Sign up or sign in with phone storage
    async signUpOrSignIn(email, password, phone) {
        try {
            // First try to sign in (user exists) - silently catch errors
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (!error && data.user) {
                    // User exists, signed in successfully
                    this.user = data.user;
                    // Update last login
                    await this.updateLastLogin(this.user.id);
                    // Store phone number if not already stored
                    if (phone && this.user) {
                        try {
                            await this.storePhoneNumber(this.user.id, phone);
                        } catch (phoneError) {
                            console.warn('Could not store phone number:', phoneError);
                        }
                    }
                    return { type: 'login', user: this.user };
                }
            } catch (signInError) {
                // User doesn't exist or wrong password, continue to signup
                console.log('Sign in failed, attempting signup:', signInError.message);
            }
            
            // User doesn't exist, create new account
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            if (data.user) {
                // Store phone number for new user
                if (phone) {
                    try {
                        await this.storePhoneNumber(data.user.id, phone);
                    } catch (phoneError) {
                        console.warn('Could not store phone number:', phoneError);
                    }
                }
                return { type: 'signup', user: data.user };
            }
            
            throw new Error('Failed to create account');
        } catch (error) {
            console.error('Sign up/in error:', error);
            throw error;
        }
    }

    updateUI() {
        const loginBtn = document.querySelector('.nav-signin');
        const modal = document.getElementById('loginModal');
        
        if (this.user) {
            // User is logged in
            loginBtn.textContent = 'Log out';
            loginBtn.onclick = () => this.signOut();
            modal.style.display = 'none';
        } else {
            // User is not logged in
            loginBtn.textContent = 'Log in';
            loginBtn.onclick = () => this.openModal();
        }
    }

    openModal() {
        document.getElementById('loginModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('loginModal').style.display = 'none';
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Listen for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
        authManager.user = session.user;
        authManager.updateUI();
        
        // Initialize backup database if it doesn't exist
        if (window.backupService) {
            try {
                const backupDb = await window.backupService.getBackupDatabase();
                if (!backupDb) {
                    await window.backupService.initializeBackupDatabase();
                }
            } catch (err) {
                console.error('Error checking/initializing backup database:', err);
            }
        }
    } else if (event === 'SIGNED_OUT') {
        authManager.user = null;
        authManager.updateUI();
    }
});

// Export for use in other files
window.authManager = authManager;
window.supabase = supabase;
