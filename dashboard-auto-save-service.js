// Dashboard Auto-Save Service
// Handles auto-saving for all editable sections in the suite
// Implements debouncing and conflict resolution like Notion

class DashboardAutoSaveService {
  constructor() {
    this.apiBaseUrl = window.API_GATEWAY_URL || 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod';
    this.pendingSaves = new Map(); // Track pending saves by section
    this.saveTimeouts = new Map(); // Debounce timeouts
    this.saveQueue = new Map(); // Queue of saves waiting to be sent
    this.isOnline = navigator.onLine;
    this.debounceDelay = 2000; // 2 seconds debounce (like Notion)
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    // Listen to online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Get current user ID from session
    this.currentUserId = this.getCurrentUserId();
  }

  /**
   * Get current user ID from session/localStorage
   */
  getCurrentUserId() {
    // Try to get from Cognito session
    if (window.cognitoAuthManager) {
      const session = window.cognitoAuthManager.getCurrentSession();
      if (session) {
        return session.getIdToken().payload.sub;
      }
    }
    
    // Fallback to localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.userId || parsed.cognitoUserId;
    }
    
    return null;
  }

  /**
   * Auto-save a dashboard section with debouncing
   */
  async autoSave(sectionType, sectionKey, content, options = {}) {
    if (!this.currentUserId) {
      console.warn('No user ID available for auto-save');
      return { success: false, error: 'Not authenticated' };
    }

    const sectionId = `${sectionType}:${sectionKey}`;
    
    // Store the latest content
    this.saveQueue.set(sectionId, {
      sectionType,
      sectionKey,
      content,
      timestamp: Date.now(),
      version: options.version || null
    });

    // Clear existing timeout
    if (this.saveTimeouts.has(sectionId)) {
      clearTimeout(this.saveTimeouts.get(sectionId));
    }

    // Set new timeout for debounced save
    const timeoutId = setTimeout(() => {
      this.executeSave(sectionId);
    }, this.debounceDelay);

    this.saveTimeouts.set(sectionId, timeoutId);

    // If immediate save requested, save now
    if (options.immediate) {
      clearTimeout(timeoutId);
      return await this.executeSave(sectionId);
    }

    return { success: true, queued: true };
  }

  /**
   * Execute the actual save
   */
  async executeSave(sectionId) {
    const saveData = this.saveQueue.get(sectionId);
    if (!saveData) {
      return { success: false, error: 'No data to save' };
    }

    // Remove from queue
    this.saveQueue.delete(sectionId);
    this.saveTimeouts.delete(sectionId);

    // Mark as pending
    this.pendingSaves.set(sectionId, true);

    try {
      const response = await fetch(`${this.apiBaseUrl}/dashboard/auto-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthToken()
        },
        body: JSON.stringify({
          userId: this.currentUserId,
          sectionType: saveData.sectionType,
          sectionKey: saveData.sectionKey,
          content: saveData.content,
          expectedVersion: saveData.version
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle version conflict
        if (response.status === 409 && result.error === 'version_conflict') {
          // Emit conflict event for UI to handle
          this.emit('saveConflict', {
            sectionId,
            currentVersion: result.current_version,
            expectedVersion: result.expected_version
          });
          
          // Retry with current version
          return await this.retrySave(sectionId, result.current_version);
        }
        
        throw new Error(result.error || 'Save failed');
      }

      // Success - emit event
      this.emit('saveSuccess', {
        sectionId,
        version: result.version,
        savedAt: result.saved_at
      });

      return result;

    } catch (error) {
      console.error('Auto-save error:', error);
      
      // If offline or network error, queue for later
      if (!this.isOnline || error.message.includes('fetch')) {
        this.saveQueue.set(sectionId, saveData); // Re-queue
        this.emit('saveQueued', { sectionId });
        return { success: false, queued: true, error: 'Offline - queued for later' };
      }

      // Retry on error
      return await this.retrySave(sectionId, saveData.version);
      
    } finally {
      this.pendingSaves.delete(sectionId);
    }
  }

  /**
   * Retry save with exponential backoff
   */
  async retrySave(sectionId, version, retryCount = 0) {
    if (retryCount >= this.maxRetries) {
      this.emit('saveFailed', { sectionId, error: 'Max retries exceeded' });
      return { success: false, error: 'Max retries exceeded' };
    }

    await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));

    const saveData = this.saveQueue.get(sectionId);
    if (saveData) {
      saveData.version = version;
      return await this.executeSave(sectionId);
    }

    return { success: false, error: 'Save data not found' };
  }

  /**
   * Flush all queued saves (for offline recovery)
   */
  async flushQueue() {
    const queueEntries = Array.from(this.saveQueue.entries());
    
    for (const [sectionId, saveData] of queueEntries) {
      await this.executeSave(sectionId);
    }
  }

  /**
   * Get dashboard data for a user
   */
  async getDashboard(sectionType = null) {
    if (!this.currentUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const url = sectionType 
        ? `${this.apiBaseUrl}/dashboard/get?userId=${this.currentUserId}&sectionType=${sectionType}`
        : `${this.apiBaseUrl}/dashboard/get?userId=${this.currentUserId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthToken()
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load dashboard');
      }

      return result;

    } catch (error) {
      console.error('Get dashboard error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get auth token
   */
  getAuthToken() {
    if (window.cognitoAuthManager) {
      const session = window.cognitoAuthManager.getCurrentSession();
      if (session) {
        return `Bearer ${session.getIdToken().getJwtToken()}`;
      }
    }
    return '';
  }

  /**
   * Simple event emitter
   */
  emit(event, data) {
    const eventName = `dashboard:${event}`;
    const customEvent = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(customEvent);
  }

  /**
   * Listen to save events
   */
  on(event, callback) {
    window.addEventListener(`dashboard:${event}`, (e) => callback(e.detail));
  }

  /**
   * Save immediately (bypass debounce)
   */
  async saveNow(sectionType, sectionKey, content, version = null) {
    return await this.autoSave(sectionType, sectionKey, content, {
      immediate: true,
      version
    });
  }

  /**
   * Get save status for a section
   */
  getSaveStatus(sectionId) {
    return {
      pending: this.pendingSaves.has(sectionId),
      queued: this.saveQueue.has(sectionId),
      online: this.isOnline
    };
  }
}

// Create singleton instance
const dashboardAutoSaveService = new DashboardAutoSaveService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardAutoSaveService;
}

// Make available globally
window.dashboardAutoSaveService = dashboardAutoSaveService;

