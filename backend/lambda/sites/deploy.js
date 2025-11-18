// Lambda function: Deploy Site
// Handles site deployment to S3 and CloudFront

const pool = require('../../config/database-config');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { CloudFrontClient, CreateDistributionCommand, GetDistributionCommand } = require('@aws-sdk/client-cloudfront');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const cloudfrontClient = new CloudFrontClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Lambda handler for deploying a site
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
        const siteId = event.pathParameters?.siteId;
        const body = JSON.parse(event.body || '{}');
        const { cognitoUserId, files } = body; // files is array of {path, content, contentType}

        if (!siteId || !cognitoUserId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'siteId and cognitoUserId are required'
                })
            };
        }

        // Get site
        const siteResult = await pool.query(
            'SELECT * FROM sites WHERE id = $1 AND cognito_user_id = $2',
            [siteId, cognitoUserId]
        );

        if (siteResult.rows.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Site not found'
                })
            };
        }

        const site = siteResult.rows[0];

        // Create deployment record
        const deploymentResult = await pool.query(
            `INSERT INTO site_deployments (
                site_id, deployment_version, status, s3_bucket_name, s3_deployment_path
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                siteId,
                site.deployment_version + 1,
                'uploading',
                site.s3_bucket_name,
                site.s3_deployment_path || ''
            ]
        );

        const deployment = deploymentResult.rows[0];

        // Update site status
        await pool.query(
            'UPDATE sites SET status = $1, deployment_version = $2 WHERE id = $3',
            ['deploying', deployment.deployment_version, siteId]
        );

        let uploadedFiles = [];
        let totalSize = 0;

        try {
            // Upload files to S3
            if (files && Array.isArray(files) && files.length > 0) {
                for (const file of files) {
                    const s3Key = file.path.startsWith('/') ? file.path.substring(1) : file.path;
                    
                    // Convert base64 content if needed
                    let content = file.content;
                    if (file.contentEncoding === 'base64') {
                        content = Buffer.from(file.content, 'base64');
                    }

                    const putCommand = new PutObjectCommand({
                        Bucket: site.s3_bucket_name,
                        Key: s3Key,
                        Body: content,
                        ContentType: file.contentType || 'text/html',
                        CacheControl: file.cacheControl || 'public, max-age=31536000'
                    });

                    await s3Client.send(putCommand);

                    // Record file
                    const fileSize = Buffer.byteLength(content);
                    totalSize += fileSize;

                    const fileResult = await pool.query(
                        `INSERT INTO site_files (
                            site_id, deployment_id, file_path, s3_key, file_size_bytes, content_type
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING *`,
                        [siteId, deployment.id, file.path, s3Key, fileSize, file.contentType || 'text/html']
                    );

                    uploadedFiles.push(fileResult.rows[0]);
                }
            }

            // Update deployment with file count and size
            await pool.query(
                'UPDATE site_deployments SET file_count = $1, total_size_bytes = $2, status = $3, completed_at = CURRENT_TIMESTAMP WHERE id = $4',
                [uploadedFiles.length, totalSize, 'success', deployment.id]
            );

            // Update site status and last deployed time
            await pool.query(
                'UPDATE sites SET status = $1, last_deployed_at = CURRENT_TIMESTAMP, last_deployment_status = $2 WHERE id = $3',
                ['live', 'success', siteId]
            );

            // Log the deployment
            await pool.query(
                'INSERT INTO site_logs (site_id, action, user_id, details) VALUES ($1, $2, $3, $4)',
                [siteId, 'deployed', cognitoUserId, JSON.stringify({ 
                    deployment_version: deployment.deployment_version,
                    file_count: uploadedFiles.length,
                    total_size: totalSize
                })]
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    deployment: {
                        ...deployment,
                        file_count: uploadedFiles.length,
                        total_size_bytes: totalSize
                    },
                    message: 'Site deployed successfully'
                })
            };
        } catch (deployError) {
            // Update deployment status to failed
            await pool.query(
                'UPDATE site_deployments SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP WHERE id = $3',
                ['failed', deployError.message, deployment.id]
            );

            // Update site status
            await pool.query(
                'UPDATE sites SET status = $1, last_deployment_status = $2 WHERE id = $3',
                ['failed', 'failed', siteId]
            );

            throw deployError;
        }
    } catch (error) {
        console.error('Error deploying site:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to deploy site',
                message: error.message
            })
        };
    }
};

