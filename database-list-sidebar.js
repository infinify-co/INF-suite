// Database List Sidebar Component
// Navigation sidebar for listing and managing databases

class DatabaseListSidebar {
  constructor() {
    this.databases = [];
    this.selectedDatabase = null;
    this.selectedTable = null;
  }

  /**
   * Initialize sidebar
   */
  async init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Sidebar container not found:', containerId);
      return;
    }

    await this.loadDatabases();
    this.render();

    // Setup realtime updates for database list
    if (window.realtimeService) {
      this.setupRealtime();
    }
  }

  /**
   * Setup realtime updates
   */
  setupRealtime() {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }

    if (window.realtimeService) {
      // Subscribe to database changes
      this.realtimeSubscription = window.realtimeService.subscribeToTable(
        'client_databases',
        (payload) => {
          console.log('Database updated:', payload);
          // Reload databases when changes occur
          this.loadDatabases().then(() => {
            this.render();
          });
        }
      );
    }
  }

  /**
   * Load databases from service
   */
  async loadDatabases() {
    try {
      if (!window.clientDatabaseService) {
        throw new Error('Database service not available');
      }

      const { data, error } = await window.clientDatabaseService.getDatabases();
      
      if (error) throw error;
      
      this.databases = data || [];
      
      // Load tables for each database
      for (const db of this.databases) {
        const { data: tables } = await window.clientDatabaseService.getTables(db.id);
        db.tables = tables || [];
      }
    } catch (error) {
      console.error('Error loading databases:', error);
      this.databases = [];
    }
  }

  /**
   * Render sidebar
   */
  render() {
    if (!this.container) return;

    let sidebarHTML = `
      <div class="database-sidebar">
        <div class="sidebar-header">
          <h3>My Databases</h3>
          <button class="btn-icon" onclick="databaseListSidebar.handleNewDatabase()" title="New Database">
            ➕
          </button>
        </div>
        <div class="database-list">
          ${this.renderDatabaseList()}
        </div>
      </div>
    `;

    this.container.innerHTML = sidebarHTML;
  }

  /**
   * Render database list
   */
  renderDatabaseList() {
    if (this.databases.length === 0) {
      return `
        <div class="empty-state">
          <p>No databases yet.</p>
        </div>
      `;
    }

    return this.databases
      .filter(db => !db.is_backup) // Explicitly filter out backup databases
      .map(db => {
        const isSelected = this.selectedDatabase?.id === db.id;
        return `
          <div class="database-item ${isSelected ? 'selected' : ''}">
            <div class="database-item-header" onclick="databaseListSidebar.selectDatabase('${db.id}')">
              <span class="database-icon">📊</span>
              <span class="database-name">${db.name}</span>
              <button class="btn-icon-small" 
                      onclick="event.stopPropagation(); databaseListSidebar.handleDeleteDatabase('${db.id}')"
                      title="Delete">
                🗑️
              </button>
            </div>
            ${isSelected ? this.renderTablesList(db) : ''}
          </div>
        `;
      }).join('');
  }

  /**
   * Render tables list for a database
   */
  renderTablesList(database) {
    const tables = database.tables || [];
    
    if (tables.length === 0) {
      return `
        <div class="tables-list">
          <div class="empty-state-small">
            No tables yet. Create one in the database.
          </div>
        </div>
      `;
    }

    return `
      <div class="tables-list">
        ${tables.map(table => {
          const isSelected = this.selectedTable?.id === table.id;
          return `
            <div class="table-item ${isSelected ? 'selected' : ''}"
                 onclick="databaseListSidebar.selectTable('${database.id}', '${table.id}')">
              <span class="table-icon">📋</span>
              <span class="table-name">${table.name}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Select database
   */
  selectDatabase(databaseId) {
    this.selectedDatabase = this.databases.find(db => db.id === databaseId);
    this.selectedTable = null;
    this.render();
    
    // Trigger event for main content area
    if (window.databaseManager) {
      window.databaseManager.loadDatabase(this.selectedDatabase);
    }
  }

  /**
   * Select table
   */
  async selectTable(databaseId, tableId) {
    this.selectedTable = this.selectedDatabase?.tables?.find(t => t.id === tableId);
    
    if (!this.selectedTable) return;
    
    // Get table metadata
    const { data: table } = await window.clientDatabaseService.getTable(tableId);
    if (!table) return;

    // Get actual table name
    const tableName = await window.clientDatabaseService.getTableNameFromId(tableId);
    if (!tableName) return;

    this.render();
    
    // Trigger event for main content area
    if (window.databaseManager) {
      window.databaseManager.loadTable(tableName, table);
    }
  }

  /**
   * Handle new database
   */
  handleNewDatabase() {
    if (window.databaseBuilder) {
      window.databaseBuilder.openWizard();
    }
  }

  /**
   * Handle delete database
   */
  async handleDeleteDatabase(databaseId) {
    if (!confirm('Are you sure you want to delete this database? All data will be lost.')) {
      return;
    }

    try {
      if (!window.clientDatabaseService) {
        throw new Error('Database service not available');
      }

      const { error } = await window.clientDatabaseService.deleteDatabase(databaseId);
      
      if (error) throw error;

      // Reload databases
      await this.loadDatabases();
      this.selectedDatabase = null;
      this.selectedTable = null;
      this.render();

      // Clear main content
      if (window.databaseManager) {
        window.databaseManager.clearContent();
      }

    } catch (error) {
      console.error('Error deleting database:', error);
      alert('Error deleting database: ' + error.message);
    }
  }

  /**
   * Refresh sidebar
   */
  async refresh() {
    await this.loadDatabases();
    this.render();
  }
}

// Create singleton instance
const databaseListSidebar = new DatabaseListSidebar();

// Make available globally
window.databaseListSidebar = databaseListSidebar;

