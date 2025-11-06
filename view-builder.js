// View Builder
// Create and manage filtered views of database tables

class ViewBuilder {
  constructor() {
    this.currentFilters = [];
    this.savedViews = [];
  }

  /**
   * Initialize view builder
   */
  async init(tableId) {
    this.tableId = tableId;
    await this.loadSavedViews();
  }

  /**
   * Load saved views
   */
  async loadSavedViews() {
    try {
      if (!window.clientDatabaseService || !window.supabase) {
        return;
      }

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await window.supabase
        .from('saved_views')
        .select('*')
        .eq('table_id', this.tableId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.savedViews = data || [];
    } catch (error) {
      console.error('Error loading saved views:', error);
      this.savedViews = [];
    }
  }

  /**
   * Show filter builder UI
   */
  showFilterBuilder(tableSchema, onApply) {
    const container = document.getElementById('view-builder-container') || this.createBuilderContainer();
    
    container.innerHTML = `
      <div class="view-builder-modal">
        <div class="view-builder-content">
          <div class="view-builder-header">
            <h2>Create Filtered View</h2>
            <button class="btn-icon" onclick="viewBuilder.closeBuilder()">×</button>
          </div>

          <div class="filter-list" id="filter-list">
            ${this.currentFilters.length === 0 ? this.renderEmptyFilter() : 
              this.currentFilters.map((filter, index) => this.renderFilter(filter, index)).join('')}
          </div>

          <div class="filter-actions">
            <button class="btn-secondary" onclick="viewBuilder.addFilter()">
              ➕ Add Filter
            </button>
          </div>

          <div class="view-name-section">
            <label>Save as (optional):</label>
            <input type="text" 
                   id="view-name-input" 
                   class="form-input" 
                   placeholder="e.g., Active Customers, Recent Orders">
          </div>

          <div class="view-builder-actions">
            <button class="btn-secondary" onclick="viewBuilder.closeBuilder()">Cancel</button>
            <button class="btn-primary" onclick="viewBuilder.applyFilters(tableSchema, onApply)">
              Apply Filters
            </button>
            <button class="btn-secondary" onclick="viewBuilder.saveView(tableSchema)">
              Save View
            </button>
          </div>
        </div>
      </div>
    `;

    this.tableSchema = tableSchema;
    this.onApplyCallback = onApply;
  }

  /**
   * Render empty filter
   */
  renderEmptyFilter() {
    return `
      <div class="empty-filter-message">
        <p>No filters added. Click "Add Filter" to get started.</p>
      </div>
    `;
  }

  /**
   * Render a filter row
   */
  renderFilter(filter, index) {
    const fields = this.tableSchema?.fields || [];
    const operators = this.getOperatorsForType(filter.fieldType || 'text');

    return `
      <div class="filter-row" data-filter-index="${index}">
        <select class="filter-field-select" 
                onchange="viewBuilder.updateFilterField(${index}, this.value, this.options[this.selectedIndex].dataset.type)">
          <option value="">-- Select Field --</option>
          ${fields.map(field => `
            <option value="${field.name}" 
                    data-type="${field.type}"
                    ${filter.field === field.name ? 'selected' : ''}>
              ${field.label || field.name}
            </option>
          `).join('')}
        </select>

        <select class="filter-operator-select" 
                onchange="viewBuilder.updateFilterOperator(${index}, this.value)">
          ${operators.map(op => `
            <option value="${op.value}" ${filter.operator === op.value ? 'selected' : ''}>
              ${op.label}
            </option>
          `).join('')}
        </select>

        <input type="text" 
               class="filter-value-input" 
               placeholder="Value"
               value="${filter.value || ''}"
               onchange="viewBuilder.updateFilterValue(${index}, this.value)">

        <button class="btn-icon" onclick="viewBuilder.removeFilter(${index})" title="Remove filter">
          🗑️
        </button>
      </div>
    `;
  }

  /**
   * Get operators for field type
   */
  getOperatorsForType(type) {
    switch (type) {
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'greater_than', label: 'Greater than' },
          { value: 'less_than', label: 'Less than' },
          { value: 'greater_equal', label: 'Greater or equal' },
          { value: 'less_equal', label: 'Less or equal' }
        ];
      case 'text':
      case 'email':
      case 'phone':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'starts_with', label: 'Starts with' },
          { value: 'ends_with', label: 'Ends with' }
        ];
      case 'date':
      case 'datetime':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'greater_than', label: 'After' },
          { value: 'less_than', label: 'Before' },
          { value: 'between', label: 'Between' }
        ];
      case 'boolean':
        return [
          { value: 'equals', label: 'Is' },
          { value: 'not_equals', label: 'Is not' }
        ];
      default:
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'contains', label: 'Contains' }
        ];
    }
  }

  /**
   * Add filter
   */
  addFilter() {
    this.currentFilters.push({
      field: '',
      fieldType: 'text',
      operator: 'equals',
      value: ''
    });
    this.renderFilters();
  }

  /**
   * Update filter field
   */
  updateFilterField(index, fieldName, fieldType) {
    if (this.currentFilters[index]) {
      this.currentFilters[index].field = fieldName;
      this.currentFilters[index].fieldType = fieldType;
      // Reset operator to default for new type
      const operators = this.getOperatorsForType(fieldType);
      this.currentFilters[index].operator = operators[0].value;
      this.renderFilters();
    }
  }

  /**
   * Update filter operator
   */
  updateFilterOperator(index, operator) {
    if (this.currentFilters[index]) {
      this.currentFilters[index].operator = operator;
    }
  }

  /**
   * Update filter value
   */
  updateFilterValue(index, value) {
    if (this.currentFilters[index]) {
      this.currentFilters[index].value = value;
    }
  }

  /**
   * Remove filter
   */
  removeFilter(index) {
    this.currentFilters.splice(index, 1);
    this.renderFilters();
  }

  /**
   * Render filters
   */
  renderFilters() {
    const container = document.getElementById('filter-list');
    if (!container) return;

    container.innerHTML = this.currentFilters.length === 0 
      ? this.renderEmptyFilter()
      : this.currentFilters.map((filter, index) => this.renderFilter(filter, index)).join('');
  }

  /**
   * Apply filters
   */
  async applyFilters(tableSchema, onApply) {
    const validFilters = this.currentFilters.filter(f => f.field && f.value);
    
    if (validFilters.length === 0) {
      alert('Please add at least one filter with a field and value.');
      return;
    }

    // Close builder
    this.closeBuilder();

    // Apply filters
    if (onApply) {
      onApply(validFilters);
    }
  }

  /**
   * Save view
   */
  async saveView(tableSchema) {
    const viewName = document.getElementById('view-name-input')?.value.trim();
    
    if (!viewName) {
      alert('Please enter a name for this view.');
      return;
    }

    const validFilters = this.currentFilters.filter(f => f.field && f.value);
    
    if (validFilters.length === 0) {
      alert('Please add at least one filter before saving.');
      return;
    }

    try {
      if (!window.supabase) {
        throw new Error('Supabase not available');
      }

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await window.supabase
        .from('saved_views')
        .insert([
          {
            table_id: this.tableId,
            user_id: user.id,
            name: viewName,
            filters: validFilters
          }
        ]);

      if (error) throw error;

      alert('View saved successfully!');
      await this.loadSavedViews();
      this.closeBuilder();

    } catch (error) {
      console.error('Error saving view:', error);
      alert('Error saving view: ' + error.message);
    }
  }

  /**
   * Apply saved view
   */
  applySavedView(view, onApply) {
    this.currentFilters = view.filters || [];
    if (onApply) {
      onApply(this.currentFilters);
    }
  }

  /**
   * Delete saved view
   */
  async deleteView(viewId) {
    if (!confirm('Are you sure you want to delete this view?')) {
      return;
    }

    try {
      if (!window.supabase) {
        throw new Error('Supabase not available');
      }

      const { error } = await window.supabase
        .from('saved_views')
        .delete()
        .eq('id', viewId);

      if (error) throw error;

      await this.loadSavedViews();
      alert('View deleted successfully!');

    } catch (error) {
      console.error('Error deleting view:', error);
      alert('Error deleting view: ' + error.message);
    }
  }

  /**
   * Get filtered data
   */
  getFilteredData(data, filters) {
    if (!filters || filters.length === 0) {
      return data;
    }

    return data.filter(row => {
      return filters.every(filter => {
        const fieldValue = row[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return String(fieldValue).toLowerCase() === String(filterValue).toLowerCase();
          case 'not_equals':
            return String(fieldValue).toLowerCase() !== String(filterValue).toLowerCase();
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'starts_with':
            return String(fieldValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case 'ends_with':
            return String(fieldValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
          case 'greater_than':
            return Number(fieldValue) > Number(filterValue);
          case 'less_than':
            return Number(fieldValue) < Number(filterValue);
          case 'greater_equal':
            return Number(fieldValue) >= Number(filterValue);
          case 'less_equal':
            return Number(fieldValue) <= Number(filterValue);
          default:
            return true;
        }
      });
    });
  }

  /**
   * Create builder container
   */
  createBuilderContainer() {
    const container = document.createElement('div');
    container.id = 'view-builder-container';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Close builder
   */
  closeBuilder() {
    const container = document.getElementById('view-builder-container');
    if (container) {
      container.innerHTML = '';
    }
    this.currentFilters = [];
  }

  /**
   * Show saved views menu
   */
  showSavedViewsMenu(onApply) {
    const container = document.getElementById('saved-views-menu') || this.createSavedViewsMenu();
    
    if (this.savedViews.length === 0) {
      container.innerHTML = `
        <div class="saved-views-dropdown">
          <p class="empty-message">No saved views yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="saved-views-dropdown">
        <div class="saved-views-header">Saved Views</div>
        ${this.savedViews.map(view => `
          <div class="saved-view-item">
            <span class="view-name" onclick="viewBuilder.applySavedView(${JSON.stringify(view).replace(/"/g, '&quot;')}, ${onApply ? 'viewBuilder.onApplyCallback' : 'null'})">
              ${view.name}
            </span>
            <button class="btn-icon-small" onclick="viewBuilder.deleteView('${view.id}')" title="Delete">
              🗑️
            </button>
          </div>
        `).join('')}
      </div>
    `;

    this.onApplyCallback = onApply;
  }

  /**
   * Create saved views menu container
   */
  createSavedViewsMenu() {
    const container = document.createElement('div');
    container.id = 'saved-views-menu';
    document.body.appendChild(container);
    return container;
  }
}

// Create singleton instance
const viewBuilder = new ViewBuilder();

// Make available globally
window.viewBuilder = viewBuilder;

