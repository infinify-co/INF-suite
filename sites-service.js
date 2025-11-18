// Sites Service
// Handles all operations for site deployment and management via Lambda functions

class SitesService {
    constructor() {
        // API Gateway base URL - update this in sites-config.js or set window.SITES_API_URL
        this.apiBaseUrl = window.SITES_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
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
        // Fallback: try to get from session
        const session = await window.cognitoAuthManager?.getCurrentSession();
        if (session) {
            return session.getIdToken().payload.sub;
        }
        throw new Error('User not authenticated');
    }

    /**
     * Make API request to Lambda function
     */
    async apiRequest(endpoint, method = 'GET', body = null) {
        if (!this.isConfigured) {
            throw new Error('API endpoint not configured. Please update sites-config.js with your API Gateway URL.');
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
     * Create a new site
     */
    async createSite(siteConfig) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                companyId: siteConfig.companyId || null,
                siteName: siteConfig.siteName,
                deploymentType: siteConfig.deploymentType || 'static',
                buildCommand: siteConfig.buildCommand || null,
                outputDirectory: siteConfig.outputDirectory || 'dist',
                environmentVariables: siteConfig.environmentVariables || {},
                customDomain: siteConfig.customDomain || null,
                domainId: siteConfig.domainId || null
            };

            const result = await this.apiRequest(
                `${this.sitesEndpoint}/create`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error creating site:', error);
            throw error;
        }
    }

