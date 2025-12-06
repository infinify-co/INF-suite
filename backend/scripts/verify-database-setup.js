#!/usr/bin/env node

/**
 * Database Setup Verification Script
 * Comprehensive check of database connectivity and configuration
 * 
 * Usage:
 *   node scripts/verify-database-setup.js
 */

// Try to load dotenv if available
try {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
} catch (e) {
  // dotenv not available, use environment variables directly
}

const { Pool } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function checkEnvironmentVariables() {
  logSection('Step 1: Checking Environment Variables');
  
  const required = {
    'RDS_HOST': process.env.RDS_HOST || process.env.DB_HOST,
    'RDS_PORT': process.env.RDS_PORT || process.env.DB_PORT || '5432',
    'RDS_DATABASE': process.env.RDS_DATABASE || process.env.DB_NAME,
    'RDS_USER': process.env.RDS_USER || process.env.DB_USER,
    'RDS_PASSWORD': process.env.RDS_PASSWORD || process.env.DB_PASSWORD
  };
  
  const missing = [];
  const found = {};
  
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      missing.push(key);
      log(`❌ ${key}: NOT SET`, 'red');
    } else {
      found[key] = value;
      if (key === 'RDS_PASSWORD') {
        log(`✅ ${key}: ${'*'.repeat(value.length)} (hidden)`, 'green');
      } else {
        log(`✅ ${key}: ${value}`, 'green');
      }
    }
  }
  
  if (missing.length > 0) {
    log('\n⚠️  Missing environment variables!', 'yellow');
    log('Please create a .env file in the backend directory with:', 'yellow');
    console.log(`
RDS_HOST=your-database-endpoint.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=infinify
RDS_USER=your-username
RDS_PASSWORD=your-password
    `);
    return null;
  }
  
  return found;
}

async function testConnection(config) {
  logSection('Step 2: Testing Database Connection');
  
  log(`Connecting to: ${config.RDS_HOST}:${config.RDS_PORT}`, 'blue');
  log(`Database: ${config.RDS_DATABASE}`, 'blue');
  log(`User: ${config.RDS_USER}`, 'blue');
  
  const pool = new Pool({
    host: config.RDS_HOST,
    port: parseInt(config.RDS_PORT),
    database: config.RDS_DATABASE,
    user: config.RDS_USER,
    password: config.RDS_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
  });
  
  let client;
  
  try {
    log('\n⏳ Attempting connection...', 'yellow');
    client = await pool.connect();
    log('✅ Connection successful!', 'green');
    return { pool, client, success: true };
  } catch (error) {
    log(`❌ Connection failed!`, 'red');
    log(`\nError: ${error.message}`, 'red');
    log(`Error code: ${error.code || 'N/A'}`, 'red');
    
    // Provide helpful error messages
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      log('\n💡 Troubleshooting tips:', 'yellow');
      log('   1. Check if database endpoint is correct', 'yellow');
      log('   2. Verify security group allows your IP', 'yellow');
      log('   3. Check if database is publicly accessible', 'yellow');
      log('   4. Verify database status is "Available" in AWS Console', 'yellow');
      log('   5. Check if port 5432 is not blocked by firewall', 'yellow');
    } else if (error.code === '28P01') {
      log('\n💡 Troubleshooting tips:', 'yellow');
      log('   1. Verify username and password are correct', 'yellow');
      log('   2. Check if password has special characters that need escaping', 'yellow');
      log('   3. Try resetting the master password in AWS Console', 'yellow');
    } else if (error.code === '3D000') {
      log('\n💡 Troubleshooting tips:', 'yellow');
      log('   1. Database does not exist', 'yellow');
      log('   2. Try connecting to "postgres" database first', 'yellow');
      log('   3. Create the database: CREATE DATABASE infinify;', 'yellow');
    } else if (error.message.includes('SSL')) {
      log('\n💡 Troubleshooting tips:', 'yellow');
      log('   1. Aurora requires SSL connections', 'yellow');
      log('   2. SSL is already configured in the connection', 'yellow');
    }
    
    await pool.end();
    return { pool: null, client: null, success: false, error };
  }
}

async function testQueries(client) {
  logSection('Step 3: Testing Database Queries');
  
  try {
    // Test 1: Get version
    log('\n📊 Test 1: Getting database version...', 'blue');
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version.split(',')[0];
    log(`✅ PostgreSQL version: ${version}`, 'green');
    
    // Test 2: Get current time
    log('\n📊 Test 2: Getting current database time...', 'blue');
    const timeResult = await client.query('SELECT NOW() as current_time');
    log(`✅ Current time: ${timeResult.rows[0].current_time}`, 'green');
    
    // Test 3: Check if users table exists
    log('\n📊 Test 3: Checking for users table...', 'blue');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    
    if (tableCheck.rows.length > 0) {
      log('✅ Users table exists', 'green');
      
      // Get user count
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      log(`   Total users: ${userCount.rows[0].count}`, 'green');
    } else {
      log('⚠️  Users table not found', 'yellow');
      log('   You may need to run database migrations', 'yellow');
    }
    
    // Test 4: List all tables
    log('\n📊 Test 4: Listing all tables...', 'blue');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      log(`✅ Found ${tablesResult.rows.length} table(s):`, 'green');
      tablesResult.rows.forEach(row => {
        log(`   - ${row.table_name}`, 'green');
      });
    } else {
      log('⚠️  No tables found in public schema', 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`❌ Query test failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkConnectionPool(pool) {
  logSection('Step 4: Checking Connection Pool');
  
  try {
    const stats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
    
    log(`Total connections: ${stats.totalCount}`, 'blue');
    log(`Idle connections: ${stats.idleCount}`, 'blue');
    log(`Waiting requests: ${stats.waitingCount}`, 'blue');
    
    if (stats.totalCount > 0) {
      log('✅ Connection pool is working', 'green');
    }
    
    return true;
  } catch (error) {
    log(`❌ Pool check failed: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  console.clear();
  log('\n🔍 Database Setup Verification Tool\n', 'cyan');
  log('This script will verify your database connection and configuration.\n', 'blue');
  
  // Step 1: Check environment variables
  const config = await checkEnvironmentVariables();
  if (!config) {
    log('\n❌ Please set up your environment variables first.', 'red');
    process.exit(1);
  }
  
  // Step 2: Test connection
  const connection = await testConnection(config);
  if (!connection.success) {
    log('\n❌ Database connection failed. Please fix the issues above.', 'red');
    process.exit(1);
  }
  
  const { pool, client } = connection;
  
  // Step 3: Test queries
  const queriesOk = await testQueries(client);
  
  // Step 4: Check connection pool
  const poolOk = await checkConnectionPool(pool);
  
  // Summary
  logSection('Summary');
  
  if (queriesOk && poolOk) {
    log('✅ All checks passed! Your database is ready to use.', 'green');
    log('\nNext steps:', 'cyan');
    log('  1. Run database migrations if needed', 'blue');
    log('  2. Test your Lambda functions', 'blue');
    log('  3. Update your frontend configuration', 'blue');
  } else {
    log('⚠️  Some checks failed, but connection is working.', 'yellow');
  }
  
  // Cleanup
  if (client) {
    client.release();
  }
  if (pool) {
    await pool.end();
  }
  
  rl.close();
}

// Run the verification
main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});








