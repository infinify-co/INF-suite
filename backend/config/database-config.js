// Database Connection Pool Configuration
// Optimized for AWS Aurora PostgreSQL
const { Pool } = require('pg');
const awsConfig = require('./aws-config');

// Create connection pool optimized for Aurora
const pool = new Pool({
  host: awsConfig.database.host,
  port: awsConfig.database.port,
  database: awsConfig.database.database,
  user: awsConfig.database.user,
  password: awsConfig.database.password,
  ssl: awsConfig.database.ssl,
  // Aurora-optimized pool settings
  max: awsConfig.database.pool.max,
  min: awsConfig.database.pool.min,
  idleTimeoutMillis: awsConfig.database.pool.idleTimeoutMillis,
  connectionTimeoutMillis: 5000, // Increased for Aurora
  // Aurora-specific optimizations
  statement_timeout: 30000, // 30 seconds
  query_timeout: 30000,
  // Keep connections alive for Aurora's fast failover
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

module.exports = pool;

