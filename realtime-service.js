// Realtime Service
// Handles real-time subscriptions for live updates

class RealtimeService {
  constructor() {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized');
    }
    this.supabase = window.supabase;
    this.channels = new Map();
    this.subscriptions = new Map();
  }

  /**
   * Subscribe to table changes
   */
  subscribeToTable(tableName, callback, filter = null) {
    try {
      const channelName = `table:${tableName}`;
      
      // Close existing channel if any
      if (this.channels.has(channelName)) {
        this.unsubscribe(channelName);
      }

      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: tableName,
            filter: filter
          },
          (payload) => {
            if (callback) {
              callback(payload);
            }
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
      
      return {
        channelName,
        unsubscribe: () => this.unsubscribe(channelName)
      };
    } catch (error) {
      console.error('Error subscribing to table:', error);
      return { error };
    }
  }

  /**
   * Subscribe to database changes
   */
  subscribeToDatabase(databaseId, callback) {
    return this.subscribeToTable('client_databases', callback, `id=eq.${databaseId}`);
  }

  /**
   * Subscribe to table schema changes
   */
  subscribeToTableSchema(tableId, callback) {
    return this.subscribeToTable('client_tables', callback, `id=eq.${tableId}`);
  }

  /**
   * Subscribe to data changes in a client table
   */
  subscribeToClientTable(tableName, callback) {
    return this.subscribeToTable(tableName, callback);
  }

  /**
   * Subscribe to team changes
   */
  subscribeToTeam(teamId, callback) {
    return this.subscribeToTable('teams', callback, `id=eq.${teamId}`);
  }

  /**
   * Subscribe to project changes
   */
  subscribeToProject(projectId, callback) {
    return this.subscribeToTable('projects', callback, `id=eq.${projectId}`);
  }

  /**
   * Subscribe to chat messages
   */
  subscribeToChat(chatId, callback) {
    return this.subscribeToTable('chats', callback, `chat_id=eq.${chatId}`);
  }

  /**
   * Subscribe to presence (who's online)
   */
  subscribeToPresence(channelName, onJoin, onLeave) {
    try {
      const channel = this.supabase.channel(channelName);

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          // Handle presence sync
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (onJoin) {
            onJoin(key, newPresences);
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          if (onLeave) {
            onLeave(key, leftPresences);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              online_at: new Date().toISOString(),
              user: (await this.supabase.auth.getUser()).data.user?.id
            });
          }
        });

      this.channels.set(channelName, channel);
      
      return {
        channelName,
        track: (data) => channel.track(data),
        untrack: () => channel.untrack(),
        unsubscribe: () => this.unsubscribe(channelName)
      };
    } catch (error) {
      console.error('Error subscribing to presence:', error);
      return { error };
    }
  }

  /**
   * Broadcast custom message
   */
  async broadcast(channelName, event, payload) {
    try {
      const channel = this.channels.get(channelName);
      if (!channel) {
        throw new Error(`Channel ${channelName} not found`);
      }

      await channel.send({
        type: 'broadcast',
        event: event,
        payload: payload
      });

      return { error: null };
    } catch (error) {
      console.error('Error broadcasting message:', error);
      return { error };
    }
  }

  /**
   * Subscribe to broadcast messages
   */
  subscribeToBroadcast(channelName, event, callback) {
    try {
      // Create or get channel
      let channel = this.channels.get(channelName);
      if (!channel) {
        channel = this.supabase.channel(channelName);
        channel.subscribe();
        this.channels.set(channelName, channel);
      }

      channel.on('broadcast', { event: event }, (payload) => {
        if (callback) {
          callback(payload);
        }
      });

      return {
        channelName,
        unsubscribe: () => this.unsubscribe(channelName)
      };
    } catch (error) {
      console.error('Error subscribing to broadcast:', error);
      return { error };
    }
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channelName) {
    try {
      const channel = this.channels.get(channelName);
      if (channel) {
        this.supabase.removeChannel(channel);
        this.channels.delete(channelName);
      }
      return { error: null };
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return { error };
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    try {
      this.channels.forEach((channel, channelName) => {
        this.supabase.removeChannel(channel);
      });
      this.channels.clear();
      this.subscriptions.clear();
      return { error: null };
    } catch (error) {
      console.error('Error unsubscribing all:', error);
      return { error };
    }
  }

  /**
   * Get channel status
   */
  getChannelStatus(channelName) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      return { status: 'NOT_FOUND' };
    }
    return { status: channel.state };
  }

  /**
   * Setup real-time for database builder
   */
  setupDatabaseBuilderRealtime(databaseId, onUpdate) {
    // Subscribe to database changes
    const dbSub = this.subscribeToDatabase(databaseId, (payload) => {
      if (onUpdate) {
        onUpdate('database', payload);
      }
    });

    // Subscribe to table changes
    const tablesSub = this.subscribeToTable('client_tables', (payload) => {
      if (payload.new?.database_id === databaseId || payload.old?.database_id === databaseId) {
        if (onUpdate) {
          onUpdate('table', payload);
        }
      }
    });

    return {
      unsubscribe: () => {
        if (dbSub.unsubscribe) dbSub.unsubscribe();
        if (tablesSub.unsubscribe) tablesSub.unsubscribe();
      }
    };
  }

  /**
   * Setup real-time for table data
   */
  setupTableDataRealtime(tableName, onUpdate) {
    return this.subscribeToClientTable(tableName, (payload) => {
      if (onUpdate) {
        onUpdate(payload);
      }
    });
  }

  /**
   * Setup real-time for team collaboration
   */
  setupTeamRealtime(teamId, onUpdate) {
    const teamSub = this.subscribeToTeam(teamId, (payload) => {
      if (onUpdate) {
        onUpdate('team', payload);
      }
    });

    // Subscribe to team members
    const membersSub = this.subscribeToTable('team_members', (payload) => {
      if (payload.new?.team_id === teamId || payload.old?.team_id === teamId) {
        if (onUpdate) {
          onUpdate('member', payload);
        }
      }
    });

    return {
      unsubscribe: () => {
        if (teamSub.unsubscribe) teamSub.unsubscribe();
        if (membersSub.unsubscribe) membersSub.unsubscribe();
      }
    };
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealtimeService;
}

// Make available globally
window.realtimeService = realtimeService;

