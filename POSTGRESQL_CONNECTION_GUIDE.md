# PostgreSQL Connection Guide

This guide will help you connect your AWS Aurora PostgreSQL database to a new PostgreSQL project.

## Quick Start (5 minutes)

1. **Get your database connection details** from AWS RDS Console
2. **Create a `.env` file** in the `backend` directory with your credentials:
   ```bash
   RDS_HOST=your-cluster.cluster-xxxxx.ap-southeast-2.rds.amazonaws.com
   RDS_PORT=5432
   RDS_DATABASE=infinify
   RDS_USER=infinify_admin
   RDS_PASSWORD=your-password
   ```
3. **Install dependencies** (if not already installed):
   ```bash
   cd backend
   npm install
   ```
4. **Test the connection**:
   ```bash
   npm run test:db
   ```
5. **Start using the database** - Your Lambda functions and scripts already use `backend/config/database-config.js` which is configured to work with these environment variables!

## Prerequisites

- AWS Aurora PostgreSQL database endpoint
- Database credentials (username and password)
- Database name
- Network access (security group configured to allow your IP/application)

## Step 1: Get Your Database Connection Details

### From AWS RDS Console:

1. Go to **AWS RDS Console** → **Databases**
2. Select your Aurora PostgreSQL cluster
3. Note the following:
   - **Endpoint** (e.g., `your-cluster.cluster-xxxxx.ap-southeast-2.rds.amazonaws.com`)
   - **Port** (usually `5432` for PostgreSQL)
   - **Database name** (e.g., `infinify`)
   - **Master username** (e.g., `infinify_admin`)

### From AWS Secrets Manager (if using):

If your credentials are stored in AWS Secrets Manager:
1. Go to **AWS Secrets Manager**
2. Find your database secret
3. Retrieve the JSON with connection details

## Step 2: Configure Environment Variables

### Option A: Local Development (.env file)

Create a `.env` file in your `backend` directory:

```bash
# AWS Region
AWS_REGION=ap-southeast-2

# Database Connection
RDS_HOST=your-cluster.cluster-xxxxx.ap-southeast-2.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=infinify
RDS_USER=infinify_admin
RDS_PASSWORD=your-secure-password

# Optional: Aurora Cluster Endpoints
RDS_CLUSTER_ENDPOINT=your-cluster.cluster-xxxxx.ap-southeast-2.rds.amazonaws.com
RDS_READER_ENDPOINT=your-cluster.cluster-ro-xxxxx.ap-southeast-2.rds.amazonaws.com
```

### Option B: AWS Lambda Environment Variables

For Lambda functions, set these in the AWS Console:

1. Go to **AWS Lambda** → Your function → **Configuration** → **Environment variables**
2. Add the following variables:
   - `RDS_HOST`
   - `RDS_PORT`
   - `RDS_DATABASE`
   - `RDS_USER`
   - `RDS_PASSWORD`
   - `AWS_REGION`

### Option C: AWS Systems Manager Parameter Store (Recommended for Production)

Store credentials securely in Parameter Store:

```bash
aws ssm put-parameter \
  --name "/infinify/database/host" \
  --value "your-cluster.cluster-xxxxx.ap-southeast-2.rds.amazonaws.com" \
  --type "String" \
  --region ap-southeast-2

aws ssm put-parameter \
  --name "/infinify/database/password" \
  --value "your-password" \
  --type "SecureString" \
  --region ap-southeast-2
```

Then update `backend/config/aws-config.js` to read from Parameter Store.

## Step 3: Test Database Connection

### Using the Test Script

Run the connection test script:

```bash
cd backend
node scripts/test-connection.js
```

### Using psql Command Line

```bash
psql -h your-cluster.cluster-xxxxx.ap-southeast-2.rds.amazonaws.com \
     -U infinify_admin \
     -d infinify \
     -p 5432
```

### Using pgAdmin or DBeaver

1. **pgAdmin**:
   - Right-click **Servers** → **Create** → **Server**
   - **General**: Name = "AWS Aurora"
   - **Connection**: 
     - Host: Your endpoint
     - Port: 5432
     - Database: infinify
     - Username: infinify_admin
     - Password: Your password
   - **SSL**: Enable SSL mode

2. **DBeaver**:
   - New Database Connection → PostgreSQL
   - Host: Your endpoint
   - Port: 5432
   - Database: infinify
   - Username: infinify_admin
   - Password: Your password
   - SSL: Enable

## Step 4: Verify Connection in Your Application

Your existing `backend/config/database-config.js` is already configured to use environment variables. The connection pool will automatically use:

- `RDS_HOST` → `host`
- `RDS_PORT` → `port`
- `RDS_DATABASE` → `database`
- `RDS_USER` → `user`
- `RDS_PASSWORD` → `password`

## Step 5: Security Group Configuration

Ensure your AWS Security Group allows connections:

1. Go to **EC2 Console** → **Security Groups**
2. Find the security group attached to your RDS instance
3. Add **Inbound Rule**:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: 
     - For Lambda: Security group of your Lambda VPC
     - For local dev: Your IP address (or `0.0.0.0/0` for testing only - **NOT recommended for production**)

## Step 6: SSL Connection (Recommended)

Aurora PostgreSQL requires SSL connections. Your configuration already includes:

```javascript
ssl: {
  rejectUnauthorized: false // For Aurora, SSL is required
}
```

For production, consider using SSL certificates:

```javascript
ssl: {
  ca: fs.readFileSync('/path/to/rds-ca-2019-root.pem').toString(),
  rejectUnauthorized: true
}
```

Download the RDS CA certificate from: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html

## Step 7: Connection Pooling

Your configuration uses connection pooling optimized for Aurora:

- **Min connections**: 2
- **Max connections**: 20
- **Idle timeout**: 30 seconds

Adjust these based on your Lambda concurrency and database instance size.

## Troubleshooting

### Connection Timeout

**Problem**: Connection times out

**Solutions**:
- Check security group allows your IP/application
- Verify endpoint is correct
- Check if database is in a VPC (Lambda needs VPC configuration)
- Verify network connectivity

### Authentication Failed

**Problem**: Password authentication failed

**Solutions**:
- Verify username and password
- Check if user exists in database
- Verify password hasn't expired
- Check IAM database authentication if enabled

### SSL Required

**Problem**: SSL connection required

**Solutions**:
- Ensure `ssl: { rejectUnauthorized: false }` is set
- For production, use proper SSL certificates

### Too Many Connections

**Problem**: Too many database connections

**Solutions**:
- Reduce `max` pool size
- Check for connection leaks
- Use Aurora Serverless for auto-scaling
- Enable connection pooling at RDS Proxy level

## Connection String Format

If you need a connection string for other tools:

```
postgresql://username:password@host:port/database?sslmode=require
```

Example:
```
postgresql://infinify_admin:password@your-cluster.cluster-xxxxx.ap-southeast-2.rds.amazonaws.com:5432/infinify?sslmode=require
```

## Next Steps

1. ✅ Test connection using the test script
2. ✅ Run database migrations
3. ✅ Test Lambda functions with database queries
4. ✅ Set up monitoring and alerts
5. ✅ Configure automated backups

## Additional Resources

- [AWS RDS PostgreSQL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Aurora PostgreSQL Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.BestPractices.html)
- [pg Library Documentation](https://node-postgres.com/)

