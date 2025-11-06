// Form View Component
// Form-based data entry interface for easier data management

class FormView {
  constructor() {
    this.tableName = null;
    this.tableSchema = null;
    this.data = [];
    this.currentIndex = 0;
    this.currentRecord = null;
    this.isEditing = false;
    this.formData = {};
  }

  /**
   * Initialize form view
   */
  async init(tableName, tableSchema, containerId) {
    this.tableName = tableName;
    this.tableSchema = tableSchema;
    this.container = document.getElementById(containerId);
    
    if (!this.container) {
      console.error('Form view container not found:', containerId);
      return;
    }

    await this.loadData();
    this.render();
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
      this.currentIndex = 0;
      this.loadRecord(0);
    } catch (error) {
      console.error('Error loading form data:', error);
      this.data = [];
      this.currentRecord = null;
    }
  }

  /**
   * Load a specific record
   */
  loadRecord(index) {
    if (index < 0 || index >= this.data.length) {
      // New record
      this.currentRecord = null;
      this.isEditing = false;
      this.formData = this.getDefaultFormData();
    } else {
      this.currentRecord = this.data[index];
      this.isEditing = true;
      this.formData = { ...this.currentRecord };
    }
    this.currentIndex = index;
    this.render();
  }

  /**
   * Get default form data
   */
  getDefaultFormData() {
    const fields = this.tableSchema.fields || [];
    const defaultData = {};
    
    fields.forEach(field => {
      if (field.default) {
        defaultData[field.name] = field.default;
      } else if (field.type === 'boolean') {
        defaultData[field.name] = false;
      } else if (field.type === 'number') {
        defaultData[field.name] = null;
      } else {
        defaultData[field.name] = '';
      }
    });
    
    return defaultData;
  }

  /**
   * Render the form view
   */
  render() {
    if (!this.container) return;

    const fields = this.tableSchema.fields || [];
    const totalRecords = this.data.length;
    const recordNumber = this.currentIndex < 0 ? 'New' : this.currentIndex + 1;

    let formHTML = `
      <div class="form-view-container">
        <div class="form-header">
          <h2>${this.isEditing ? 'Edit Record' : 'New Record'}</h2>
          <div class="form-navigation">
            <span class="record-counter">Record ${recordNumber} of ${totalRecords + (this.isEditing ? 0 : 1)}</span>
            <div class="nav-buttons">
              <button class="btn-icon" 
                      onclick="formView.loadRecord(${this.currentIndex - 1})"
                      ${this.currentIndex <= 0 ? 'disabled' : ''}
                      title="Previous">
                ←
              </button>
              <button class="btn-icon" 
                      onclick="formView.loadRecord(${this.currentIndex + 1})"
                      ${this.currentIndex >= totalRecords - 1 ? 'disabled' : ''}
                      title="Next">
                →
              </button>
            </div>
          </div>
        </div>

        <form class="data-form" onsubmit="formView.handleSubmit(event)">
          ${fields.map(field => this.renderField(field)).join('')}
          
          <div class="form-actions">
            <button type="submit" class="btn-primary btn-large">
              ${this.isEditing ? '💾 Save Changes' : '➕ Add Record'}
            </button>
            ${this.isEditing ? `
              <button type="button" class="btn-danger" onclick="formView.handleDelete()">
                🗑️ Delete Record
              </button>
            ` : ''}
            <button type="button" class="btn-secondary" onclick="formView.handleCancel()">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    this.container.innerHTML = formHTML;
  }

  /**
   * Render a single form field
   */
  renderField(field) {
    const value = this.formData[field.name] || '';
    const fieldId = `field-${field.name}`;
    const label = field.label || field.name;
    const required = field.required ? 'required' : '';

    let inputHTML = '';

    switch (field.type) {
      case 'boolean':
        inputHTML = `
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" 
                     id="${fieldId}"
                     name="${field.name}"
                     ${value ? 'checked' : ''}
                     onchange="formView.updateField('${field.name}', this.checked)">
              <span>${label}</span>
            </label>
          </div>
        `;
        break;

      case 'text':
        inputHTML = `
          <div class="form-group">
            <label for="${fieldId}">${label} ${field.required ? '*' : ''}</label>
            <textarea 
              id="${fieldId}"
              name="${field.name}"
              class="form-input form-textarea"
              ${required}
              placeholder="Enter ${label.toLowerCase()}"
              onchange="formView.updateField('${field.name}', this.value)"
            >${value}</textarea>
          </div>
        `;
        break;

      case 'number':
        inputHTML = `
          <div class="form-group">
            <label for="${fieldId}">${label} ${field.required ? '*' : ''}</label>
            <input 
              type="number" 
              id="${fieldId}"
              name="${field.name}"
              class="form-input"
              ${required}
              value="${value}"
              placeholder="Enter ${label.toLowerCase()}"
              onchange="formView.updateField('${field.name}', this.value ? parseFloat(this.value) : null)"
            >
          </div>
        `;
        break;

      case 'date':
        inputHTML = `
          <div class="form-group">
            <label for="${fieldId}">${label} ${field.required ? '*' : ''}</label>
            <input 
              type="date" 
              id="${fieldId}"
              name="${field.name}"
              class="form-input"
              ${required}
              value="${value ? new Date(value).toISOString().split('T')[0] : ''}"
              onchange="formView.updateField('${field.name}', this.value)"
            >
          </div>
        `;
        break;

      case 'datetime':
        inputHTML = `
          <div class="form-group">
            <label for="${fieldId}">${label} ${field.required ? '*' : ''}</label>
            <input 
              type="datetime-local" 
              id="${fieldId}"
              name="${field.name}"
              class="form-input"
              ${required}
              value="${value ? new Date(value).toISOString().slice(0, 16) : ''}"
              onchange="formView.updateField('${field.name}', this.value)"
            >
          </div>
        `;
        break;

      case 'email':
        inputHTML = `
          <div class="form-group">
            <label for="${fieldId}">${label} ${field.required ? '*' : ''}</label>
            <input 
              type="email" 
              id="${fieldId}"
              name="${field.name}"
              class="form-input"
              ${required}
              value="${value}"
              placeholder="example@email.com"
              onchange="formView.updateField('${field.name}', this.value)"
            >
          </div>
        `;
        break;

      case 'phone':
        inputHTML = `
          <div class="form-group">
            <label for="${fieldId}">${label} ${field.required ? '*' : ''}</label>
            <input 
              type="tel" 
              id="${fieldId}"
              name="${field.name}"
              class="form-input"
              ${required}
              value="${value}"
              placeholder="(555) 123-4567"
              onchange="formView.updateField('${field.name}', this.value)"
            >
          </div>
        `;
        break;

      default:
        inputHTML = `
          <div class="form-group">
            <label for="${fieldId}">${label} ${field.required ? '*' : ''}</label>
            <input 
              type="text" 
              id="${fieldId}"
              name="${field.name}"
              class="form-input"
              ${required}
              value="${value}"
              placeholder="Enter ${label.toLowerCase()}"
              onchange="formView.updateField('${field.name}', this.value)"
            >
          </div>
        `;
    }

    return inputHTML;
  }

  /**
   * Update field value
   */
  updateField(fieldName, value) {
    this.formData[fieldName] = value;
  }

  /**
   * Handle form submit
   */
  async handleSubmit(event) {
    event.preventDefault();

    try {
      if (!window.clientDatabaseService) {
        throw new Error('Database service not available');
      }

      // Validate required fields
      const fields = this.tableSchema.fields || [];
      const missingFields = fields
        .filter(f => f.required && !this.formData[f.name])
        .map(f => f.label || f.name);

      if (missingFields.length > 0) {
        alert('Please fill in required fields: ' + missingFields.join(', '));
        return;
      }

      if (this.isEditing && this.currentRecord) {
        // Update existing record
        const { error } = await window.clientDatabaseService.updateRow(
          this.tableName,
          this.currentRecord.id,
          this.formData
        );

        if (error) throw error;

        // Reload data
        await this.loadData();
        this.loadRecord(this.currentIndex);
        
        alert('Record updated successfully!');
      } else {
        // Insert new record
        const { data, error } = await window.clientDatabaseService.insertRow(
          this.tableName,
          this.formData
        );

        if (error) throw error;

        // Reload data and load the new record
        await this.loadData();
        this.loadRecord(this.data.length - 1);
        
        alert('Record added successfully!');
      }

    } catch (error) {
      console.error('Error saving record:', error);
      alert('Error saving record: ' + error.message);
    }
  }

  /**
   * Handle delete
   */
  async handleDelete() {
    if (!this.currentRecord) return;
    
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      if (!window.clientDatabaseService) {
        throw new Error('Database service not available');
      }

      const { error } = await window.clientDatabaseService.deleteRow(
        this.tableName,
        this.currentRecord.id
      );

      if (error) throw error;

      // Reload data
      await this.loadData();
      
      // Load next record or previous if at end
      if (this.currentIndex >= this.data.length) {
        this.currentIndex = this.data.length - 1;
      }
      
      this.loadRecord(this.currentIndex);

    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record: ' + error.message);
    }
  }

  /**
   * Handle cancel
   */
  handleCancel() {
    if (this.currentRecord) {
      // Reload original record
      this.loadRecord(this.currentIndex);
    } else {
      // Go to first record
      this.loadRecord(0);
    }
  }

  /**
   * Switch to new record mode
   */
  newRecord() {
    this.loadRecord(-1);
  }
}

// Create singleton instance
const formView = new FormView();

// Make available globally
window.formView = formView;

