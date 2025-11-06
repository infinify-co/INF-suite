# AWS Migration Guide

## Overview
This guide explains how to migrate from managed Supabase to self-hosted AWS infrastructure. The architecture is designed to make this transition as smooth as possible.

## Current Architecture (Supabase Managed)

- **Database**: PostgreSQL (Supabase)
- **API**: Auto-generated REST API (PostgREST)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Hosting**: Supabase (managed)

## Target Architecture (AWS Self-Hosted)

- **Database**: AWS RDS PostgreSQL
- **API**: PostgREST or Node.js/Express API
- **Auth**: AWS Cognito or Custom Auth
- **Storage**: AWS S3
- **Real-time**: WebSockets (Socket.io) or AWS API Gateway WebSockets
- **Hosting**: AWS EC2/ECS or Lambda
- **Load Balancer**: AWS ALB
- **CDN**: CloudFront (optional)

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Basic knowledge of AWS services
4. Database backup from Supabase

## Step-by-Step Migration

### Phase 1: Database Migration

#### 1.1 Export Database Schema
```bash
# From Supabase dashboard or using pg_dump
pg_dump -h <supabase-host> -U postgres -d postgres -s > schema.sql
```

#### 1.2 Export Data
```bash
# Export all data
pg_dump -h <supabase-host> -U postgres -d postgres -a > data.sql

# Or export specific tables
pg_dump -h <supabase-host> -U postgres -d postgres -t client_databases -t client_tables -a > data.sql
```

#### 1.3 Create RDS PostgreSQL Instance
```bash
# Using AWS CLI
aws rds create-db-instance \
  --db-instance-identifier inf-database \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password <secure-password> \
  --allocated-storage 20 \
  --vpc-security-group-ids <sg-id> \
  --db-subnet-group-name <subnet-group>
```

#### 1.4 Import Schema and Data
```bash
# Connect to RDS and import schema
psql -h <rds-endpoint> -U postgres -d postgres -f schema.sql

# Import data
psql -h <rds-endpoint> -U postgres -d postgres -f data.sql
```

### Phase 2: API Server Setup

#### Option A: PostgREST (Recommended for simplicity)

1. **Deploy PostgREST on EC2**
```bash
# Install PostgREST
wget https://github.com/PostgREST/postgrest/releases/download/v12.0.0/postgrest-v12.0.0-ubuntu.tar.xz
tar xf postgrest-v12.0.0-ubuntu.tar.xz

# Create config file
cat > postgrest.conf << EOF
db-uri = "postgres://postgres:<password>@<rds-endpoint>:5432/postgres"
db-schema = "public"
db-anon-role = "anon"
db-pool = 10
server-host = "0.0.0.0"
server-port = 3000
EOF

# Run PostgREST
./postgrest postgrest.conf
```

2. **Set up Systemd Service**
```bash
sudo nano /etc/systemd/system/postgrest.service
```

```ini
[Unit]
Description=PostgREST API Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/postgrest
ExecStart=/opt/postgrest/postgrest /opt/postgrest/postgrest.conf
Restart=always

[Install]
WantedBy=multi-user.target
```

#### Option B: Node.js/Express API

1. **Create API Server**
```javascript
// server.js
const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: 'postgres',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());

// API routes matching Supabase REST API structure
app.get('/rest/v1/client_databases', async (req, res) => {
  const { data, error } = await pool.query('SELECT * FROM client_databases');
  res.json(data);
});

// ... more routes

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
```

2. **Deploy to EC2 or ECS**

### Phase 3: Authentication Migration

#### Option A: AWS Cognito

1. **Create Cognito User Pool**
```bash
aws cognito-idp create-user-pool \
  --pool-name inf-users \
  --auto-verified-attributes email
```

2. **Create User Pool Client**
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id <pool-id> \
  --client-name inf-client \
  --generate-secret
```

3. **Update Frontend Code**
```javascript
// Replace Supabase auth with Cognito
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: 'us-east-1_xxxxx',
  ClientId: 'xxxxxxxxxxxxx'
};

const userPool = new CognitoUserPool(poolData);
```

#### Option B: Custom Auth (Keep existing structure)

1. **Migrate user data to RDS**
2. **Implement JWT-based auth**
3. **Keep same API structure**

### Phase 4: File Storage Migration

#### 4.1 Create S3 Bucket
```bash
aws s3 mb s3://inf-storage
```

#### 4.2 Set up CORS
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"]
    }
  ]
}
```

