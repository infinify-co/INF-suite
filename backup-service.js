// Backup Service
// Handles automatic backup of all user data to "All Data" database

class BackupService {
  constructor() {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized. Make sure supabase-config.js is loaded first.');
    }
    this.supabase = window.supabase;
    this.backupDatabase = null;
    this.backupTableName = null;
    this.isInitializing = false;
  }

  /**
   * Initialize backup database for a user (called on signup)
   */
  async initializeBackupDatabase() {
    if (this.isInitializing) {
      console.log('Backup database initialization already in progress');
      return;
    }

    try {
      this.isInitializing = true;
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if backup database already exists
      const existingBackup = await this.getBackupDatabase();
      if (existingBackup) {
        console.log('Backup database already exists');
        this.backupDatabase = existingBackup;
        return { data: existingBackup, error: null };
      }

      // Create "All Data" backup database
      if (!window.clientDatabaseService) {
        throw new Error('Database service not available');
      }

      const { data: backupDb, error: dbError } = await window.clientDatabaseService.createDatabase(
        'All Data',
        'Automatic backup of all your data, files, and settings',
        null,
        true // is_backup flag
      );

      if (dbError) throw dbError;

      this.backupDatabase = backupDb;

      // Create backup tables structure
      await this.createBackupTables(backupDb.id);

      console.log('Backup database initialized successfully');
      return { data: backupDb, error: null };
    } catch (error) {
      console.error('Error initializing backup database:', error);
      return { data: null, error };
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Create backup tables structure
   */
  async createBackupTables(databaseId) {
    try {
      // Create Documents table
      const documentsFields = [
        { name: 'file_name', type: 'text', required: true },
        { name: 'file_path', type: 'text', required: true },
        { name: 'file_type', type: 'text', required: true },
        { name: 'file_size', type: 'number', required: false },
        { name: 'backup_timestamp', type: 'timestamp', required: true },
        { name: 'original_location', type: 'text', required: false },
        { name: 'metadata', type: 'jsonb', required: false }
      ];

      const { data: documentsTable, error: docError } = await window.clientDatabaseService.createTable(
        databaseId,
        'Documents',
        'Backup of all user files and documents',
        documentsFields
      );

      if (docError) console.warn('Error creating Documents table:', docError);

      // Create Data table
      const dataFields = [
        { name: 'backup_type', type: 'text', required: true }, // 'database', 'table', 'row', 'settings'
        { name: 'backup_data', type: 'jsonb', required: true },
        { name: 'backup_timestamp', type: 'timestamp', required: true },
        { name: 'change_type', type: 'text', required: true }, // 'create', 'update', 'delete'
        { name: 'original_id', type: 'text', required: false },
        { name: 'metadata', type: 'jsonb', required: false }
      ];

      const { data: dataTable, error: dataError } = await window.clientDatabaseService.createTable(
        databaseId,
        'Data',
        'Backup of all database data and changes',
        dataFields
      );

      if (dataError) console.warn('Error creating Data table:', dataError);

      return { error: null };
    } catch (error) {
      console.error('Error creating backup tables:', error);
      return { error };
    }
  }

  /**
   * Get the backup database for current user
   */
  async getBackupDatabase() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('client_databases')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_backup', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      if (data) {
        this.backupDatabase = data;
      }

      return data || null;
    } catch (error) {
      console.error('Error getting backup database:', error);
      return null;
    }
  }

  /**
   * Backup a database and its data
   */
  async backupDatabase(databaseId) {
    try {
      const backupDb = await this.ensureBackupDatabase();
      if (!backupDb) return { error: new Error('Backup database not available') };

      // Get database info
      const { data: database, error: dbError } = await window.clientDatabaseService.getDatabase(databaseId);
      if (dbError || !database) throw dbError || new Error('Database not found');

      // Get all tables in the database
      const { data: tables } = await window.clientDatabaseService.getTables(databaseId);

      // Backup database metadata
      await this.autoSaveChange('database', {
        change_type: 'update',
        original_id: databaseId,
        backup_data: {
          database: database,
          tables: tables || [],
          backup_timestamp: new Date().toISOString()
        }
      });

      // Backup each table's data
      if (tables && tables.length > 0) {
        for (const table of tables) {
          const tableName = await window.clientDatabaseService.getTableNameFromId(table.id);
          if (tableName) {
            const { data: tableData } = await window.clientDatabaseService.getTableData(tableName);
            
            await this.autoSaveChange('table', {
              change_type: 'update',
              original_id: table.id,
              backup_data: {
                table: table,
                data: tableData || [],
                backup_timestamp: new Date().toISOString()
              }
            });
          }
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Error backing up database:', error);
      return { error };
    }
  }

  /**
   * Backup a file to Supabase Storage and record metadata
   */
  async backupFile(file, metadata = {}) {
    try {
      const backupDb = await this.ensureBackupDatabase();
      if (!backupDb) return { error: new Error('Backup database not available') };

      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload file to Supabase Storage
      const filePath = `user-backups/${user.id}/files/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('user-backups')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('user-backups')
        .getPublicUrl(filePath);

      // Record file metadata in backup database
      const fileRecord = {
        file_name: file.name,
        file_path: filePath,
        file_type: file.type || 'unknown',
        file_size: file.size,
        backup_timestamp: new Date().toISOString(),
        original_location: metadata.originalLocation || 'unknown',
        metadata: {
          public_url: publicUrl,
          ...metadata
        }
      };

      // Get Documents table name
      const { data: tables } = await window.clientDatabaseService.getTables(backupDb.id);
      const documentsTable = tables?.find(t => t.name === 'Documents');
      
      if (documentsTable) {
        const tableName = await window.clientDatabaseService.getTableNameFromId(documentsTable.id);
        if (tableName) {
          await window.clientDatabaseService.insertRow(tableName, fileRecord);
        }
      }

      return { data: { filePath, publicUrl }, error: null };
    } catch (error) {
      console.error('Error backing up file:', error);
      return { data: null, error };
    }
  }

  /**
   * Backup user settings
   */
  async backupUserSettings(settings) {
    try {
      await this.autoSaveChange('settings', {
        change_type: 'update',
        backup_data: {
          settings: settings,
          backup_timestamp: new Date().toISOString()
        }
      });

      return { error: null };
    } catch (error) {
      console.error('Error backing up user settings:', error);
      return { error };
    }
  }

  /**
   * Auto-save change handler (real-time backup)
   */
  async autoSaveChange(type, data) {
    try {
      const backupDb = await this.ensureBackupDatabase();
      if (!backupDb) {
        console.warn('Backup database not available, skipping backup');
        return { error: new Error('Backup database not available') };
      }

      // Get Data table
      const { data: tables } = await window.clientDatabaseService.getTables(backupDb.id);
      const dataTable = tables?.find(t => t.name === 'Data');
      
      if (!dataTable) {
        console.warn('Data table not found in backup database');
        return { error: new Error('Data table not found') };
      }

      const tableName = await window.clientDatabaseService.getTableNameFromId(dataTable.id);
      if (!tableName) {
        console.warn('Could not get Data table name');
        return { error: new Error('Could not get Data table name') };
      }

      // Insert backup record
      const backupRecord = {
        backup_type: type,
        backup_data: data.backup_data || data,
        backup_timestamp: new Date().toISOString(),
        change_type: data.change_type || 'update',
        original_id: data.original_id || null,
        metadata: data.metadata || {}
      };

      const { error } = await window.clientDatabaseService.insertRow(tableName, backupRecord);

      if (error) {
        console.error('Error saving backup record:', error);
        return { error };
      }

      // Update backup metadata in database record
      await this.updateBackupMetadata(backupDb.id, type, data.change_type || 'update');

      return { error: null };
    } catch (error) {
      console.error('Error in autoSaveChange:', error);
      return { error };
    }
  }

  /**
   * Update backup metadata in database record
   */
  async updateBackupMetadata(databaseId, backupType, changeType) {
    try {
      const { data: database } = await window.clientDatabaseService.getDatabase(databaseId);
      if (!database) return;

      const currentMetadata = database.backup_metadata || {};
      const timestamp = new Date().toISOString();

      const updatedMetadata = {
        ...currentMetadata,
        last_backup: timestamp,
        last_backup_type: backupType,
        last_change_type: changeType,
        backup_history: [
          ...(currentMetadata.backup_history || []),
          {
            timestamp,
            type: backupType,
            change_type: changeType
          }
        ].slice(-100) // Keep last 100 backup records
      };

      await window.clientDatabaseService.updateDatabase(databaseId, {
        backup_metadata: updatedMetadata
      });
    } catch (error) {
      console.warn('Error updating backup metadata:', error);
    }
  }

  /**
   * Ensure backup database exists, create if not
   */
  async ensureBackupDatabase() {
    if (this.backupDatabase) {
      return this.backupDatabase;
    }

    const backupDb = await this.getBackupDatabase();
    if (backupDb) {
      this.backupDatabase = backupDb;
      return backupDb;
    }

    // Try to initialize if it doesn't exist
    const { data } = await this.initializeBackupDatabase();
    return data || null;
  }
}

// Create singleton instance
const backupService = new BackupService();

// Make available globally
window.backupService = backupService;

