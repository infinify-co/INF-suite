// Lambda function: Get Analytics Stats
// Retrieves analytics statistics for a site

const pool = require('../../config/database-config');

/**
 * Lambda handler for getting analytics stats
 */
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        const siteId = event.pathParameters?.siteId;
        const cognitoUserId = event.queryStringParameters?.cognitoUserId;
        const startDate = event.queryStringParameters?.startDate;
        const endDate = event.queryStringParameters?.endDate;
        const period = event.queryStringParameters?.period || '7d'; // 7d, 30d, 90d, all

        if (!siteId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'siteId is required'
                })
            };
        }

        // Verify site belongs to user
        if (cognitoUserId) {
            const siteCheck = await pool.query(
                'SELECT id FROM sites WHERE id = $1 AND cognito_user_id = $2',
                [siteId, cognitoUserId]
            );
            if (siteCheck.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({
                        error: 'Site not found'
                    })
                };
            }
        }

        // Calculate date range
        let dateStart, dateEnd;
        if (startDate && endDate) {
            dateStart = startDate;
            dateEnd = endDate;
        } else {
            dateEnd = new Date().toISOString().split('T')[0];
            const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
            const start = new Date();
            start.setDate(start.getDate() - daysAgo);
            dateStart = start.toISOString().split('T')[0];
        }

        // Get daily summaries
        const summaryResult = await pool.query(
            `SELECT * FROM site_analytics_daily_summary 
            WHERE site_id = $1 AND summary_date >= $2 AND summary_date <= $3
            ORDER BY summary_date ASC`,
            [siteId, dateStart, dateEnd]
        );

        // Aggregate totals
        const totals = {
            pageviews: 0,
            visits: 0,
            unique_visitors: 0,
            bounce_count: 0,
            conversion_count: 0,
            avg_load_time_ms: 0
        };

        const dailyData = [];
        let totalLoadTime = 0;
        let loadTimeCount = 0;

        summaryResult.rows.forEach(row => {
            totals.pageviews += row.total_pageviews || 0;
            totals.visits += row.total_visits || 0;
            totals.unique_visitors += row.unique_visitors || 0;
            totals.bounce_count += row.bounce_count || 0;
            totals.conversion_count += row.conversion_count || 0;
            
            if (row.avg_load_time_ms) {
                totalLoadTime += row.avg_load_time_ms * (row.total_pageviews || 0);
                loadTimeCount += row.total_pageviews || 0;
            }

            dailyData.push({
                date: row.summary_date,
                pageviews: row.total_pageviews || 0,
                visits: row.total_visits || 0,
                unique_visitors: row.unique_visitors || 0
            });
        });

        totals.avg_load_time_ms = loadTimeCount > 0 ? Math.round(totalLoadTime / loadTimeCount) : 0;

        // Get top pages (from raw analytics data, last 30 days)
        const topPagesResult = await pool.query(
            `SELECT page_path, COUNT(*) as views
            FROM site_analytics
            WHERE site_id = $1 AND event_type = 'pageview' 
            AND event_date >= $2
            GROUP BY page_path
            ORDER BY views DESC
            LIMIT 10`,
            [siteId, dateStart]
        );

        const topPages = topPagesResult.rows.map(row => ({
            path: row.page_path || '/',
            views: parseInt(row.views)
        }));

        // Get top referrers
        const topReferrersResult = await pool.query(
            `SELECT referrer, COUNT(*) as count
            FROM site_analytics
            WHERE site_id = $1 AND event_type = 'pageview'
            AND event_date >= $2 AND referrer IS NOT NULL
            GROUP BY referrer
            ORDER BY count DESC
            LIMIT 10`,
            [siteId, dateStart]
        );

        const topReferrers = topReferrersResult.rows.map(row => ({
            referrer: row.referrer,
            count: parseInt(row.count)
        }));

        // Get device breakdown
        const deviceBreakdownResult = await pool.query(
            `SELECT device_type, COUNT(*) as count
            FROM site_analytics
            WHERE site_id = $1 AND event_type = 'pageview'
            AND event_date >= $2
            GROUP BY device_type
            ORDER BY count DESC`,
            [siteId, dateStart]
        );

        const deviceBreakdown = {};
        deviceBreakdownResult.rows.forEach(row => {
            deviceBreakdown[row.device_type] = parseInt(row.count);
        });

        // Get country breakdown
        const countryBreakdownResult = await pool.query(
            `SELECT country_code, COUNT(DISTINCT session_id) as visitors
            FROM site_analytics
            WHERE site_id = $1 AND event_type = 'pageview'
            AND event_date >= $2 AND country_code IS NOT NULL
            GROUP BY country_code
            ORDER BY visitors DESC
            LIMIT 10`,
            [siteId, dateStart]
        );

        const topCountries = countryBreakdownResult.rows.map(row => ({
            country: row.country_code,
            visitors: parseInt(row.visitors)
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                stats: {
                    totals,
                    daily: dailyData,
                    top_pages: topPages,
                    top_referrers: topReferrers,
                    device_breakdown: deviceBreakdown,
                    top_countries: topCountries,
                    period: {
                        start: dateStart,
                        end: dateEnd
                    }
                }
            })
        };
    } catch (error) {
        console.error('Error getting analytics stats:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to get analytics stats',
                message: error.message
            })
        };
    }
};

