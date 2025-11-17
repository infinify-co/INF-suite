# AI Agents Setup Guide

## Overview
This guide explains how to set up the AI Agents feature that allows users to create and manage AI agents using OpenAI's API.

## Prerequisites
- AWS Lambda functions deployed
- AWS API Gateway configured
- Aurora PostgreSQL database with agents tables
- OpenAI API key
- AWS Secrets Manager (optional, for secure key storage)

## 1. Database Setup

Run the migration script to create the necessary tables:

```sql
-- Execute the migration file
psql -h your-aurora-endpoint -U your-username -d your-database -f backend/database/migrations/create_agents_tables.sql
```

This creates:
- `agents` table - stores agent configurations
- `agent_versions` table - version history
- `agent_logs` table - activity tracking

## 2. OpenAI API Key Configuration

### Option A: Environment Variable (Development)
Set the OpenAI API key as an environment variable in your Lambda functions:

```bash
OPENAI_API_KEY=your-openai-api-key-here
```

### Option B: AWS Secrets Manager (Production - Recommended)
1. Store the API key in AWS Secrets Manager:
   ```bash
   aws secretsmanager create-secret \
     --name openai-api-key \
     --secret-string '{"OPENAI_API_KEY":"your-openai-api-key-here"}'
   ```

2. Update Lambda environment variables:
   - `OPENAI_SECRET_NAME=openai-api-key`
   - `AWS_REGION=us-east-1` (or your region)

3. Grant Lambda execution role permission to read the secret:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["secretsmanager:GetSecretValue"],
       "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:openai-api-key-*"
     }]
   }
   ```

## 3. Lambda Function Deployment

Deploy all Lambda functions in `backend/lambda/agents/`:

```bash
# Install dependencies
cd backend/lambda/agents
npm install openai aws-sdk pg

# Deploy each function (example using AWS CLI)
aws lambda create-function \
  --function-name agents-create \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT:role/lambda-execution-role \
  --handler create.handler \
  --zip-file fileb://function.zip
```

Required Lambda functions:
- `agents-create` - Create new agents
- `agents-list` - List user's agents
- `agents-get` - Get single agent
- `agents-update` - Update agent
- `agents-delete` - Delete agent
- `agents-deploy` - Deploy/undeploy agent
- `agents-logs` - Get agent logs
- `agents-version` - Version management

## 4. API Gateway Configuration

Set up API Gateway endpoints for each Lambda function:

### Endpoint Structure
```
POST   /agents/create
GET    /agents/list?cognitoUserId={userId}&status={status}
GET    /agents/{agentId}?cognitoUserId={userId}
PUT    /agents/{agentId}
DELETE /agents/{agentId}?cognitoUserId={userId}
POST   /agents/{agentId}/deploy
GET    /agents/{agentId}/logs?cognitoUserId={userId}&limit={limit}&offset={offset}
GET    /agents/{agentId}/version?cognitoUserId={userId}
POST   /agents/{agentId}/version
```

### CORS Configuration
Enable CORS on all endpoints with:
- Allowed Origins: `*` (or your domain)
- Allowed Methods: `GET, POST, PUT, DELETE, OPTIONS`
- Allowed Headers: `Content-Type, Authorization`

## 5. Frontend Configuration

Update `agents-service.js` with your API Gateway URL:

```javascript
// In agents-service.js, update:
this.apiBaseUrl = 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
```

Or set environment variable:
```javascript
this.apiBaseUrl = process.env.API_GATEWAY_URL || 'https://your-default-url...';
```

## 6. Lambda Dependencies

Each Lambda function needs these npm packages:
```json
{
  "dependencies": {
    "openai": "^4.0.0",
    "pg": "^8.11.0",
    "aws-sdk": "^2.1500.0"
  }
}
```

Install in each Lambda function directory:
```bash
npm install openai pg aws-sdk
```

## 7. Testing

### Test Agent Creation
```javascript
// In browser console on Agents.html page
await window.agentsService.createAgent({
  name: "Test Agent",
  instructions: "You are a helpful assistant",
  model: "gpt-5.1",
  tools: []
});
```

### Test API Endpoint
```bash
curl -X POST https://your-api-gateway-url/agents/create \
  -H "Content-Type: application/json" \
  -d '{
    "cognitoUserId": "test-user-id",
    "name": "Test Agent",
    "instructions": "You are helpful",
    "model": "gpt-5.1"
  }'
```

## 8. Security Considerations

1. **API Key Security**: Never expose OpenAI API key in frontend code
2. **User Authentication**: All endpoints verify `cognitoUserId`
3. **Input Validation**: Validate all inputs in Lambda functions
4. **Rate Limiting**: Consider adding rate limiting to prevent abuse
5. **Cost Monitoring**: Monitor OpenAI API usage and costs

## 9. Troubleshooting

### Agent creation fails
- Check OpenAI API key is correctly configured
- Verify Lambda has permission to access Secrets Manager (if used)
- Check CloudWatch logs for detailed error messages

### Database errors
- Verify agents tables exist in Aurora
- Check database connection pool configuration
- Ensure user has proper database permissions

### CORS errors
- Verify API Gateway CORS is enabled
- Check allowed origins include your domain
- Ensure OPTIONS method is configured

## 10. Next Steps

- Set up monitoring and alerting for agent usage
- Implement usage quotas per user/company
- Add agent templates for common use cases
- Set up automated testing for agent functionality

