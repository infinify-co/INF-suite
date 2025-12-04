#!/usr/bin/env node

/**
 * Quick Database Connection Helper
 * Simple script to execute a single query against the database
 * 
 * Usage:
 *   node scripts/quick-connect.js "SELECT * FROM users LIMIT 5"
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/database-config');

const query = process.argv[2] || 'SELECT NOW() as current_time, version() as version';

async function runQuery() {
  try {
    console.log('🔍 Executing query...\n');
    console.log(`Query: ${query}\n`);
    
    const result = await pool.query(query);
    
    console.log(`✅ Query executed successfully! (${result.rows.length} rows)\n`);
    
    if (result.rows.length > 0) {
      console.log('Results:');
      console.log(JSON.stringify(result.rows, null, 2));
    } else {
      console.log('No rows returned.');
    }
    
  } catch (error) {
    console.error('❌ Query failed!\n');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runQuery();



