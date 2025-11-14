# AWS Infrastructure Setup Guide

## Prerequisites

1. **AWS Account**: Sign up at [aws.amazon.com](https://aws.amazon.com)
2. **AWS CLI**: Install and configure
   ```bash
   # Install AWS CLI
   brew install awscli  # macOS
   # or download from https://aws.amazon.com/cli/
   
   # Configure credentials
   aws configure
   ```
3. **Node.js**: Version 18.x or higher
4. **PostgreSQL Client**: For database access

## Step 1: Create RDS PostgreSQL Database

### Option A: Using AWS Console

1. Go to **RDS** in AWS Console
2. Click **Create database**
3. Choose **PostgreSQL**
4. Select **Free tier** (or your preferred tier)
5. Configure:
   - **DB instance identifier**: `infinify-db`
   - **Master username**: `infinify_admin`
   - **Master password**: (choose strong password)
   - **DB instance class**: `db.t3.micro` (free tier)
   - **Storage**: 20 GB (free tier)
   - **VPC**: Default VPC
   - **Public access**: Yes (for Lambda access)
   - **Security group**: Create new or use existing
6. Click **Create database**
7. Wait for database to be available (5-10 minutes)
8. Note the **Endpoint** (e.g., `infinify-db.xxxxx.us-east-1.rds.amazonaws.com`)

### Option B: Using AWS CLI

```bash
aws rds create-db-instance \
  --db-instance-identifier infinify-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username infinify_admin \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --publicly-accessible \
  --region us-east-1
```

## Step 2: Run Database Schema

1. Connect to your RDS instance:
   ```bash
   psql -h YOUR_RDS_ENDPOINT -U infinify_admin -d postgres
   ```

2. Create the database:
   ```sql
   CREATE DATABASE infinify;
   \c infinify
   ```

3. Run the schema:
   ```bash
   psql -h YOUR_RDS_ENDPOINT -U infinify_admin -d infinify -f aws-infrastructure/rds-setup.sql
   ```

   Or copy and paste the contents of `aws-infrastructure/rds-setup.sql` into the psql prompt.

## Step 3: Create S3 Buckets

### Using AWS Console

1. Go to **S3** in AWS Console
2. Click **Create bucket**
3. Create three buckets:
   - `infinify-user-files` (your-region)
   - `infinify-backups` (your-region)
   - `infinify-static` (your-region)
4. For each bucket:
   - Uncheck **Block all public access** (or configure as needed)
   - Enable **Versioning**
   - Enable **Encryption** (AES256)
   - Click **Create bucket**

### Using AWS CLI

```bash
# Create buckets
aws s3 mb s3://infinify-user-files --region us-east-1
aws s3 mb s3://infinify-backups --region us-east-1
aws s3 mb s3://infinify-static --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket infinify-user-files \
  --versioning-configuration Status=Enabled
```

## Step 4: Create IAM Role for Lambda

1. Go to **IAM** in AWS Console
2. Click **Roles** → **Create role**
3. Select **AWS service** → **Lambda**
4. Attach policies:
   - `AWSLambdaBasicExecutionRole`
   - `AmazonRDSFullAccess` (or create custom policy)
   - `AmazonS3FullAccess` (or create custom policy)
   - `AmazonSESFullAccess` (for email)
5. Name: `LambdaExecutionRole`
6. Click **Create role**

## Step 5: Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```env
# AWS Configuration
AWS_REGION=us-east-1

# RDS Database
RDS_HOST=infinify-db.xxxxx.us-east-1.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=infinify
RDS_USER=infinify_admin
RDS_PASSWORD=YOUR_PASSWORD

# JWT
JWT_SECRET=YOUR_SECRET_KEY_HERE_USE_RANDOM_STRING

# S3 Buckets
S3_BUCKET_USER_FILES=infinify-user-files
S3_BUCKET_BACKUPS=infinify-backups
S3_BUCKET_STATIC=infinify-static

# Email (AWS SES)
EMAIL_FROM=noreply@infinify.com
EMAIL_REPLY_TO=support@infinify.com

# Redis (ElastiCache - optional for now)
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=

# API Gateway (will be set after creation)
API_BASE_URL=
API_KEY=
```

**Important**: Never commit `.env` to git! Add it to `.gitignore`.

## Step 6: Install Dependencies

```bash
cd backend
npm init -y
npm install pg bcrypt jsonwebtoken @aws-sdk/client-s3 @aws-sdk/client-ses
```

## Step 7: Create API Gateway

### Using AWS Console

1. Go to **API Gateway** in AWS Console
2. Click **Create API** → **REST API** → **Build**
3. Choose **New API**
4. Name: `Infinify API`
5. Click **Create API**
6. Import the OpenAPI spec:
   - Click **Actions** → **Import**
   - Upload `aws-infrastructure/api-gateway-config.yaml`
   - Or manually create resources and methods

### Using AWS CLI

```bash
# Create API
aws apigateway create-rest-api \
  --name "Infinify API" \
  --region us-east-1

# Note the API ID, then import the OpenAPI spec
aws apigateway put-rest-api \
  --rest-api-id YOUR_API_ID \
  --mode overwrite \
  --body file://aws-infrastructure/api-gateway-config.yaml
```

## Step 8: Deploy Lambda Functions

1. Install dependencies in each Lambda function directory:
   ```bash
   cd backend/lambda/auth
   npm install pg bcrypt jsonwebtoken
   ```

2. Package and deploy:
   ```bash
   cd aws-infrastructure
   ./lambda-deploy.sh
   ```

   Or deploy manually:
   ```bash
   # Package function
   cd backend/lambda/auth
   zip -r function.zip . -x "*.git*"
   
   # Create/update Lambda
   aws lambda create-function \
     --function-name infinify-auth-signup \
     --runtime nodejs18.x \
     --role arn:aws:iam::ACCOUNT_ID:role/LambdaExecutionRole \
     --handler signup.handler \
     --zip-file fileb://function.zip \
     --timeout 30 \
     --memory-size 256
   ```

## Step 9: Connect API Gateway to Lambda

1. In API Gateway console, select your API
2. For each endpoint:
   - Click on the method (POST, GET, etc.)
   - Click **Integration Request**
   - Integration type: **Lambda Function**
   - Select your Lambda function
   - Click **Save**
3. Deploy API:
   - Click **Actions** → **Deploy API**
   - Stage: `prod` (or `dev`)
   - Click **Deploy**
4. Note the **Invoke URL**

## Step 10: Configure SES for Email

1. Go to **SES** in AWS Console
2. Verify your email domain or email address
3. Request production access (if needed)
4. Configure SMTP credentials (optional)

## Step 11: Test the Setup

```bash
# Test signup endpoint
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "phone": "+1234567890"
  }'
