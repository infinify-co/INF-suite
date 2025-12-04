// Dashboard Real-Time Service
// Handles live updates using AWS API Gateway WebSocket (cost-efficient)
// Falls back to polling if WebSocket unavailable

class DashboardRealtimeService {
  constructor() {
    this.wsUrl = window.WEBSOCKET_URL || 'wss://YOUR_WEBSOCKET_API.execute-api.us-east-1.amazonaws.com/prod';
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.connectionId = null;
    this.subscriptions = new Map();
    this.isConnected = false;
    this.pingInterval = null;
    this.currentUserId = this.getCurrentUserId();
    
    // Fallback to polling if WebSocket fails
    this.usePolling = false;
    this.pollingIntervals = new Map();
  }

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    if (window.cognitoAuthManager) {
      const session = window.cognitoAuthManager.getCurrentSession();
      if (session) {
        return session.getIdToken().payload.sub;
      }
    }
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.userId || parsed.cognitoUserId;
    }
    return null;
  }

  /**
   * Connect to WebSocket
   */
  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return { success: true, alreadyConnected: true };
    }

    try {
      // Get auth token
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Connect with auth token
      this.ws = new WebSocket(`${this.wsUrl}?token=${encodeURIComponent(token)}`);

      return new Promise((resolve, reject) => {
        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startPing();
          this.emit('connected');
          resolve({ success: true });
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', { error });
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.stopPing();
          this.emit('disconnected');
          
          // Attempt reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
          } else {
            // Fallback to polling
            this.fallbackToPolling();
          }
        };
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.fallbackToPolling();
      return { success: false, error: error.message, usingPolling: true };
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'connection_id':
        this.connectionId = payload.connectionId;
        break;

      case 'dashboard_update':
        this.handleDashboardUpdate(payload);
        break;

      case 'user_typing':
        this.emit('userTyping', payload);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  }

  /**
   * Handle dashboard update from server
   */
  handleDashboardUpdate(payload) {
    const { sectionType, sectionKey, content, version, userId } = payload;

    // Only process updates for current user or subscribed sections
    if (userId !== this.currentUserId) {
      return;
    }

    const sectionId = `${sectionType}:${sectionKey}`;
    const subscription = this.subscriptions.get(sectionId);

    if (subscription && subscription.callback) {
      subscription.callback({
        sectionType,
        sectionKey,
        content,
        version,
        source: 'realtime'
      });
    }

    this.emit('update', payload);
  }

  /**
   * Subscribe to a dashboard section for real-time updates
   */
  subscribe(sectionType, sectionKey, callback) {
    const sectionId = `${sectionType}:${sectionKey}`;

    // Store subscription
    this.subscriptions.set(sectionId, {
      sectionType,
      sectionKey,
      callback,
      subscribedAt: Date.now()
    });

    // Send subscription message via WebSocket
    if (this.isConnected && this.ws) {
      this.send({
        type: 'subscribe',
        payload: {
          sectionType,
          sectionKey,
          userId: this.currentUserId
        }
      });
    } else {
      // If not connected, try to connect
      this.connect().then(() => {
        this.send({
          type: 'subscribe',
          payload: {
            sectionType,
            sectionKey,
            userId: this.currentUserId
          }
        });
      });
    }

    // If using polling fallback, start polling
    if (this.usePolling) {
      this.startPolling(sectionType, sectionKey, callback);
    }

    return {
      unsubscribe: () => this.unsubscribe(sectionId)
    };
  }

  /**
   * Unsubscribe from a section
   */
  unsubscribe(sectionId) {
    const subscription = this.subscriptions.get(sectionId);
    if (!subscription) return;

    // Send unsubscribe message
    if (this.isConnected && this.ws) {
      this.send({
        type: 'unsubscribe',
        payload: {
          sectionType: subscription.sectionType,
          sectionKey: subscription.sectionKey
        }
      });
    }

    // Stop polling if active
    if (this.pollingIntervals.has(sectionId)) {
      clearInterval(this.pollingIntervals.get(sectionId));
      this.pollingIntervals.delete(sectionId);
    }

    this.subscriptions.delete(sectionId);
  }

  /**
   * Send message via WebSocket
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, message not sent:', data);
    }
  }

  /**
   * Start ping to keep connection alive
   */
  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop ping
   */
  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Fallback to polling if WebSocket fails
   */
  fallbackToPolling() {
    console.warn('Falling back to polling for real-time updates');
    this.usePolling = true;

    // Start polling for all subscribed sections
    this.subscriptions.forEach((subscription, sectionId) => {
      this.startPolling(
        subscription.sectionType,
        subscription.sectionKey,
        subscription.callback
      );
    });
  }

  /**
   * Start polling for a section (fallback)
   */
  startPolling(sectionType, sectionKey, callback) {
    const sectionId = `${sectionType}:${sectionKey}`;

    // Clear existing interval
    if (this.pollingIntervals.has(sectionId)) {
      clearInterval(this.pollingIntervals.get(sectionId));
    }

    // Poll every 5 seconds
    const interval = setInterval(async () => {
      try {
        const result = await window.dashboardAutoSaveService.getDashboard(sectionType);
        if (result.success && result.data) {
          const section = result.data.find(s => s.section_key === sectionKey);
          if (section && callback) {
            callback({
              sectionType,
              sectionKey,
              content: section.content,
              version: section.version,
              source: 'polling'
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);

    this.pollingIntervals.set(sectionId, interval);
  }

  /**
   * Broadcast typing indicator
   */
  broadcastTyping(sectionType, sectionKey) {
    if (this.isConnected) {
      this.send({
        type: 'typing',
        payload: {
          sectionType,
          sectionKey,
          userId: this.currentUserId
        }
      });
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    // Unsubscribe from all
    this.subscriptions.forEach((_, sectionId) => {
      this.unsubscribe(sectionId);
    });

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.stopPing();
  }

  /**
   * Get auth token
   */
  getAuthToken() {
    if (window.cognitoAuthManager) {
      const session = window.cognitoAuthManager.getCurrentSession();
      if (session) {
        return session.getIdToken().getJwtToken();
      }
    }
    return '';
  }

  /**
   * Event emitter
   */
  emit(event, data) {
    const eventName = `realtime:${event}`;
    const customEvent = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(customEvent);
  }

  /**
   * Listen to events
   */
  on(event, callback) {
    window.addEventListener(`realtime:${event}`, (e) => callback(e.detail));
  }
}

// Create singleton instance
const dashboardRealtimeService = new DashboardRealtimeService();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardRealtimeService;
}

// Make available globally
window.dashboardRealtimeService = dashboardRealtimeService;

