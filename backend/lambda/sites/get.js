// Lambda function: Get Site
// Retrieves a single site by ID with full details

const pool = require('../../config/database-config');

/**
 * Lambda handler for getting a single site
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

        if (!siteId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'siteId is required'
                })
            };
        }

        let query = 'SELECT * FROM sites WHERE id = $1';
        const values = [siteId];

        if (cognitoUserId) {
            query += ' AND cognito_user_id = $2';
            values.push(cognitoUserId);
        }

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Site not found'
                })
            };
        }

        const site = result.rows[0];

        // Parse JSON fields
        site.environment_variables = typeof site.environment_variables === 'string' 
            ? JSON.parse(site.environment_variables) 
            : site.environment_variables;
        site.metadata = typeof site.metadata === 'string' 
            ? JSON.parse(site.metadata) 
            : site.metadata;

        // Get latest deployment
        const deploymentResult = await pool.query(
            'SELECT * FROM site_deployments WHERE site_id = $1 ORDER BY created_at DESC LIMIT 1',
            [siteId]
        );
        site.latest_deployment = deploymentResult.rows[0] || null;

        // Get deployment count
        const deploymentCount = await pool.query(
            'SELECT COUNT(*) as count FROM site_deployments WHERE site_id = $1',
            [siteId]
        );
        site.deployment_count = parseInt(deploymentCount.rows[0].count);

        // Get analytics summary for last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const analyticsResult = await pool.query(
            `SELECT 
                SUM(total_pageviews) as total_pageviews,
                SUM(total_visits) as total_visits,
                SUM(unique_visitors) as unique_visitors
            FROM site_analytics_daily_summary 
            WHERE site_id = $1 AND summary_date >= $2`,
            [siteId, sevenDaysAgo.toISOString().split('T')[0]]
        );

        if (analyticsResult.rows[0]) {
            site.analytics_summary = {
                pageviews: parseInt(analyticsResult.rows[0].total_pageviews || 0),
                visits: parseInt(analyticsResult.rows[0].total_visits || 0),
                unique_visitors: parseInt(analyticsResult.rows[0].unique_visitors || 0)
            };
        } else {
            site.analytics_summary = {
                pageviews: 0,
                visits: 0,
                unique_visitors: 0
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                site: site
            })
        };
    } catch (error) {
        console.error('Error getting site:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to get site',
                message: error.message
            })
        };
    }
};

