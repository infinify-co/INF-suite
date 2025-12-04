// Dashboard Integration Example
// Copy this code to any suite page to enable auto-save and real-time updates

(function() {
  'use strict';

  // Wait for services to load
  if (!window.dashboardAutoSaveService || !window.dashboardRealtimeService) {
    console.warn('Dashboard services not loaded. Make sure to include:');
    console.warn('- dashboard-auto-save-service.js');
    console.warn('- dashboard-realtime-service.js');
    return;
  }

  // Initialize real-time connection
  window.dashboardRealtimeService.connect().then(() => {
    console.log('Real-time service connected');
  }).catch(err => {
    console.warn('Real-time connection failed, using polling fallback:', err);
  });

  // Get current page section type (e.g., 'home', 'operation', 'work')
  function getSectionType() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().replace('.html', '');
    return filename || 'home';
  }

  const currentSectionType = getSectionType();

  // Auto-save for contenteditable elements
  function setupContentEditableAutoSave() {
    const editableElements = document.querySelectorAll('[contenteditable="true"]');
    
    editableElements.forEach(element => {
      const sectionKey = element.dataset.sectionKey || 
                        element.id || 
                        `editable-${Date.now()}`;
      
      // Load existing content
      loadSectionContent(currentSectionType, sectionKey).then(content => {
        if (content) {
          element.innerHTML = content.html || content.text || '';
        }
      });

      // Debounced auto-save
      let saveTimeout;
      element.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        
        // Show "Saving..." indicator
        showSaveIndicator(element, 'saving');
        
        saveTimeout = setTimeout(async () => {
          const content = {
            text: element.textContent,
            html: element.innerHTML
          };
          
          const result = await window.dashboardAutoSaveService.autoSave(
            currentSectionType,
            sectionKey,
            content
          );
          
          if (result.success) {
            showSaveIndicator(element, 'saved');
          } else {
            showSaveIndicator(element, 'error');
          }
        }, 2000);
      });

      // Subscribe to real-time updates
      window.dashboardRealtimeService.subscribe(
        currentSectionType,
        sectionKey,
        (update) => {
          // Only update if version is newer
          const currentVersion = parseInt(element.dataset.version || '0');
          if (update.version > currentVersion) {
            element.innerHTML = update.content.html || update.content.text;
            element.dataset.version = update.version;
            showSaveIndicator(element, 'updated');
          }
        }
      );
    });
  }

  // Auto-save for form inputs
  function setupFormInputAutoSave() {
    const formInputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
    
    formInputs.forEach(input => {
      if (input.dataset.noAutoSave === 'true') return; // Skip if marked
      
      const sectionKey = input.dataset.sectionKey || 
                        input.name || 
                        input.id || 
                        `input-${Date.now()}`;
      
      // Load existing value
      loadSectionContent(currentSectionType, sectionKey).then(content => {
        if (content && content.value) {
          input.value = content.value;
        }
      });

      // Debounced auto-save
      let saveTimeout;
      input.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        
        showSaveIndicator(input, 'saving');
        
        saveTimeout = setTimeout(async () => {
          const content = {
            value: input.value,
            type: input.type
          };
          
          const result = await window.dashboardAutoSaveService.autoSave(
            currentSectionType,
            sectionKey,
            content
          );
          
          if (result.success) {
            showSaveIndicator(input, 'saved');
          } else {
            showSaveIndicator(input, 'error');
          }
        }, 2000);
      });
    });
  }

  // Auto-save for dock preferences
  function setupDockAutoSave() {
    const dock = document.getElementById('dock');
    if (!dock) return;

    // Save dock state when items change
    const observer = new MutationObserver(() => {
      saveDockState();
    });

    observer.observe(dock, {
      childList: true,
      attributes: true,
      subtree: true
    });

    // Load dock state on page load
    loadDockState();
  }

  async function saveDockState() {
    const dock = document.getElementById('dock');
    if (!dock) return;

    const dockItems = Array.from(dock.querySelectorAll('.dock-item')).map((item, index) => {
      const icon = item.querySelector('.dock-icon');
      const label = item.querySelector('.dock-label');
      
      return {
        id: item.dataset.dockId || `dock-${index}`,
        order: index,
        icon: icon ? icon.innerHTML : '',
        label: label ? label.textContent : '',
        href: item.onclick ? item.onclick.toString() : ''
      };
    });

    await window.dashboardAutoSaveService.autoSave(
      'dock',
      'preferences',
      { items: dockItems }
    );
  }

  async function loadDockState() {
    const result = await window.dashboardAutoSaveService.getDashboard('dock');
    if (result.success && result.data.length > 0) {
      const dockData = result.data.find(d => d.section_key === 'preferences');
      if (dockData && dockData.content.items) {
        // Restore dock order if needed
        // Implementation depends on your dock structure
      }
    }
  }

  // Load section content from database
  async function loadSectionContent(sectionType, sectionKey) {
    const result = await window.dashboardAutoSaveService.getDashboard(sectionType);
    if (result.success && result.data) {
      const section = result.data.find(s => s.section_key === sectionKey);
      return section ? section.content : null;
    }
    return null;
  }

  // Show save indicator
  function showSaveIndicator(element, status) {
    // Remove existing indicator
    const existing = element.parentElement.querySelector('.save-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('span');
    indicator.className = `save-indicator save-indicator-${status}`;
    
    const messages = {
      saving: 'Saving...',
      saved: 'Saved',
      error: 'Error',
      updated: 'Updated'
    };
    
    indicator.textContent = messages[status] || '';
    indicator.style.cssText = `
      position: absolute;
      top: -20px;
      right: 0;
      font-size: 11px;
      color: ${status === 'saved' ? '#10b981' : status === 'error' ? '#ef4444' : '#6b7280'};
      opacity: 0;
      transition: opacity 0.3s;
    `;
    
    element.style.position = 'relative';
    element.parentElement.appendChild(indicator);
    
    // Fade in
    setTimeout(() => {
      indicator.style.opacity = '1';
    }, 10);
    
    // Fade out after 2 seconds (except for saving)
    if (status !== 'saving') {
      setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 300);
      }, 2000);
    }
  }

  // Listen to save events
  window.dashboardAutoSaveService.on('saveSuccess', (data) => {
    console.log('Auto-saved:', data);
  });

  window.dashboardAutoSaveService.on('saveConflict', (data) => {
    console.warn('Version conflict detected:', data);
    // Show conflict resolution UI
    showConflictDialog(data);
  });

  window.dashboardAutoSaveService.on('saveQueued', (data) => {
    console.log('Save queued (offline):', data);
    // Show offline indicator
    showOfflineIndicator();
  });

  // Conflict resolution dialog
  function showConflictDialog(data) {
    const dialog = document.createElement('div');
    dialog.className = 'conflict-dialog';
    dialog.innerHTML = `
      <div class="conflict-dialog-content">
        <h3>Version Conflict</h3>
        <p>This section was modified by another device. Choose an action:</p>
        <button onclick="resolveConflict('keep-local')">Keep My Changes</button>
        <button onclick="resolveConflict('use-server')">Use Server Version</button>
        <button onclick="resolveConflict('merge')">Merge Changes</button>
      </div>
    `;
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    document.body.appendChild(dialog);
  }

  // Offline indicator
  function showOfflineIndicator() {
    let indicator = document.getElementById('offline-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.textContent = 'Offline - Changes will be saved when online';
      indicator.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #f59e0b;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 9999;
      `;
      document.body.appendChild(indicator);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    setupContentEditableAutoSave();
    setupFormInputAutoSave();
    setupDockAutoSave();
    
    console.log('Dashboard auto-save initialized for section:', currentSectionType);
  }

})();

