// Lambda function: Create Site
// Creates a new site deployment configuration

const pool = require('../../config/database-config');
const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Generate a unique site URL
 */
function generateSiteUrl(siteName, cognitoUserId) {
    // Clean site name: lowercase, replace spaces with hyphens, remove special chars
    const cleanName = siteName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 50);
    
    // Use first 8 chars of user ID for uniqueness
    const userIdHash = cognitoUserId.substring(0, 8);
    return `${cleanName}-${userIdHash}.infinify.com`;
}

/**
 * Lambda handler for creating a site
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
        const { cognitoUserId, companyId, siteName, deploymentType, buildCommand, outputDirectory, environmentVariables, customDomain, domainId } = body;

        if (!cognitoUserId || !siteName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'cognitoUserId and siteName are required'
                })
            };
        }

        // Check if site name already exists for this user
        const existingCheck = await pool.query(
            'SELECT id FROM sites WHERE cognito_user_id = $1 AND site_name = $2',
            [cognitoUserId, siteName]
        );

        if (existingCheck.rows.length > 0) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    error: 'Site name already exists for this user'
                })
            };
        }

        // Generate site URL
        const siteUrl = generateSiteUrl(siteName, cognitoUserId);

        // Generate S3 bucket name (must be globally unique)
        const bucketName = `infinify-sites-${cognitoUserId.substring(0, 8)}-${Date.now()}`;

        // Create site record
        const result = await pool.query(
            `INSERT INTO sites (
                cognito_user_id, company_id, site_name, site_url, custom_domain, domain_id,
                deployment_type, build_command, output_directory, environment_variables,
                s3_bucket_name, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                cognitoUserId,
                companyId || null,
                siteName,
                siteUrl,
                customDomain || null,
                domainId || null,
                deploymentType || 'static',
                buildCommand || null,
                outputDirectory || 'dist',
                JSON.stringify(environmentVariables || {}),
                bucketName,
                'draft'
            ]
        );

        const site = result.rows[0];

        // Parse JSON fields
        site.environment_variables = typeof site.environment_variables === 'string' 
            ? JSON.parse(site.environment_variables) 
            : site.environment_variables;
        site.metadata = typeof site.metadata === 'string' 
            ? JSON.parse(site.metadata) 
            : site.metadata;

        // Log the creation
        await pool.query(
            'INSERT INTO site_logs (site_id, action, user_id, details) VALUES ($1, $2, $3, $4)',
            [site.id, 'created', cognitoUserId, JSON.stringify({ site_name: siteName })]
        );

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                site: site
            })
        };
    } catch (error) {
        console.error('Error creating site:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to create site',
                message: error.message
            })
        };
    }
};

