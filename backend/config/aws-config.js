// AWS Configuration
// Store sensitive values in environment variables

const awsConfig = {
  // AWS Region
  region: process.env.AWS_REGION || 'us-east-1',
  
  // AWS Aurora PostgreSQL Configuration
  // Aurora is compatible with PostgreSQL but has better performance and failover
  database: {
    host: process.env.RDS_HOST || '',
    port: process.env.RDS_PORT || 5432,
    database: process.env.RDS_DATABASE || 'infinify',
    user: process.env.RDS_USER || '',
    password: process.env.RDS_PASSWORD || '',
    // Aurora cluster endpoint (for writes) or reader endpoint (for reads)
    // Use cluster endpoint for primary connections
    clusterEndpoint: process.env.RDS_CLUSTER_ENDPOINT || process.env.RDS_HOST || '',
    readerEndpoint: process.env.RDS_READER_ENDPOINT || '',
    ssl: {
      rejectUnauthorized: false // For Aurora, SSL is required
    },
    pool: {
      min: 2,
      max: 20, // Aurora can handle more connections efficiently
      idleTimeoutMillis: 30000
    }
  },
  
  // S3 Configuration
  s3: {
    buckets: {
      userFiles: process.env.S3_BUCKET_USER_FILES || 'infinify-user-files',
      backups: process.env.S3_BUCKET_BACKUPS || 'infinify-backups',
      static: process.env.S3_BUCKET_STATIC || 'infinify-static'
    },
    region: process.env.AWS_REGION || 'us-east-1',
    // Presigned URL expiration (in seconds)
    urlExpiration: 3600 // 1 hour
  },
  
  // API Gateway Configuration
  api: {
    baseUrl: process.env.API_BASE_URL || '',
    apiKey: process.env.API_KEY || '',
    stage: process.env.API_STAGE || 'prod'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || '',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'HS256'
  },
  
  // OTP Configuration
  otp: {
    length: 6,
    expiryMinutes: 15,
    maxAttempts: 3,
    rateLimitPerHour: 3
  },
  
  // Email Configuration (AWS SES)
  email: {
    from: process.env.EMAIL_FROM || 'noreply@infinify.com',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@infinify.com',
    region: process.env.AWS_REGION || 'us-east-1'
  },
  
  // ElastiCache (Redis) Configuration
  redis: {
    host: process.env.REDIS_HOST || '',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    tls: process.env.REDIS_TLS === 'true'
  },
  
  // WebSocket Configuration
  websocket: {
    apiId: process.env.WEBSOCKET_API_ID || '',
    stage: process.env.WEBSOCKET_STAGE || 'prod'
  },
  
  // CORS Configuration
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  }
};

module.exports = awsConfig;

