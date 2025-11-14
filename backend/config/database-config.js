// Database Connection Pool Configuration
const { Pool } = require('pg');
const awsConfig = require('./aws-config');

// Create connection pool
const pool = new Pool({
  host: awsConfig.database.host,
  port: awsConfig.database.port,
  database: awsConfig.database.database,
  user: awsConfig.database.user,
  password: awsConfig.database.password,
  ssl: awsConfig.database.ssl,
  max: awsConfig.database.pool.max,
  min: awsConfig.database.pool.min,
  idleTimeoutMillis: awsConfig.database.pool.idleTimeoutMillis,
  connectionTimeoutMillis: 2000
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

