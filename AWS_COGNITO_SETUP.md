# AWS Cognito Authentication Setup Guide

## Overview
This guide will help you set up AWS Cognito for authentication with custom branding (no AWS branding visible) and email functionality via AWS SES.

## Phase 1: Create Cognito User Pool

### Step 1: Create User Pool in AWS Console

1. Go to [AWS Cognito Console](https://console.aws.amazon.com/cognito/)
2. Select **ap-southeast-2** (Sydney) region (matching your Aurora setup)
3. Click **"Create user pool"**
4. Choose **"Sign-in options"**:
   - Select **Email** (uncheck username if checked)
   - Click **Next**

### Step 2: Configure Security Requirements

1. **Password policy**:
   - Minimum length: 8 characters
   - Require uppercase letters: ✅
   - Require lowercase letters: ✅
   - Require numbers: ✅
   - Require symbols: Optional
   - Click **Next**

2. **Multi-factor authentication**:
   - Choose **No MFA** (or Optional if you want it later)
   - Click **Next**

3. **User account recovery**:
   - Enable **Email only** for account recovery
   - Click **Next**

### Step 3: Configure Sign-up Experience

1. **Self-service sign-up**:
   - Enable self-service sign-up: ✅
   - Enable email verification: ✅
   - Click **Next**

2. **Required attributes**:
   - Keep **email** (required)
   - Add **phone_number** as required attribute (if needed)
   - Click **Next**

3. **Custom attributes** (optional):
   - Add any custom attributes you need
   - Click **Next**

### Step 4: Configure Message Delivery

1. **Email provider**:
   - Choose **Send email with Amazon SES**
   - **Important**: You must verify your email/domain in SES first (see Phase 2)

2. **Email sending account**:
   - Select **Cognito managed** (or your verified SES email)
   - Click **Next**

### Step 5: Integrate Your App

1. **User pool name**: `infinify-user-pool` (or your preferred name)
2. **App client**:
   - Click **Add an app client**
   - App client name: `infinify-web-client`
   - **Uncheck** "Generate client secret" (for web apps)
   - Click **Next**

### Step 6: Review and Create

1. Review all settings
2. Click **Create user pool**
3. **IMPORTANT**: Copy and save:
   - **User Pool ID** (looks like: `ap-southeast-2_xxxxxxxxx`)
   - **App Client ID** (looks like: `xxxxxxxxxxxxxxxxxxxxx`)

## Phase 2: Configure AWS SES for Email

### Step 1: Verify Email Address or Domain

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Select **ap-southeast-2** region
3. Click **Verified identities** → **Create identity**
4. Choose **Email address** or **Domain**:
   - **Email**: Enter your email (e.g., `noreply@yourdomain.com`)
   - **Domain**: Enter your domain (e.g., `yourdomain.com`)
5. Click **Create identity**
6. **For email**: Check your inbox and click verification link
7. **For domain**: Follow DNS verification steps

### Step 2: Request Production Access (If Needed)

If you're in SES sandbox:
1. Go to **Account dashboard**
2. Click **Request production access**
3. Fill out the form (explain your use case)
4. Wait for approval (usually 24-48 hours)

### Step 3: Create Custom Email Templates

Cognito will use SES to send emails. You can customize the email content:

1. In Cognito User Pool, go to **Messaging** tab
2. Configure email templates:
   - **Verification email**: Customize with your branding
   - **Password reset email**: Customize with your branding
   - **Welcome email**: Optional

**Note**: For full custom branding, you may need to use Lambda triggers (see Phase 3).

## Phase 3: Link Cognito to SES

### Step 1: Configure Email in Cognito

1. In your User Pool, go to **Messaging** tab
2. Under **Email configuration**:
   - **Email provider**: Amazon SES
   - **From email address**: Your verified SES email
   - **From sender name**: Your brand name (e.g., "Infinify")
   - **Reply-to email address**: Your support email

### Step 2: Test Email Sending

1. Create a test user in Cognito
2. Trigger email verification
3. Check that email arrives with your branding

## Phase 4: Environment Variables

Add these to your `.env` file in the `backend` directory:

```env
# AWS Cognito Configuration
COGNITO_USER_POOL_ID=ap-southeast-2_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=ap-southeast-2
```

## Phase 5: Custom Email Templates (Advanced)

For fully custom email templates with your branding:

### Option A: Lambda Triggers (Recommended)

1. Create Lambda functions for:
   - `PreSignUp` trigger
   - `CustomMessage` trigger (for custom email content)

2. In Cognito User Pool:
   - Go to **User pool properties** → **Lambda triggers**
   - Add your Lambda functions

### Option B: Cognito Built-in Templates

1. Use Cognito's email template editor
2. Customize HTML/CSS within Cognito's template system
3. Limited customization but easier to set up

## Security Best Practices

1. **App Client Settings**:
   - Enable only necessary OAuth flows
   - Set callback URLs properly
   - Enable CORS for your domain

2. **User Pool Settings**:
   - Enable advanced security features
   - Set up rate limiting
   - Configure session duration

3. **SES**:
   - Use verified identities only
   - Monitor bounce/complaint rates
   - Set up SNS notifications

## Testing Checklist

- [ ] User can sign up with email
- [ ] Verification email is received
- [ ] User can verify email with code
- [ ] User can sign in after verification
- [ ] Password reset email is received
- [ ] User can reset password
- [ ] No AWS branding appears in UI
- [ ] Custom email templates work
- [ ] OTP functionality works (if implemented)

## Troubleshooting

### Emails Not Sending
- Verify SES identity is confirmed
- Check SES is out of sandbox (if needed)
- Verify Cognito is linked to SES
- Check CloudWatch logs

### Verification Code Not Working
- Check code expiration time
- Verify user pool settings
- Check Lambda triggers (if using)

### CORS Errors
- Add your domain to Cognito app client settings
- Check API Gateway CORS configuration

## Next Steps

After completing this setup:
1. Update frontend code to use Cognito SDK
2. Test all authentication flows
3. Remove Supabase dependencies
4. Deploy to production

## Cost Estimate

- **Cognito**: Free for up to 50,000 MAU (Monthly Active Users)
- **SES**: $0.10 per 1,000 emails (first 62,000 emails free per month if using EC2)
- **Total**: Essentially free for small to medium applications

