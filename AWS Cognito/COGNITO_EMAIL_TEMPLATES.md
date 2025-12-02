# AWS Cognito Custom Email Templates Guide

## Overview
This guide explains how to customize email templates in AWS Cognito to match your branding (no AWS branding visible).

## Email Types in Cognito

Cognito sends several types of emails:
1. **Verification Email** - Sent when user signs up
2. **Password Reset Email** - Sent when user requests password reset
3. **Welcome Email** - Optional, sent after verification
4. **Account Recovery Email** - For account recovery

## Method 1: Using Cognito Built-in Template Editor

### Step 1: Access Email Templates

1. Go to [AWS Cognito Console](https://console.aws.amazon.com/cognito/)
2. Select your User Pool
3. Go to **Messaging** tab
4. Click on **Email templates**

### Step 2: Customize Templates

For each email type, you can customize:

**Verification Email:**
- Subject: `Your verification code is {####}`
- Message: HTML or plain text with your branding

**Password Reset Email:**
- Subject: `Reset your password - Code: {####}`
- Message: HTML or plain text with your branding

### Step 3: Template Variables

Available variables in Cognito templates:
- `{####}` - Verification code (6 digits)
- `{username}` - User's email/username
- `{####}` - Can be used for OTP codes

### Example Custom Verification Email Template

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; }
        .header { background: #000; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .code { font-size: 32px; font-weight: bold; text-align: center; color: #3b82f6; padding: 20px; background: #f0f0f0; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>INFINIFY</h1>
        </div>
        <div class="content">
            <h2>Verify Your Email</h2>
            <p>Thank you for signing up! Please enter the verification code below:</p>
            <div class="code">{####}</div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2025 Infinify. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### Example Password Reset Email Template

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; }
        .header { background: #000; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .code { font-size: 32px; font-weight: bold; text-align: center; color: #3b82f6; padding: 20px; background: #f0f0f0; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #000; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>INFINIFY</h1>
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>You requested to reset your password. Use the code below:</p>
            <div class="code">{####}</div>
            <p>Enter this code on the password reset page to create a new password.</p>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2025 Infinify. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

## Method 2: Using Lambda Triggers (Advanced)

For full control over email content and branding, use Lambda triggers.

### Step 1: Create Lambda Function

Create a Lambda function that handles the `CustomMessage` trigger:

```javascript
exports.handler = async (event) => {
    // Only handle email verification and password reset
    if (event.triggerSource === 'CustomMessage_SignUp' || 
        event.triggerSource === 'CustomMessage_ForgotPassword') {
        
        const code = event.request.codeParameter;
        const username = event.request.userAttributes.email;
        
        // Customize email subject and message
        if (event.triggerSource === 'CustomMessage_SignUp') {
            event.response.emailSubject = 'Verify your Infinify account';
            event.response.emailMessage = `
                <html>
                <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px;">
                        <div style="background: #000; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0;">INFINIFY</h1>
                        </div>
                        <div style="padding: 20px;">
                            <h2>Verify Your Email</h2>
                            <p>Thank you for signing up! Your verification code is:</p>
                            <div style="font-size: 32px; font-weight: bold; text-align: center; color: #3b82f6; padding: 20px; background: #f0f0f0; border-radius: 8px; margin: 20px 0;">
                                ${code}
                            </div>
                            <p>This code will expire in 15 minutes.</p>
                        </div>
                        <div style="text-align: center; color: #666; font-size: 12px; padding: 20px;">
                            <p>&copy; 2025 Infinify. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
        } else if (event.triggerSource === 'CustomMessage_ForgotPassword') {
            event.response.emailSubject = 'Reset your Infinify password';
            event.response.emailMessage = `
                <html>
                <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px;">
                        <div style="background: #000; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0;">INFINIFY</h1>
                        </div>
                        <div style="padding: 20px;">
                            <h2>Reset Your Password</h2>
                            <p>You requested to reset your password. Your verification code is:</p>
                            <div style="font-size: 32px; font-weight: bold; text-align: center; color: #3b82f6; padding: 20px; background: #f0f0f0; border-radius: 8px; margin: 20px 0;">
                                ${code}
                            </div>
                            <p>Enter this code on the password reset page.</p>
                            <p>This code will expire in 15 minutes.</p>
                        </div>
                        <div style="text-align: center; color: #666; font-size: 12px; padding: 20px;">
                            <p>&copy; 2025 Infinify. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
        }
    }
    
    return event;
};
```

### Step 2: Configure Lambda Trigger

1. In Cognito User Pool, go to **User pool properties** → **Lambda triggers**
2. Add **Custom message** trigger
3. Select your Lambda function
4. Save changes

### Step 3: Grant Permissions

The Lambda function needs permission to be invoked by Cognito. This is usually handled automatically, but verify in IAM.

## Method 3: Using SES Custom Templates

For even more control, you can use AWS SES email templates:

1. Create email templates in SES
2. Use Lambda trigger to call SES SendTemplatedEmail API
3. Full control over design and content

## Best Practices

1. **Brand Consistency**: Use your logo, colors, and fonts
2. **Clear Call-to-Action**: Make the verification code prominent
3. **Security Messaging**: Include expiration time and security tips
4. **Mobile Responsive**: Ensure emails look good on mobile
5. **No AWS Branding**: Remove any AWS references
6. **Professional Tone**: Match your brand voice

## Testing

1. **Test in Sandbox**: Use Cognito test users first
2. **Check All Email Types**: Test verification, reset, etc.
3. **Mobile Testing**: View emails on mobile devices
4. **Spam Testing**: Ensure emails don't go to spam
5. **Code Delivery**: Verify codes arrive correctly

## Troubleshooting

### Emails Not Sending
- Verify SES identity is confirmed
- Check Lambda function logs
- Verify trigger is configured correctly

### Codes Not Working
- Check code expiration settings
- Verify template variables are correct
- Check Lambda function logic

### Branding Issues
- Ensure HTML is properly formatted
- Test in multiple email clients
- Check for broken images/links

## Next Steps

1. Customize templates with your branding
2. Test all email flows
3. Monitor email delivery rates
4. Gather user feedback
5. Iterate and improve

