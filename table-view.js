// Table View Component
// Spreadsheet-style interface for viewing and editing data

class TableView {
  constructor() {
    this.tableName = null;
    this.tableSchema = null;
    this.data = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.rowsPerPage = 50;
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.searchTerm = '';
    this.editingCell = null;
  }

  /**
   * Initialize table view
   */
  async init(tableName, tableSchema, containerId) {
    this.tableName = tableName;
    this.tableSchema = tableSchema;
    this.container = document.getElementById(containerId);
    this.currentFilters = [];
    
    if (!this.container) {
      console.error('Table view container not found:', containerId);
      return;
    }

    // Initialize import service
    if (window.importService) {
      window.importService.initImportButton(tableName, tableSchema);
    }

    // Initialize view builder
    if (window.viewBuilder && tableSchema.id) {
      await window.viewBuilder.init(tableSchema.id);
    }

    // Setup realtime updates
    if (window.realtimeService) {
      this.setupRealtime();
    }

    await this.loadData();
    this.render();
  }

  /**
   * Setup realtime updates
   */
  setupRealtime() {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }

    if (window.realtimeService) {
      this.realtimeSubscription = window.realtimeService.setupTableDataRealtime(
        this.tableName,
        (payload) => {
          console.log('Realtime update:', payload);
          // Reload data when changes occur
          this.loadData().then(() => {
            this.render();
          });
        }
      );
    }
  }

  /**
   * Load data from database
   */
  async loadData() {
    try {
      if (!window.clientDatabaseService) {
        throw new Error('Database service not available');
      }

      const { data, error } = await window.clientDatabaseService.getTableData(this.tableName);
      
      if (error) throw error;
      
      this.data = data || [];
      this.filteredData = [...this.data];
      this.applyFilters();
    } catch (error) {
      console.error('Error loading table data:', error);
      this.data = [];
      this.filteredData = [];
    }
  }

  /**
   * Render the table view
   */
  render() {
    if (!this.container) return;

    const fields = this.tableSchema.fields || [];
    
    let tableHTML = `
      <div class="table-view-container">
        <div class="table-toolbar">
          <div class="table-search">
            <input type="text" 
                   class="search-input" 
                   placeholder="Search..." 
                   value="${this.searchTerm}"
                   oninput="tableView.handleSearch(this.value)">
            <span class="search-icon">🔍</span>
          </div>
          <div class="table-actions">
            <button class="btn-primary" onclick="tableView.addRow()">
              ➕ Add Row
            </button>
            <button class="btn-secondary" onclick="tableView.exportData()">
              📥 Export CSV
            </button>
          </div>
        </div>
        
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                ${fields.map(field => `
                  <th onclick="tableView.sort('${field.name}')">
                    ${field.label || field.name}
                    ${this.sortColumn === field.name ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                `).join('')}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.renderTableRows(fields)}
            </tbody>
          </table>
        </div>
        
        <div class="table-footer">
          <div class="table-info">
            Showing ${this.filteredData.length} of ${this.data.length} rows
          </div>
          <div class="table-pagination">
            ${this.renderPagination()}
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = tableHTML;
  }

  /**
   * Render table rows
   */
  renderTableRows(fields) {
    const startIndex = (this.currentPage - 1) * this.rowsPerPage;
    const endIndex = startIndex + this.rowsPerPage;
    const pageData = this.filteredData.slice(startIndex, endIndex);

    if (pageData.length === 0) {
      return `
        <tr>
          <td colspan="${fields.length + 1}" class="empty-state">
            No data found. Click "Add Row" to add your first record.
          </td>
        </tr>
      `;
    }

    return pageData.map((row, rowIndex) => `
      <tr data-row-id="${row.id}">
        ${fields.map(field => {
          const value = row[field.name] || '';
          const displayValue = this.formatCellValue(value, field.type);
          return `
            <td 
              class="editable-cell" 
              data-field="${field.name}"
              data-row-id="${row.id}"
              onclick="tableView.startEdit(this, '${field.name}', '${row.id}', '${field.type}')"
            >
              ${displayValue}
            </td>
          `;
        }).join('')}
        <td class="actions-cell">
          <button class="btn-icon" onclick="tableView.deleteRow('${row.id}')" title="Delete">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Format cell value for display
   */
  formatCellValue(value, type) {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'boolean':
        return value ? '✓ Yes' : '✗ No';
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '';
      case 'datetime':
        return value ? new Date(value).toLocaleString() : '';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      default:
        return String(value);
    }
  }

  /**
   * Start editing a cell
   */
  startEdit(cell, fieldName, rowId, fieldType) {
    if (this.editingCell) return; // Already editing

    const currentValue = cell.textContent.trim();
    const row = this.data.find(r => r.id === rowId);
    const value = row ? row[fieldName] : '';

    let inputHTML = '';
    
    switch (fieldType) {
      case 'boolean':
        inputHTML = `
          <select class="cell-input" onchange="tableView.saveCell(this, '${fieldName}', '${rowId}')">
            <option value="false" ${!value ? 'selected' : ''}>No</option>
            <option value="true" ${value ? 'selected' : ''}>Yes</option>
          </select>
        `;
        break;
      case 'date':
        inputHTML = `
          <input type="date" 
                 class="cell-input" 
                 value="${value ? new Date(value).toISOString().split('T')[0] : ''}"
                 onblur="tableView.saveCell(this, '${fieldName}', '${rowId}')"
                 onkeydown="if(event.key==='Enter') tableView.saveCell(this, '${fieldName}', '${rowId}')">
        `;
        break;
      case 'number':
        inputHTML = `
          <input type="number" 
                 class="cell-input" 
                 value="${value || ''}"
                 onblur="tableView.saveCell(this, '${fieldName}', '${rowId}')"
                 onkeydown="if(event.key==='Enter') tableView.saveCell(this, '${fieldName}', '${rowId}')">
        `;
        break;
      default:
        inputHTML = `
          <input type="text" 
                 class="cell-input" 
                 value="${value || ''}"
                 onblur="tableView.saveCell(this, '${fieldName}', '${rowId}')"
                 onkeydown="if(event.key==='Enter') tableView.saveCell(this, '${fieldName}', '${rowId}')">
        `;
    }

    cell.innerHTML = inputHTML;
    const input = cell.querySelector('.cell-input');
    if (input) {
      input.focus();
      input.select();
    }

    this.editingCell = { cell, fieldName, rowId, fieldType };
  }

  /**
   * Save cell value
   */
  async saveCell(input, fieldName, rowId) {
    if (!this.editingCell) return;

    let value = input.value;
    
    // Convert value based on field type
    const field = this.tableSchema.fields.find(f => f.name === fieldName);
    if (field) {
      switch (field.type) {
        case 'boolean':
          value = value === 'true';
          break;
        case 'number':
          value = value ? parseFloat(value) : null;
          break;
        case 'date':
        case 'datetime':
          value = value || null;
          break;
        default:
          value = value || '';
      }
    }

    try {
      if (!window.clientDatabaseService) {
        throw new Error('Database service not available');
      }

      const { error } = await window.clientDatabaseService.updateRow(
        this.tableName,
        rowId,
        { [fieldName]: value }
      );

      if (error) throw error;

      // Update local data
      const row = this.data.find(r => r.id === rowId);
      if (row) {
        row[fieldName] = value;
      }

      // Re-render the cell
      const cell = this.editingCell.cell;
      cell.innerHTML = this.formatCellValue(value, field?.type || 'text');
      this.editingCell = null;

    } catch (error) {
      console.error('Error saving cell:', error);
      alert('Error saving: ' + error.message);
      // Restore original value
      const row = this.data.find(r => r.id === rowId);
      const originalValue = row ? row[fieldName] : '';
      this.editingCell.cell.innerHTML = this.formatCellValue(originalValue, field?.type || 'text');
      this.editingCell = null;
    }
  }

  /**
   * Add new row
   */
  async addRow() {
    const fields = this.tableSchema.fields || [];
    const newRow = {};

    // Create row with default values
    fields.forEach(field => {
      if (field.default) {
        newRow[field.name] = field.default;
      } else if (field.type === 'boolean') {
        newRow[field.name] = false;
      } else if (field.type === 'number') {
        newRow[field.name] = null;
      } else {
        newRow[field.name] = '';
      }
    });

    try {
      if (!window.clientDatabaseService) {
        throw new Error('Database service not available');
      }

      const { data, error } = await window.clientDatabaseService.insertRow(
        this.tableName,
        newRow
      );

      if (error) throw error;

      // Reload data and re-render
      await this.loadData();
      this.render();

    } catch (error) {
      console.error('Error adding row:', error);
      alert('Error adding row: ' + error.message);
    }
  }

  /**
   * Delete row
   */
  async deleteRow(rowId) {
    if (!confirm('Are you sure you want to delete this row?')) return;

    try {
      if (!window.clientDatabaseService) {
        throw new Error('Database service not available');
      }

      const { error } = await window.clientDatabaseService.deleteRow(
        this.tableName,
        rowId
      );

      if (error) throw error;

      // Reload data and re-render
      await this.loadData();
      this.render();

    } catch (error) {
      console.error('Error deleting row:', error);
      alert('Error deleting row: ' + error.message);
    }
  }

  /**
   * Sort table
   */
  sort(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applyFilters();
    this.render();
  }

  /**
   * Handle search
   */
  handleSearch(term) {
    this.searchTerm = term.toLowerCase();
    this.currentPage = 1; // Reset to first page
    this.applyFilters();
    this.render();
  }

  /**
   * Apply filters and sorting
   */
  applyFilters() {
    this.filteredData = [...this.data];

    // Apply custom filters from view builder
    if (this.currentFilters && this.currentFilters.length > 0 && window.viewBuilder) {
      this.filteredData = window.viewBuilder.getFilteredData(this.filteredData, this.currentFilters);
    }

    // Apply search filter
    if (this.searchTerm) {
      this.filteredData = this.filteredData.filter(row => {
        return Object.values(row).some(value => 
          String(value).toLowerCase().includes(this.searchTerm)
        );
      });
    }

    // Apply sorting
    if (this.sortColumn) {
      this.filteredData.sort((a, b) => {
        const aVal = a[this.sortColumn];
        const bVal = b[this.sortColumn];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (this.sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }
  }

  /**
   * Set filters from view builder
   */
  setFilters(filters) {
    this.currentFilters = filters;
    this.currentPage = 1;
    this.applyFilters();
    this.render();
  }

  /**
   * Render pagination
   */
  renderPagination() {
    const totalPages = Math.ceil(this.filteredData.length / this.rowsPerPage);
    
    if (totalPages <= 1) return '';

    let paginationHTML = `
      <button class="btn-icon" 
              onclick="tableView.currentPage = Math.max(1, tableView.currentPage - 1); tableView.render();"
              ${this.currentPage === 1 ? 'disabled' : ''}>
        ←
      </button>
      <span class="page-info">Page ${this.currentPage} of ${totalPages}</span>
      <button class="btn-icon" 
              onclick="tableView.currentPage = Math.min(${totalPages}, tableView.currentPage + 1); tableView.render();"
              ${this.currentPage === totalPages ? 'disabled' : ''}>
        →
      </button>
    `;

    return paginationHTML;
  }

  /**
   * Export data to CSV
   */
  exportData() {
    const fields = this.tableSchema.fields || [];
    const headers = fields.map(f => f.label || f.name);
    
    let csv = headers.join(',') + '\n';
    
    this.filteredData.forEach(row => {
      const values = fields.map(field => {
        const value = row[field.name] || '';
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.tableName}_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

// Create singleton instance
const tableView = new TableView();

// Make available globally
window.tableView = tableView;