    /**
     * List all sites for current user
     */
    async listSites(status = null) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            let url = `${this.sitesEndpoint}/list?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            if (status) {
                url += `&status=${encodeURIComponent(status)}`;
            }

            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error listing sites:', error);
            throw error;
        }
    }

    /**
     * Get a single site by ID
     */
    async getSite(siteId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.sitesEndpoint}/${siteId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting site:', error);
            throw error;
        }
    }

    /**
     * Update a site
     */
    async updateSite(siteId, updates) {
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
            console.error('Error updating site:', error);
            throw error;
        }
    }

    /**
     * Delete a site
     */
    async deleteSite(siteId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.sitesEndpoint}/${siteId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'DELETE');
            return result;
        } catch (error) {
            console.error('Error deleting site:', error);
            throw error;
        }
    }

    /**
     * Deploy a site
     */
    async deploySite(siteId, files) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                files: files // Array of {path, content, contentType, contentEncoding, cacheControl}
            };

            const result = await this.apiRequest(
                `${this.sitesEndpoint}/${siteId}/deploy`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error deploying site:', error);
            throw error;
        }
    }

    /**
     * Prepare files for deployment from a FileList or directory
     */
    async prepareFilesForDeployment(fileInput) {
        const files = [];
        
        if (fileInput.files && fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) {
                const file = fileInput.files[i];
                const content = await this.readFileAsBase64(file);
                files.push({
                    path: file.webkitRelativePath || file.name,
                    content: content,
                    contentType: file.type || 'application/octet-stream',
                    contentEncoding: 'base64',
                    cacheControl: this.getCacheControl(file.name)
                });
            }
        }
        
        return files;
    }

    /**
     * Read file as base64
     */
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove data URL prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Get cache control header based on file type
     */
    getCacheControl(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const staticAssets = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'];
        const longCache = ['js', 'css', ...staticAssets];
        
        if (longCache.includes(ext)) {
            return 'public, max-age=31536000, immutable';
        }
        return 'public, max-age=3600';
    }

    // ========== UI METHODS ==========

    /**
     * Load and display sites
     */
    async loadSites(status = null) {
        try {
            if (!this.isConfigured) {
                this.renderSites([]);
                const sitesList = document.getElementById('sites-list');
                const emptyState = document.getElementById('empty-state');
                if (emptyState) {
                    emptyState.innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <i data-lucide="globe" style="width: 64px; height: 64px; color: #94a3b8; margin-bottom: 16px;"></i>
                            <h3 style="color: #64748b; margin-bottom: 8px;">API Not Configured</h3>
                            <p style="color: #94a3b8; margin-bottom: 16px;">Please configure your API Gateway URL in <code>sites-config.js</code></p>
                        </div>
                    `;
                    emptyState.style.display = 'block';
                    if (sitesList) sitesList.style.display = 'none';
                    if (window.lucide) lucide.createIcons();
                }
                return;
            }

            const result = await this.listSites(status);
            this.renderSites(result.sites || []);
        } catch (error) {
            console.error('Error loading sites:', error);
            const errorMessage = error.message || 'Failed to load sites. Please try again.';
            this.showError(errorMessage);
            
            const sitesList = document.getElementById('sites-list');
            const emptyState = document.getElementById('empty-state');
            if (emptyState) {
                emptyState.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i data-lucide="alert-circle" style="width: 64px; height: 64px; color: #ef4444; margin-bottom: 16px;"></i>
                        <h3 style="color: #ef4444; margin-bottom: 8px;">Failed to Load Sites</h3>
                        <p style="color: #94a3b8; margin-bottom: 16px;">${this.escapeHtml(errorMessage)}</p>
                    </div>
                `;
                emptyState.style.display = 'block';
                if (sitesList) sitesList.style.display = 'none';
                if (window.lucide) lucide.createIcons();
            }
        }
    }

    /**
     * Render sites list
     */
    renderSites(sites) {
        const sitesList = document.getElementById('sites-list');
        const emptyState = document.getElementById('empty-state');

        if (!sitesList) return;

        if (sites.length === 0) {
            sitesList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        sitesList.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        sitesList.innerHTML = sites.map(site => this.createSiteCard(site)).join('');

        // Reinitialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Attach event listeners
        this.attachSiteEventListeners();
    }

    /**
     * Create site card HTML
     */
    createSiteCard(site) {
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
        const stats = site.today_stats || { pageviews: 0, visits: 0, unique_visitors: 0 };

        return `
            <div class="site-card" data-site-id="${site.id}" style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; transition: all 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <h3 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 4px 0;">${this.escapeHtml(site.site_name)}</h3>
                        <p style="font-size: 13px; color: #64748b; margin: 0 0 4px 0;">${this.escapeHtml(siteUrl)}</p>
                        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Created ${createdDate}</p>
                    </div>
                    <div style="display: flex; gap: 8px; flex-direction: column; align-items: flex-end;">
                        <span style="background: ${statusColors[site.status] || '#94a3b8'}15; color: ${statusColors[site.status] || '#94a3b8'}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                            ${statusLabels[site.status] || site.status}
                        </span>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; padding: 16px; background: #f8fafc; border-radius: 8px;">
                    <div style="text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${stats.pageviews}</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Pageviews</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${stats.visits}</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Visits</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${stats.unique_visitors}</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Visitors</div>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px;">
                    ${site.status === 'live' 
                        ? `<a href="https://${siteUrl}" target="_blank" style="background: #f0fdf4; color: #22c55e; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none;">Visit Site</a>`
                        : ''
                    }
                    <button class="site-action-btn" data-action="deploy" data-site-id="${site.id}" style="background: #f0f9ff; color: #0ea5e9; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Deploy</button>
                    <button class="site-action-btn" data-action="analytics" data-site-id="${site.id}" style="background: #f3e8ff; color: #a855f7; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Analytics</button>
                    <button class="site-action-btn" data-action="edit" data-site-id="${site.id}" style="background: #f0f9ff; color: #0ea5e9; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Edit</button>
                    <button class="site-action-btn" data-action="delete" data-site-id="${site.id}" style="background: #fef2f2; color: #ef4444; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Delete</button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to site cards
     */
    attachSiteEventListeners() {
        document.querySelectorAll('.site-action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = btn.dataset.action;
                const siteId = btn.dataset.siteId;

                switch (action) {
                    case 'deploy':
                        await this.handleDeploy(siteId);
                        break;
                    case 'analytics':
                        await this.handleAnalytics(siteId);
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
     * Handle deploy action
     */
    async handleDeploy(siteId) {
        this.showDeployModal(siteId);
    }

    /**
     * Handle analytics action
     */
    async handleAnalytics(siteId) {
        if (window.analyticsService) {
            window.analyticsService.showAnalyticsDashboard(siteId);
        } else {
            this.showInfo('Analytics service not available');
        }
    }

    /**
     * Handle edit action
     */
    async handleEdit(siteId) {
        try {
            const result = await this.getSite(siteId);
            this.showEditModal(result.site);
        } catch (error) {
            this.showError(error.message || 'Failed to load site');
        }
    }

    /**
     * Handle delete action
     */
    async handleDelete(siteId) {
        if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
            return;
        }

        try {
            await this.deleteSite(siteId);
            this.showSuccess('Site deleted successfully');
            await this.loadSites();
        } catch (error) {
            this.showError(error.message || 'Failed to delete site');
        }
    }

    /**
     * Show create site modal
     */
    showCreateModal() {
        this.showSiteModal(null);
    }

    /**
     * Show edit site modal
     */
    showEditModal(site) {
        this.showSiteModal(site);
    }

    /**
     * Show site form modal (create or edit)
     */
    showSiteModal(site = null) {
        const isEdit = !!site;
        const modal = document.createElement('div');
        modal.id = 'site-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">
                        ${isEdit ? 'Edit Site' : 'Create Site'}
                    </h2>
                    <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
                </div>
                
                <form id="site-form" style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Site Name *</label>
                        <input type="text" id="site-name" required style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;" value="${site?.site_name || ''}">
                        <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">A unique name for your site</p>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Deployment Type</label>
                        <select id="deployment-type" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                            <option value="static" ${site?.deployment_type === 'static' ? 'selected' : ''}>Static Site</option>
                            <option value="serverless" ${site?.deployment_type === 'serverless' ? 'selected' : ''}>Serverless</option>
                            <option value="container" ${site?.deployment_type === 'container' ? 'selected' : ''}>Container</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Build Command (optional)</label>
                        <input type="text" id="build-command" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-family: monospace;" value="${site?.build_command || ''}" placeholder="npm run build">
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Output Directory</label>
                        <input type="text" id="output-directory" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;" value="${site?.output_directory || 'dist'}">
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
                        <button type="button" id="cancel-btn" style="background: #f1f5f9; color: #475569; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" style="background: #0ea5e9; color: #ffffff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">${isEdit ? 'Update' : 'Create'} Site</button>
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
        document.getElementById('site-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSiteSubmit(site?.id, modal);
        });
    }

    /**
     * Handle site form submission
     */
    async handleSiteSubmit(siteId, modal) {
        try {
            const siteName = document.getElementById('site-name').value;
            const deploymentType = document.getElementById('deployment-type').value;
            const buildCommand = document.getElementById('build-command').value;
            const outputDirectory = document.getElementById('output-directory').value;

            if (siteId) {
                // Update existing site
                await this.updateSite(siteId, { 
                    siteName, 
                    deploymentType, 
                    buildCommand: buildCommand || null,
                    outputDirectory 
                });
                this.showSuccess('Site updated successfully');
            } else {
                // Create new site
                await this.createSite({ 
                    siteName, 
                    deploymentType, 
                    buildCommand: buildCommand || null,
                    outputDirectory 
                });
                this.showSuccess('Site created successfully');
            }

            modal.remove();
            await this.loadSites();
        } catch (error) {
            this.showError(error.message || 'Failed to save site');
        }
    }

    /**
     * Show deploy modal
     */
    showDeployModal(siteId) {
        const modal = document.createElement('div');
        modal.id = 'deploy-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; max-width: 600px; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">Deploy Site</h2>
                    <button id="close-deploy-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Select Files to Deploy</label>
                    <input type="file" id="deploy-files" webkitdirectory directory multiple style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Select a folder containing your site files</p>
                </div>

                <div id="deploy-progress" style="display: none; margin-bottom: 24px;">
                    <div style="background: #f1f5f9; border-radius: 8px; height: 8px; overflow: hidden;">
                        <div id="deploy-progress-bar" style="background: #0ea5e9; height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                    <p id="deploy-status" style="font-size: 12px; color: #64748b; margin-top: 8px;">Preparing files...</p>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" id="cancel-deploy-btn" style="background: #f1f5f9; color: #475569; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">Cancel</button>
                    <button type="button" id="deploy-btn" style="background: #0ea5e9; color: #ffffff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">Deploy</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal handlers
        document.getElementById('close-deploy-modal').addEventListener('click', () => modal.remove());
        document.getElementById('cancel-deploy-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Deploy button handler
        document.getElementById('deploy-btn').addEventListener('click', async () => {
            await this.handleDeploySubmit(siteId, modal);
        });
    }

    /**
     * Handle deploy form submission
     */
    async handleDeploySubmit(siteId, modal) {
        const fileInput = document.getElementById('deploy-files');
        const progressDiv = document.getElementById('deploy-progress');
        const progressBar = document.getElementById('deploy-progress-bar');
        const statusText = document.getElementById('deploy-status');
        const deployBtn = document.getElementById('deploy-btn');

        if (!fileInput.files || fileInput.files.length === 0) {
            this.showError('Please select files to deploy');
            return;
        }

        try {
            deployBtn.disabled = true;
            progressDiv.style.display = 'block';
            statusText.textContent = 'Preparing files...';
            progressBar.style.width = '10%';

            // Prepare files
            const files = await this.prepareFilesForDeployment(fileInput);
            statusText.textContent = `Uploading ${files.length} files...`;
            progressBar.style.width = '30%';

            // Deploy
            await this.deploySite(siteId, files);
            
            progressBar.style.width = '100%';
            statusText.textContent = 'Deployment successful!';
            
            this.showSuccess('Site deployed successfully');
            modal.remove();
            await this.loadSites();
        } catch (error) {
            progressBar.style.width = '0%';
            statusText.textContent = 'Deployment failed';
            this.showError(error.message || 'Failed to deploy site');
            deployBtn.disabled = false;
        }
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
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize and expose globally
window.sitesService = new SitesService();

