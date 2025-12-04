# AWS Dashboard Setup Guide - Complete Auto-Save & Real-Time System

This guide sets up a cost-efficient database system with auto-save and real-time updates for all editable sections in your suite.

## Overview

The system includes:
- ✅ **Unique usernames** with database-level constraints
- ✅ **Auto-save** for all editable sections (debounced, like Notion)
- ✅ **Real-time updates** using WebSocket (with polling fallback)
- ✅ **User-specific data storage** for all dashboard sections
- ✅ **Cost-optimized** architecture using Aurora Serverless, Lambda, and API Gateway

## Architecture

```
Frontend (Browser)
    ↓
API Gateway (REST + WebSocket)
    ↓
Lambda Functions (Auto-save, Get Dashboard, Username Check)
    ↓
Aurora PostgreSQL (User data, Dashboard sections)
```

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS Aurora PostgreSQL database (see `aws-infrastructure/AWS_SETUP.md`)
3. AWS Cognito User Pool (see `AWS Cognito/AWS_COGNITO_SETUP.md`)
4. Node.js 18.x or higher
5. AWS CLI configured

## Step 1: Run Database Schema

### 1.1 Run Base Schema

First, run the base schema if you haven't already:

```bash
psql -h YOUR_RDS_ENDPOINT -U infinify_admin -d infinify -f aws-infrastructure/rds-setup.sql
```

### 1.2 Run Dashboard Schema

Run the dashboard-specific schema:

```bash
psql -h YOUR_RDS_ENDPOINT -U infinify_admin -d infinify -f aws-infrastructure/user-dashboard-schema.sql
```

This creates:
- `user_dashboard_sections` - Stores all editable content
- `auto_save_history` - History for recovery
- `editing_sessions` - Real-time collaboration tracking
- `user_dock_preferences` - Bottom dock state
- Username uniqueness constraints

## Step 2: Deploy Lambda Functions

### 2.1 Install Dependencies

```bash
cd backend
npm install pg
```

### 2.2 Package Lambda Functions

```bash
# Create deployment packages
cd backend/lambda/dashboard
zip -r auto-save.zip auto-save.js ../../config/ ../../utils/ ../../../node_modules/pg/

cd ../users
zip -r check-username.zip check-username.js ../../config/ ../../utils/ ../../../node_modules/pg/
```

### 2.3 Deploy to AWS Lambda

```bash
# Deploy auto-save function
aws lambda create-function \
  --function-name infinify-dashboard-auto-save \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/LambdaExecutionRole \
  --handler auto-save.handler \
  --zip-file fileb://auto-save.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{
    RDS_HOST=your-aurora-endpoint.rds.amazonaws.com,
    RDS_PORT=5432,
    RDS_DATABASE=infinify,
    RDS_USER=infinify_admin,
    RDS_PASSWORD=your-password,
    AWS_REGION=us-east-1
  }"

# Deploy get-dashboard function
aws lambda create-function \
  --function-name infinify-dashboard-get \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/LambdaExecutionRole \
  --handler get-dashboard.handler \
  --zip-file fileb://get-dashboard.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{...}"

# Deploy check-username function
aws lambda create-function \
  --function-name infinify-check-username \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/LambdaExecutionRole \
  --handler check-username.handler \
  --zip-file fileb://check-username.zip \
  --timeout 10 \
  --memory-size 128 \
  --environment Variables="{...}"
```

## Step 3: Set Up API Gateway REST API

### 3.1 Create REST API

```bash
aws apigateway create-rest-api --name "Infinify Dashboard API"
```

Note the API ID.

### 3.2 Create Resources

```bash
API_ID=your-api-id

# Create /dashboard resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text) \
  --path-part dashboard

# Create /dashboard/auto-save
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/dashboard`].id' --output text) \
  --path-part auto-save

# Create /dashboard/get
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/dashboard`].id' --output text) \
  --path-part get

# Create /users/check-username
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/users`].id' --output text) \
  --path-part check-username
```

### 3.3 Create Methods

```bash
# POST /dashboard/auto-save
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE

# GET /dashboard/get
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE

