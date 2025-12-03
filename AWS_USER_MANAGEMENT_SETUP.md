# AWS User Management Setup Guide

This guide will help you connect your sign-in system to AWS for complete user management.

## Overview

Your application now has:
- **AWS Cognito** for authentication
- **AWS Aurora PostgreSQL** for user data storage
- **AWS Lambda** functions for user management APIs
- **Frontend service** (`users-service.js`) for API interactions

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS Cognito User Pool created (see `AWS Cognito/AWS_COGNITO_SETUP.md`)
3. AWS Aurora PostgreSQL database set up (see `aws-infrastructure/AWS_SETUP.md`)
4. AWS Lambda functions deployed
5. API Gateway configured

## Step 1: Run Database Migration

Run the migration to add business fields to the users table:

```bash
# Connect to your Aurora database
psql -h YOUR_RDS_ENDPOINT -U infinify_admin -d infinify

# Run the migration
\i backend/database/migrations/001_add_business_fields_to_users.sql
```

Or copy and paste the SQL from the migration file into your database client.

## Step 2: Deploy Lambda Functions

### Option A: Using AWS CLI

```bash
cd backend

# Package Lambda functions
zip -r lambda-users-list.zip lambda/users/list.js config/ utils/ node_modules/
zip -r lambda-users-get.zip lambda/users/get.js config/ utils/ node_modules/
zip -r lambda-users-update.zip lambda/users/update.js config/ utils/ node_modules/
zip -r lambda-users-delete.zip lambda/users/delete.js config/ utils/ node_modules/

# Deploy to AWS Lambda
aws lambda create-function \
  --function-name infinify-users-list \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler lambda/users/list.handler \
  --zip-file fileb://lambda-users-list.zip \
  --region ap-southeast-2

# Repeat for other functions (get, update, delete)
```

### Option B: Using AWS Console

1. Go to **AWS Lambda Console**
2. Click **Create function**
3. For each function:
   - **Function name**: `infinify-users-list`, `infinify-users-get`, etc.
   - **Runtime**: Node.js 18.x
   - **Handler**: `lambda/users/list.handler` (adjust for each)
   - Upload the function code and dependencies
   - Set environment variables (see Step 3)

## Step 3: Configure Lambda Environment Variables

For each Lambda function, set these environment variables:

```
COGNITO_USER_POOL_ID=ap-southeast-2_xxxxxxxxx
COGNITO_REGION=ap-southeast-2
DB_HOST=your-aurora-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=infinify
DB_USER=infinify_admin
DB_PASSWORD=your-password
```

## Step 4: Set Up API Gateway

### Create REST API

1. Go to **API Gateway Console**
2. Click **Create API** → **REST API**
3. Name: `infinify-users-api`
4. Create the following resources and methods:

```
/users
  GET → Lambda: infinify-users-list
  OPTIONS → Mock (for CORS)

/users/{id}
  GET → Lambda: infinify-users-get
  PUT → Lambda: infinify-users-update
  DELETE → Lambda: infinify-users-delete
  OPTIONS → Mock (for CORS)

/auth/signup
  POST → Lambda: infinify-auth-signup
  OPTIONS → Mock (for CORS)

/auth/signin
  POST → Lambda: infinify-auth-signin
  OPTIONS → Mock (for CORS)
```

### Configure CORS

For each method, enable CORS:
- **Access-Control-Allow-Origin**: `*` (or your domain)
- **Access-Control-Allow-Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Access-Control-Allow-Headers**: `Content-Type, Authorization`

### Deploy API

1. Click **Actions** → **Deploy API**
2. **Deployment stage**: `prod` (or `dev`)
3. Note the **Invoke URL** (e.g., `https://abc123.execute-api.ap-southeast-2.amazonaws.com/prod`)

## Step 5: Update Frontend Configuration

### Update `users-service.js`

Update the API base URL in `users-service.js`:

```javascript
this.apiBaseUrl = 'https://YOUR_API_ID.execute-api.ap-southeast-2.amazonaws.com/prod';
```

