# Site Deployment & Analytics Setup Guide

## Overview

This guide will help you set up the Site Deployment and Analytics system, allowing users to deploy their sites on your platform and track traffic metrics.

## Features

- **Site Deployment**: Users can create, deploy, and manage static sites
- **Traffic Analytics**: Real-time tracking of pageviews, visits, unique visitors
- **Performance Metrics**: Load times, device breakdown, top pages
- **Custom Domains**: Connect custom domains to deployed sites
- **Deployment History**: Track all deployments with versioning

## Prerequisites

1. AWS Account with RDS, S3, Lambda, and API Gateway configured
2. Database migration completed (see Step 1)
3. API Gateway endpoints configured
4. Frontend configuration updated

## Step 1: Database Setup

Run the database migration to create the necessary tables:

```bash
psql -h YOUR_RDS_ENDPOINT -U YOUR_USERNAME -d infinify -f backend/database/migrations/create_sites_tables.sql
```

This creates the following tables:
- `sites` - Site configurations
- `site_deployments` - Deployment history
- `site_files` - Deployed files tracking
- `site_logs` - Activity logs
- `site_analytics` - Raw analytics events
- `site_analytics_daily_summary` - Aggregated daily stats

## Step 2: Configure S3 Buckets

Create S3 buckets for site hosting:

```bash
# Create bucket for site deployments
aws s3 mb s3://infinify-sites-deployments --region us-east-1

# Enable static website hosting (optional, if using S3 website hosting)
aws s3 website s3://infinify-sites-deployments \
  --index-document index.html \
  --error-document error.html
```

## Step 3: Deploy Lambda Functions

### Install Dependencies

For each Lambda function directory:

```bash
cd backend/lambda/sites
npm install pg @aws-sdk/client-s3 @aws-sdk/client-cloudfront
```

### Deploy Functions

Deploy all site-related Lambda functions:

```bash
# Create deployment package
cd backend/lambda/sites
zip -r sites-create.zip create.js ../../config/database-config.js node_modules/

# Deploy to AWS Lambda
aws lambda create-function \
  --function-name infinify-sites-create \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/LambdaExecutionRole \
  --handler create.handler \
  --zip-file fileb://sites-create.zip \
  --timeout 60 \
  --memory-size 512 \
  --environment Variables="{RDS_HOST=your-host,RDS_DATABASE=infinify,RDS_USER=your-user,RDS_PASSWORD=your-password,AWS_REGION=us-east-1}"
```

Repeat for:
- `sites-list.js`
- `sites-get.js`
- `sites-update.js`
- `sites-delete.js`
- `sites-deploy.js`

### Deploy Analytics Functions

```bash
cd backend/lambda/analytics
npm install pg

# Deploy track.js
zip -r analytics-track.zip track.js ../../config/database-config.js node_modules/
aws lambda create-function \
  --function-name infinify-analytics-track \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/LambdaExecutionRole \
  --handler track.handler \
  --zip-file fileb://analytics-track.zip \
  --timeout 30 \
  --memory-size 256

# Deploy get-stats.js
zip -r analytics-get-stats.zip get-stats.js ../../config/database-config.js node_modules/
aws lambda create-function \
  --function-name infinify-analytics-get-stats \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/LambdaExecutionRole \
  --handler get-stats.handler \
  --zip-file fileb://analytics-get-stats.zip \
  --timeout 30 \
  --memory-size 512
```

## Step 4: Configure API Gateway

Add the following routes to your API Gateway:

### Sites Endpoints

- `POST /sites/create` → `infinify-sites-create`
- `GET /sites/list` → `infinify-sites-list`
- `GET /sites/{siteId}` → `infinify-sites-get`
- `PUT /sites/{siteId}` → `infinify-sites-update`
- `DELETE /sites/{siteId}` → `infinify-sites-delete`
- `POST /sites/{siteId}/deploy` → `infinify-sites-deploy`

### Analytics Endpoints

- `POST /analytics/track` → `infinify-analytics-track`
- `GET /analytics/{siteId}/stats` → `infinify-analytics-get-stats`

## Step 5: Configure Frontend

Update `sites-config.js` with your API Gateway URL:

```javascript
window.SITES_API_URL = 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod';
```

## Step 6: Add Analytics Tracking to Deployed Sites

To track analytics on deployed sites, add this script to your site's HTML:

```html
<script>
(function() {
    const siteId = 'YOUR_SITE_ID';
    const analyticsUrl = 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/analytics/track';
    
    // Track pageview
    fetch(analyticsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            siteId: siteId,
            eventType: 'pageview',
            pagePath: window.location.pathname,
            referrer: document.referrer,
            userAgent: navigator.userAgent
        })
    }).catch(err => console.error('Analytics error:', err));
    
    // Track page load time
    window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        fetch(analyticsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteId: siteId,
                eventType: 'pageview',
                pagePath: window.location.pathname,
                loadTimeMs: loadTime
            })
        }).catch(err => console.error('Analytics error:', err));
    });
})();
</script>
```

## Step 7: IAM Permissions

Ensure your Lambda execution role has the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:CreateBucket"
      ],
      "Resource": [
        "arn:aws:s3:::infinify-sites-*",
        "arn:aws:s3:::infinify-sites-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateDistribution",
        "cloudfront:GetDistribution",
        "cloudfront:UpdateDistribution"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances"
      ],
      "Resource": "*"
    }
  ]
}
```

## Usage

### Creating a Site

1. Navigate to `Sites.html`
2. Click "Create Site"
3. Enter site name and configuration
4. Click "Create Site"

### Deploying a Site

1. Click "Deploy" on a site card
2. Select the folder containing your site files
3. Wait for deployment to complete
4. Your site will be available at the generated URL

### Viewing Analytics

1. Click "Analytics" on a site card
2. View traffic statistics, top pages, device breakdown
3. Filter by date range (7d, 30d, 90d)

## Troubleshooting

### Deployment Fails

- Check S3 bucket permissions
- Verify Lambda function has correct IAM role
- Check CloudWatch logs for errors

### Analytics Not Tracking

- Verify analytics endpoint URL is correct
- Check browser console for errors
- Ensure CORS is configured on API Gateway

### Site Not Accessible

- Verify S3 bucket is public or CloudFront is configured
- Check DNS records if using custom domain
- Verify SSL certificate is issued

## Next Steps

1. Set up CloudFront distributions for CDN
2. Configure custom domain SSL certificates
3. Set up automated deployments from Git
4. Add more analytics metrics (conversions, funnels, etc.)
5. Implement rate limiting and usage quotas

## Cost Optimization

- Use S3 lifecycle policies to archive old deployments
- Enable S3 Intelligent-Tiering
- Use CloudFront caching to reduce S3 requests
- Set up CloudWatch billing alerts
- Consider using S3 Transfer Acceleration for large files

## Security Checklist

- [ ] S3 buckets have proper access policies
- [ ] Lambda functions use least privilege IAM roles
- [ ] API Gateway has rate limiting enabled
- [ ] Analytics tracking respects user privacy (GDPR)
- [ ] Custom domains use SSL certificates
- [ ] Database credentials are stored securely
- [ ] CORS is properly configured

