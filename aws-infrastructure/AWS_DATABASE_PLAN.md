# AWS Database System Implementation Plan

## Overview
Build a custom AWS-based database system to compete with Supabase, running alongside Supabase initially, then fully migrating after a few months.

## Architecture

### AWS Services Stack
1. **Database**: AWS RDS PostgreSQL (or Aurora Serverless)
2. **API**: AWS API Gateway + AWS Lambda (serverless functions)
3. **Authentication**: AWS Cognito (or custom JWT system)
4. **File Storage**: AWS S3
5. **Real-time**: AWS AppSync (GraphQL subscriptions) or WebSocket API
6. **Caching**: AWS ElastiCache (Redis) for sessions/OTP
7. **Email**: AWS SES (Simple Email Service)
8. **CDN**: AWS CloudFront (optional)

## Implementation Phases

### Phase 1: Infrastructure Setup (Week 1-2)
**Goal**: Set up AWS infrastructure and basic connectivity

#### 1.1 AWS Account & Services Setup
- Create AWS account
- Set up IAM roles and policies
- Configure AWS CLI
- Set up billing alerts

#### 1.2 Database Setup
- **File**: `aws-infrastructure/rds-setup.sql`
- Create RDS PostgreSQL instance (or Aurora Serverless)
- Run migration from `schema.sql` to create tables
- Set up automated backups
- Configure VPC and security groups
- Create read replicas (optional, for scaling)

#### 1.3 API Infrastructure
- **Files**: 
  - `aws-infrastructure/api-gateway-config.yaml`
  - `aws-infrastructure/lambda-functions/`
- Set up API Gateway REST API
- Create Lambda functions structure
- Configure CORS
- Set up API keys and rate limiting

#### 1.4 Storage Setup
- **File**: `aws-infrastructure/s3-buckets.json`
- Create S3 buckets:
  - `infinify-user-files` (user uploads)
  - `infinify-backups` (database backups)
  - `infinify-static` (static assets)
- Configure bucket policies
- Set up lifecycle policies

### Phase 2: Core Backend Services (Week 3-4)
**Goal**: Build core API endpoints to match Supabase functionality

#### 2.1 Authentication Service
- **Files**:
  - `backend/services/auth-service.js`
  - `backend/lambda/auth/signup.js`
  - `backend/lambda/auth/signin.js`
  - `backend/lambda/auth/verify-otp.js`
  - `backend/lambda/auth/send-otp.js`
- Features:
  - User registration (email/password)
  - User login
  - JWT token generation
  - OTP generation and verification
  - Session management
  - Password hashing (bcrypt)
  - Email verification

#### 2.2 Database Service
- **Files**:
  - `backend/services/database-service.js`
  - `backend/lambda/database/create.js`
  - `backend/lambda/database/read.js`
  - `backend/lambda/database/update.js`
  - `backend/lambda/database/delete.js`
- Features:
  - CRUD operations
  - Dynamic table creation
  - Query builder
  - Row-level security (RLS) simulation
  - Data validation

#### 2.3 File Storage Service
- **Files**:
  - `backend/services/storage-service.js`
  - `backend/lambda/storage/upload.js`
  - `backend/lambda/storage/download.js`
  - `backend/lambda/storage/delete.js`
- Features:
  - File upload to S3
  - Presigned URLs for downloads
  - File metadata storage
  - Image resizing (Lambda + Sharp)
  - Access control

#### 2.4 Real-time Service
- **Files**:
  - `backend/services/realtime-service.js`
  - `backend/lambda/realtime/websocket-handler.js`
- Features:
  - WebSocket connections (API Gateway WebSocket API)
  - Channel subscriptions
  - Real-time data sync
  - Connection management

### Phase 3: Client Integration Layer (Week 5-6)
**Goal**: Create JavaScript client library similar to Supabase client

#### 3.1 AWS Client Library
- **File**: `aws-client.js`
- **Features**:
  - Similar API to Supabase client
  - Authentication methods
  - Database query builder
  - Real-time subscriptions
  - File upload/download
  - Error handling
  - TypeScript definitions (optional)

#### 3.2 Migration Adapter
- **File**: `aws-supabase-adapter.js`
- **Purpose**: Allow gradual migration
- **Features**:
  - Dual-mode: Use AWS or Supabase
  - Feature flags for migration
  - Data sync between systems
  - Fallback to Supabase if AWS fails

### Phase 4: OTP System Integration (Week 7)
**Goal**: Integrate custom OTP with AWS backend

#### 4.1 OTP Service
- **Files**:
  - `backend/services/otp-service.js`
  - `backend/lambda/otp/send.js`
  - `backend/lambda/otp/verify.js`
- **Features**:
  - Generate 6-digit OTP codes
  - Store in ElastiCache (Redis) with expiration
  - Rate limiting (3 per hour per email)
  - Email sending via AWS SES
  - Secure hashing

#### 4.2 Email Service
- **File**: `backend/services/email-service.js`
- **Features**:
  - HTML email templates
  - OTP email sending
  - Verification emails
  - Password reset emails
  - Customizable templates

### Phase 5: Testing & Migration Strategy (Week 8+)
**Goal**: Test system and plan gradual migration

#### 5.1 Testing
- Unit tests for Lambda functions
- Integration tests for API
- Load testing
- Security testing