# POST /users/check-username
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE
```

### 3.4 Integrate with Lambda

```bash
# For each method, set Lambda integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:ACCOUNT_ID:function:infinify-dashboard-auto-save/invocations
```

### 3.5 Deploy API

```bash
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod
```

Note the **Invoke URL** (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)

## Step 4: Set Up WebSocket API (Optional - for Real-Time)

### 4.1 Create WebSocket API

```bash
aws apigatewayv2 create-api \
  --name infinify-dashboard-websocket \
  --protocol-type WEBSOCKET \
  --route-selection-expression '$request.body.action'
```

### 4.2 Create Routes

```bash
API_ID=your-websocket-api-id

# $connect route
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key '$connect' \
  --target "integrations/$(aws apigatewayv2 create-integration --api-id $API_ID --integration-type AWS_PROXY --integration-uri arn:aws:lambda:... --query 'IntegrationId' --output text)"

# $disconnect route
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key '$disconnect' \
  --target "integrations/..."

# $default route (for dashboard updates)
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key '$default' \
  --target "integrations/..."
```

### 4.3 Deploy WebSocket API

```bash
aws apigatewayv2 create-deployment \
  --api-id $API_ID \
  --stage-name prod
```

Note the **WebSocket URL** (e.g., `wss://abc123.execute-api.us-east-1.amazonaws.com/prod`)

## Step 5: Update Frontend Configuration

### 5.1 Update HTML Files

Add the services to your suite HTML files (e.g., `suite/home.html`, `suite/Operation.html`):

```html
<!-- Add before closing </body> tag -->
<script src="../dashboard-auto-save-service.js"></script>
<script src="../dashboard-realtime-service.js"></script>
<script>
  // Initialize after page load
  document.addEventListener('DOMContentLoaded', () => {
    // Connect to real-time service
    window.dashboardRealtimeService.connect();
    
    // Listen to save events
    window.dashboardAutoSaveService.on('saveSuccess', (data) => {
      console.log('Saved:', data);
      // Update UI to show "Saved" indicator
    });
    
    window.dashboardAutoSaveService.on('saveConflict', (data) => {
      console.warn('Version conflict:', data);
      // Show conflict resolution UI
    });
  });
</script>
```

### 5.2 Set API URLs

Create a config file or add to existing config:

```javascript
// config.js or in your HTML
window.API_GATEWAY_URL = 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod';
window.WEBSOCKET_URL = 'wss://YOUR_WEBSOCKET_API.execute-api.us-east-1.amazonaws.com/prod';
```

## Step 6: Update Sign-In Flow

### 6.1 Add Username to Sign-Up

Update `Sign in/sign-up.html` or `Sign in/Step-2.html`:

```javascript
// After Cognito sign-up, check username availability
async function checkUsername(username) {
  const response = await fetch(`${window.API_GATEWAY_URL}/users/check-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const result = await response.json();
  return result.available;
}

// When user enters username
const usernameInput = document.getElementById('username');
usernameInput.addEventListener('blur', async () => {
  const username = usernameInput.value.trim();
  if (username) {
    const available = await checkUsername(username);
    if (!available) {
      showError('Username is already taken');
    }
  }
});

