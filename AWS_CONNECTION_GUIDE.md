# AWS Database Connection Guide for Beginners

This guide will walk you through connecting your database to AWS step-by-step. Don't worry if you're new to AWS - we'll go slow!

## 🎯 What We're Doing

We're going to:
1. Create an AWS account (if you don't have one)
2. Set up a PostgreSQL database on AWS RDS
3. Connect your application to it
4. Migrate your data from Supabase (if you have any)

## Step 1: Create AWS Account (5 minutes)

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click **"Create an AWS Account"**
3. Follow the signup process (you'll need a credit card, but we'll use the free tier)
4. **Important**: AWS Free Tier includes:
   - 750 hours/month of RDS (database) for 12 months
   - 5 GB of S3 storage
   - This should be enough to get started!

## Step 2: Install AWS CLI (10 minutes)

The AWS CLI lets you control AWS from your terminal.

### On macOS:
```bash
brew install awscli
```

### On Windows:
Download from: https://aws.amazon.com/cli/

### Verify installation:
```bash
aws --version
```

## Step 3: Configure AWS Credentials (5 minutes)

1. In AWS Console, click your name (top right) → **"Security credentials"**
2. Scroll down to **"Access keys"**
3. Click **"Create access key"**
4. Choose **"Command Line Interface (CLI)"**
5. Download the CSV file (keep it safe!)
6. Run this command in your terminal:
```bash
aws configure
```
7. Enter:
   - **AWS Access Key ID**: (from the CSV file)
   - **AWS Secret Access Key**: (from the CSV file)
   - **Default region**: `us-east-1` (or your preferred region)
   - **Default output format**: `json`

## Step 4: Create Your Database on AWS RDS (15 minutes)

### Option A: Using AWS Console (Easiest for Beginners)

1. Go to [AWS RDS Console](https://console.aws.amazon.com/rds/)
2. Click **"Create database"**
3. Choose **"Standard create"**
4. Select **PostgreSQL** (version 15 or 16)
5. Under **Templates**, select **"Free tier"**
6. Fill in:
   - **DB instance identifier**: `infinify-db`
   - **Master username**: `infinify_admin`
   - **Master password**: Create a strong password (save it somewhere safe!)
   - **Confirm password**: Enter again
7. Under **Instance configuration**:
   - **DB instance class**: `db.t3.micro` (Free tier eligible)
8. Under **Storage**:
   - **Storage type**: General Purpose SSD (gp3)
   - **Allocated storage**: 20 GB (free tier)
9. Under **Connectivity**:
   - **Public access**: Choose **"Yes"** (for now, so you can connect)
   - **VPC**: Default VPC
   - **Security group**: Create new (name it `infinify-db-sg`)
10. Under **Database authentication**: Choose **"Password authentication"**
11. Click **"Create database"**
12. **Wait 5-10 minutes** for the database to be created
13. Once it says **"Available"**, click on it to see the details
14. **Copy the "Endpoint"** - it looks like: `infinify-db.xxxxx.us-east-1.rds.amazonaws.com`

### Option B: Using AWS CLI (Faster, but requires CLI setup)

```bash
aws rds create-db-instance \
  --db-instance-identifier infinify-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username infinify_admin \
  --master-user-password YOUR_PASSWORD_HERE \
  --allocated-storage 20 \
  --publicly-accessible \
  --region us-east-1
```

## Step 5: Configure Security Group (5 minutes)

Your database needs to allow connections from your computer and your application.

1. Go to **EC2 Console** → **Security Groups**
2. Find `infinify-db-sg` (the one we created)
3. Click **"Edit inbound rules"**
4. Click **"Add rule"**
5. Configure:
   - **Type**: PostgreSQL
   - **Protocol**: TCP
   - **Port**: 5432
   - **Source**: My IP (or 0.0.0.0/0 for testing - **change this later for security!**)
6. Click **"Save rules"**

## Step 6: Set Up Your Database Schema (10 minutes)

1. **Install PostgreSQL client** (if you don't have it):
   ```bash
   # macOS
   brew install postgresql
   
   # Or download pgAdmin from https://www.pgadmin.org/
   ```

2. **Connect to your database**:
   ```bash
   psql -h YOUR_RDS_ENDPOINT -U infinify_admin -d postgres
   ```
   (Replace `YOUR_RDS_ENDPOINT` with the endpoint from Step 4)

3. **Enter your password** when prompted

4. **Create your database**:
   ```sql
   CREATE DATABASE infinify;
   \c infinify
   ```

5. **Run the schema**:
   ```bash
   # Exit psql first (type \q)
   psql -h YOUR_RDS_ENDPOINT -U infinify_admin -d infinify -f aws-infrastructure/rds-setup.sql
   ```
   
   Or if you prefer, copy the contents of `aws-infrastructure/rds-setup.sql` and paste into psql.

## Step 7: Update Your Application Configuration (5 minutes)

1. **Create a `.env` file** in the `backend` directory:
   ```bash
   cd backend
   touch .env
   ```

2. **Add your database credentials** to `.env`:
   ```env
   # AWS Configuration
   AWS_REGION=us-east-1

   # RDS Database (replace with YOUR values)
   RDS_HOST=infinify-db.xxxxx.us-east-1.rds.amazonaws.com
   RDS_PORT=5432
   RDS_DATABASE=infinify
   RDS_USER=infinify_admin
   RDS_PASSWORD=YOUR_PASSWORD_HERE

   # JWT Secret (generate a random string)
   JWT_SECRET=your-super-secret-random-string-here

   # S3 Buckets (we'll create these next)
   S3_BUCKET_USER_FILES=infinify-user-files
   S3_BUCKET_BACKUPS=infinify-backups
   S3_BUCKET_STATIC=infinify-static
   ```

3. **Important**: Add `.env` to `.gitignore` so you don't commit secrets!

## Step 8: Test the Connection (5 minutes)

1. **Install dependencies** (if not already done):
   ```bash
   cd backend
   npm install pg
   ```

2. **Test the connection** by running:
   ```bash
   node -e "const pool = require('./config/database-config'); pool.query('SELECT NOW()', (err, res) => { if (err) console.error(err); else console.log('Connected!', res.rows[0]); process.exit(); });"
   ```

   You should see: `Connected! { now: '2024-...' }`

## Step 9: Migrate Data from Supabase (Optional - 15 minutes)

If you have data in Supabase that you want to move:

1. **Export from Supabase**:
   - Go to Supabase Dashboard → SQL Editor
   - Run: `SELECT * FROM your_table_name;`
   - Export results as CSV

2. **Import to AWS RDS**:
   ```bash
   psql -h YOUR_RDS_ENDPOINT -U infinify_admin -d infinify -c "\COPY your_table_name FROM 'path/to/file.csv' CSV HEADER;"
   ```

## Step 10: Update Your Frontend (5 minutes)

If your frontend currently connects to Supabase, you'll need to:

1. **Update connection strings** in your JavaScript files
2. **Point to your new AWS API** (once you set up API Gateway)
3. **Or use the database directly** through your backend

## 🎉 You're Done!

Your database is now connected to AWS! 

## 🔒 Security Checklist (Do This Soon!)

- [ ] Change security group to only allow your IP address
- [ ] Enable SSL connections (already configured in code)
- [ ] Set up database backups
- [ ] Use strong passwords
- [ ] Never commit `.env` file to git

## 💰 Cost Monitoring

- Set up billing alerts in AWS Console
- Monitor your usage in Cost Explorer
- Free tier lasts 12 months, then ~$15/month for db.t3.micro

## 🆘 Troubleshooting

### "Connection timeout"
- Check security group allows your IP
- Verify database endpoint is correct
- Check database is "Available" (not "Creating")

### "Authentication failed"
- Double-check username and password
- Make sure you're using the master username

### "Database does not exist"
- Run the CREATE DATABASE command again
- Check you're connecting to the right database

## 📚 Next Steps

1. Set up S3 buckets for file storage (see AWS_SETUP.md)
2. Create Lambda functions for your API
3. Set up API Gateway
4. Configure backups

## Need Help?

- AWS Documentation: https://docs.aws.amazon.com/rds/
- AWS Free Tier: https://aws.amazon.com/free/
- Your project's AWS_SETUP.md has more advanced details