Or set it via environment variable:
```javascript
this.apiBaseUrl = process.env.API_GATEWAY_URL || 'https://your-api-id...';
```

### Add to HTML Pages

Add the users service to your HTML pages:

```html
<script src="users-service.js"></script>
```

## Step 6: Update Sign-Up Flow

Update `sign-in.html` to sync user data after Cognito signup:

```javascript
// After successful Cognito signup
const cognitoUser = result.user;
const cognitoUserId = cognitoUser.getUsername();

// Sync to Aurora
await window.usersService.syncUserFromCognito({
  cognitoUserId: cognitoUserId,
  email: email,
  emailVerified: false
});

// Redirect to Step-2
window.location.href = 'sign-in/Step-2.html';
```

## Step 7: Update Step-2 to Save Business Data

Update `sign-in/Step-2.html` to save business information:

```javascript
// After form submission
const formData = {
  businessName: fullNameInput.value.trim(),
  businessUsername: '@' + usernameValue,
  businessOperations: selectedCountry,
  jobTitle: document.getElementById('jobTitle').value.trim() || null
};

// Get Cognito user ID from localStorage or session
const signupData = JSON.parse(localStorage.getItem('signupData') || '{}');
const cognitoUserId = signupData.cognitoUserId;

// Update user in Aurora
await window.usersService.updateUser(cognitoUserId, formData);
```

## Step 8: Update Sign-In Flow

Update `Sign in/sign-in.html` to sync session after sign-in:

```javascript
// After successful Cognito sign-in
const session = cognitoUser.getSignInUserSession();
const idToken = session.getIdToken();
const cognitoUserId = idToken.payload.sub;
const email = idToken.payload.email;

// Sync session to Aurora
await window.usersService.syncUserSession({
  cognitoUserId: cognitoUserId,
  email: email
});

// Redirect to suite/home.html
window.location.href = '../suite/home.html';
```

## Step 9: Create User Management Interface (Optional)

Create an admin page to manage users:

```html
<!-- Example: internal/users.html -->
<script src="../users-service.js"></script>
<script>
  async function loadUsers() {
    const result = await window.usersService.listUsers({ page: 1, limit: 20 });
    // Display users in table
  }
  
  async function updateUser(userId, updates) {
    await window.usersService.updateUser(userId, updates);
    loadUsers(); // Refresh list
  }
  
  async function deleteUser(userId) {
    if (confirm('Are you sure?')) {
      await window.usersService.deleteUser(userId);
      loadUsers(); // Refresh list
    }
  }
</script>
```

## Security Considerations

1. **API Gateway Authorization**: Add Cognito User Pool authorizer to protect endpoints
2. **IAM Roles**: Ensure Lambda functions have proper IAM roles with database access
3. **VPC Configuration**: If database is in VPC, configure Lambda VPC settings
4. **CORS**: Restrict CORS to your domain in production
5. **Rate Limiting**: Enable API Gateway throttling

## Testing

1. **Test Sign-Up Flow**:
   - Sign up new user
   - Complete Step-2
   - Verify user appears in database

2. **Test Sign-In Flow**:
   - Sign in existing user
   - Verify last_login updates

3. **Test User Management**:
   - List users via API
   - Get user details
   - Update user information
   - Delete user (test account)

## Troubleshooting

### Lambda Functions Not Working
- Check CloudWatch logs
- Verify environment variables
- Check IAM permissions
- Verify database connection

### API Gateway Errors
- Check CORS configuration
- Verify Lambda integration
- Check API Gateway logs
- Verify request/response mapping

### Database Connection Issues
- Verify security group allows Lambda access
- Check database endpoint
- Verify credentials
- Check VPC configuration if applicable

## Next Steps

1. Set up monitoring and alerts
2. Implement user management UI
3. Add user analytics
4. Set up automated backups
5. Configure user retention policies

## Cost Estimate

- **Cognito**: Free for up to 50,000 MAU
- **Lambda**: $0.20 per 1M requests (first 1M free)
- **API Gateway**: $3.50 per 1M requests (first 1M free)
- **Aurora**: Depends on instance size (free tier available)
- **Total**: Very low cost for small to medium applications

