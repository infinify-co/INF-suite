#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests connection to AWS Aurora PostgreSQL database
 * 
 * Usage:
 *   node scripts/test-connection.js
 * 
 * Make sure environment variables are set:
 *   RDS_HOST, RDS_PORT, RDS_DATABASE, RDS_USER, RDS_PASSWORD
 */

// Try to load dotenv if available (optional for Lambda environments)
try {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
} catch (e) {
  // dotenv not available, use environment variables directly
}

const { Pool } = require('pg');

// Get connection details from environment
const config = {
  host: process.env.RDS_HOST || process.env.DB_HOST,
  port: parseInt(process.env.RDS_PORT || process.env.DB_PORT || '5432'),
  database: process.env.RDS_DATABASE || process.env.DB_NAME || 'infinify',
  user: process.env.RDS_USER || process.env.DB_USER,
  password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // Required for Aurora
  },
  connectionTimeoutMillis: 5000
};

// Validate required fields
const required = ['host', 'user', 'password', 'database'];
const missing = required.filter(field => !config[field]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(field => {
    console.error(`   - ${field.toUpperCase() === 'HOST' ? 'RDS_HOST' : 
                   field.toUpperCase() === 'USER' ? 'RDS_USER' : 
                   field.toUpperCase() === 'PASSWORD' ? 'RDS_PASSWORD' : 
                   field.toUpperCase() === 'DATABASE' ? 'RDS_DATABASE' : field}`);
  });
  console.error('\nPlease set these in your .env file or environment variables.');
  process.exit(1);
}

console.log('🔌 Testing PostgreSQL connection...\n');
console.log('Connection details:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   SSL: Enabled\n`);

// Create a test connection
const pool = new Pool(config);

// Test connection
async function testConnection() {
  let client;
  
  try {
    console.log('⏳ Connecting to database...');
    
    // Get a client from the pool
    client = await pool.connect();
    console.log('✅ Successfully connected to database!\n');
    
    // Test query: Get database version
    console.log('📊 Testing query execution...');
    const versionResult = await client.query('SELECT version()');
    console.log('✅ Query executed successfully!\n');
    console.log('Database version:');
    console.log(`   ${versionResult.rows[0].version.split(',')[0]}\n`);
    
    // Test query: Get current time
    const timeResult = await client.query('SELECT NOW() as current_time');
    console.log('Current database time:');
    console.log(`   ${timeResult.rows[0].current_time}\n`);
    
    // Test query: Check if users table exists
    console.log('📋 Checking database schema...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Users table exists\n');
      
      // Get user count
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`   Total users: ${userCount.rows[0].count}\n`);
    } else {
      console.log('⚠️  Users table not found (you may need to run migrations)\n');
    }
    
    // Test connection pool
    console.log('🏊 Testing connection pool...');
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
    console.log(`   Total connections: ${poolStats.totalCount}`);
    console.log(`   Idle connections: ${poolStats.idleCount}`);
    console.log(`   Waiting requests: ${poolStats.waitingCount}\n`);
    
    console.log('✅ All connection tests passed!\n');
    console.log('🎉 Your database is ready to use!');
    
  } catch (error) {
    console.error('❌ Connection test failed!\n');
    console.error('Error details:');
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Message: ${error.message}\n`);
    
    // Provide helpful error messages
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('💡 Troubleshooting tips:');
      console.error('   1. Check if the database endpoint is correct');
      console.error('   2. Verify your IP is allowed in the security group');
      console.error('   3. Check if the database is in a VPC and accessible');
      console.error('   4. Verify network connectivity');
    } else if (error.code === '28P01') {
      console.error('💡 Troubleshooting tips:');
      console.error('   1. Verify username and password are correct');
      console.error('   2. Check if the user exists in the database');
      console.error('   3. Verify password hasn\'t expired');
    } else if (error.code === '3D000') {
      console.error('💡 Troubleshooting tips:');
      console.error('   1. Verify the database name is correct');
      console.error('   2. Check if the database exists');
    } else if (error.message.includes('SSL')) {
      console.error('💡 Troubleshooting tips:');
      console.error('   1. Aurora requires SSL connections');
      console.error('   2. Ensure SSL is enabled in connection config');
    }
    
    process.exit(1);
  } finally {
    // Release the client
    if (client) {
      client.release();
    }
    // Close the pool
    await pool.end();
    console.log('\n🔌 Connection closed.');
  }
}

// Run the test
testConnection().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

