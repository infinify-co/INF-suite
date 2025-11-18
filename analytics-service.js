// Analytics Service
// Handles analytics tracking and statistics

class AnalyticsService {
    constructor() {
        // API Gateway base URL - should match sites API URL
        this.apiBaseUrl = window.SITES_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
        this.analyticsEndpoint = `${this.apiBaseUrl}/analytics`;
        this.isConfigured = this.apiBaseUrl && !this.apiBaseUrl.includes('your-api-gateway-url');
    }

    /**
     * Track an analytics event
     */
    async trackEvent(siteId, eventData) {
        if (!this.isConfigured) {
            console.warn('Analytics API not configured');
            return;
        }

        try {
            const payload = {
                siteId: siteId,
                eventType: eventData.eventType || 'pageview',
                pagePath: eventData.pagePath || window.location.pathname,
                referrer: eventData.referrer || document.referrer,
                userAgent: navigator.userAgent,
                sessionId: this.getSessionId(),
                loadTimeMs: eventData.loadTimeMs || null,
                metadata: eventData.metadata || {}
            };

            // Try to get IP and location (would need a service for this)
            // For now, we'll send without IP

            const response = await fetch(`${this.analyticsEndpoint}/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error('Failed to track analytics event');
            }
        } catch (error) {
            console.error('Error tracking analytics:', error);
        }
    }

    /**
     * Get or create session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('analytics_session_id');
        if (!sessionId) {
            sessionId = this.generateSessionId();
            sessionStorage.setItem('analytics_session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get analytics stats for a site
     */
    async getStats(siteId, period = '7d') {
        try {
            const cognitoUserId = await this.getCurrentUserId();
            const url = `${this.analyticsEndpoint}/${siteId}/stats?cognitoUserId=${encodeURIComponent(cognitoUserId)}&period=${period}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get analytics stats');
            }

            return data;
        } catch (error) {
            console.error('Error getting analytics stats:', error);
            throw error;
        }
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
     * Show analytics dashboard
     */
    async showAnalyticsDashboard(siteId) {
        const modal = document.createElement('div');
        modal.id = 'analytics-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;';
        
        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; max-width: 1000px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">Site Analytics</h2>
                    <button id="close-analytics-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
                </div>
                
                <div id="analytics-content" style="min-height: 400px;">
                    <div style="text-align: center; padding: 40px;">
                        <div class="spinner" style="border: 3px solid #f3f4f6; border-top: 3px solid #0ea5e9; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                        <p style="color: #64748b; margin-top: 16px;">Loading analytics...</p>
                    </div>
                </div>
            </div>
        `;

        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);

        // Close modal handlers
        document.getElementById('close-analytics-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Load analytics data
        try {
            const stats = await this.getStats(siteId, '7d');
            this.renderAnalyticsDashboard(modal, stats);
        } catch (error) {
            document.getElementById('analytics-content').innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i data-lucide="alert-circle" style="width: 64px; height: 64px; color: #ef4444; margin-bottom: 16px;"></i>
                    <h3 style="color: #ef4444; margin-bottom: 8px;">Failed to Load Analytics</h3>
                    <p style="color: #94a3b8;">${this.escapeHtml(error.message || 'Unknown error')}</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }
    }

    /**
     * Render analytics dashboard
     */
    renderAnalyticsDashboard(modal, stats) {
        const content = document.getElementById('analytics-content');
        const data = stats.stats || {};

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px;">
                <div style="background: #f8fafc; border-radius: 12px; padding: 24px;">
                    <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">Total Pageviews</div>
                    <div style="font-size: 32px; font-weight: 700; color: #0f172a;">${(data.totals?.pageviews || 0).toLocaleString()}</div>
                </div>
                <div style="background: #f8fafc; border-radius: 12px; padding: 24px;">
                    <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">Total Visits</div>
                    <div style="font-size: 32px; font-weight: 700; color: #0f172a;">${(data.totals?.visits || 0).toLocaleString()}</div>
                </div>
                <div style="background: #f8fafc; border-radius: 12px; padding: 24px;">
                    <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">Unique Visitors</div>
                    <div style="font-size: 32px; font-weight: 700; color: #0f172a;">${(data.totals?.unique_visitors || 0).toLocaleString()}</div>
                </div>
                <div style="background: #f8fafc; border-radius: 12px; padding: 24px;">
                    <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">Avg Load Time</div>
                    <div style="font-size: 32px; font-weight: 700; color: #0f172a;">${(data.totals?.avg_load_time_ms || 0)}ms</div>
                </div>
            </div>

            ${data.top_pages && data.top_pages.length > 0 ? `
                <div style="margin-bottom: 32px;">
                    <h3 style="font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 16px;">Top Pages</h3>
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        ${data.top_pages.map((page, i) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: ${i < data.top_pages.length - 1 ? '1px solid #e5e7eb' : 'none'};">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #0f172a;">${this.escapeHtml(page.path || '/')}</div>
                                </div>
                                <div style="font-size: 14px; color: #64748b;">${page.views.toLocaleString()} views</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${data.device_breakdown && Object.keys(data.device_breakdown).length > 0 ? `
                <div style="margin-bottom: 32px;">
                    <h3 style="font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 16px;">Device Breakdown</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
                        ${Object.entries(data.device_breakdown).map(([device, count]) => `
                            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
                                <div style="font-size: 24px; font-weight: 700; color: #0f172a;">${count.toLocaleString()}</div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 4px; text-transform: capitalize;">${device}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
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
window.analyticsService = new AnalyticsService();

