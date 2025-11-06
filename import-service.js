// Import Service
// Handles Excel/CSV import with column mapping

class ImportService {
  constructor() {
    this.papaParseLoaded = false;
    this.sheetJSLoaded = false;
    this.loadLibraries();
  }

  /**
   * Load required libraries
   */
  loadLibraries() {
    // Load PapaParse for CSV
    if (!window.Papa) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
      script.onload = () => {
        this.papaParseLoaded = true;
      };
      document.head.appendChild(script);
    } else {
      this.papaParseLoaded = true;
    }

    // Load SheetJS for Excel
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => {
        this.sheetJSLoaded = true;
      };
      document.head.appendChild(script);
    } else {
      this.sheetJSLoaded = true;
    }
  }

  /**
   * Handle file selection
   */
  async handleFileSelect(file, tableSchema, onPreview, onComplete) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    try {
      let data = [];
      
      if (fileExtension === 'csv') {
        data = await this.parseCSV(file);
      } else if (['xlsx', 'xls'].includes(fileExtension)) {
        data = await this.parseExcel(file);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
      }

      if (!data || data.length === 0) {
        throw new Error('File appears to be empty or invalid.');
      }

      // Show preview and mapping interface
      this.showMappingInterface(data, tableSchema, file.name, onPreview, onComplete);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file: ' + error.message);
    }
  }

  /**
   * Parse CSV file
   */
  parseCSV(file) {
    return new Promise((resolve, reject) => {
      if (!window.Papa) {
        reject(new Error('CSV parser not loaded. Please wait a moment and try again.'));
        return;
      }

      window.Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Parse Excel file
   */
  parseExcel(file) {
    return new Promise((resolve, reject) => {
      if (!window.XLSX) {
        reject(new Error('Excel parser not loaded. Please wait a moment and try again.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Show column mapping interface
   */
  showMappingInterface(fileData, tableSchema, fileName, onPreview, onComplete) {
    const fileColumns = Object.keys(fileData[0] || {});
    const tableFields = tableSchema.fields || [];

    // Auto-detect matches
    const fieldMap = {};
    fileColumns.forEach(fileCol => {
      const match = tableFields.find(field => {
        const fieldName = (field.name || '').toLowerCase();
        const fieldLabel = (field.label || '').toLowerCase();
        const colName = fileCol.toLowerCase();
        return fieldName === colName || fieldLabel === colName ||
               fieldName.includes(colName) || colName.includes(fieldName);
      });
      if (match) {
        fieldMap[fileCol] = match.name;
      }
    });

    // Create mapping UI
    const container = document.getElementById('import-mapping-container') || this.createMappingContainer();
    
    container.innerHTML = `
      <div class="import-mapping-modal">
        <div class="import-mapping-content">
          <div class="import-header">
            <h2>Map Columns</h2>
            <p>Map columns from "${fileName}" to your database fields</p>
          </div>
          
          <div class="mapping-preview">
            <h3>Preview (first 5 rows)</h3>
            <div class="preview-table-container">
              <table class="preview-table">
                <thead>
                  <tr>
                    ${fileColumns.map(col => `<th>${col}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${fileData.slice(0, 5).map(row => `
                    <tr>
                      ${fileColumns.map(col => `<td>${row[col] || ''}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="mapping-fields">
            <h3>Column Mapping</h3>
            <div class="mapping-list">
              ${fileColumns.map(fileCol => {
                const currentMapping = fieldMap[fileCol] || '';
                return `
                  <div class="mapping-row">
                    <div class="file-column">
                      <strong>${fileCol}</strong>
                      <span class="sample-value">${fileData[0]?.[fileCol] || '(empty)'}</span>
                    </div>
                    <div class="mapping-arrow">→</div>
                    <div class="table-field">
                      <select class="field-mapping-select" data-file-column="${fileCol}">
                        <option value="">-- Skip this column --</option>
                        ${tableFields.map(field => `
                          <option value="${field.name}" ${currentMapping === field.name ? 'selected' : ''}>
                            ${field.label || field.name} (${field.type})
                          </option>
                        `).join('')}
                      </select>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="import-actions">
            <button class="btn-secondary" onclick="importService.closeMappingModal()">Cancel</button>
            <button class="btn-primary" onclick="importService.executeImport('${fileName}', fileData, tableSchema, onComplete)">
              Import Data
            </button>
          </div>
        </div>
      </div>
    `;

    // Store file data for import
    window._importFileData = fileData;
    window._importTableSchema = tableSchema;
    window._importCompleteCallback = onComplete;
  }

  /**
   * Create mapping container if it doesn't exist
   */
  createMappingContainer() {
    let container = document.getElementById('import-mapping-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'import-mapping-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Execute import with mapped columns
   */
  async executeImport(fileName, fileData, tableSchema, onComplete) {
    try {
      // Get column mappings
      const mappings = {};
      const selects = document.querySelectorAll('.field-mapping-select');
      selects.forEach(select => {
        const fileColumn = select.dataset.fileColumn;
        const tableField = select.value;
        if (tableField) {
          mappings[fileColumn] = tableField;
        }
      });

      // Validate mappings
      const requiredFields = tableSchema.fields.filter(f => f.required);
      const missingFields = requiredFields.filter(f => !Object.values(mappings).includes(f.name));
      
      if (missingFields.length > 0) {
        alert('Please map all required fields: ' + missingFields.map(f => f.label || f.name).join(', '));
        return;
      }

      // Transform data
      const transformedData = this.transformData(fileData, mappings, tableSchema);
      
      if (transformedData.length === 0) {
        alert('No valid data to import.');
        return;
      }

      // Show progress
      this.showImportProgress(0, transformedData.length);

      // Import in batches
      const batchSize = 50;
      let imported = 0;
      let errors = [];

      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);
        
        try {
          if (!window.clientDatabaseService) {
            throw new Error('Database service not available');
          }

          // Get table name from schema (we'll need to pass this)
          const tableName = window._importTableName;
          if (!tableName) {
            throw new Error('Table name not available');
          }

          const { data, error } = await window.clientDatabaseService.insertRows(tableName, batch);
          
          if (error) {
            errors.push({ batch: i / batchSize + 1, error: error.message });
          } else {
            imported += batch.length;
          }

          // Update progress
          this.showImportProgress(imported, transformedData.length);
        } catch (error) {
          errors.push({ batch: i / batchSize + 1, error: error.message });
        }
      }

      // Close modal and show results
      this.closeMappingModal();
      
      if (errors.length > 0) {
        alert(`Import completed with ${errors.length} errors. ${imported} rows imported successfully.`);
      } else {
        alert(`Successfully imported ${imported} rows!`);
      }

      if (onComplete) {
        onComplete(imported, errors);
      }

    } catch (error) {
      console.error('Error executing import:', error);
      alert('Error during import: ' + error.message);
    }
  }

  /**
   * Transform data based on mappings
   */
  transformData(fileData, mappings, tableSchema) {
    const transformed = [];
    const fields = tableSchema.fields || [];

    fileData.forEach((row, index) => {
      const transformedRow = {};
      let isValid = true;

      fields.forEach(field => {
        const fileColumn = Object.keys(mappings).find(col => mappings[col] === field.name);
        
        if (fileColumn !== undefined) {
          let value = row[fileColumn];

          // Transform based on field type
          switch (field.type) {
            case 'number':
              value = value ? parseFloat(value) : (field.default || null);
              if (isNaN(value) && field.required) {
                isValid = false;
              }
              break;
            case 'boolean':
              value = value === 'true' || value === '1' || value === 'yes' || value === true;
              break;
            case 'date':
              value = value ? new Date(value).toISOString().split('T')[0] : null;
              break;
            case 'datetime':
              value = value ? new Date(value).toISOString() : null;
              break;
            default:
              value = value || field.default || '';
          }

          transformedRow[field.name] = value;
        } else if (field.default !== undefined) {
          transformedRow[field.name] = field.default;
        } else if (field.required) {
          isValid = false;
        }
      });

      if (isValid) {
        transformed.push(transformedRow);
      }
    });

    return transformed;
  }

  /**
   * Show import progress
   */
  showImportProgress(imported, total) {
    let progressContainer = document.getElementById('import-progress');
    if (!progressContainer) {
      progressContainer = document.createElement('div');
      progressContainer.id = 'import-progress';
      progressContainer.className = 'import-progress-modal';
      document.body.appendChild(progressContainer);
    }

    const percentage = Math.round((imported / total) * 100);
    progressContainer.innerHTML = `
      <div class="progress-content">
        <h3>Importing Data...</h3>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${percentage}%"></div>
        </div>
        <p>${imported} of ${total} rows imported (${percentage}%)</p>
      </div>
    `;
  }

  /**
   * Close mapping modal
   */
  closeMappingModal() {
    const container = document.getElementById('import-mapping-container');
    if (container) {
      container.innerHTML = '';
    }
    
    const progress = document.getElementById('import-progress');
    if (progress) {
      progress.remove();
    }

    delete window._importFileData;
    delete window._importTableSchema;
    delete window._importTableName;
    delete window._importCompleteCallback;
  }

  /**
   * Initialize import button in table view
   */
  initImportButton(tableName, tableSchema) {
    window._importTableName = tableName;
    window._importTableSchema = tableSchema;
  }
}

// Create singleton instance
const importService = new ImportService();

// Make available globally
window.importService = importService;

