# Realtime Setup Guide

## Overview
This guide explains how to use the realtime service for live updates in your application.

## Prerequisites

1. Supabase Realtime enabled in your project
2. Replication enabled for tables you want to monitor
3. WebSocket support in your browser

## Enabling Realtime in Supabase

### 1. Enable Realtime for Tables

1. Go to Supabase Dashboard
2. Navigate to **Database** → **Replication**
3. Enable replication for tables you want to monitor:
   - `client_databases`
   - `client_tables`
   - `teams`
   - `team_members`
   - `projects`
   - Custom client data tables

### 2. Configure Replication

For each table, you can configure:
- **Realtime**: Enable/disable
- **Insert**: Track insert events
- **Update**: Track update events
- **Delete**: Track delete events

## Usage Examples

### Subscribe to Database Changes

```javascript
// Subscribe to changes in a specific database
const subscription = window.realtimeService.subscribeToDatabase(
  'database-uuid',
  (payload) => {
    console.log('Database changed:', payload);
    // payload.eventType: 'INSERT', 'UPDATE', 'DELETE'
    // payload.new: new data (for INSERT/UPDATE)
    // payload.old: old data (for UPDATE/DELETE)
  }
);

// Unsubscribe when done
subscription.unsubscribe();
```

### Subscribe to Table Data Changes

```javascript
// Subscribe to changes in a client table
const subscription = window.realtimeService.setupTableDataRealtime(
  'client_abc123_db_xyz789_table_def456',
  (payload) => {
    console.log('Table data changed:', payload);
    // Reload table or update specific row
    if (payload.eventType === 'INSERT') {
      // Add new row to table
    } else if (payload.eventType === 'UPDATE') {
      // Update existing row
    } else if (payload.eventType === 'DELETE') {
      // Remove row from table
    }
  }
);
```

### Subscribe to Team Collaboration

```javascript
// Subscribe to team changes
const subscription = window.realtimeService.setupTeamRealtime(
  'team-uuid',
  (payload) => {
    if (payload.type === 'team') {
      console.log('Team updated:', payload);
    } else if (payload.type === 'member') {
      console.log('Team member changed:', payload);
    }
  }
);
```

### Presence (Who's Online)

```javascript
// Track who's viewing a database
const presence = window.realtimeService.subscribeToPresence(
  'database-viewers',
  (key, newPresences) => {
    console.log('User joined:', key, newPresences);
    // Update UI to show who's online
  },
  (key, leftPresences) => {
    console.log('User left:', key, leftPresences);
    // Update UI to remove user from online list
  }
);

// Track current user
presence.track({
  viewing: 'database-uuid',
  last_seen: new Date().toISOString()
});

// Untrack when leaving
presence.untrack();
```

### Broadcast Messages

```javascript
// Subscribe to broadcast messages
const broadcastSub = window.realtimeService.subscribeToBroadcast(
  'chat-channel',
  'message',
  (payload) => {
    console.log('New message:', payload);
  }
);

// Send a broadcast message
await window.realtimeService.broadcast(
  'chat-channel',
  'message',
  {
    text: 'Hello!',
    from: 'user-id'
  }
);
```

## Integration with Database Builder

The realtime service is automatically integrated with:

### Table View
- Automatically reloads when data changes
- Updates specific rows when edited by others
- Shows notifications for changes

### Database List
- Updates when databases are created/deleted
- Reflects changes made by other users

### Collaboration
- Multiple users can edit the same database
- Changes appear in real-time
- Presence shows who's currently viewing

## Best Practices

### 1. Unsubscribe When Done

Always unsubscribe from channels when components are destroyed:

```javascript
class MyComponent {
  constructor() {
    this.subscription = null;
  }

  init() {
    this.subscription = window.realtimeService.subscribeToTable(
      'my-table',
      this.handleUpdate.bind(this)
    );
  }

  destroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
```

### 2. Debounce Updates

For high-frequency updates, debounce the handler:

```javascript
let updateTimeout;
const handleUpdate = (payload) => {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    // Process update
    processUpdate(payload);
  }, 300);
};
```

### 3. Handle Connection Issues

```javascript
// Check connection status
const status = window.realtimeService.getChannelStatus('my-channel');
if (status.status === 'SUBSCRIBED') {
  // Connected
} else {
  // Reconnecting or disconnected
}
```

### 4. Optimize for Performance

- Only subscribe to necessary tables
- Use filters to reduce data transfer
- Unsubscribe from unused channels
- Limit number of simultaneous subscriptions

## Troubleshooting

### Not receiving updates

1. **Check Realtime is enabled** for the table in Supabase dashboard
2. **Verify replication** is enabled for the table
3. **Check WebSocket connection** in browser DevTools
4. **Verify RLS policies** allow the user to see the data

### Connection drops

- Supabase automatically reconnects
- Check network connectivity
- Verify Supabase project is active
- Check for rate limiting

### High latency

- Use filters to reduce data transfer
- Subscribe only to necessary columns
- Consider using polling for less critical updates
- Optimize RLS policies

## Performance Considerations

### Subscription Limits

- Supabase free tier: 200 concurrent connections
- Each browser tab counts as one connection
- Consider connection pooling for multiple subscriptions

### Bandwidth Usage

- Each update sends the full row data
- Consider using column-level subscriptions if available
- Monitor bandwidth usage in Supabase dashboard

### CPU Usage

- Realtime updates trigger JavaScript handlers
- Debounce handlers for high-frequency updates
- Use requestAnimationFrame for UI updates

## Security

### Row Level Security

Realtime respects RLS policies:
- Users only receive updates for data they can access
- Updates are filtered based on RLS rules
- No data leakage through realtime subscriptions

### Validation

Always validate data received through realtime:
- Check data structure
- Verify user permissions
- Sanitize before displaying

## Example: Collaborative Database Editor

```javascript
// Setup realtime for collaborative editing
const setupCollaboration = (tableName) => {
  // Track presence
  const presence = window.realtimeService.subscribeToPresence(
    `table-${tableName}`,
    (key, users) => {
      updateOnlineUsers(users);
    },
    (key, users) => {
      removeOnlineUser(key);
    }
  );

  // Track current user
  presence.track({
    editing: true,
    last_seen: new Date().toISOString()
  });

  // Subscribe to data changes
  const dataSub = window.realtimeService.setupTableDataRealtime(
    tableName,
    (payload) => {
      if (payload.eventType === 'UPDATE') {
        // Update row in table
        updateTableRow(payload.new);
      }
    }
  );

  return {
    cleanup: () => {
      presence.untrack();
      dataSub.unsubscribe();
    }
  };
};
```

