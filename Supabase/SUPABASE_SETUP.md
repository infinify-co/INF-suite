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
   - **Site URL**: `http://localhost:8080` (for development) or your production URL
   - **Redirect URLs**: Add `http://localhost:8080/Auth.html` and your production Auth.html URL
   - **Enable email confirmations**: ON (required for OTP flow)
4. For OTP Code Support (optional):
   - Supabase may send magic links by default
   - To enable numeric OTP codes, configure in **Authentication** → **Email Templates**
   - Or use Supabase Edge Functions for custom OTP implementation
   - The current implementation handles both magic links and OTP codes

### 4. Customize Email Templates (Quick Guide)
1. In Supabase dashboard, go to **Authentication** → **Email Templates**
2. You'll see templates for:
   - **Confirm signup** - Email verification for new users
   - **Magic Link** - Passwordless login link
   - **Change Email Address** - Email change confirmation
   - **Reset Password** - Password reset link
   - **Invite user** - Team member invitations

3. **Customize each template**:
   - Click on a template to edit
   - Use HTML/CSS for styling
   - Available variables:
     - `{{ .Email }}` - User's email address
     - `{{ .Token }}` - Verification/OTP token
     - `{{ .TokenHash }}` - Hashed token
     - `{{ .SiteURL }}` - Your site URL
     - `{{ .RedirectTo }}` - Redirect URL after verification
     - `{{ .ConfirmationURL }}` - Full confirmation link
     - `{{ .OTP }}` - One-time password code (if using OTP)

4. **Example OTP Email Template**:
   ```html
   <h2>Verify your email</h2>
   <p>Your verification code is: <strong>{{ .OTP }}</strong></p>
   <p>Enter this code in the verification page to complete your signup.</p>
   <p>This code expires in 15 minutes.</p>
   ```

5. **Example Magic Link Template**:
   ```html
   <h2>Sign in to Infinify</h2>
   <p>Click the link below to sign in:</p>
   <a href="{{ .ConfirmationURL }}">Sign In</a>
   <p>Or copy this link: {{ .ConfirmationURL }}</p>
   ```

6. **Save changes** - Templates are saved automatically
7. **Test emails** - Use the "Send test email" feature to preview

### 5. Test the Integration
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

## 📧 Email Template Customization Guide

### Available Email Templates

1. **Confirm Signup** - Sent when user signs up
   - Used for: Email verification after registration
   - Variables: `{{ .Email }}`, `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .OTP }}`

2. **Magic Link** - Passwordless authentication
   - Used for: OTP/magic link login
   - Variables: `{{ .Email }}`, `{{ .Token }}`, `{{ .ConfirmationURL }}`

3. **Change Email Address** - Email change confirmation
   - Used for: Verifying new email address
   - Variables: `{{ .Email }}`, `{{ .Token }}`, `{{ .ConfirmationURL }}`

4. **Reset Password** - Password reset
   - Used for: Password recovery
   - Variables: `{{ .Email }}`, `{{ .Token }}`, `{{ .ConfirmationURL }}`

5. **Invite User** - Team invitations
   - Used for: Inviting team members
   - Variables: `{{ .Email }}`, `{{ .Token }}`, `{{ .ConfirmationURL }}`

### Customizing Templates

**Step-by-step:**
1. Go to Supabase Dashboard → **Authentication** → **Email Templates**
2. Select the template you want to customize
3. Edit the **Subject** and **Body** (HTML supported)
4. Use variables like `{{ .OTP }}` for dynamic content
5. Click **Save** to apply changes

**Tips:**
- Use inline CSS for email compatibility
- Test with the "Send test email" button
- Keep subject lines under 50 characters
- Include your branding/logo
- Make sure links work correctly

### Custom SMTP (Optional)

For production, you can use your own SMTP server:
1. Go to **Settings** → **Auth** → **SMTP Settings**
2. Configure your SMTP provider (SendGrid, Mailgun, etc.)
3. This allows custom "From" addresses and better deliverability

## 🎯 Next Steps

1. **User Profiles**: Add user profile management
2. **Dashboard**: Create user dashboard after login
3. **Data Protection**: Implement Row Level Security
4. **Analytics**: Track user engagement
5. **Custom Branding**: Add your logo and colors to email templates