#### 4.3 Migrate Files from Supabase Storage
```bash
# Download from Supabase
# Upload to S3
aws s3 sync ./supabase-files s3://inf-storage/
```

#### 4.4 Update Storage Service
```javascript
// Replace Supabase storage with S3
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: 'us-east-1'
});

// Upload file
const upload = await s3.upload({
  Bucket: 'inf-storage',
  Key: fileName,
  Body: fileBuffer
}).promise();
```

### Phase 5: Real-time Subscriptions

#### Option A: Socket.io

1. **Install Socket.io**
```bash
npm install socket.io
```

2. **Set up WebSocket Server**
```javascript
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.on('subscribe', (channel) => {
    socket.join(channel);
  });
});

// Broadcast changes
function broadcastChange(channel, data) {
  io.to(channel).emit('change', data);
}
```

#### Option B: AWS API Gateway WebSockets

1. **Create WebSocket API in API Gateway**
2. **Set up Lambda functions for connection/disconnection**
3. **Update frontend to use WebSocket API**

### Phase 6: Configuration Updates

#### 6.1 Update Environment Variables

Create `.env` file:
```env
# Database
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<password>

# API
API_URL=http://<api-server>:3000

# Auth (Cognito)
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxx

# Storage (S3)
AWS_REGION=us-east-1
AWS_S3_BUCKET=inf-storage
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx

# WebSocket
WS_URL=ws://<websocket-server>:3001
```

#### 6.2 Update Frontend Config

```javascript
// config.js
const config = {
  api: {
    url: process.env.API_URL || 'http://localhost:3000'
  },
  auth: {
    // Cognito or custom auth config
  },
  storage: {
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_REGION
  },
  realtime: {
    url: process.env.WS_URL || 'ws://localhost:3001'
  }
};
```

### Phase 7: Testing

1. **Test Database Connectivity**
2. **Test API Endpoints**
3. **Test Authentication**
4. **Test File Uploads**
5. **Test Real-time Updates**
6. **Load Testing**

### Phase 8: DNS and SSL

1. **Set up Route 53 DNS**
2. **Configure SSL Certificate (ACM)**
3. **Set up Load Balancer with SSL**
4. **Update DNS records**

### Phase 9: Monitoring and Logging

1. **CloudWatch Logs** for API logs
2. **CloudWatch Metrics** for database performance
3. **S3 Access Logs** for storage
4. **Set up Alarms** for critical metrics

## Cost Estimates

### AWS Monthly Costs (Approximate)

- **RDS PostgreSQL (db.t3.micro)**: $15-20/month
- **EC2 (t3.small for API)**: $15/month
- **S3 Storage (100GB)**: $2.30/month
- **Data Transfer (100GB)**: $9/month
- **Route 53**: $0.50/month
- **Load Balancer**: $16/month
- **CloudWatch**: $5/month

**Total: ~$60-70/month** (vs Supabase free tier, then $25/month for Pro)

## Rollback Plan

1. Keep Supabase instance running during migration
2. Test thoroughly before switching DNS
3. Maintain database backups
4. Ability to switch back quickly if needed

## Security Considerations

1. **Use IAM Roles** instead of access keys where possible
2. **Enable RDS encryption** at rest
3. **Use VPC** for database isolation
4. **Enable SSL/TLS** for all connections
5. **Set up WAF** for API protection
6. **Regular security audits**

## Performance Optimization

1. **RDS Read Replicas** for read-heavy workloads
2. **ElastiCache** for caching
3. **CloudFront** for static assets
4. **Auto Scaling** for EC2 instances
5. **Database connection pooling**

## Maintenance

1. **Regular backups** (automated via RDS)
2. **Database maintenance windows**
3. **Security updates**
4. **Monitoring and alerting**
5. **Capacity planning**

## Support

For issues during migration:
- AWS Support (Basic is free)
- AWS Documentation
- Community forums

## Next Steps After Migration

1. Monitor performance metrics
2. Optimize based on usage patterns
3. Set up automated backups
4. Configure scaling policies
5. Document runbooks

