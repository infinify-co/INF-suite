// Supabase Configuration
const SUPABASE_URL = 'https://dzxlcontltcfsxizjeew.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eGxjb250bHRjZnN4aXpqZWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTQ1MzYsImV4cCI6MjA3NDQ3MDUzNn0.9eqEkL_kxuzhQyIrIFzTs9GBxq_CQCzk1cHqw2Q5Pgs';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            if (data.user) {
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
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            this.user = data.user;
            this.updateUI();
            showNotification('Successfully logged in!', 'success');
            return data;
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        }
    }

    async signOut() {
        try {
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
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        authManager.user = session.user;
        authManager.updateUI();
    } else if (event === 'SIGNED_OUT') {
        authManager.user = null;
        authManager.updateUI();
    }
});

// Export for use in other files
window.authManager = authManager;
window.supabase = supabase;
