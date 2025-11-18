// Lambda function: List Sites
// Lists all sites for a user

const pool = require('../../config/database-config');

/**
 * Lambda handler for listing sites
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
        const cognitoUserId = event.queryStringParameters?.cognitoUserId;
        const status = event.queryStringParameters?.status;

        if (!cognitoUserId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'cognitoUserId is required'
                })
            };
        }

        let query = 'SELECT * FROM sites WHERE cognito_user_id = $1';
        const values = [cognitoUserId];

        if (status) {
            query += ' AND status = $2';
            values.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, values);

        // Parse JSON fields and get analytics summary
        const sites = await Promise.all(result.rows.map(async (site) => {
            site.environment_variables = typeof site.environment_variables === 'string' 
                ? JSON.parse(site.environment_variables) 
                : site.environment_variables;
            site.metadata = typeof site.metadata === 'string' 
                ? JSON.parse(site.metadata) 
                : site.metadata;

            // Get today's analytics summary
            const today = new Date().toISOString().split('T')[0];
            const analyticsResult = await pool.query(
                'SELECT * FROM site_analytics_daily_summary WHERE site_id = $1 AND summary_date = $2',
                [site.id, today]
            );

            if (analyticsResult.rows.length > 0) {
                const summary = analyticsResult.rows[0];
                site.today_stats = {
                    pageviews: summary.total_pageviews || 0,
                    visits: summary.total_visits || 0,
                    unique_visitors: summary.unique_visitors || 0
                };
            } else {
                site.today_stats = {
                    pageviews: 0,
                    visits: 0,
                    unique_visitors: 0
                };
            }

            return site;
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sites: sites
            })
        };
    } catch (error) {
        console.error('Error listing sites:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to list sites',
                message: error.message
            })
        };
    }
};

