# Supabase Authentication Setup Guide

## 🚀 Quick Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: INF Site
   - **Database Password**: (choose a strong password)
   - **Region**: Choose closest to your users

### 2. Get Your Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key
3. Open `supabase-config.js` in your project
4. Replace the placeholder values:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 3. Enable Authentication
1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Auth Providers**, enable **Email**
3. Configure email settings:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add your production domain when ready

### 4. Test the Integration
1. Start your development server: `npm start`
2. Click "Log in" in the navigation
3. Try creating a new account
4. Check your email for verification
5. Test logging in and out

## 🔧 Features Included

### ✅ Authentication Features
- **User Registration**: Email/password signup
- **User Login**: Email/password authentication
- **User Logout**: Secure session termination
- **Session Management**: Automatic login state tracking
- **Email Verification**: Built-in email confirmation

### ✅ UI Components
- **Login Modal**: Clean, responsive login form
- **Signup Form**: User registration with validation
- **Navigation Updates**: Dynamic login/logout button
- **Error Handling**: User-friendly error messages
- **Success Notifications**: Confirmation messages

### ✅ Security Features
- **Password Hashing**: Automatic password encryption
- **Session Tokens**: Secure JWT token management
- **Email Verification**: Prevents fake accounts
- **CSRF Protection**: Built-in security measures

## 📱 Usage

### For Users
1. **Sign Up**: Click "Log in" → "Sign up" → Enter email/password
2. **Verify Email**: Check email and click verification link
3. **Log In**: Use email/password to access account
4. **Log Out**: Click "Log out" to end session

### For Developers
```javascript
// Check if user is logged in
if (authManager.user) {
    console.log('User is logged in:', authManager.user.email);
}

// Get current user
const user = authManager.user;

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
});
```

## 🛠️ Customization

### Styling
- Modal styles are in `styles.css` under `.modal`
- Customize colors, fonts, and layout as needed
- Responsive design included

### Functionality
- Add user profiles in `supabase-config.js`
- Extend authentication with social logins
- Add password reset functionality
- Implement user roles and permissions

## 🚨 Important Notes

### Security
- Never commit your Supabase keys to public repositories
- Use environment variables in production
- Enable Row Level Security (RLS) for data protection

### Production Setup
1. Update Site URL in Supabase dashboard
2. Add your domain to Redirect URLs
3. Configure custom SMTP for email sending
4. Set up proper CORS settings

## 📞 Support

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Authentication Guide**: [supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)
- **JavaScript Client**: [supabase.com/docs/reference/javascript](https://supabase.com/docs/reference/javascript)

## 🎯 Next Steps

1. **User Profiles**: Add user profile management
2. **Dashboard**: Create user dashboard after login
3. **Data Protection**: Implement Row Level Security
4. **Analytics**: Track user engagement
5. **Email Templates**: Customize verification emails
