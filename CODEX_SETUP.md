# Codex Setup Guide

This guide will help you set up Codex, the AI-powered coding assistant integrated into your Online Assets section.

## Prerequisites

- AWS Account with Lambda and API Gateway access
- OpenAI API key
- Aurora PostgreSQL database (same as used for Agents)
- AWS Cognito authentication configured

## Setup Steps

### 1. Database Setup

Run the migration to create Codex tables:

```bash
# Connect to your Aurora PostgreSQL database
psql -h your-db-endpoint -U your-username -d your-database

# Run the migration
\i backend/database/migrations/create_codex_tables.sql
```

Or manually execute the SQL from `backend/database/migrations/create_codex_tables.sql`.

### 2. Configure OpenAI API Key

Store your OpenAI API key in AWS Secrets Manager:

1. Go to AWS Secrets Manager
2. Create a new secret named `openai-api-key` (or update `OPENAI_SECRET_NAME` in Lambda environment)
3. Store the secret as JSON: `{"OPENAI_API_KEY": "sk-your-key-here"}`
4. Note the secret name for Lambda configuration

### 3. Deploy Lambda Function

**Note:** Codex Lambda function is available in both Python and Node.js. Choose your preferred language.

#### Option A: Python Deployment (Recommended)

```bash
cd backend/lambda/codex

# Install dependencies in a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create deployment package
mkdir package
cp chat.py package/
cp -r venv/lib/python*/site-packages/* package/
cd package
zip -r ../codex-chat.zip .
cd ..

# Create Lambda function
aws lambda create-function \
  --function-name codex-chat \
  --runtime python3.11 \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler chat.lambda_handler \
  --zip-file fileb://codex-chat.zip \
  --environment Variables="{
    OPENAI_SECRET_NAME=openai-api-key,
    AWS_REGION=us-east-1,
    DB_HOST=your-db-endpoint,
    DB_NAME=your-database,
    DB_USER=your-username,
    DB_PASSWORD_SECRET=db-password-secret-name
  }" \
  --timeout 30 \
  --memory-size 512

# Or update existing function
aws lambda update-function-code \
  --function-name codex-chat \
  --zip-file fileb://codex-chat.zip
```

#### Option B: Node.js Deployment

```bash
cd backend/lambda/codex

# Install dependencies
npm install openai aws-sdk pg

# Create deployment package
zip -r codex-chat.zip . -x "*.git*" "*.md" "venv/*" "*.pyc" "__pycache__/*"

# Create Lambda function
aws lambda create-function \
  --function-name codex-chat \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler chat.handler \
  --zip-file fileb://codex-chat.zip \
  --environment Variables="{
    OPENAI_SECRET_NAME=openai-api-key,
    AWS_REGION=us-east-1,
    DB_HOST=your-db-endpoint,
    DB_NAME=your-database,
    DB_USER=your-username,
    DB_PASSWORD_SECRET=db-password-secret-name
  }" \
  --timeout 30 \
  --memory-size 512

# Or update existing function
aws lambda update-function-code \
  --function-name codex-chat \
  --zip-file fileb://codex-chat.zip
```

#### Option C: Using AWS Console

**For Python:**
1. Go to AWS Lambda Console
2. Create a new function:
   - **Function name**: `codex-chat`
   - **Runtime**: Python 3.11
   - **Architecture**: x86_64
3. Upload the code from `backend/lambda/codex/chat.py`
4. Create a Lambda layer with dependencies (openai, boto3, psycopg2-binary) or package them with the function

**For Node.js:**
1. Go to AWS Lambda Console
2. Create a new function:
   - **Function name**: `codex-chat`
   - **Runtime**: Node.js 18.x
   - **Architecture**: x86_64
3. Upload the code from `backend/lambda/codex/chat.js`
4. Set environment variables:
   - `OPENAI_SECRET_NAME`: `openai-api-key`
   - `AWS_REGION`: `us-east-1`
   - `DB_HOST`: Your Aurora endpoint
   - `DB_NAME`: Your database name
   - `DB_USER`: Your database username
   - `DB_PASSWORD_SECRET`: Secret name containing DB password
5. Set timeout to 30 seconds
6. Set memory to 512 MB
7. Attach execution role with permissions for:
   - Secrets Manager (read)
   - VPC access (if database is in VPC)
8. For Python: Install dependencies using a Lambda layer or package them with the function
   - Create a Lambda layer with: `openai`, `boto3`, `psycopg2-binary`
   - Or use the packaging method shown in Option A above

### 4. Create API Gateway Endpoint

1. Go to API Gateway Console
2. Create a new REST API or use existing
3. Create a new resource: `/codex`
4. Create a POST method for `/codex/chat`
5. Set integration type to Lambda Function
6. Select `codex-chat` function
7. Enable CORS:
   - Access-Control-Allow-Origin: `*`
   - Access-Control-Allow-Headers: `Content-Type,Authorization`
   - Access-Control-Allow-Methods: `POST,OPTIONS`
8. Deploy API to a stage (e.g., `prod`)
9. Note the API Gateway URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)

### 5. Update Frontend Configuration

Edit `codex-config.js`:

```javascript
window.CODEX_API_URL = 'https://your-api-gateway-url.amazonaws.com/prod/codex/chat';
```

Replace `your-api-gateway-url` with your actual API Gateway URL.

### 6. Test the Integration

1. Open `Online-assets.html` in your browser
2. Navigate to the Codex section
3. Make sure you're logged in (Cognito authentication required)
4. Try sending a message or generating code
5. Check browser console for any errors

## Features

Codex supports the following tasks:

- **Chat**: General conversation about code
- **Generate**: Generate code from descriptions
- **Explain**: Explain how code works
- **Refactor**: Improve and refactor code
- **Debug**: Find and fix bugs
- **Translate**: Convert code between languages
- **Document**: Generate code documentation

## Usage

1. Select a task from the top buttons
2. Optionally paste code in the left editor
3. Type your request in the chat input
4. Click Send or press Enter
5. View the AI response in the chat panel

## Troubleshooting

### "Codex API is not configured"
- Update `codex-config.js` with your API Gateway URL

### "User not authenticated"
- Make sure you're logged in via Cognito
- Check that `cognitoAuthManager` is available

### "Network error"
- Verify API Gateway URL is correct
- Check API Gateway deployment status
- Verify CORS is enabled

### Lambda timeout
- Increase Lambda timeout to 30+ seconds
- Check Lambda logs in CloudWatch

### Database errors
- Verify database connection settings
- Ensure migration has been run
- Check Lambda has VPC access if needed

## Cost Considerations

- OpenAI API usage: Pay per token (see OpenAI pricing)
- Lambda: Pay per request and compute time
- API Gateway: Pay per API call
- Database: Storage and query costs

Monitor usage in:
- OpenAI dashboard
- AWS Cost Explorer
- CloudWatch metrics

