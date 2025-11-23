// Agents Service
// Handles all operations for AI agent management via Lambda functions

class AgentsService {
    constructor() {
        // API Gateway base URL - update this in agents-config.js or set window.AGENTS_API_URL
        this.apiBaseUrl = window.AGENTS_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
        this.agentsEndpoint = `${this.apiBaseUrl}/agents`;
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
            throw new Error('API endpoint not configured. Please update agents-config.js with your API Gateway URL.');
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
            // Re-throw with more context if it's a network error
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to reach API endpoint. Please check your API Gateway URL.');
            }
            throw error;
        }
    }

    /**
     * Create a new AI agent
     */
    async createAgent(agentConfig) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                companyId: agentConfig.companyId || null,
                name: agentConfig.name,
                instructions: agentConfig.instructions,
                model: agentConfig.model || 'gpt-5.1',
                tools: agentConfig.tools || [],
                metadata: agentConfig.metadata || {}
            };

            const result = await this.apiRequest(
                `${this.agentsEndpoint}/create`,
                'POST',
                payload
            );

            // Create data item for categorization (if organization service is available)
            if (result.agent && window.dataOrganizationService) {
                try {
                    // Get user ID (convert cognito user id to UUID if needed)
                    const userId = window.authManager?.user?.id || cognitoUserId;
                    
                    await window.dataOrganizationService.createDataItem({
                        itemType: 'agent',
                        itemId: result.agent.id,
                        itemTable: 'agents',
                        name: result.agent.name,
                        categorySlug: 'agents',
                        description: result.agent.instructions?.substring(0, 200) || `AI Agent: ${result.agent.name}`,
                        tags: agentConfig.tags || []
                    });
                } catch (orgError) {
                    console.warn('Error creating data item for agent:', orgError);
                    // Non-blocking - agent creation succeeded
                }
            }

            return result;
        } catch (error) {
            console.error('Error creating agent:', error);
            throw error;
        }
    }

    /**
     * List all agents for current user
     */
    /**
     * List all agents for current user
     * @param {string} status - Optional status filter
     * @param {string} categorySlug - Optional category filter
     */
    async listAgents(status = null, categorySlug = null) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            let url = `${this.agentsEndpoint}/list?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            if (status) {
                url += `&status=${encodeURIComponent(status)}`;
            }

            const result = await this.apiRequest(url, 'GET');
            
            // Filter by category if specified and organization service is available
            if (categorySlug && window.dataOrganizationService && result.agents) {
                try {
                    const userId = window.authManager?.user?.id || cognitoUserId;
                    const { data: categoryItems } = await window.dataOrganizationService.getDataItemsByCategory('agents', userId);
                    
                    if (categoryItems) {
                        const categoryItemIds = new Set(categoryItems.map(item => item.item_id));
                        result.agents = result.agents.filter(agent => categoryItemIds.has(agent.id));
                    }
                } catch (orgError) {
                    console.warn('Error filtering agents by category:', orgError);
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error listing agents:', error);
            throw error;
        }
    }

    /**
     * Get a single agent by ID
     */
    async getAgent(agentId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.agentsEndpoint}/${agentId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting agent:', error);
            throw error;
        }
    }

    /**
     * Update an agent
     */
    async updateAgent(agentId, updates) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                ...updates
            };

            const result = await this.apiRequest(
                `${this.agentsEndpoint}/${agentId}`,
                'PUT',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error updating agent:', error);
            throw error;
        }
    }

    /**
     * Delete an agent
     */
    async deleteAgent(agentId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.agentsEndpoint}/${agentId}?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'DELETE');
            return result;
        } catch (error) {
            console.error('Error deleting agent:', error);
            throw error;
        }
    }

    /**
     * Deploy an agent
     */
    async deployAgent(agentId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                action: 'deploy'
            };

            const result = await this.apiRequest(
                `${this.agentsEndpoint}/${agentId}/deploy`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error deploying agent:', error);
            throw error;
        }
    }

    /**
     * Undeploy an agent
     */
    async undeployAgent(agentId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                action: 'undeploy'
            };

            const result = await this.apiRequest(
                `${this.agentsEndpoint}/${agentId}/deploy`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error undeploying agent:', error);
            throw error;
        }
    }

    /**
     * Get agent logs
     */
    async getAgentLogs(agentId, limit = 50, offset = 0) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.agentsEndpoint}/${agentId}/logs?cognitoUserId=${encodeURIComponent(cognitoUserId)}&limit=${limit}&offset=${offset}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting agent logs:', error);
            throw error;
        }
    }

    /**
     * Get agent version history
     */
    async getAgentVersions(agentId) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.agentsEndpoint}/${agentId}/version?cognitoUserId=${encodeURIComponent(cognitoUserId)}`;
            
            const result = await this.apiRequest(url, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting agent versions:', error);
            throw error;
        }
    }

    /**
     * Rollback agent to a previous version
     */
    async rollbackAgent(agentId, version) {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const payload = {
                cognitoUserId: cognitoUserId,
                action: 'rollback',
                version: version
            };

            const result = await this.apiRequest(
                `${this.agentsEndpoint}/${agentId}/version`,
                'POST',
                payload
            );

            return result;
        } catch (error) {
            console.error('Error rolling back agent:', error);
            throw error;
        }
    }

    // ========== UI METHODS ==========

    /**
     * Load and display agents
     */
    async loadAgents(status = null) {
        try {
            if (!this.isConfigured) {
                this.renderAgents([]);
                const agentsList = document.getElementById('agents-list');
                const emptyState = document.getElementById('empty-state');
                if (emptyState) {
                    emptyState.innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <i data-lucide="cpu" style="width: 64px; height: 64px; color: #94a3b8; margin-bottom: 16px;"></i>
                            <h3 style="color: #64748b; margin-bottom: 8px;">API Not Configured</h3>
                            <p style="color: #94a3b8; margin-bottom: 16px;">Please configure your API Gateway URL in <code>agents-config.js</code></p>
                            <p style="color: #cbd5e1; font-size: 14px;">Update <code>window.AGENTS_API_URL</code> with your actual API Gateway endpoint.</p>
                        </div>
                    `;
                    emptyState.style.display = 'block';
                    if (agentsList) agentsList.style.display = 'none';
                    if (window.lucide) lucide.createIcons();
                }
                return;
            }

            const result = await this.listAgents(status);
            this.renderAgents(result.agents || []);
        } catch (error) {
            console.error('Error loading agents:', error);
            const errorMessage = error.message || 'Failed to load agents. Please try again.';
            this.showError(errorMessage);
            
            // Show error in the UI
            const agentsList = document.getElementById('agents-list');
            const emptyState = document.getElementById('empty-state');
            if (emptyState) {
                emptyState.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i data-lucide="alert-circle" style="width: 64px; height: 64px; color: #ef4444; margin-bottom: 16px;"></i>
                        <h3 style="color: #ef4444; margin-bottom: 8px;">Failed to Load Agents</h3>
                        <p style="color: #94a3b8; margin-bottom: 16px;">${this.escapeHtml(errorMessage)}</p>
                    </div>
                `;
                emptyState.style.display = 'block';
                if (agentsList) agentsList.style.display = 'none';
                if (window.lucide) lucide.createIcons();
            }
        }
    }

    /**
     * Render agents list
     */
    renderAgents(agents) {
        const agentsList = document.getElementById('agents-list');
        const emptyState = document.getElementById('empty-state');

        if (!agentsList) return;

        if (agents.length === 0) {
            agentsList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        agentsList.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        agentsList.innerHTML = agents.map(agent => this.createAgentCard(agent)).join('');

        // Reinitialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Attach event listeners
        this.attachAgentEventListeners();
    }

    /**
     * Create agent card HTML
     */
    createAgentCard(agent) {
        const statusColors = {
            'draft': '#94a3b8',
            'deployed': '#22c55e',
            'paused': '#f59e0b'
        };

        const statusLabels = {
            'draft': 'Draft',
            'deployed': 'Deployed',
            'paused': 'Paused'
        };

        const lastActivity = agent.last_activity 
            ? new Date(agent.last_activity).toLocaleDateString()
            : 'Never';

        return `
            <div class="agent-card" data-agent-id="${agent.id}" style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; transition: all 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <h3 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 4px 0;">${this.escapeHtml(agent.name)}</h3>
                        <p style="font-size: 13px; color: #64748b; margin: 0;">Model: ${this.escapeHtml(agent.model)}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span style="background: ${statusColors[agent.status] || '#94a3b8'}15; color: ${statusColors[agent.status] || '#94a3b8'}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                            ${statusLabels[agent.status] || agent.status}
                        </span>
                    </div>
                </div>
                
                <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${this.escapeHtml(agent.instructions?.substring(0, 100) || 'No instructions')}${agent.instructions?.length > 100 ? '...' : ''}
                </p>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="font-size: 12px; color: #94a3b8;">
                        Version ${agent.version} • Last activity: ${lastActivity}
                    </div>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${agent.status === 'deployed' 
                        ? `<button class="agent-action-btn" data-action="undeploy" data-agent-id="${agent.id}" style="background: #fef3c7; color: #f59e0b; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Undeploy</button>`
                        : `<button class="agent-action-btn" data-action="deploy" data-agent-id="${agent.id}" style="background: #f0fdf4; color: #22c55e; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Deploy</button>`
                    }
                    <button class="agent-action-btn" data-action="edit" data-agent-id="${agent.id}" style="background: #f0f9ff; color: #0ea5e9; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Edit</button>
                    <button class="agent-action-btn" data-action="logs" data-agent-id="${agent.id}" style="background: #f3e8ff; color: #a855f7; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Logs</button>
                    <button class="agent-action-btn" data-action="delete" data-agent-id="${agent.id}" style="background: #fef2f2; color: #ef4444; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Delete</button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to agent cards
     */
    attachAgentEventListeners() {
        document.querySelectorAll('.agent-action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = btn.dataset.action;
                const agentId = btn.dataset.agentId;

                switch (action) {
                    case 'deploy':
                        await this.handleDeploy(agentId);
                        break;
                    case 'undeploy':
                        await this.handleUndeploy(agentId);
                        break;
                    case 'edit':
                        await this.handleEdit(agentId);
                        break;
                    case 'logs':
                        await this.handleViewLogs(agentId);
                        break;
                    case 'delete':
                        await this.handleDelete(agentId);
                        break;
                }
            });
        });
    }

    /**
     * Handle deploy action
     */
    async handleDeploy(agentId) {
        try {
            await this.deployAgent(agentId);
            this.showSuccess('Agent deployed successfully');
            await this.loadAgents();
        } catch (error) {
            this.showError(error.message || 'Failed to deploy agent');
        }
    }

    /**
     * Handle undeploy action
     */
    async handleUndeploy(agentId) {
        try {
            await this.undeployAgent(agentId);
            this.showSuccess('Agent undeployed successfully');
            await this.loadAgents();
        } catch (error) {
            this.showError(error.message || 'Failed to undeploy agent');
        }
    }

    /**
     * Handle edit action
     */
    async handleEdit(agentId) {
        try {
            const result = await this.getAgent(agentId);
            this.showEditModal(result.agent);
        } catch (error) {
            this.showError(error.message || 'Failed to load agent');
        }
    }

    /**
     * Handle view logs action
     */
    async handleViewLogs(agentId) {
        try {
            const result = await this.getAgentLogs(agentId);
            this.showLogsModal(agentId, result.logs);
        } catch (error) {
            this.showError(error.message || 'Failed to load logs');
        }
    }

    /**
     * Handle delete action
     */
    async handleDelete(agentId) {
        if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
            return;
        }

        try {
            await this.deleteAgent(agentId);
            this.showSuccess('Agent deleted successfully');
            await this.loadAgents();
        } catch (error) {
            this.showError(error.message || 'Failed to delete agent');
        }
    }

    /**
     * Show create agent modal
     */
    showCreateModal() {
        this.showAgentModal(null);
    }

    /**
     * Show edit agent modal
     */
    showEditModal(agent) {
        this.showAgentModal(agent);
    }

    /**
     * Show agent form modal (create or edit)
     */
    showAgentModal(agent = null) {
        const isEdit = !!agent;
        const modal = document.createElement('div');
        modal.id = 'agent-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">
                        ${isEdit ? 'Edit Agent' : 'Create Agent'}
                    </h2>
                    <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
                </div>
                
                <form id="agent-form" style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Agent Name *</label>
                        <input type="text" id="agent-name" required style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;" value="${agent?.name || ''}">
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Instructions *</label>
                        <textarea id="agent-instructions" required rows="6" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; resize: vertical;" placeholder="Describe what the agent should do...">${agent?.instructions || ''}</textarea>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Model</label>
                        <select id="agent-model" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                            <option value="gpt-5.1" ${agent?.model === 'gpt-5.1' ? 'selected' : ''}>GPT-5.1</option>
                            <option value="gpt-4" ${agent?.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                            <option value="gpt-4-turbo" ${agent?.model === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Tools (JSON array)</label>
                        <textarea id="agent-tools" rows="4" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-family: monospace; resize: vertical;" placeholder='[]'>${agent?.tools ? JSON.stringify(agent.tools, null, 2) : '[]'}</textarea>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
                        <button type="button" id="cancel-btn" style="background: #f1f5f9; color: #475569; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" style="background: #0ea5e9; color: #ffffff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">${isEdit ? 'Update' : 'Create'} Agent</button>
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
        document.getElementById('agent-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAgentSubmit(agent?.id, modal);
        });
    }

    /**
     * Handle agent form submission
     */
    async handleAgentSubmit(agentId, modal) {
        try {
            const name = document.getElementById('agent-name').value;
            const instructions = document.getElementById('agent-instructions').value;
            const model = document.getElementById('agent-model').value;
            let tools = [];
            
            try {
                const toolsText = document.getElementById('agent-tools').value;
                tools = JSON.parse(toolsText);
            } catch (e) {
                throw new Error('Invalid JSON format for tools');
            }

            if (agentId) {
                // Update existing agent
                await this.updateAgent(agentId, { name, instructions, model, tools });
                this.showSuccess('Agent updated successfully');
            } else {
                // Create new agent
                await this.createAgent({ name, instructions, model, tools });
                this.showSuccess('Agent created successfully');
            }

            modal.remove();
            await this.loadAgents();
        } catch (error) {
            this.showError(error.message || 'Failed to save agent');
        }
    }

    /**
     * Show logs modal
     */
    showLogsModal(agentId, logs) {
        const modal = document.createElement('div');
        modal.id = 'logs-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        const logsHtml = logs.length > 0
            ? logs.map(log => `
                <div style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="font-weight: 600; color: #0f172a;">${this.escapeHtml(log.action)}</span>
                        <span style="font-size: 12px; color: #94a3b8;">${new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    ${log.details && Object.keys(log.details).length > 0 
                        ? `<pre style="font-size: 12px; color: #64748b; margin: 4px 0 0 0; white-space: pre-wrap;">${this.escapeHtml(JSON.stringify(log.details, null, 2))}</pre>`
                        : ''
                    }
                </div>
            `).join('')
            : '<div style="padding: 40px; text-align: center; color: #94a3b8;">No logs available</div>';

        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">Agent Logs</h2>
                    <button id="close-logs-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
                </div>
                <div style="max-height: 60vh; overflow-y: auto;">
                    ${logsHtml}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('close-logs-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
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
window.agentsService = new AgentsService();

