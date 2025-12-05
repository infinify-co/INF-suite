# Database Setup from Scratch - Complete Guide

Since you have your AWS PostgreSQL database (`infinify-db`) created, let's verify it's accessible and set everything up properly.

## Step 1: Verify Database Status in AWS Console

1. Go to **AWS RDS Console**: https://console.aws.amazon.com/rds/
2. Click on **Databases** in the left sidebar
3. Find your database `infinify-db`
4. **Check the status** - it should say **"Available"** (not "Creating", "Modifying", or "Stopped")
5. **Copy these details** (you'll need them):
   - **Endpoint** (e.g., `infinify-db.xxxxx.us-east-1.rds.amazonaws.com`)
   - **Port** (usually `5432`)
   - **Master username** (e.g., `postgres` or `infinify_admin`)
   - **Database name** (might be `postgres` by default)

## Step 2: Check Security Group Settings

This is the #1 reason databases are not accessible!

1. In the RDS Console, click on your database `infinify-db`
2. Scroll down to **Connectivity & security**
3. Click on the **Security group** link (e.g., `sg-xxxxx`)
4. Click on the **Inbound rules** tab
5. **Check if there's a rule for PostgreSQL**:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Should allow your IP or `0.0.0.0/0` (for testing)

### If no PostgreSQL rule exists, add one:

1. Click **Edit inbound rules**
2. Click **Add rule**
3. Configure:
   - **Type**: PostgreSQL
   - **Protocol**: TCP
   - **Port range**: 5432
   - **Source**: 
     - For testing: `0.0.0.0/0` (allows from anywhere - **NOT secure for production**)
     - For production: `My IP` (only your current IP)
4. Click **Save rules**

## Step 3: Verify Public Accessibility

1. Still in the RDS Console, on your database details page
2. Check **Connectivity & security** → **Publicly accessible**
3. It should say **"Yes"** (if you want to connect from your local machine)
4. If it says **"No"**, you'll need to:
   - Click **Modify** button
   - Under **Connectivity**, change **Public access** to **"Yes"**
   - Click **Continue** → **Apply immediately**
   - Wait 5-10 minutes for the change to apply

## Step 4: Get Your Current IP Address

For security group configuration, you need your IP:

```bash
# On macOS/Linux
curl ifconfig.me

# Or visit: https://whatismyipaddress.com/
```

## Step 5: Test Connection from Command Line

### Install PostgreSQL Client (if needed)

**macOS:**
```bash
brew install postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql-client
```

**Windows:**
Download from: https://www.postgresql.org/download/windows/

### Test Connection

Replace the values with your actual database details:

```bash
psql -h YOUR_ENDPOINT -U YOUR_USERNAME -d postgres -p 5432
```

Example:
```bash
psql -h infinify-db.xxxxx.us-east-1.rds.amazonaws.com -U postgres -d postgres -p 5432
```

**If it asks for a password**, enter your master password.

**If it connects successfully**, you'll see:
```
psql (15.x)
Type "help" for help.

postgres=>
```

Type `\q` to exit.

### Common Connection Errors:

**Error: "Connection timeout"**
- ✅ Security group doesn't allow your IP
- ✅ Database is not publicly accessible
- ✅ Wrong endpoint address
- ✅ Database is still being created/modified

**Error: "Password authentication failed"**
- ✅ Wrong username or password
- ✅ Check your master username and password

**Error: "Database does not exist"**
- ✅ Try connecting to `postgres` database first (default)
- ✅ Create the `infinify` database (see Step 6)

## Step 6: Create the Application Database

Once connected, create your application database:

```sql
-- Connect to postgres database first
\c postgres

-- Create the infinify database
CREATE DATABASE infinify;

-- Connect to the new database
\c infinify

-- Verify you're connected
SELECT current_database();
```

You should see: `infinify`

## Step 7: Set Up Environment Variables

Create or update your `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Add these variables (replace with YOUR actual values):

```env
# AWS Configuration
AWS_REGION=us-east-1

# Database Connection - REPLACE WITH YOUR VALUES
RDS_HOST=infinify-db.xxxxx.us-east-1.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=infinify
RDS_USER=postgres
RDS_PASSWORD=your-actual-password-here

# Optional: If you have other services
# JWT_SECRET=your-jwt-secret
# S3_BUCKET_USER_FILES=infinify-user-files
```

**Important**: 
- Replace `xxxxx` with your actual endpoint
- Replace `postgres` with your actual master username
- Replace `your-actual-password-here` with your actual password
- Make sure `.env` is in `.gitignore` (never commit passwords!)

## Step 8: Test Connection with Node.js

### Install dependencies (if not already done):

```bash
cd backend
npm install
```

### Run the connection test:

```bash
npm run test:db
```

Or manually:

```bash
node scripts/test-connection.js
```

**Expected output:**
```
🔌 Testing PostgreSQL connection...

Connection details:
   Host: infinify-db.xxxxx.us-east-1.rds.amazonaws.com
   Port: 5432
   Database: infinify
   User: postgres
   SSL: Enabled

⏳ Connecting to database...
✅ Successfully connected to database!
```

## Step 9: Run Database Migrations

Once connected, run your database migrations:

```bash
# Connect to database
psql -h YOUR_ENDPOINT -U YOUR_USERNAME -d infinify

# Run migrations one by one
\i backend/database/migrations/001_add_business_fields_to_users.sql
```

Or copy and paste the SQL from each migration file into psql.

## Step 10: Verify Everything Works

Test a simple query:

```bash
node scripts/quick-connect.js "SELECT NOW() as current_time, version() as version"
```

You should see the current time and PostgreSQL version.

## Troubleshooting Checklist

If you're still having issues, go through this checklist:

- [ ] Database status is "Available" (not "Creating" or "Modifying")
- [ ] Security group has inbound rule for PostgreSQL (port 5432)
- [ ] Security group allows your IP address (or 0.0.0.0/0 for testing)
- [ ] Database is publicly accessible (if connecting from local machine)
- [ ] Endpoint address is correct (copy from AWS Console)
- [ ] Port is 5432 (default PostgreSQL port)
- [ ] Username is correct (check in AWS Console)
- [ ] Password is correct (try resetting if unsure)
- [ ] Database name exists (create it if needed)
- [ ] `.env` file has correct values
- [ ] No firewall blocking port 5432
- [ ] VPN is not interfering (if using one)

## Common Issues and Solutions

### Issue: "Connection timeout" from local machine

**Solution:**
1. Check security group allows your IP
2. Verify database is publicly accessible
3. Check if your ISP/network blocks port 5432

### Issue: "Connection timeout" from Lambda

**Solution:**
1. Lambda must be in the same VPC as the database
2. Security group must allow Lambda's security group
3. Check Lambda VPC configuration

### Issue: "Password authentication failed"

**Solution:**
1. Reset the master password in AWS Console
2. Wait 5-10 minutes for change to apply
3. Update `.env` file with new password

### Issue: "Database does not exist"

**Solution:**
1. Connect to `postgres` database first
2. Create the `infinify` database (see Step 6)
3. Update `RDS_DATABASE` in `.env` file

## Next Steps

Once your connection is working:

1. ✅ Run all database migrations
2. ✅ Test your Lambda functions
3. ✅ Set up API Gateway
4. ✅ Update frontend to use new endpoints
5. ✅ Secure your security groups (restrict to specific IPs)

## Need More Help?

- Check AWS RDS logs in CloudWatch
- Review security group rules
- Verify network ACLs (if using custom VPC)
- Check AWS Service Health Dashboard

## Quick Reference Commands

```bash
# Test connection
psql -h YOUR_ENDPOINT -U YOUR_USERNAME -d postgres

# Test with Node.js
cd backend
npm run test:db

# Quick query
node scripts/quick-connect.js "SELECT * FROM users LIMIT 5"

# Check your IP
curl ifconfig.me
```