#### 5.2 Migration Strategy
- **Month 1-2**: Run alongside Supabase (read from both)
- **Month 3**: Write new data to AWS, read from both
- **Month 4**: Migrate existing data to AWS
- **Month 5+**: Full migration, Supabase as backup

## File Structure

```
INF Site.code/
├── backend/
│   ├── services/
│   │   ├── auth-service.js
│   │   ├── database-service.js
│   │   ├── storage-service.js
│   │   ├── realtime-service.js
│   │   ├── otp-service.js
│   │   └── email-service.js
│   ├── lambda/
│   │   ├── auth/
│   │   │   ├── signup.js
│   │   │   ├── signin.js
│   │   │   ├── send-otp.js
│   │   │   └── verify-otp.js
│   │   ├── database/
│   │   │   ├── create.js
│   │   │   ├── read.js
│   │   │   ├── update.js
│   │   │   └── delete.js
│   │   ├── storage/
│   │   │   ├── upload.js
│   │   │   ├── download.js
│   │   │   └── delete.js
│   │   └── realtime/
│   │       └── websocket-handler.js
│   ├── config/
│   │   ├── aws-config.js
│   │   └── database-config.js
│   └── utils/
│       ├── jwt.js
│       ├── encryption.js
│       └── validation.js
├── aws-infrastructure/
│   ├── rds-setup.sql
│   ├── api-gateway-config.yaml
│   ├── s3-buckets.json
│   ├── lambda-deploy.sh
│   └── terraform/ (optional)
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── aws-client.js (new Supabase-like client)
├── aws-supabase-adapter.js (migration helper)
└── AWS_DATABASE_PLAN.md (this file)
```

## Technical Specifications

### Database Schema
- Use existing `schema.sql` as base
- Add AWS-specific optimizations
- Indexes for performance
- Partitioning for large tables

### API Endpoints

#### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `POST /auth/send-otp` - Send OTP code
- `POST /auth/verify-otp` - Verify OTP code
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/signout` - Sign out

#### Database
- `POST /db/{database_id}/tables` - Create table
- `GET /db/{database_id}/tables` - List tables
- `GET /db/{database_id}/tables/{table_id}/rows` - Query rows
- `POST /db/{database_id}/tables/{table_id}/rows` - Insert row
- `PATCH /db/{database_id}/tables/{table_id}/rows/{row_id}` - Update row
- `DELETE /db/{database_id}/tables/{table_id}/rows/{row_id}` - Delete row

#### Storage
- `POST /storage/upload` - Upload file
- `GET /storage/{file_id}` - Get file URL
- `DELETE /storage/{file_id}` - Delete file

#### Real-time
- WebSocket: `wss://api.infinify.com/realtime`
- Subscribe to channels
- Receive updates

### Security

1. **Authentication**
   - JWT tokens (RS256)
   - Token expiration (15 min access, 7 days refresh)
   - Secure password hashing (bcrypt, cost 12)

2. **Authorization**
   - Row-level security (RLS) in application layer
   - API key authentication
   - Rate limiting per user/IP

3. **Data Protection**
   - Encryption at rest (RDS encryption)
   - Encryption in transit (TLS/SSL)
   - S3 bucket encryption

4. **OTP Security**
   - Store in Redis with 15-min expiration
   - Rate limiting: 3 OTPs per email per hour
   - Secure random generation
   - One-time use only

### Cost Estimation (Monthly)

**Free Tier (First Year)**:
- RDS: Free tier (750 hours/month)
- Lambda: 1M requests free
- S3: 5GB storage free
- API Gateway: 1M requests free
- SES: 62,000 emails free

**After Free Tier** (estimated for 1000 users):
- RDS: $15-50/month (db.t3.micro)
- Lambda: $5-20/month
- S3: $5-15/month
- API Gateway: $3-10/month
- SES: $0.10 per 1000 emails
- **Total**: ~$30-100/month

## Migration Path

### Phase A: Parallel Operation (Months 1-2)
- Both systems running
- New features use AWS
- Existing features use Supabase
- Data sync script runs daily

### Phase B: Write to AWS (Month 3)
- All writes go to AWS
- Reads from both (AWS primary, Supabase fallback)
- Monitor for issues

### Phase C: Data Migration (Month 4)
- Migrate all Supabase data to AWS
- Verify data integrity
- Keep Supabase as read-only backup

### Phase D: Full Migration (Month 5+)
- All traffic to AWS
- Supabase kept as emergency backup
- Monitor for 1 month, then decommission Supabase

## Next Steps

1. **Set up AWS account and services**
2. **Create RDS database and run schema**
3. **Build first Lambda function (auth)**
4. **Create API Gateway endpoints**
5. **Build AWS client library**
6. **Test with sign-up flow**
7. **Gradually migrate features**

## Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-rds": "^3.x",
    "@aws-sdk/client-s3": "^3.x",
    "@aws-sdk/client-ses": "^3.x",
    "@aws-sdk/client-lambda": "^3.x",
    "pg": "^8.x",
    "bcrypt": "^5.x",
    "jsonwebtoken": "^9.x",
    "redis": "^4.x",
    "express": "^4.x",
    "cors": "^2.x"
  }
}
```

## Documentation Files to Create

1. `AWS_SETUP.md` - Step-by-step AWS setup guide
2. `AWS_MIGRATION.md` - Detailed migration process
3. `AWS_API_REFERENCE.md` - API documentation
4. `AWS_COST_OPTIMIZATION.md` - Cost saving tips

