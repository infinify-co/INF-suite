// Lambda function: Track Analytics Event
// Records analytics events (pageviews, visits, etc.)

const pool = require('../../config/database-config');

/**
 * Extract device type from user agent
 */
function getDeviceType(userAgent) {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
        return 'tablet';
    }
    if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
        return 'bot';
    }
    return 'desktop';
}

/**
 * Extract browser from user agent
 */
function getBrowser(userAgent) {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'chrome';
    if (ua.includes('firefox')) return 'firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
    if (ua.includes('edge')) return 'edge';
    if (ua.includes('opera')) return 'opera';
    return 'unknown';
}

/**
 * Extract OS from user agent
 */
function getOS(userAgent) {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'windows';
    if (ua.includes('mac os') || ua.includes('macos')) return 'macos';
    if (ua.includes('linux')) return 'linux';
    if (ua.includes('android')) return 'android';
    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    return 'unknown';
}

/**
 * Lambda handler for tracking analytics events
 */
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: ''
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const {
            siteId,
            eventType = 'pageview',
            pagePath,
            referrer,
            userAgent,
            ipAddress,
            countryCode,
            city,
            sessionId,
            userId,
            loadTimeMs,
            metadata
        } = body;

        if (!siteId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'siteId is required'
                })
            };
        }

        // Verify site exists
        const siteCheck = await pool.query('SELECT id FROM sites WHERE id = $1', [siteId]);
        if (siteCheck.rows.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Site not found'
                })
            };
        }

        const deviceType = getDeviceType(userAgent);
        const browser = getBrowser(userAgent);
        const os = getOS(userAgent);
        const eventDate = new Date().toISOString().split('T')[0];

        // Insert analytics event
        const result = await pool.query(
            `INSERT INTO site_analytics (
                site_id, event_date, event_type, page_path, referrer, user_agent,
                ip_address, country_code, city, device_type, browser, os,
                session_id, user_id, load_time_ms, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id`,
            [
                siteId,
                eventDate,
                eventType,
                pagePath || null,
                referrer || null,
                userAgent || null,
                ipAddress || null,
                countryCode || null,
                city || null,
                deviceType,
                browser,
                os,
                sessionId || null,
                userId || null,
                loadTimeMs || null,
                JSON.stringify(metadata || {})
            ]
        );

        // Update daily summary (async, don't wait)
        updateDailySummary(siteId, eventDate, eventType, pagePath, referrer, countryCode, deviceType, browser, loadTimeMs)
            .catch(err => console.error('Error updating daily summary:', err));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                eventId: result.rows[0].id
            })
        };
    } catch (error) {
        console.error('Error tracking analytics:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to track analytics',
                message: error.message
            })
        };
    }
};

/**
 * Update daily summary (called asynchronously)
 */
async function updateDailySummary(siteId, eventDate, eventType, pagePath, referrer, countryCode, deviceType, browser, loadTimeMs) {
    try {
        // Get or create daily summary
        let summaryResult = await pool.query(
            'SELECT * FROM site_analytics_daily_summary WHERE site_id = $1 AND summary_date = $2',
            [siteId, eventDate]
        );

        let summary;
        if (summaryResult.rows.length === 0) {
            // Create new summary
            const insertResult = await pool.query(
                `INSERT INTO site_analytics_daily_summary (
                    site_id, summary_date, total_pageviews, total_visits, unique_visitors
                ) VALUES ($1, $2, 0, 0, 0)
                RETURNING *`,
                [siteId, eventDate]
            );
            summary = insertResult.rows[0];
        } else {
            summary = summaryResult.rows[0];
        }

        // Update counts based on event type
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (eventType === 'pageview') {
            updates.push(`total_pageviews = total_pageviews + 1`);
        }
        if (eventType === 'visit') {
            updates.push(`total_visits = total_visits + 1`);
        }
        if (eventType === 'unique_visitor') {
            updates.push(`unique_visitors = unique_visitors + 1`);
        }
        if (eventType === 'bounce') {
            updates.push(`bounce_count = bounce_count + 1`);
        }
        if (eventType === 'conversion') {
            updates.push(`conversion_count = conversion_count + 1`);
        }

        // Update load time average
        if (loadTimeMs) {
            const currentAvg = summary.avg_load_time_ms || 0;
            const currentPageviews = summary.total_pageviews || 0;
            const newAvg = currentPageviews > 0 
                ? Math.round((currentAvg * currentPageviews + loadTimeMs) / (currentPageviews + 1))
                : loadTimeMs;
            updates.push(`avg_load_time_ms = $${paramIndex++}`);
            values.push(newAvg);
        }

        if (updates.length > 0) {
            values.push(siteId, eventDate);
            await pool.query(
                `UPDATE site_analytics_daily_summary 
                SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE site_id = $${paramIndex++} AND summary_date = $${paramIndex++}`,
                values
            );
        }

        // Note: Top pages, referrers, countries, device breakdown would require
        // more complex aggregation logic. For now, we'll update these periodically
        // via a separate aggregation job or on-demand when viewing analytics.
    } catch (error) {
        console.error('Error in updateDailySummary:', error);
        throw error;
    }
}

