// Lambda function: Update Site
// Updates site configuration

const pool = require('../../config/database-config');

/**
 * Lambda handler for updating a site
 */
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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
        const body = JSON.parse(event.body || '{}');
        const { cognitoUserId, siteName, deploymentType, buildCommand, outputDirectory, environmentVariables, customDomain, domainId, status } = body;

        if (!siteId || !cognitoUserId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'siteId and cognitoUserId are required'
                })
            };
        }

        // Check if site exists and belongs to user
        const existingCheck = await pool.query(
            'SELECT * FROM sites WHERE id = $1 AND cognito_user_id = $2',
            [siteId, cognitoUserId]
        );

        if (existingCheck.rows.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Site not found'
                })
            };
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (siteName !== undefined) {
            updates.push(`site_name = $${paramIndex++}`);
            values.push(siteName);
        }
        if (deploymentType !== undefined) {
            updates.push(`deployment_type = $${paramIndex++}`);
            values.push(deploymentType);
        }
        if (buildCommand !== undefined) {
            updates.push(`build_command = $${paramIndex++}`);
            values.push(buildCommand);
        }
        if (outputDirectory !== undefined) {
            updates.push(`output_directory = $${paramIndex++}`);
            values.push(outputDirectory);
        }
        if (environmentVariables !== undefined) {
            updates.push(`environment_variables = $${paramIndex++}`);
            values.push(JSON.stringify(environmentVariables));
        }
        if (customDomain !== undefined) {
            updates.push(`custom_domain = $${paramIndex++}`);
            values.push(customDomain);
        }
        if (domainId !== undefined) {
            updates.push(`domain_id = $${paramIndex++}`);
            values.push(domainId);
        }
        if (status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (updates.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'No fields to update'
                })
            };
        }

        values.push(siteId, cognitoUserId);
        const query = `UPDATE sites SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND cognito_user_id = $${paramIndex++} RETURNING *`;

        const result = await pool.query(query, values);
        const site = result.rows[0];

        // Parse JSON fields
        site.environment_variables = typeof site.environment_variables === 'string' 
            ? JSON.parse(site.environment_variables) 
            : site.environment_variables;
        site.metadata = typeof site.metadata === 'string' 
            ? JSON.parse(site.metadata) 
            : site.metadata;

        // Log the update
        await pool.query(
            'INSERT INTO site_logs (site_id, action, user_id, details) VALUES ($1, $2, $3, $4)',
            [siteId, 'updated', cognitoUserId, JSON.stringify({ updates })]
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                site: site
            })
        };
    } catch (error) {
        console.error('Error updating site:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to update site',
                message: error.message
            })
        };
    }
};

