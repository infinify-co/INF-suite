# Reserved Handles - AWS Setup Guide

## Recommended Approach: AWS DynamoDB

DynamoDB is the best choice for reserved handles because:
- ✅ Serverless (no server management)
- ✅ Auto-scaling
- ✅ Fast lookups by handle name
- ✅ Pay-per-use pricing
- ✅ Simple key-value structure perfect for handles

## Setup Steps

### Step 1: Create DynamoDB Table

#### Option A: Using AWS Console

1. Go to **DynamoDB** in AWS Console
2. Click **Create table**
3. Configure:
   - **Table name**: `infinify-reserved-handles`
   - **Partition key**: `handle` (String)
   - **Settings**: Use default settings
   - **Table class**: Standard (or Burst capacity for cost savings)
4. Click **Create table**

#### Option B: Using AWS CLI

```bash
aws dynamodb create-table \
  --table-name infinify-reserved-handles \
  --attribute-definitions AttributeName=handle,AttributeType=S \
  --key-schema AttributeName=handle,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 2: Install Dependencies

```bash
cd backend/lambda/handles
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### Step 3: Set Environment Variables

Add to your Lambda function environment variables:
- `HANDLES_TABLE_NAME=infinify-reserved-handles`
- `AWS_REGION=us-east-1`

### Step 4: Create API Gateway Endpoints

Add these endpoints to your API Gateway:

1. **POST /handles** - Create reserved handle
   - Integration: Lambda function `handles-create`
   
2. **GET /handles** - List all handles
   - Integration: Lambda function `handles-list`
   - Query params: `?search=term` (optional)
   
3. **DELETE /handles/{handle}** - Delete handle
   - Integration: Lambda function `handles-delete`

### Step 5: Update Frontend Code

Update `internal/reserved-handles.html` to call the API instead of using local data.

## Alternative: Use Existing RDS PostgreSQL

If you prefer to use your existing RDS database:

### Step 1: Create Table

```sql
CREATE TABLE reserved_handles (
    id SERIAL PRIMARY KEY,
    handle VARCHAR(255) UNIQUE NOT NULL,
    reserved_by VARCHAR(255) NOT NULL,
    reserved_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'reserved',
    expires VARCHAR(50) DEFAULT 'Never',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_handle ON reserved_handles(handle);
CREATE INDEX idx_reserved_date ON reserved_handles(reserved_date DESC);
```

### Step 2: Create Lambda Functions

Use the existing pattern from `backend/lambda/sites/` but for handles table.

## Cost Comparison

### DynamoDB (Pay-per-request)
- **Free Tier**: 25 GB storage, 25 read/write units
- **After Free Tier**: ~$1.25 per million requests
- **Storage**: $0.25 per GB/month
- **Estimated**: $5-10/month for moderate usage

### RDS PostgreSQL
- **Free Tier**: 750 hours/month (db.t3.micro)
- **After Free Tier**: ~$15-50/month
- **Better for**: Complex queries, relational data

## Recommendation

**Use DynamoDB** for reserved handles because:
1. Simpler structure (just handles)
2. Faster lookups
3. Lower cost for this use case
4. Serverless (no connection pooling needed)
5. Auto-scaling

## Next Steps

1. Create DynamoDB table
2. Deploy Lambda functions
3. Update frontend to use API
4. Test end-to-end
5. Add authentication/authorization

## Security Considerations

- Add authentication to API endpoints
- Use IAM roles for Lambda
- Enable DynamoDB encryption at rest
- Add rate limiting in API Gateway
- Validate input data in Lambda

