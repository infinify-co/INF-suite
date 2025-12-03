/**
 * Example: Using the Database Connection in Your Project
 * 
 * This file demonstrates how to use the database connection
 * in your own scripts and applications.
 */

// Option 1: Use the existing connection pool (recommended)
const pool = require('../config/database-config');

async function exampleUsingPool() {
  try {
    // Simple query
    const result = await pool.query('SELECT * FROM users LIMIT 5');
    console.log('Users:', result.rows);
    
    // Parameterized query (prevents SQL injection)
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['user@example.com']
    );
    console.log('User:', userResult.rows[0]);
    
    // Transaction example
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Your queries here
      await client.query('INSERT INTO users (email) VALUES ($1)', ['new@example.com']);
      await client.query('UPDATE users SET updated_at = NOW() WHERE email = $1', ['new@example.com']);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Database error:', error);
  }
}

// Option 2: Create your own connection (for special cases)
const { Pool: CreatePool } = require('pg');
const awsConfig = require('../config/aws-config');

async function exampleCustomConnection() {
  const customPool = new CreatePool({
    host: awsConfig.database.host,
    port: awsConfig.database.port,
    database: awsConfig.database.database,
    user: awsConfig.database.user,
    password: awsConfig.database.password,
    ssl: awsConfig.database.ssl,
    max: 5, // Smaller pool for this use case
  });
  
  try {
    const result = await customPool.query('SELECT NOW()');
    console.log('Current time:', result.rows[0].now);
  } finally {
    await customPool.end();
  }
}

// Option 3: Using in Lambda functions (already set up)
// Your Lambda functions in backend/lambda/ already use:
// const pool = require('../../config/database-config');
// 
// Example from backend/lambda/users/list.js:
/*
exports.handler = async (event) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    return {
      statusCode: 200,
      body: JSON.stringify({ users: result.rows })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
*/

// Run examples (uncomment to test)
// exampleUsingPool();
// exampleCustomConnection();

module.exports = {
  exampleUsingPool,
  exampleCustomConnection
};

