# AWS Aurora PostgreSQL Setup Guide

## 🎯 What is Aurora?

AWS Aurora is Amazon's managed database service that's compatible with PostgreSQL. It offers:
- **Better Performance**: Up to 3x better than standard PostgreSQL
- **Automatic Failover**: High availability built-in
- **Auto-scaling**: Storage grows automatically
- **Read Replicas**: Automatic read scaling
- **Backup**: Continuous backup to S3

## ✅ Good News!

Your existing PostgreSQL connection code works with Aurora! Aurora is **100% compatible** with PostgreSQL, so no code changes are needed.

## 🔧 Configuration for Aurora

### Connection String Format

Your Aurora connection string:
```
postgres://admin:NYSE33INFSCALE@infinify-base-1.cjugwacawzxp.ap-southeast-2.rds.amazonaws.com:5432/myapp
```

This works perfectly! Aurora uses the same PostgreSQL protocol.

### Environment Variables (.env file)

```env
# AWS Configuration
AWS_REGION=ap-southeast-2

# Aurora Database Configuration
RDS_HOST=infinify-base-1.cjugwacawzxp.ap-southeast-2.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=myapp
RDS_USER=admin
RDS_PASSWORD=NYSE33INFSCALE

# Optional: Aurora Cluster Endpoints
# Use cluster endpoint for writes (primary)
RDS_CLUSTER_ENDPOINT=infinify-base-1.cjugwacawzxp.ap-southeast-2.rds.amazonaws.com
# Use reader endpoint for read-only queries (if you have read replicas)
RDS_READER_ENDPOINT=infinify-base-1.cluster-ro-xxxxx.ap-southeast-2.rds.amazonaws.com
```

## 🚀 Aurora-Specific Features

### 1. Cluster Endpoints

Aurora has two types of endpoints:

**Cluster Endpoint** (for writes):
- Always points to the primary instance
- Use this for INSERT, UPDATE, DELETE operations
- Automatically fails over if primary fails

**Reader Endpoint** (for reads):
- Distributes read queries across all replicas
- Use this for SELECT queries to reduce load
- Only available if you have read replicas

### 2. Connection Pooling

Aurora can handle more connections efficiently. The configuration is optimized for:
- **Max connections**: 20 (Aurora can handle more than standard RDS)
- **Connection timeout**: 5 seconds (increased for Aurora's failover)
- **Keep-alive**: Enabled for better connection management

### 3. Performance Tips

1. **Use Connection Pooling**: Already configured in `database-config.js`
2. **Batch Queries**: Aurora handles batch operations efficiently
3. **Use Read Replicas**: For read-heavy workloads (optional)
4. **Monitor Performance**: Use CloudWatch to track query performance

## 📊 Aurora vs Standard RDS

| Feature | Standard RDS | Aurora |
|---------|-------------|--------|
| Performance | Baseline | 3x faster |
| Failover | 60-120 seconds | <30 seconds |
| Storage | Fixed size | Auto-scales |
| Backups | Manual/Scheduled | Continuous |
| Read Replicas | Manual setup | Automatic |
| Cost | Lower | Slightly higher |

## 🔒 Security for Aurora

1. **SSL Required**: Already configured (`ssl: { rejectUnauthorized: false }`)
2. **Security Groups**: Make sure your security group allows connections
3. **IAM Authentication**: Can use IAM roles instead of passwords (advanced)
4. **Encryption**: Enable encryption at rest in Aurora console

## 🧪 Testing Your Connection

Test your Aurora connection:

```bash
cd backend
npm install
node -e "
require('dotenv').config();
const pool = require('./config/database-config');
pool.query('SELECT version(), current_database()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
  } else {
    console.log('✅ Connected to Aurora!');
    console.log('Database:', res.rows[0].current_database);
    console.log('Version:', res.rows[0].version);
  }
  process.exit();
});
"
```

## 📝 Setting Up Your Database Schema

1. **Connect to Aurora**:
   ```bash
   psql -h infinify-base-1.cjugwacawzxp.ap-southeast-2.rds.amazonaws.com \
        -U admin \
        -d myapp
   ```

2. **Run your schema**:
   ```bash
   psql -h infinify-base-1.cjugwacawzxp.ap-southeast-2.rds.amazonaws.com \
        -U admin \
        -d myapp \
        -f aws-infrastructure/rds-setup.sql
   ```

## 🎯 Next Steps

1. ✅ Your connection string is configured
2. ✅ Code is optimized for Aurora
3. ⏭️ Create `.env` file with your credentials
4. ⏭️ Test the connection
5. ⏭️ Run database schema
6. ⏭️ Set up read replicas (optional, for better performance)

## 💡 Aurora Best Practices

1. **Use Connection Pooling**: ✅ Already done
2. **Monitor CloudWatch**: Track performance metrics
3. **Enable Backups**: Aurora does this automatically
4. **Use Read Replicas**: For read-heavy applications
5. **Set Up Alarms**: Monitor database health

## 🆘 Troubleshooting

### Connection Timeout
- Check security group allows your IP
- Verify endpoint is correct
- Check Aurora cluster status in AWS Console

### Slow Queries
- Check CloudWatch metrics
- Consider adding read replicas
- Optimize your queries

### Failover Issues
- Aurora handles this automatically
- Check cluster status in AWS Console
- Verify your application reconnects (connection pool handles this)

## 📚 Resources

- [Aurora PostgreSQL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraPostgreSQL.html)
- [Aurora Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.BestPractices.html)
- [Connection Pooling Guide](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Managing.html)

