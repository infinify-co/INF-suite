# Dashboard Auto-Save Quick Start

Quick reference for implementing auto-save in your suite pages.

## 1. Include Required Scripts

Add to your HTML file (before closing `</body>`):

```html
<!-- Configuration -->
<script>
  window.API_GATEWAY_URL = 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod';
  window.WEBSOCKET_URL = 'wss://YOUR_WEBSOCKET_API.execute-api.us-east-1.amazonaws.com/prod';
</script>

<!-- Services -->
<script src="../dashboard-auto-save-service.js"></script>
<script src="../dashboard-realtime-service.js"></script>

<!-- Integration (optional - includes example implementations) -->
<script src="dashboard-integration-example.js"></script>
```

## 2. Basic Usage

### Auto-Save Text Content

```javascript
// For contenteditable elements
const element = document.querySelector('.editable-content');

element.addEventListener('input', () => {
  window.dashboardAutoSaveService.autoSave(
    'operation',        // section type
    'overview',         // section key
    { text: element.textContent, html: element.innerHTML }
  );
});
```

### Auto-Save Form Input

```javascript
const input = document.getElementById('my-input');

input.addEventListener('input', () => {
  window.dashboardAutoSaveService.autoSave(
    'operation',
    'client-name',
    { value: input.value }
  );
});
```

### Load Saved Content

```javascript
// Load all sections for current page
const result = await window.dashboardAutoSaveService.getDashboard('operation');

if (result.success) {
  result.data.forEach(section => {
    // section.section_key - unique identifier
    // section.content - saved content
    // section.version - version number
    // section.last_saved_at - timestamp
  });
}
```

## 3. Real-Time Updates

```javascript
// Subscribe to updates for a section
const subscription = window.dashboardRealtimeService.subscribe(
  'operation',
  'overview',
  (update) => {
    // update.content - new content
    // update.version - new version
    // update.source - 'realtime' or 'polling'
    
    // Update your UI
    element.innerHTML = update.content.html;
  }
);

// Unsubscribe when done
subscription.unsubscribe();
```

## 4. Save Indicators

```javascript
// Listen to save events
window.dashboardAutoSaveService.on('saveSuccess', (data) => {
  console.log('Saved!', data);
  // Show "Saved" indicator
});

window.dashboardAutoSaveService.on('saveConflict', (data) => {
  console.warn('Conflict!', data);
  // Show conflict resolution UI
});

window.dashboardAutoSaveService.on('saveQueued', (data) => {
  console.log('Queued (offline)', data);
  // Show offline indicator
});
```

## 5. Section Types

Use these section types for different pages:

- `home` - Home page
- `operation` - Operation page
- `work` - Teams/Work page
- `tools` - Tools page
- `agents` - Agents page
- `dock` - Bottom dock/navigation
- `campaigns` - Campaigns page
- `oceanbase` - Database page
- `filebase` - Filebase page
- `financial` - Financials page
- `chats` - Chats page

## 6. Section Keys

Use descriptive keys for each editable element:

- `overview` - Overview section
- `widget-1`, `widget-2` - Widgets
- `preferences` - User preferences
- `notes` - Notes section
- `client-name`, `client-email` - Form fields
- `dock-preferences` - Dock configuration

## 7. Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Operation</title>
</head>
<body>
  <!-- Editable content -->
  <div 
    contenteditable="true" 
    data-section-type="operation" 
    data-section-key="overview"
    class="editable-content">
    Start typing...
  </div>

  <!-- Form input -->
  <input 
    type="text" 
    data-section-type="operation" 
    data-section-key="client-name"
    placeholder="Client name">

  <!-- Scripts -->
  <script>
    window.API_GATEWAY_URL = 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod';
  </script>
  <script src="../dashboard-auto-save-service.js"></script>
  <script src="../dashboard-realtime-service.js"></script>
  <script src="dashboard-integration-example.js"></script>
</body>
</html>
```

## 8. Username Validation

```javascript
// Check if username is available
async function checkUsername(username) {
  const response = await fetch(`${window.API_GATEWAY_URL}/users/check-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const result = await response.json();
  return result.available;
}

// Use in sign-up form
const usernameInput = document.getElementById('username');
usernameInput.addEventListener('blur', async () => {
  const available = await checkUsername(usernameInput.value);
  if (!available) {
    alert('Username is already taken');
  }
});
```

## 9. Common Patterns

### Debounced Auto-Save

```javascript
let timeout;
element.addEventListener('input', () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    window.dashboardAutoSaveService.autoSave(...);
  }, 2000);
});
```

### Immediate Save

```javascript
// Save immediately (bypass debounce)
await window.dashboardAutoSaveService.saveNow(
  'operation',
  'overview',
  { text: element.textContent }
);
```

### Save on Blur

```javascript
element.addEventListener('blur', () => {
  window.dashboardAutoSaveService.saveNow(...);
});
```

## 10. Troubleshooting

### Auto-save not working?

1. Check browser console for errors
2. Verify `API_GATEWAY_URL` is set correctly
3. Check user is authenticated
4. Verify Lambda functions are deployed

### Real-time not working?

1. Check `WEBSOCKET_URL` is set
2. Falls back to polling automatically
3. Check browser console for connection errors

### Version conflicts?

1. Listen to `saveConflict` event
2. Show conflict resolution UI
3. User can choose: keep local, use server, or merge

## Next Steps

- See `AWS_DASHBOARD_SETUP.md` for complete setup
- See `suite/dashboard-integration-example.js` for full implementation
- Customize save indicators and conflict resolution UI

