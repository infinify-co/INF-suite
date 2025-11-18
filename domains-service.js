// Domains Service
// Handles all operations for domain management via Lambda functions

class DomainsService {
    constructor() {
        // API Gateway base URL - update this in domains-config.js or set window.DOMAINS_API_URL
        this.apiBaseUrl = window.DOMAINS_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
        this.domainsEndpoint = `${this.apiBaseUrl}/domains`;
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
            throw new Error('API endpoint not configured. Please update domains-config.js with your API Gateway URL.');
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
            
            // Check if response is JSON
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
     * Connect a domain
     */
    async connectDomain(domainName, companyId = null) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                companyId: companyId,
                domainName: domainName
            };

            const result = await this.apiRequest(
                `${this.domainsEndpoint}/connect`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error connecting domain:', error);
            throw error;
        }
    }

    /**
     * List all domains for current user
     */
    async listDomains(status = null) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            let url = `${this.domainsEndpoint}/list?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            if (status) {
                url += `&status=${encodeURIComponent(status)}`;
            }

            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error listing domains:', error);
            throw error;
        }
    }

    /**
     * Get a single domain by ID
     */
    async getDomain(domainId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.domainsEndpoint}/${domainId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting domain:', error);
            throw error;
        }
    }

    /**
     * Verify domain ownership
     */
    async verifyDomain(domainId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                domainId: domainId,
                cognitoUserId: cognitoUserId
            };

            const result = await this.apiRequest(
                `${this.domainsEndpoint}/${domainId}/verify`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error verifying domain:', error);
            throw error;
        }
    }

    /**
     * Delete a domain
     */
    async deleteDomain(domainId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.domainsEndpoint}/${domainId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'DELETE');
            return result;
        } catch (error) {
            console.error('Error deleting domain:', error);
            throw error;
        }
    }

    /**
     * Get DNS records for a domain
     */
    async getDNSRecords(domainId, recordType = null) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            let url = `${this.domainsEndpoint}/${domainId}/dns-records?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            if (recordType) {
                url += `&type=${encodeURIComponent(recordType)}`;
            }

            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting DNS records:', error);
            throw error;
        }
    }

    /**
     * Create a DNS record
     */
    async createDNSRecord(domainId, recordType, name, value, ttl = 300, priority = null) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                recordType: recordType,
                name: name,
                value: value,
                ttl: ttl,
                priority: priority
            };

            const result = await this.apiRequest(
                `${this.domainsEndpoint}/${domainId}/dns-records?cognitoUserId=${encodeURIComponent(cognitoUserId)}`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error creating DNS record:', error);
            throw error;
        }
    }

    /**
     * Update a DNS record
     */
    async updateDNSRecord(domainId, recordId, updates) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.domainsEndpoint}/${domainId}/dns-records/${recordId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'PUT', updates);
            return result;
        } catch (error) {
            console.error('Error updating DNS record:', error);
            throw error;
        }
    }

    /**
     * Delete a DNS record
     */
    async deleteDNSRecord(domainId, recordId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.domainsEndpoint}/${domainId}/dns-records/${recordId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'DELETE');
            return result;
        } catch (error) {
            console.error('Error deleting DNS record:', error);
            throw error;
        }
    }

    /**
     * Get subdomains for a domain
     */
    async getSubdomains(domainId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.domainsEndpoint}/${domainId}/subdomains?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting subdomains:', error);
            throw error;
        }
    }

    /**
     * Create a subdomain
     */
    async createSubdomain(domainId, subdomainName, targetType, targetValue) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                subdomainName: subdomainName,
                targetType: targetType,
                targetValue: targetValue
            };

            const result = await this.apiRequest(
                `${this.domainsEndpoint}/${domainId}/subdomains?cognitoUserId=${encodeURIComponent(cognitoUserId)}`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error creating subdomain:', error);
            throw error;
        }
    }

    /**
     * Delete a subdomain
     */
    async deleteSubdomain(domainId, subdomainId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.domainsEndpoint}/${domainId}/subdomains/${subdomainId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'DELETE');
            return result;
        } catch (error) {
            console.error('Error deleting subdomain:', error);
            throw error;
        }
    }

    /**
     * Get email forwards for a domain
     */
    async getEmailForwards(domainId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.domainsEndpoint}/${domainId}/email-forwards?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting email forwards:', error);
            throw error;
        }
    }

    /**
     * Create an email forward
     */
    async createEmailForward(domainId, fromAddress, toAddress, isWildcard = false) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                fromAddress: fromAddress,
                toAddress: toAddress,
                isWildcard: isWildcard
            };

            const result = await this.apiRequest(
                `${this.domainsEndpoint}/${domainId}/email-forwards?cognitoUserId=${encodeURIComponent(cognitoUserId)}`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error creating email forward:', error);
            throw error;
        }
    }

    /**
     * Update an email forward
     */
    async updateEmailForward(domainId, forwardId, updates) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.domainsEndpoint}/${domainId}/email-forwards/${forwardId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'PUT', updates);
            return result;
        } catch (error) {
            console.error('Error updating email forward:', error);
            throw error;
        }
    }

    /**
     * Delete an email forward
     */
    async deleteEmailForward(domainId, forwardId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.domainsEndpoint}/${domainId}/email-forwards/${forwardId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'DELETE');
            return result;
        } catch (error) {
            console.error('Error deleting email forward:', error);
            throw error;
        }
    }

    /**
     * Get SSL certificate status
     */
    async getSSLStatus(domainId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.domainsEndpoint}/${domainId}/ssl?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting SSL status:', error);
            throw error;
        }
    }

    /**
     * Request SSL certificate
     */
    async requestSSLCertificate(domainId, includeSubdomains = false) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                includeSubdomains: includeSubdomains
            };

            const result = await this.apiRequest(
                `${this.domainsEndpoint}/${domainId}/ssl?cognitoUserId=${encodeURIComponent(cognitoUserId)}`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error requesting SSL certificate:', error);
            throw error;
        }
    }

    // ========== UI METHODS ==========

    /**
     * Load and display domains
     */
    async loadDomains(status = null) {
        try {
            if (!this.isConfigured) {
                this.renderDomains([]);
                const domainsList = document.getElementById('domains-list');
                const emptyState = document.getElementById('empty-state');
                if (emptyState) {
                    emptyState.innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <i data-lucide="globe" style="width: 64px; height: 64px; color: #94a3b8; margin-bottom: 16px;"></i>
                            <h3 style="color: #64748b; margin-bottom: 8px;">API Not Configured</h3>
                            <p style="color: #94a3b8; margin-bottom: 16px;">Please configure your API Gateway URL in <code>domains-config.js</code></p>
                        </div>
                    `;
                    emptyState.style.display = 'block';
                    if (domainsList) domainsList.style.display = 'none';
                    if (window.lucide) lucide.createIcons();
                }
                return;
            }

            const result = await this.listDomains(status);
            this.renderDomains(result.domains || []);
        } catch (error) {
            console.error('Error loading domains:', error);
            const errorMessage = error.message || 'Failed to load domains. Please try again.';
            this.showError(errorMessage);
            
            const domainsList = document.getElementById('domains-list');
            const emptyState = document.getElementById('empty-state');
            if (emptyState) {
                emptyState.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i data-lucide="alert-circle" style="width: 64px; height: 64px; color: #ef4444; margin-bottom: 16px;"></i>
                        <h3 style="color: #ef4444; margin-bottom: 8px;">Failed to Load Domains</h3>
                        <p style="color: #94a3b8; margin-bottom: 16px;">${this.escapeHtml(errorMessage)}</p>
                    </div>
                `;
                emptyState.style.display = 'block';
                if (domainsList) domainsList.style.display = 'none';
                if (window.lucide) lucide.createIcons();
            }
        }
    }

    /**
     * Render domains list
     */
    renderDomains(domains) {
        const domainsList = document.getElementById('domains-list');
        const emptyState = document.getElementById('empty-state');

        if (!domainsList) return;

        if (domains.length === 0) {
            domainsList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        domainsList.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        domainsList.innerHTML = domains.map(domain => this.createDomainCard(domain)).join('');

        // Reinitialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Attach event listeners
        this.attachDomainEventListeners();
    }

    /**
     * Create domain card HTML
     */
    createDomainCard(domain) {
        const statusColors = {
            'pending': '#f59e0b',
            'verifying': '#3b82f6',
            'verified': '#22c55e',
            'connected': '#22c55e',
            'failed': '#ef4444',
            'disconnected': '#94a3b8'
        };

        const statusLabels = {
            'pending': 'Pending',
            'verifying': 'Verifying',
            'verified': 'Verified',
            'connected': 'Connected',
            'failed': 'Failed',
            'disconnected': 'Disconnected'
        };

        const sslStatusColors = {
            'pending': '#94a3b8',
            'requested': '#3b82f6',
            'issued': '#22c55e',
            'failed': '#ef4444',
            'expired': '#f59e0b'
        };

        const createdDate = domain.created_at 
            ? new Date(domain.created_at).toLocaleDateString()
            : 'Unknown';

        return `
            <div class="domain-card" data-domain-id="${domain.id}" style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; transition: all 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <h3 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 4px 0;">${this.escapeHtml(domain.domain_name)}</h3>
                        <p style="font-size: 13px; color: #64748b; margin: 0;">Added ${createdDate}</p>
                    </div>
                    <div style="display: flex; gap: 8px; flex-direction: column; align-items: flex-end;">
                        <span style="background: ${statusColors[domain.status] || '#94a3b8'}15; color: ${statusColors[domain.status] || '#94a3b8'}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                            ${statusLabels[domain.status] || domain.status}
                        </span>
                        ${domain.ssl_status && domain.ssl_status !== 'not_requested' ? `
                            <span style="background: ${sslStatusColors[domain.ssl_status] || '#94a3b8'}15; color: ${sslStatusColors[domain.ssl_status] || '#94a3b8'}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                                SSL: ${domain.ssl_status}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px;">
                    ${domain.status === 'pending' || domain.status === 'verifying' 
                        ? `<button class="domain-action-btn" data-action="verify" data-domain-id="${domain.id}" style="background: #f0f9ff; color: #0ea5e9; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Verify</button>`
                        : ''
                    }
                    <button class="domain-action-btn" data-action="manage" data-domain-id="${domain.id}" style="background: #f0f9ff; color: #0ea5e9; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Manage</button>
                    <button class="domain-action-btn" data-action="delete" data-domain-id="${domain.id}" style="background: #fef2f2; color: #ef4444; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Delete</button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to domain cards
     */
    attachDomainEventListeners() {
        document.querySelectorAll('.domain-action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = btn.dataset.action;
                const domainId = btn.dataset.domainId;

                switch (action) {
                    case 'verify':
                        await this.handleVerify(domainId);
                        break;
                    case 'manage':
                        await this.handleManage(domainId);
                        break;
                    case 'delete':
                        await this.handleDelete(domainId);
                        break;
                }
            });
        });
    }

    /**
     * Handle verify action
     */
    async handleVerify(domainId) {
        try {
            this.showInfo('Verifying domain... This may take a few moments.');
            const result = await this.verifyDomain(domainId);
            if (result.verified) {
                this.showSuccess('Domain verified successfully!');
            } else {
                this.showError(result.message || 'Domain verification failed. Please check your DNS records.');
            }
            await this.loadDomains();
        } catch (error) {
            this.showError(error.message || 'Failed to verify domain');
        }
    }

    /**
     * Handle manage action
     */
    async handleManage(domainId) {
        // Navigate to domain management page
        window.location.hash = `domains-manage-${domainId}`;
    }

    /**
     * Handle delete action
     */
    async handleDelete(domainId) {
        if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) {
            return;
        }

        try {
            await this.deleteDomain(domainId);
            this.showSuccess('Domain deleted successfully');
            await this.loadDomains();
        } catch (error) {
            this.showError(error.message || 'Failed to delete domain');
        }
    }

    /**
     * Show create domain modal
     */
    showConnectModal() {
        const modal = document.createElement('div');
        modal.id = 'domain-connect-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; max-width: 500px; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">Connect Domain</h2>
                    <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
                </div>
                
                <form id="domain-connect-form" style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Domain Name *</label>
                        <input type="text" id="domain-name" required placeholder="example.com" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                        <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Enter your domain name (e.g., example.com)</p>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
                        <button type="button" id="cancel-btn" style="background: #f1f5f9; color: #475569; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" style="background: #0ea5e9; color: #ffffff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">Connect Domain</button>
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
        document.getElementById('domain-connect-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleConnectSubmit(modal);
        });
    }

    /**
     * Handle domain connect form submission
     */
    async handleConnectSubmit(modal) {
        try {
            const domainName = document.getElementById('domain-name').value.trim();
            
            if (!domainName) {
                this.showError('Please enter a domain name');
                return;
            }

            const result = await this.connectDomain(domainName);
            
            modal.remove();
            this.showSuccess('Domain connection initiated! Please add the verification DNS record.');
            
            // Show verification instructions
            if (result.domain && result.domain.verification_instructions) {
                const instructions = result.domain.verification_instructions;
                alert(`To verify your domain, add this DNS record:\n\nType: ${instructions.record_type}\nName: ${instructions.record_name}\nValue: ${instructions.record_value}\n\nAfter adding the record, click "Verify" on your domain.`);
            }
            
            await this.loadDomains();
        } catch (error) {
            this.showError(error.message || 'Failed to connect domain');
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
window.domainsService = new DomainsService();

