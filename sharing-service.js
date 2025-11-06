// Sharing Service
// Share databases with other users via links or email invites

class SharingService {
  constructor() {
    this.generateToken = this.generateToken.bind(this);
  }

  /**
   * Generate share token
   */
  generateToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Share database
   */
  async shareDatabase(databaseId, permission = 'view', email = null) {
    try {
      if (!window.supabase) {
        throw new Error('Supabase not available');
      }

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate share token for public links
      const shareToken = email ? null : this.generateToken();

      const { data, error } = await window.supabase
        .from('shared_databases')
        .insert([
          {
            database_id: databaseId,
            shared_by: user.id,
            shared_with: email ? await this.getUserIdByEmail(email) : null,
            share_token: shareToken,
            permission: permission
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Generate share link if public
      if (!email && shareToken) {
        const shareLink = `${window.location.origin}/Database.html?share=${shareToken}`;
        return { data, shareLink, error: null };
      }

      // Send email invite if email provided
      if (email) {
        // TODO: Implement email sending (via Supabase Edge Function or email service)
        console.log('Email invite should be sent to:', email);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error sharing database:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user ID by email (helper for invites)
   */
  async getUserIdByEmail(email) {
    // This would typically require an admin function or lookup table
    // For now, return null and let the user look up by token
    return null;
  }

  /**
   * Get shared databases for current user
   */
  async getSharedDatabases() {
    try {
      if (!window.supabase) {
        throw new Error('Supabase not available');
      }

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await window.supabase
        .from('shared_databases')
        .select('*, client_databases(*)')
        .or(`shared_with.eq.${user.id},share_token.not.is.null`);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting shared databases:', error);
      return { data: null, error };
    }
  }

  /**
   * Access shared database by token
   */
  async accessSharedDatabase(shareToken) {
    try {
      if (!window.supabase) {
        throw new Error('Supabase not available');
      }

      const { data, error } = await window.supabase
        .from('shared_databases')
        .select('*, client_databases(*)')
        .eq('share_token', shareToken)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error accessing shared database:', error);
      return { data: null, error };
    }
  }

  /**
   * Update share permission
   */
  async updateSharePermission(shareId, permission) {
    try {
      if (!window.supabase) {
        throw new Error('Supabase not available');
      }

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await window.supabase
        .from('shared_databases')
        .update({ permission })
        .eq('id', shareId)
        .eq('shared_by', user.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating share permission:', error);
      return { data: null, error };
    }
  }

  /**
   * Revoke share
   */
  async revokeShare(shareId) {
    try {
      if (!window.supabase) {
        throw new Error('Supabase not available');
      }

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await window.supabase
        .from('shared_databases')
        .delete()
        .eq('id', shareId)
        .eq('shared_by', user.id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error revoking share:', error);
      return { error };
    }
  }

  /**
   * Show sharing modal
   */
  showSharingModal(databaseId, databaseName) {
    const container = document.getElementById('sharing-modal-container') || this.createSharingContainer();
    
    container.innerHTML = `
      <div class="sharing-modal">
        <div class="sharing-modal-content">
          <div class="sharing-header">
            <h2>Share Database: ${databaseName}</h2>
            <button class="btn-icon" onclick="sharingService.closeSharing()">×</button>
          </div>

          <div class="sharing-body">
            <div class="share-method-tabs">
              <button class="tab-btn active" data-tab="link" onclick="sharingService.switchTab('link')">
                Share Link
              </button>
              <button class="tab-btn" data-tab="email" onclick="sharingService.switchTab('email')">
                Invite by Email
              </button>
            </div>

            <div class="tab-content" id="share-link-tab">
              <div class="share-link-section">
                <label>Permission Level</label>
                <select id="share-permission" class="form-input">
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                  <option value="admin">Admin Access</option>
                </select>
                <button class="btn-primary" onclick="sharingService.createShareLink('${databaseId}')">
                  Generate Share Link
                </button>
                <div id="share-link-result" class="share-link-result"></div>
              </div>
            </div>

            <div class="tab-content" id="share-email-tab" style="display: none;">
              <div class="share-email-section">
                <label>Email Address</label>
                <input type="email" id="share-email-input" class="form-input" placeholder="user@example.com">
                <label>Permission Level</label>
                <select id="share-email-permission" class="form-input">
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                  <option value="admin">Admin Access</option>
                </select>
                <button class="btn-primary" onclick="sharingService.sendEmailInvite('${databaseId}')">
                  Send Invite
                </button>
              </div>
            </div>

            <div class="active-shares">
              <h3>Active Shares</h3>
              <div id="active-shares-list">
                Loading...
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.databaseId = databaseId;
    this.loadActiveShares(databaseId);
  }

  /**
   * Switch tab
   */
  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
      }
    });

    document.getElementById('share-link-tab').style.display = tab === 'link' ? 'block' : 'none';
    document.getElementById('share-email-tab').style.display = tab === 'email' ? 'block' : 'none';
  }

  /**
   * Create share link
   */
  async createShareLink(databaseId) {
    const permission = document.getElementById('share-permission').value;
    
    const { data, shareLink, error } = await this.shareDatabase(databaseId, permission);
    
    if (error) {
      alert('Error creating share link: ' + error.message);
      return;
    }

    const resultDiv = document.getElementById('share-link-result');
    resultDiv.innerHTML = `
      <div class="share-link-success">
        <p>Share link created!</p>
        <div class="share-link-box">
          <input type="text" readonly value="${shareLink}" id="share-link-input" class="share-link-input">
          <button class="btn-secondary" onclick="sharingService.copyShareLink()">Copy</button>
        </div>
        <p class="share-link-note">Anyone with this link can ${permission} the database.</p>
      </div>
    `;

    await this.loadActiveShares(databaseId);
  }

  /**
   * Copy share link
   */
  copyShareLink() {
    const input = document.getElementById('share-link-input');
    input.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
  }

  /**
   * Send email invite
   */
  async sendEmailInvite(databaseId) {
    const email = document.getElementById('share-email-input').value.trim();
    const permission = document.getElementById('share-email-permission').value;

    if (!email) {
      alert('Please enter an email address');
      return;
    }

    const { data, error } = await this.shareDatabase(databaseId, permission, email);
    
    if (error) {
      alert('Error sending invite: ' + error.message);
      return;
    }

    alert('Invite sent to ' + email);
    document.getElementById('share-email-input').value = '';
    await this.loadActiveShares(databaseId);
  }

  /**
   * Load active shares
   */
  async loadActiveShares(databaseId) {
    try {
      if (!window.supabase) return;

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await window.supabase
        .from('shared_databases')
        .select('*')
        .eq('database_id', databaseId)
        .eq('shared_by', user.id);

      if (error) throw error;

      const listDiv = document.getElementById('active-shares-list');
      if (!listDiv) return;

      if (!data || data.length === 0) {
        listDiv.innerHTML = '<p class="empty-message">No active shares</p>';
        return;
      }

      listDiv.innerHTML = data.map(share => `
        <div class="share-item">
          <div class="share-info">
            <div class="share-type">${share.share_token ? '🔗 Public Link' : '📧 Email Invite'}</div>
            <div class="share-permission">${share.permission}</div>
            ${share.share_token ? `
              <div class="share-link">${window.location.origin}/Database.html?share=${share.share_token}</div>
            ` : ''}
          </div>
          <button class="btn-danger btn-small" onclick="sharingService.revokeShare('${share.id}')">
            Revoke
          </button>
        </div>
      `).join('');

    } catch (error) {
      console.error('Error loading active shares:', error);
      document.getElementById('active-shares-list').innerHTML = '<p class="error">Error loading shares</p>';
    }
  }

  /**
   * Create sharing container
   */
  createSharingContainer() {
    const container = document.createElement('div');
    container.id = 'sharing-modal-container';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Close sharing modal
   */
  closeSharing() {
    const container = document.getElementById('sharing-modal-container');
    if (container) {
      container.innerHTML = '';
    }
    delete this.databaseId;
  }

  /**
   * Initialize share token access (if accessed via share link)
   */
  async initShareAccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareToken = urlParams.get('share');

    if (shareToken) {
      const { data, error } = await this.accessSharedDatabase(shareToken);
      
      if (error || !data) {
        alert('Invalid or expired share link');
        window.location.href = 'Database.html';
        return;
      }

      // Load the shared database
      if (window.databaseManager) {
        await window.databaseManager.loadSharedDatabase(data);
      }
    }
  }
}

// Create singleton instance
const sharingService = new SharingService();

// Make available globally
window.sharingService = sharingService;

