// Database Builder Wizard
// Step-by-step wizard for creating databases from templates or custom fields

class DatabaseBuilder {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 5;
    this.selectedTemplate = null;
    this.customFields = [];
    this.databaseName = '';
    this.databaseDescription = '';
    this.wizardContainer = null;
    this._nameUpdateTimer = null;
  }

  /**
   * Initialize the wizard
   */
  init(containerId) {
    this.wizardContainer = document.getElementById(containerId);
    if (!this.wizardContainer) {
      console.error('Wizard container not found:', containerId);
      return;
    }
    this.renderStep(1);
  }

  /**
   * Render the current step
   */
  renderStep(step) {
    this.currentStep = step;
    if (!this.wizardContainer) return;

    switch (step) {
      case 1:
        this.renderStep1_ChooseMethod();
        break;
      case 2:
        this.renderStep2_TemplateOrCustom();
        break;
      case 3:
        this.renderStep3_Review();
        break;
      case 4:
        this.renderStep4_Name();
        break;
      case 5:
        this.renderStep5_Create();
        break;
    }

    this.ensureLucideIcons();
  }

  /**
   * Step 1: Choose Method (Template or Custom)
   */
  renderStep1_ChooseMethod() {
    this.wizardContainer.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-header">
          <h2>Create New Database</h2>
          <p>Choose how you'd like to create your database</p>
        </div>
        <div class="wizard-options">
          <button class="wizard-option-btn" onclick="databaseBuilder.selectMethod('template')">
            <div class="option-icon"><i data-lucide="book-dashed"></i></div>
            <div class="option-title">Use a Template</div>
            <div class="option-description">Start with a pre-made template for common databases</div>
          </button>
          <button class="wizard-option-btn" onclick="databaseBuilder.selectMethod('custom')">
            <div class="option-icon"><i data-lucide="circle-fading-plus"></i></div>
            <div class="option-title">Create Custom</div>
            <div class="option-description">Build your own database from scratch</div>
          </button>
        </div>
        <div class="wizard-actions">
          <button class="btn-secondary" onclick="databaseBuilder.closeWizard()">Cancel</button>
        </div>
      </div>
    `;
  }

  /**
   * Step 2: Template Selection or Custom Field Builder
   */
  renderStep2_TemplateOrCustom() {
    if (this.method === 'template') {
      this.renderStep2_TemplateSelection();
    } else {
      this.renderStep2_CustomFields();
    }
  }

  /**
   * Step 2a: Template Selection
   */
  renderStep2_TemplateSelection() {
    const templates = window.DATABASE_TEMPLATES || {};
    const categorized = window.getTemplatesByCategory ? window.getTemplatesByCategory() : {};
    
    let templatesHTML = '';
    
    Object.keys(categorized).forEach(category => {
      if (categorized[category].length > 0) {
        templatesHTML += `<div class="template-category">
          <h3>${category}</h3>
          <div class="template-grid">`;
        
        categorized[category].forEach(template => {
          templatesHTML += `
            <div class="template-card ${this.selectedTemplate?.id === template.id ? 'selected' : ''}" 
                 onclick="databaseBuilder.selectTemplate('${template.id}')">
              <div class="template-icon">${template.icon || '📊'}</div>
              <div class="template-name">${template.name}</div>
              <div class="template-description">${template.description}</div>
            </div>
          `;
        });
        
        templatesHTML += `</div></div>`;
      }
    });

    this.wizardContainer.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-header">
          <h2>Choose a Template</h2>
          <p>Select a template that matches what you want to create</p>
        </div>
        <div class="template-selection">
          ${templatesHTML}
        </div>
        <div class="wizard-actions">
          <button class="btn-secondary" onclick="databaseBuilder.renderStep(1)">← Back</button>
          <button class="btn-primary" 
                  onclick="databaseBuilder.renderStep(3)" 
                  ${!this.selectedTemplate ? 'disabled' : ''}>
            Next →
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Step 2b: Custom Field Builder
   */
  renderStep2_CustomFields() {
    let fieldsHTML = '';
    const confirmedCount = this.getConfirmedCustomFields().length;
    const helperMessage = this.customFields.length === 0
      ? '<p class="empty-state">No datasets added yet. Click "Add Dataset" to get started.</p>'
      : (confirmedCount === 0
          ? '<p class="empty-state subtle">Confirm each dataset with the checkmark to include it in your database.</p>'
          : '');

    this.customFields.forEach((field, index) => {
      const confirmed = !!field.confirmed && !!(field.name && field.name.trim());
      fieldsHTML += `
        <div class="custom-field-row${confirmed ? ' field-confirmed' : ''}">
          <div class="field-name-wrap">
            <input type="text" 
                   class="field-name-input" 
                   placeholder="Dataset name (e.g., Customers, Inventory)"
                   value="${field.name || ''}"
                   onchange="databaseBuilder.updateCustomField(${index}, 'name', this.value)">
            <button class="field-confirm-btn${confirmed ? ' active' : ''}" 
                    type="button" 
                    onclick="databaseBuilder.toggleCustomFieldConfirmation(${index})" 
                    title="${confirmed ? 'Dataset confirmed' : 'Confirm dataset'}"
                    aria-pressed="${confirmed}">
              <i data-lucide="${confirmed ? 'check-circle-2' : 'check'}"></i>
            </button>
          </div>
          <button class="btn-icon" onclick="databaseBuilder.removeCustomField(${index})" title="Remove dataset">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
    });

    this.wizardContainer.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-header">
          <h2>Add Fields</h2>
          <p>Create the datasets for your database. Confirm each entry to include it.</p>
        </div>
        <div class="custom-fields-list">
          ${fieldsHTML || ''}
          ${helperMessage}
        </div>
        <div class="wizard-actions">
          <button class="btn-secondary" onclick="databaseBuilder.addCustomField()">
            ➕ Add Dataset
          </button>
        </div>
        <div class="wizard-actions">
          <button class="btn-secondary" onclick="databaseBuilder.renderStep(1)">← Back</button>
          <button class="btn-primary" 
                  onclick="databaseBuilder.renderStep(3)"
                  ${confirmedCount === 0 ? 'disabled' : ''}>
            Next →
          </button>
        </div>
      </div>
    `;

    this.ensureLucideIcons();
  }

  /**
   * Step 3: Review Schema
   */
  renderStep3_Review() {
    let fields = [];
    
    if (this.method === 'template' && this.selectedTemplate) {
      const template = window.getTemplateById(this.selectedTemplate.id);
      if (template) {
        fields = template.fields;
      }
    } else {
      fields = this.getConfirmedCustomFields();
    }

    let fieldsHTML = fields.map(field => `
      <div class="field-review-item">
        <span class="field-name">${field.name || field.label}</span>
        <span class="field-type">${field.type}</span>
        ${field.required ? '<span class="field-required">Required</span>' : ''}
      </div>
    `).join('');

    this.wizardContainer.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-header">
          <h2>Review Your Database</h2>
          <p>Here's what your database will look like</p>
        </div>
        <div class="review-section">
          <h3>Fields:</h3>
          <div class="fields-review">
            ${fieldsHTML}
          </div>
        </div>
        ${this.method === 'template' && this.selectedTemplate ? `
          <div class="review-section">
            <h3>Sample Data:</h3>
            <p>This template includes ${this.selectedTemplate.sampleData?.length || 0} sample records to help you get started.</p>
          </div>
        ` : ''}
        <div class="wizard-actions">
          <button class="btn-secondary" onclick="databaseBuilder.renderStep(2)">← Back</button>
          <button class="btn-primary" onclick="databaseBuilder.renderStep(4)">Next →</button>
        </div>
      </div>
    `;
  }

  /**
   * Step 4: Name Database
   */
  renderStep4_Name() {
    this.wizardContainer.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-header">
          <h2>Name Your Database</h2>
          <p>Give your database a name and optional description</p>
        </div>
        <div class="form-group">
          <label for="db-name">Database Name *</label>
          <input type="text" 
                 id="db-name" 
                 class="form-input"
                 placeholder="e.g., My Contacts, Inventory List"
                 value="${this.databaseName}"
                 onchange="databaseBuilder.databaseName = this.value">
        </div>
        <div class="form-group">
          <label for="db-description">Description (optional)</label>
          <textarea id="db-description" 
                    class="form-textarea"
                    placeholder="Describe what this database is for"
                    onchange="databaseBuilder.databaseDescription = this.value">${this.databaseDescription}</textarea>
        </div>
        <div class="wizard-actions">
          <button class="btn-secondary" onclick="databaseBuilder.renderStep(3)">← Back</button>
          <button class="btn-primary" 
                  onclick="databaseBuilder.renderStep(5)"
                  ${!this.databaseName ? 'disabled' : ''}>
            Create Database →
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Step 5: Create Database
   */
  async renderStep5_Create() {
    this.wizardContainer.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-header">
          <h2>Creating Database...</h2>
          <p>Please wait while we set up your database</p>
        </div>
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
      </div>
    `;

    await this.createDatabase();
  }

  /**
   * Create the database
   */
  async createDatabase() {
    try {
      if (!window.clientDatabaseService) {
        throw new Error('Database service not available');
      }

      // Get fields
      let fields = [];
      if (this.method === 'template' && this.selectedTemplate) {
        const template = window.getTemplateById(this.selectedTemplate.id);
        if (template) {
          fields = template.fields;
        }
      } else {
        fields = this.getConfirmedCustomFields().map(f => ({
          name: f.name,
          type: f.type,
          required: f.required || false,
          default: f.default || null,
          label: f.name
        }));
      }

      // Create database
      const { data: database, error: dbError } = await window.clientDatabaseService.createDatabase(
        this.databaseName,
        this.databaseDescription,
        this.selectedTemplate?.id || null
      );

      if (dbError) throw dbError;

      // Create table
      const tableName = this.databaseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const { data: table, error: tableError, tableName: actualTableName } = 
        await window.clientDatabaseService.createTable(
          database.id,
          tableName,
          this.databaseDescription,
          fields
        );

      if (tableError) throw tableError;

      // Insert sample data if template
      if (this.method === 'template' && this.selectedTemplate && this.selectedTemplate.sampleData) {
        const template = window.getTemplateById(this.selectedTemplate.id);
        if (template && template.sampleData) {
          await window.clientDatabaseService.insertRows(actualTableName, template.sampleData);
        }
      }

      // Success!
      this.wizardContainer.innerHTML = `
        <div class="wizard-step">
          <div class="wizard-header">
            <h2>✅ Database Created!</h2>
            <p>Your database "${this.databaseName}" has been created successfully.</p>
          </div>
          <div class="wizard-actions">
            <button class="btn-primary" onclick="databaseBuilder.closeWizard(); location.reload();">
              Open Database
            </button>
          </div>
        </div>
      `;

    } catch (error) {
      console.error('Error creating database:', error);
      this.wizardContainer.innerHTML = `
        <div class="wizard-step">
          <div class="wizard-header">
            <h2>❌ Error</h2>
            <p>There was an error creating your database: ${error.message}</p>
          </div>
          <div class="wizard-actions">
            <button class="btn-secondary" onclick="databaseBuilder.renderStep(4)">← Go Back</button>
            <button class="btn-primary" onclick="databaseBuilder.closeWizard()">Close</button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Select method (template or custom)
   */
  selectMethod(method) {
    this.method = method;
    this.renderStep(2);
  }

  /**
   * Select template
   */
  selectTemplate(templateId) {
    const template = window.getTemplateById(templateId);
    if (template) {
      this.selectedTemplate = template;
      this.renderStep2_TemplateSelection();
    }
  }

  /**
   * Add custom field
   */
  addCustomField() {
    this.customFields.push({
      name: '',
      type: 'text',
      required: false,
      default: null,
      confirmed: false
    });
    this.renderStep2_CustomFields();
  }

  /**
   * Update custom field
   */
  updateCustomField(index, property, value) {
    if (!this.customFields[index]) return;

    this.customFields[index][property] = value;
    if (property === 'name') {
      const trimmed = value ? value.trim() : '';
      if (!trimmed) {
        this.customFields[index].confirmed = false;
      }
      if (this._nameUpdateTimer) {
        clearTimeout(this._nameUpdateTimer);
      }
      this._nameUpdateTimer = setTimeout(() => {
        this._nameUpdateTimer = null;
        this.renderStep2_CustomFields();
      }, 0);
    }
  }

  toggleCustomFieldConfirmation(index) {
    const field = this.customFields[index];
    if (!field) return;

    const rows = this.wizardContainer?.querySelectorAll('.custom-field-row');
    const row = rows ? rows[index] : null;
    const input = row ? row.querySelector('.field-name-input') : null;
    if (input) {
      field.name = input.value;
    }

    const trimmedName = field.name ? field.name.trim() : '';
    if (!trimmedName) {
      alert('Please give this dataset a name before confirming it.');
      return;
    }

    field.confirmed = !field.confirmed;
    this.renderStep2_CustomFields();
  }

  /**
   * Remove custom field
   */
  removeCustomField(index) {
    this.customFields.splice(index, 1);
    this.renderStep2_CustomFields();
  }

  getConfirmedCustomFields() {
    return this.customFields.filter(field => {
      const trimmedName = field.name ? field.name.trim() : '';
      return !!field.confirmed && !!trimmedName;
    });
  }


  /**
   * Open wizard
   */
  openWizard() {
    const modal = document.getElementById('database-wizard');
    if (modal) {
      modal.style.display = 'flex';
      this.renderStep(1);
    }
  }

  /**
   * Close wizard
   */
  closeWizard() {
    const modal = document.getElementById('database-wizard');
    if (modal) {
      modal.style.display = 'none';
    }
    // Reset wizard state
    this.currentStep = 1;
    this.selectedTemplate = null;
    this.customFields = [];
    this.databaseName = '';
    this.databaseDescription = '';
    this.method = null;
  }

  /**
   * Ensure lucide icons render inside wizard
   */
  ensureLucideIcons(attempt = 0) {
    const MAX_ATTEMPTS = 10;
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      requestAnimationFrame(() => window.lucide.createIcons());
    } else if (attempt < MAX_ATTEMPTS) {
      setTimeout(() => this.ensureLucideIcons(attempt + 1), 120);
    }
  }
}

// Create singleton instance
const databaseBuilder = new DatabaseBuilder();

// Make available globally
window.databaseBuilder = databaseBuilder;

