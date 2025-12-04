# Quick Start: Connect to Your Database

You have your AWS PostgreSQL database (`infinify-db`) created. Let's get it connected in 5 minutes!

## 🚀 Quick Setup (5 Steps)

### Step 1: Get Your Database Details from AWS

1. Go to **AWS RDS Console**: https://console.aws.amazon.com/rds/
2. Click on your database `infinify-db`
3. Copy these values:
   - **Endpoint** (looks like: `infinify-db.xxxxx.us-east-1.rds.amazonaws.com`)
   - **Port** (usually `5432`)
   - **Master username** (e.g., `postgres`)
   - **Master password** (the one you set when creating the database)

### Step 2: Fix Security Group (Most Important!)

**This is usually why databases aren't accessible!**

1. In the RDS Console, on your database page, scroll to **Connectivity & security**
2. Click on the **Security group** link
3. Click **Edit inbound rules**
4. Click **Add rule**:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: `0.0.0.0/0` (for testing - allows from anywhere)
5. Click **Save rules**

### Step 3: Create .env File

```bash
cd backend
```

Create a file named `.env`:

```bash
touch .env
```

Open it and add (replace with YOUR actual values):

```env
RDS_HOST=infinify-db.xxxxx.us-east-1.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=infinify
RDS_USER=postgres
RDS_PASSWORD=your-actual-password
AWS_REGION=us-east-1
```

**Replace:**
- `xxxxx` with your actual endpoint
- `postgres` with your actual username
- `your-actual-password` with your actual password

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Test Connection

```bash
npm run verify:db
```

This will run comprehensive checks and tell you exactly what's wrong if something fails.

## ✅ Success!

If you see:
```
✅ All checks passed! Your database is ready to use.
```

You're all set! 🎉

## ❌ Still Having Issues?

Run the detailed troubleshooting guide:
```bash
# Read the full guide
cat DATABASE_SETUP_FROM_SCRATCH.md
```

Or check:
1. Database status is "Available" (not "Creating")
2. Security group allows PostgreSQL on port 5432
3. Database is "Publicly accessible" = Yes
4. `.env` file has correct values
5. No typos in endpoint or password

## Next Steps

Once connected:
1. Create the database: `CREATE DATABASE infinify;`
2. Run migrations
3. Test your Lambda functions



