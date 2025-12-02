// Webhost Service
// Handles website hosting, sharing, and client access management

class WebhostService {
    constructor() {
        this.apiBaseUrl = window.WEBHOST_API_URL || window.SITES_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
        this.shareBaseUrl = window.WEBHOST_SHARE_BASE_URL || window.location.origin + '/suite/online-assets/webhost.html';
        this.sitesEndpoint = `${this.apiBaseUrl}/sites`;
        this.isConfigured = this.apiBaseUrl && !this.apiBaseUrl.includes('your-api-gateway-url');
    }

    /**
     * Get current user's Cognito ID
     */
    async getCurrentUserId() {
        if (window.cognitoAuthManager && window.cognitoAuthManager.user) {
            return window.cognitoAuthManager.user.sub || window.cognitoAuthManager.user.username;
        }
        const session = await window.cognitoAuthManager?.getCurrentSession();
        if (session) {
            return session.getIdToken().payload.sub;
        }
        throw new Error('User not authenticated');
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
     * Make API request to Lambda function
     */
    async apiRequest(endpoint, method = 'GET', body = null) {
        if (!this.isConfigured) {
            throw new Error('API endpoint not configured. Please update webhost-config.js with your API Gateway URL.');
        }

        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(endpoint, options);
            
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`API returned non-JSON response: ${text.substring(0, 100)}`);
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `API request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request error:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to reach API endpoint. Please check your API Gateway URL.');
            }
            throw error;
        }
    }

    /**
     * List all hosted websites
     */
    async listWebsites() {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.sitesEndpoint}/list?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error listing websites:', error);
            throw error;
        }
    }

    /**
     * Create a new website project
     */
    async createWebsite(websiteConfig) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                siteName: websiteConfig.siteName,
                clientName: websiteConfig.clientName || null,
                description: websiteConfig.description || null,
                deploymentType: websiteConfig.deploymentType || 'static',
                buildCommand: websiteConfig.buildCommand || null,
                outputDirectory: websiteConfig.outputDirectory || 'dist',
                environmentVariables: websiteConfig.environmentVariables || {},
                customDomain: websiteConfig.customDomain || null,
                domainId: websiteConfig.domainId || null
            };

            const result = await this.apiRequest(
                `${this.sitesEndpoint}/create`,
                'POST',
                payload
            );

            // Generate share link immediately
            if (result.site && result.site.id) {
                const shareToken = this.generateToken();
                const shareLink = `${this.shareBaseUrl}?share=${shareToken}&site=${result.site.id}`;
                
                // Store share token (in a real implementation, this would be saved to database)
                if (!window.webhostShares) {
                    window.webhostShares = {};
                }
                window.webhostShares[result.site.id] = {
                    token: shareToken,
                    link: shareLink,
                    permission: 'view',
                    createdAt: new Date().toISOString()
                };

                result.shareLink = shareLink;
            }

            return result;
        } catch (error) {
            console.error('Error creating website:', error);
            throw error;
        }
    }

    /**
     * Get a single website by ID
     */
    async getWebsite(siteId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.sitesEndpoint}/${siteId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting website:', error);
            throw error;
        }
    }

    /**
     * Update a website
     */
    async updateWebsite(siteId, updates) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                ...updates
            };

            const result = await this.apiRequest(
                `${this.sitesEndpoint}/${siteId}`,
                'PUT',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error updating website:', error);
            throw error;
        }
    }

    /**
     * Delete a website
     */
    async deleteWebsite(siteId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.sitesEndpoint}/${siteId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'DELETE');
            
            // Remove share link from local storage
            if (window.webhostShares && window.webhostShares[siteId]) {
                delete window.webhostShares[siteId];
            }
            
            return result;
        } catch (error) {
            console.error('Error deleting website:', error);
            throw error;
        }
    }

    /**
     * Generate shareable link for a website
     */
    generateShareLink(siteId, permission = 'view') {
        if (!window.webhostShares) {
            window.webhostShares = {};
        }

        // Check if share link already exists
        if (window.webhostShares[siteId]) {
            return window.webhostShares[siteId].link;
        }

        // Generate new share link
        const shareToken = this.generateToken();
        const shareLink = `${this.shareBaseUrl}?share=${shareToken}&site=${siteId}`;
        
        window.webhostShares[siteId] = {
            token: shareToken,
            link: shareLink,
            permission: permission,
            createdAt: new Date().toISOString()
        };

        return shareLink;
    }

    /**
     * Get share link for a website
     */
    getShareLink(siteId) {
        if (!window.webhostShares || !window.webhostShares[siteId]) {
            return this.generateShareLink(siteId);
        }
        return window.webhostShares[siteId].link;
    }

    /**
     * Copy share link to clipboard
     */
    async copyShareLink(link) {
        try {
            await navigator.clipboard.writeText(link);
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = link;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    /**
     * Load and display websites
     */
    async loadWebsites() {
        try {
            if (!this.isConfigured) {
                this.renderWebsites([]);
                const websitesList = document.getElementById('websites-list');
                const emptyState = document.getElementById('empty-state');
                if (emptyState) {
                    emptyState.innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <i data-lucide="globe" style="width: 64px; height: 64px; color: #94a3b8; margin-bottom: 16px;"></i>
                            <h3 style="color: #64748b; margin-bottom: 8px;">API Not Configured</h3>
                            <p style="color: #94a3b8; margin-bottom: 16px;">Please configure your API Gateway URL in <code>webhost-config.js</code></p>
                        </div>
                    `;
                    emptyState.style.display = 'block';
                    if (websitesList) websitesList.style.display = 'none';
                    if (window.lucide) lucide.createIcons();
                }
                return;
            }

            const result = await this.listWebsites();
            this.renderWebsites(result.sites || []);
        } catch (error) {
            console.error('Error loading websites:', error);
            const errorMessage = error.message || 'Failed to load websites. Please try again.';
            this.showError(errorMessage);
            
            const websitesList = document.getElementById('websites-list');
            const emptyState = document.getElementById('empty-state');
            if (emptyState) {
                emptyState.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i data-lucide="alert-circle" style="width: 64px; height: 64px; color: #ef4444; margin-bottom: 16px;"></i>
                        <h3 style="color: #ef4444; margin-bottom: 8px;">Failed to Load Websites</h3>
                        <p style="color: #94a3b8; margin-bottom: 16px;">${this.escapeHtml(errorMessage)}</p>
                    </div>
                `;
                emptyState.style.display = 'block';
                if (websitesList) websitesList.style.display = 'none';
                if (window.lucide) lucide.createIcons();
            }
        }
    }

    /**
     * Render websites list
     */
    renderWebsites(websites) {
        const websitesList = document.getElementById('websites-list');
        const emptyState = document.getElementById('empty-state');

        if (!websitesList) return;

        if (websites.length === 0) {
            websitesList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        websitesList.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        websitesList.innerHTML = websites.map(site => this.createWebsiteCard(site)).join('');

        // Reinitialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Attach event listeners
        this.attachWebsiteEventListeners();
    }

    /**
     * Create website card HTML
     */
    createWebsiteCard(site) {
        const statusColors = {
            'draft': '#94a3b8',
            'building': '#3b82f6',
            'deploying': '#3b82f6',
            'live': '#22c55e',
            'paused': '#f59e0b',
            'failed': '#ef4444',
            'deleted': '#94a3b8'
        };

        const statusLabels = {
            'draft': 'Draft',
            'building': 'Building',
            'deploying': 'Deploying',
            'live': 'Live',
            'paused': 'Paused',
            'failed': 'Failed',
            'deleted': 'Deleted'
        };

        const createdDate = site.created_at 
            ? new Date(site.created_at).toLocaleDateString()
            : 'Unknown';

        const siteUrl = site.custom_domain || site.site_url || 'Not deployed';
        const clientName = site.client_name || 'No client assigned';

        return `
            <div class="website-card" data-site-id="${site.id}" style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; transition: all 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <h3 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 4px 0;">${this.escapeHtml(site.site_name)}</h3>
                        <p style="font-size: 13px; color: #64748b; margin: 0 0 4px 0;">Client: ${this.escapeHtml(clientName)}</p>
                        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Created ${createdDate}</p>
                    </div>
                    <div style="display: flex; gap: 8px; flex-direction: column; align-items: flex-end;">
                        <span style="background: ${statusColors[site.status] || '#94a3b8'}15; color: ${statusColors[site.status] || '#94a3b8'}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                            ${statusLabels[site.status] || site.status}
                        </span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px;">
                    ${site.status === 'live' 
                        ? `<a href="https://${siteUrl}" target="_blank" style="background: #f0fdf4; color: #22c55e; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none;">Visit Site</a>`
                        : ''
                    }
                    <button class="website-action-btn" data-action="share" data-site-id="${site.id}" style="background: #f0f9ff; color: #0ea5e9; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Share</button>
                    <button class="website-action-btn" data-action="edit" data-site-id="${site.id}" style="background: #f0f9ff; color: #0ea5e9; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Edit</button>
                    <button class="website-action-btn" data-action="delete" data-site-id="${site.id}" style="background: #fef2f2; color: #ef4444; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Delete</button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to website cards
     */
    attachWebsiteEventListeners() {
        document.querySelectorAll('.website-action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = btn.dataset.action;
                const siteId = btn.dataset.siteId;

                switch (action) {
                    case 'share':
                        await this.handleShare(siteId);
                        break;
                    case 'edit':
                        await this.handleEdit(siteId);
                        break;
                    case 'delete':
                        await this.handleDelete(siteId);
                        break;
                }
            });
        });
    }

    /**
     * Handle share action
     */
    async handleShare(siteId) {
        this.showShareModal(siteId);
    }

    /**
     * Handle edit action
     */
    async handleEdit(siteId) {
        try {
            const result = await this.getWebsite(siteId);
            this.showCreateModal(result.site);
        } catch (error) {
            this.showError(error.message || 'Failed to load website');
        }
    }

    /**
     * Handle delete action
     */
    async handleDelete(siteId) {
        if (!confirm('Are you sure you want to delete this website? This action cannot be undone.')) {
            return;
        }

        try {
            await this.deleteWebsite(siteId);
            this.showSuccess('Website deleted successfully');
            await this.loadWebsites();
        } catch (error) {
            this.showError(error.message || 'Failed to delete website');
        }
    }

    /**
     * Show create website modal
     */
    showCreateModal(site = null) {
        const isEdit = !!site;
        const modal = document.createElement('div');
        modal.id = 'website-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">
                        ${isEdit ? 'Edit Website' : 'Create New Website'}
                    </h2>
                    <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
                </div>
                
                <form id="website-form" style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Website Name *</label>
                        <input type="text" id="website-name" required style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;" value="${site?.site_name || ''}">
                        <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">A unique name for your website</p>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Client Name</label>
                        <input type="text" id="client-name" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;" value="${site?.client_name || ''}" placeholder="Client or company name">
                        <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">The client this website is for</p>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Description</label>
                        <textarea id="description" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; min-height: 80px; resize: vertical;" placeholder="Brief description of the website">${site?.description || ''}</textarea>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Deployment Type</label>
                        <select id="deployment-type" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                            <option value="static" ${site?.deployment_type === 'static' ? 'selected' : ''}>Static Site</option>
                            <option value="serverless" ${site?.deployment_type === 'serverless' ? 'selected' : ''}>Serverless</option>
                            <option value="container" ${site?.deployment_type === 'container' ? 'selected' : ''}>Container</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
                        <button type="button" id="cancel-btn" style="background: #f1f5f9; color: #475569; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" style="background: #0ea5e9; color: #ffffff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">${isEdit ? 'Update' : 'Create'} Website</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal handlers
        document.getElementById('close-modal').addEventListener('click', () => modal.remove());
        document.getElementById('cancel-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Form submission
        document.getElementById('website-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleWebsiteSubmit(site?.id, modal);
        });
    }

    /**
     * Handle website form submission
     */
    async handleWebsiteSubmit(siteId, modal) {
        try {
            const websiteName = document.getElementById('website-name').value;
            const clientName = document.getElementById('client-name').value;
            const description = document.getElementById('description').value;
            const deploymentType = document.getElementById('deployment-type').value;

            if (siteId) {
                // Update existing website
                await this.updateWebsite(siteId, { 
                    siteName: websiteName,
                    clientName: clientName || null,
                    description: description || null,
                    deploymentType: deploymentType
                });
                this.showSuccess('Website updated successfully');
            } else {
                // Create new website
                await this.createWebsite({ 
                    siteName: websiteName,
                    clientName: clientName || null,
                    description: description || null,
                    deploymentType: deploymentType
                });
                this.showSuccess('Website created successfully');
            }

            modal.remove();
            await this.loadWebsites();
        } catch (error) {
            this.showError(error.message || 'Failed to save website');
        }
    }

    /**
     * Show share modal
     */
    showShareModal(siteId) {
        const shareLink = this.getShareLink(siteId);
        const modal = document.createElement('div');
        modal.id = 'share-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; max-width: 500px; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">Share Website</h2>
                    <button id="close-share-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <p style="font-size: 14px; color: #64748b; margin-bottom: 16px;">Share this link with your client to give them access to view the website:</p>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="share-link-input" readonly value="${shareLink}" style="flex: 1; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: #f8fafc;">
                        <button id="copy-share-link" style="background: #0ea5e9; color: #ffffff; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap;">Copy</button>
                    </div>
                    <p id="copy-success" style="font-size: 12px; color: #22c55e; margin-top: 8px; display: none;">Link copied to clipboard!</p>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" id="close-share-btn" style="background: #f1f5f9; color: #475569; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal handlers
        document.getElementById('close-share-modal').addEventListener('click', () => modal.remove());
        document.getElementById('close-share-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Copy link handler
        document.getElementById('copy-share-link').addEventListener('click', async () => {
            const success = await this.copyShareLink(shareLink);
            if (success) {
                const successMsg = document.getElementById('copy-success');
                successMsg.style.display = 'block';
                setTimeout(() => {
                    successMsg.style.display = 'none';
                }, 3000);
            }
        });
    }

    /**
     * Show success notification
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show error notification
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show info notification
     */
    showInfo(message) {
        this.showNotification(message, 'info');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#0ea5e9';
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: ${bgColor}; color: white;
            padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001; font-size: 14px; font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize and expose globally
window.webhostService = new WebhostService();

