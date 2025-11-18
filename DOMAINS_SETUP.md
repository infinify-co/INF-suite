# Domain Management System Setup Guide

## Overview
The domain management system allows users to connect existing domains, manage DNS records, configure subdomains, set up email forwarding, and automatically provision SSL certificates using AWS Route53 and Certificate Manager.

## What Was Implemented

### Backend (AWS Lambda Functions)
All Lambda functions are located in `backend/lambda/domains/`:

1. **connect.js** - Initiates domain connection with DNS verification
2. **list.js** - Lists all domains for a user
3. **get.js** - Gets detailed information about a single domain
4. **verify.js** - Verifies domain ownership via DNS TXT record
5. **dns-records.js** - CRUD operations for DNS records (A, AAAA, CNAME, MX, TXT, etc.)
6. **subdomains.js** - Create and manage subdomains
7. **email-forwarding.js** - Configure email forwarding rules
8. **ssl.js** - Request and manage SSL certificates via AWS Certificate Manager
9. **delete.js** - Remove domain connections

### Database Schema
Migration file: `backend/database/migrations/create_domains_tables.sql`

**Tables created:**
- `domains` - Main domain records with verification and SSL status
- `dns_records` - DNS record configurations
- `subdomains` - Subdomain mappings
- `email_forwards` - Email forwarding rules
- `domain_logs` - Activity tracking

### Frontend
- **Online-assets.html** - Updated with "Domains" navigation item
- **Online-assets-domains.html** - Main domains dashboard
- **domains-service.js** - Frontend service for API integration
- **domains-config.js** - Configuration file for API Gateway URL

## Setup Instructions

### 1. Database Migration
Run the migration script in your Aurora PostgreSQL database:

```bash
psql -h your-aurora-endpoint -U your-username -d infinify -f backend/database/migrations/create_domains_tables.sql
```

### 2. Deploy Lambda Functions

#### Install Dependencies
Each Lambda function needs the AWS SDK. Create a `package.json` in `backend/lambda/domains/`:

```json
{
  "name": "domains-lambda",
  "version": "1.0.0",
  "dependencies": {
    "aws-sdk": "^2.1000.0",
    "pg": "^8.11.0"
  }
}
```

#### Deploy to AWS
Deploy each Lambda function using AWS SAM, Serverless Framework, or AWS CLI:

```bash
# Example using AWS CLI
cd backend/lambda/domains
zip -r connect.zip connect.js ../../config/
aws lambda create-function \
  --function-name domains-connect \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler connect.handler \
  --zip-file fileb://connect.zip
```

**Required IAM Permissions:**
- Route53: `route53:CreateHostedZone`, `route53:ChangeResourceRecordSets`, `route53:GetHostedZone`
- Certificate Manager: `acm:RequestCertificate`, `acm:DescribeCertificate`, `acm:ListCertificates`
- Secrets Manager: `secretsmanager:GetSecretValue` (if using for database credentials)

### 3. Set Up API Gateway

Create REST API endpoints for each Lambda function:

```
POST   /domains/connect
GET    /domains/list
GET    /domains/{domainId}
POST   /domains/{domainId}/verify
DELETE /domains/{domainId}
GET    /domains/{domainId}/dns-records
POST   /domains/{domainId}/dns-records
PUT    /domains/{domainId}/dns-records/{recordId}
DELETE /domains/{domainId}/dns-records/{recordId}
GET    /domains/{domainId}/subdomains
POST   /domains/{domainId}/subdomains
DELETE /domains/{domainId}/subdomains/{subdomainId}
GET    /domains/{domainId}/email-forwards
POST   /domains/{domainId}/email-forwards
PUT    /domains/{domainId}/email-forwards/{forwardId}
DELETE /domains/{domainId}/email-forwards/{forwardId}
GET    /domains/{domainId}/ssl
POST   /domains/{domainId}/ssl
```

### 4. Configure Frontend

Update `domains-config.js` with your API Gateway URL:

```javascript
window.DOMAINS_API_URL = 'https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod';
```

### 5. Environment Variables

Set the following environment variables for your Lambda functions:

- `AWS_REGION` - AWS region (default: us-east-1)
- `RDS_HOST` - Aurora database endpoint
- `RDS_PORT` - Database port (default: 5432)
- `RDS_DATABASE` - Database name
- `RDS_USER` - Database username
- `RDS_PASSWORD` - Database password (or use Secrets Manager)

## Features

### Domain Connection Flow
1. User enters domain name
2. System generates verification token
3. User adds DNS TXT record: `_inf-verification` with value `inf-verification={token}`
4. User clicks "Verify" to check DNS record
5. Domain status updates to "verified" or "connected"

### DNS Management
- Support for all common DNS record types (A, AAAA, CNAME, MX, TXT, NS, SRV, CAA)
- Create, update, and delete DNS records
- TTL and priority configuration

### Subdomain Management
- Create subdomains pointing to IPs, CNAMEs, S3 buckets, CloudFront distributions, or load balancers
- Automatic CNAME record creation
- SSL certificate support for subdomains

### Email Forwarding
- Configure email forwarding rules
- Support for wildcard forwarding (`*@example.com`)
- Enable/disable forwarding rules

### SSL Certificates
- Automatic SSL certificate requests via AWS Certificate Manager
- DNS-based validation
- Support for wildcard certificates
- Certificate status monitoring

## Security Considerations

1. **Domain Ownership Verification**: Users must verify domain ownership via DNS before managing it
2. **User Isolation**: All queries filter by `cognito_user_id` to ensure users can only manage their own domains
3. **Rate Limiting**: Consider implementing rate limiting on DNS operations
4. **SSL Validation**: Certificates are validated through AWS Certificate Manager

## Testing

1. **Connect a Domain**: Use the "Connect Domain" button in the dashboard
2. **Verify Domain**: Add the DNS TXT record and click "Verify"
3. **Manage DNS**: Add/update/delete DNS records
4. **Create Subdomain**: Create a subdomain pointing to a target
5. **Configure Email Forwarding**: Set up email forwarding rules
6. **Request SSL**: Request an SSL certificate for your domain

## Troubleshooting

### Domain Verification Fails
- Ensure DNS TXT record is correctly added
- Wait a few minutes for DNS propagation
- Check that the record name is `_inf-verification` (with underscore)
- Verify the record value matches exactly

### SSL Certificate Issues
- Domain must be verified before requesting SSL
- Ensure DNS validation records are added correctly
- Check AWS Certificate Manager console for validation status

### API Errors
- Verify API Gateway URL in `domains-config.js`
- Check Lambda function logs in CloudWatch
- Ensure IAM roles have correct permissions
- Verify database connection and credentials

## Next Steps

1. Deploy Lambda functions to AWS
2. Set up API Gateway endpoints
3. Run database migration
4. Update `domains-config.js` with API Gateway URL
5. Test domain connection flow
6. Configure Route53 hosted zones (if managing DNS through Route53)
7. Set up SSL certificate automation

