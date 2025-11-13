// Client Database Service
// Handles all CRUD operations for client databases and tables

class ClientDatabaseService {
  constructor() {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized. Make sure supabase-config.js is loaded first.');
    }
    this.supabase = window.supabase;
  }

  // ========== DATABASE OPERATIONS ==========

  /**
   * Get all databases for the current user
   * @param {boolean} includeBackup - Whether to include backup databases (default: false)
   */
  async getDatabases(includeBackup = false) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let query = this.supabase
        .from('client_databases')
        .select('*')
        .eq('user_id', user.id);

      // Filter out backup databases unless explicitly requested
      if (!includeBackup) {
        query = query.or('is_backup.is.null,is_backup.eq.false');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching databases:', error);
      return { data: null, error };
    }
  }

  /**
   * Get a single database by ID
   */
  async getDatabase(databaseId) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('client_databases')
        .select('*')
        .eq('id', databaseId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching database:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a new database
   */
  async createDatabase(name, description = '', templateId = null, isBackup = false) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('client_databases')
        .insert([
          {
            user_id: user.id,
            name: name,
            description: description,
            template_id: templateId,
            is_backup: isBackup,
            backup_metadata: isBackup ? { created_at: new Date().toISOString(), backup_history: [] } : null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Trigger backup if this is not the backup database itself
      if (!isBackup && window.backupService) {
        window.backupService.backupDatabase(data.id).catch(err => {
          console.warn('Error backing up new database:', err);
        });
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error creating database:', error);
      return { data: null, error };
    }
  }

  /**
   * Update a database
   */
  async updateDatabase(databaseId, updates) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get database to check if it's a backup database
      const { data: database } = await this.getDatabase(databaseId);
      const isBackupDb = database?.is_backup || false;

      const { data, error } = await this.supabase
        .from('client_databases')
        .update(updates)
        .eq('id', databaseId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Trigger backup if this is not the backup database itself
      if (!isBackupDb && window.backupService) {
        window.backupService.backupDatabase(databaseId).catch(err => {
          console.warn('Error backing up database update:', err);
        });
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error updating database:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a database and all its tables
   */
  async deleteDatabase(databaseId) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get all tables in this database
      const { data: tables } = await this.getTables(databaseId);
      
      // Delete all tables first
      if (tables) {
        for (const table of tables) {
          await this.deleteTable(table.id);
        }
      }

      // Delete the database
      const { error } = await this.supabase
        .from('client_databases')
        .delete()
        .eq('id', databaseId)
        .eq('user_id', user.id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting database:', error);
      return { error };
    }
  }

  // ========== TABLE OPERATIONS ==========

  /**
   * Get all tables for a database
   */
  async getTables(databaseId) {
    try {
      const { data, error } = await this.supabase
        .from('client_tables')
        .select('*')
        .eq('database_id', databaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching tables:', error);
      return { data: null, error };
    }
  }

  /**
   * Get a single table by ID
   */
  async getTable(tableId) {
    try {
      const { data, error } = await this.supabase
        .from('client_tables')
        .select('*')
        .eq('id', tableId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching table:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a new table and its actual database table
   */
  async createTable(databaseId, tableName, description, fields) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get database info
      const { data: database } = await this.getDatabase(databaseId);
      if (!database) throw new Error('Database not found');

      // Create table record
      const { data: tableRecord, error: tableError } = await this.supabase
        .from('client_tables')
        .insert([
          {
            database_id: databaseId,
            name: tableName,
            description: description,
            fields: fields
          }
        ])
        .select()
        .single();

      if (tableError) throw tableError;

      // Create actual database table using Supabase function
      const tableName_db = `client_${user.id.replace(/-/g, '_')}_db_${databaseId.replace(/-/g, '_')}_table_${tableRecord.id.replace(/-/g, '_')}`;
      
      const { data: createTableData, error: createError } = await this.supabase.rpc(
        'create_client_table',
        {
          p_table_name: tableName_db,
          p_client_id: user.id,
          p_database_id: databaseId,
          p_table_id: tableRecord.id,
          p_fields: fields
        }
      );

      if (createError) {
        // If table creation fails, delete the table record
        await this.supabase.from('client_tables').delete().eq('id', tableRecord.id);
        throw createError;
      }

      // Trigger backup (but not for backup database itself)
      const { data: database } = await this.getDatabase(databaseId);
      const isBackupDb = database?.is_backup || false;
      
      if (!isBackupDb && window.backupService) {
        window.backupService.backupDatabase(databaseId).catch(err => {
          console.warn('Error backing up table creation:', err);
        });
      }

      return { data: tableRecord, error: null, tableName: tableName_db };
    } catch (error) {
      console.error('Error creating table:', error);
      return { data: null, error };
    }
  }

  /**
   * Update a table schema
   */
  async updateTable(tableId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('client_tables')
        .update(updates)
        .eq('id', tableId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating table:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a table and its actual database table
   */
  async deleteTable(tableId) {
    try {
      // Get table metadata to find the actual table name
      const { data: table } = await this.getTable(tableId);
      if (!table) throw new Error('Table not found');

      // Get metadata
      const { data: metadata } = await this.supabase
        .from('table_metadata')
        .select('table_name')
        .eq('table_id', tableId)
        .single();

      // Drop the actual table if it exists
      if (metadata) {
        const { error: dropError } = await this.supabase.rpc(
          'drop_client_table',
          { p_table_name: metadata.table_name }
        );
        if (dropError) console.warn('Error dropping table:', dropError);
      }

      // Delete the table record
      const { error } = await this.supabase
        .from('client_tables')
        .delete()
        .eq('id', tableId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting table:', error);
      return { error };
    }
  }

  // ========== DATA OPERATIONS ==========

  /**
   * Get all rows from a table
   */
  async getTableData(tableName) {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching table data:', error);
      return { data: null, error };
    }
  }

  /**
   * Get a single row by ID
   */
  async getRow(tableName, rowId) {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('id', rowId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching row:', error);
      return { data: null, error };
    }
  }

  /**
   * Insert a new row
   */
  async insertRow(tableName, rowData) {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .insert([rowData])
        .select()
        .single();

      if (error) throw error;

      // Update row count in metadata
      await this.updateTableRowCount(tableName);

      // Trigger backup
      if (window.backupService) {
        window.backupService.autoSaveChange('row', {
          change_type: 'create',
          backup_data: {
            table_name: tableName,
            row: data,
            backup_timestamp: new Date().toISOString()
          }
        }).catch(err => {
          console.warn('Error backing up row insertion:', err);
        });
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error inserting row:', error);
      return { data: null, error };
    }
  }

  /**
   * Update a row
   */
  async updateRow(tableName, rowId, updates) {
    try {
      updates.updated_at = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from(tableName)
        .update(updates)
        .eq('id', rowId)
        .select()
        .single();

      if (error) throw error;

      // Update last modified in metadata
      await this.updateTableMetadata(tableName);

      // Trigger backup
      if (window.backupService) {
        window.backupService.autoSaveChange('row', {
          change_type: 'update',
          original_id: rowId,
          backup_data: {
            table_name: tableName,
            row: data,
            backup_timestamp: new Date().toISOString()
          }
        }).catch(err => {
          console.warn('Error backing up row update:', err);
        });
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error updating row:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a row
   */
  async deleteRow(tableName, rowId) {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .delete()
        .eq('id', rowId);

      if (error) throw error;

      // Update row count in metadata
      await this.updateTableRowCount(tableName);

      // Trigger backup
      if (window.backupService) {
        window.backupService.autoSaveChange('row', {
          change_type: 'delete',
          original_id: rowId,
          backup_data: {
            table_name: tableName,
            row_id: rowId,
            backup_timestamp: new Date().toISOString()
          }
        }).catch(err => {
          console.warn('Error backing up row deletion:', err);
        });
      }

      return { error: null };
    } catch (error) {
      console.error('Error deleting row:', error);
      return { error };
    }
  }

  /**
   * Insert multiple rows (for imports)
   */
  async insertRows(tableName, rows) {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .insert(rows)
        .select();

      if (error) throw error;

      // Update row count in metadata
      await this.updateTableRowCount(tableName);

      // Trigger backup
      if (window.backupService) {
        window.backupService.autoSaveChange('table', {
          change_type: 'update',
          backup_data: {
            table_name: tableName,
            rows: data || [],
            backup_timestamp: new Date().toISOString()
          }
        }).catch(err => {
          console.warn('Error backing up bulk row insertion:', err);
        });
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error inserting rows:', error);
      return { data: null, error };
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Update table row count in metadata
   */
  async updateTableRowCount(tableName) {
    try {
      const { data: tableData } = await this.getTableData(tableName);
      const rowCount = tableData ? tableData.length : 0;

      const { error } = await this.supabase
        .from('table_metadata')
        .update({ 
          row_count: rowCount,
          last_modified: new Date().toISOString()
        })
        .eq('table_name', tableName);

      if (error) console.warn('Error updating metadata:', error);
    } catch (error) {
      console.warn('Error updating row count:', error);
    }
  }

  /**
   * Update table metadata last modified
   */
  async updateTableMetadata(tableName) {
    try {
      const { error } = await this.supabase
        .from('table_metadata')
        .update({ last_modified: new Date().toISOString() })
        .eq('table_name', tableName);

      if (error) console.warn('Error updating metadata:', error);
    } catch (error) {
      console.warn('Error updating metadata:', error);
    }
  }

  /**
   * Get table name from table ID
   */
  async getTableNameFromId(tableId) {
    try {
      const { data: metadata } = await this.supabase
        .from('table_metadata')
        .select('table_name')
        .eq('table_id', tableId)
        .single();

      return metadata ? metadata.table_name : null;
    } catch (error) {
      console.error('Error getting table name:', error);
      return null;
    }
  }
}

// Create singleton instance
const clientDatabaseService = new ClientDatabaseService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientDatabaseService;
}

// Make available globally
window.clientDatabaseService = clientDatabaseService;