// Save username to database after sign-up
async function saveUsernameToDatabase(cognitoUserId, username) {
  // Call your user update Lambda function
  await fetch(`${window.API_GATEWAY_URL}/users/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({
      userId: cognitoUserId,
      username: username
    })
  });
}
```

## Step 7: Implement Auto-Save in Editable Sections

### 7.1 Example: Auto-Save Text Input

```javascript
// In any suite page (e.g., suite/Operation.html)
document.addEventListener('DOMContentLoaded', () => {
  // Find all editable elements
  const editableElements = document.querySelectorAll('[contenteditable="true"], .editable-input');
  
  editableElements.forEach(element => {
    const sectionType = element.dataset.sectionType || 'operation';
    const sectionKey = element.dataset.sectionKey || element.id || 'default';
    
    // Debounced auto-save on input
    let saveTimeout;
    element.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        const content = {
          text: element.textContent || element.value,
          html: element.innerHTML
        };
        
        await window.dashboardAutoSaveService.autoSave(
          sectionType,
          sectionKey,
          content
        );
      }, 2000); // 2 second debounce
    });
    
    // Subscribe to real-time updates
    window.dashboardRealtimeService.subscribe(
      sectionType,
      sectionKey,
      (update) => {
        // Update element if version is newer
        if (update.version > currentVersion) {
          element.textContent = update.content.text;
          element.innerHTML = update.content.html;
        }
      }
    );
  });
});
```

### 7.2 Example: Auto-Save Dock Preferences

```javascript
// Save dock state when changed
function saveDockState() {
  const dockItems = Array.from(document.querySelectorAll('.dock-item')).map(item => ({
    id: item.dataset.dockId,
    order: Array.from(item.parentElement.children).indexOf(item)
  }));
  
  window.dashboardAutoSaveService.autoSave(
    'dock',
    'preferences',
    { items: dockItems }
  );
}

// Load dock state on page load
async function loadDockState() {
  const result = await window.dashboardAutoSaveService.getDashboard('dock');
  if (result.success && result.data.length > 0) {
    const dockData = result.data.find(d => d.section_key === 'preferences');
    if (dockData) {
      // Restore dock order
      // ... implementation
    }
  }
}
```

## Step 8: Cost Optimization Tips

### 8.1 Aurora Serverless

Use Aurora Serverless v2 for automatic scaling:

```bash
aws rds create-db-cluster \
  --engine aurora-postgresql \
  --engine-version 13.7 \
  --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=2 \
  --database-name infinify
```

### 8.2 Lambda Configuration

- Use **Provisioned Concurrency** only if needed (adds cost)
- Set **Reserved Concurrency** to limit costs
- Use **128MB memory** for simple functions (check-username)
- Use **256MB memory** for database functions

### 8.3 API Gateway

- Enable **Caching** for GET requests (dashboard/get)
- Set **Throttling** limits to prevent abuse
- Use **API Keys** for rate limiting

### 8.4 WebSocket

- WebSocket is **cost-efficient** for real-time (pay per message, not per connection)
- Falls back to polling if WebSocket unavailable (no extra cost)

## Step 9: Testing

### 9.1 Test Auto-Save

1. Open any suite page
2. Edit a text field
3. Wait 2 seconds
4. Check browser console for "Saved" message
5. Refresh page - data should persist

### 9.2 Test Username Uniqueness

1. Try to sign up with existing username
2. Should show "Username already taken"
3. Try valid username - should succeed

### 9.3 Test Real-Time Updates

1. Open same page in two browsers
2. Edit in one browser
3. Should see update in other browser within 1-2 seconds

## Troubleshooting

### Auto-Save Not Working

- Check browser console for errors
- Verify API Gateway URL is correct
- Check Lambda function logs in CloudWatch
- Verify database connection in Lambda environment variables

### Username Check Failing

- Verify database schema was run correctly
- Check unique index exists: `\d users` in psql
- Check Lambda has database access

### Real-Time Not Working

- Check WebSocket URL is correct
- Verify WebSocket API is deployed
- Check browser console for connection errors
- Falls back to polling automatically

## Security Considerations

1. **API Gateway Authorization**: Add Cognito User Pool authorizer
2. **Database Access**: Lambda should use IAM roles, not credentials in code
3. **CORS**: Restrict to your domain in production
4. **Rate Limiting**: Enable throttling in API Gateway
5. **Input Validation**: Validate all user input in Lambda functions

## Cost Estimate (Monthly)

- **Aurora Serverless v2**: ~$50-100 (0.5-2 ACU, depends on usage)
- **Lambda**: ~$1-5 (1M requests free, then $0.20 per 1M)
- **API Gateway REST**: ~$3.50 per 1M requests (first 1M free)
- **API Gateway WebSocket**: ~$1 per 1M messages (first 1M free)
- **Data Transfer**: Minimal for small apps

**Total**: ~$55-110/month for small to medium usage

## Next Steps

1. ✅ Database schema created
2. ✅ Lambda functions deployed
3. ✅ API Gateway configured
4. ✅ Frontend services integrated
5. ⏭️ Add conflict resolution UI
6. ⏭️ Add "Saving..." indicators
7. ⏭️ Add offline support (already queued)
8. ⏭️ Add version history UI

## Support

For issues:
- Check CloudWatch logs for Lambda functions
- Check API Gateway logs
- Verify database schema is correct
- Check browser console for frontend errors