```

## Troubleshooting

### Database Connection Issues
- Check security group allows inbound connections from Lambda
- Verify RDS endpoint is correct
- Check credentials

### Lambda Timeout
- Increase timeout in Lambda configuration
- Check database connection pool settings

### CORS Errors
- Verify CORS headers in API Gateway
- Check Lambda response includes CORS headers

### Permission Errors
- Verify IAM role has correct permissions
- Check S3 bucket policies

## Next Steps

1. Complete Phase 2: Build remaining Lambda functions
2. Set up CloudWatch for logging
3. Configure auto-scaling for RDS
4. Set up CloudFront CDN (optional)
5. Configure monitoring and alerts

## Cost Optimization

- Use RDS Free Tier for development
- Enable RDS automated backups (7-day retention)
- Use S3 lifecycle policies to move old files to Glacier
- Set up CloudWatch billing alerts
- Use Lambda reserved concurrency to control costs

## Security Checklist

- [ ] RDS database is in private subnet (production)
- [ ] Security groups restrict access
- [ ] JWT secret is strong and stored securely
- [ ] S3 buckets have proper access policies
- [ ] API Gateway has rate limiting enabled
- [ ] Environment variables are encrypted
- [ ] HTTPS only (API Gateway default)
- [ ] Database backups are encrypted

