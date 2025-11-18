// Lambda function: Delete Site
// Deletes a site and all associated data

const pool = require('../../config/database-config');
const { S3Client, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Lambda handler for deleting a site
 */
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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

        if (!siteId || !cognitoUserId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'siteId and cognitoUserId are required'
                })
            };
        }

        // Get site info before deletion
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

        // Delete S3 bucket contents if bucket exists
        if (site.s3_bucket_name) {
            try {
                // List all objects in bucket
                const listCommand = new ListObjectsV2Command({
                    Bucket: site.s3_bucket_name
                });
                const listResult = await s3Client.send(listCommand);

                if (listResult.Contents && listResult.Contents.length > 0) {
                    // Delete all objects
                    const deleteCommand = new DeleteObjectsCommand({
                        Bucket: site.s3_bucket_name,
                        Delete: {
                            Objects: listResult.Contents.map(obj => ({ Key: obj.Key }))
                        }
                    });
                    await s3Client.send(deleteCommand);
                }

                // Delete bucket (Note: bucket must be empty)
                // In production, you might want to keep the bucket or handle this differently
                // await s3Client.send(new DeleteBucketCommand({ Bucket: site.s3_bucket_name }));
            } catch (s3Error) {
                console.error('Error cleaning up S3 bucket:', s3Error);
                // Continue with deletion even if S3 cleanup fails
            }
        }

        // Delete site (cascade will handle related records)
        await pool.query('DELETE FROM sites WHERE id = $1', [siteId]);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Site deleted successfully'
            })
        };
    } catch (error) {
        console.error('Error deleting site:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to delete site',
                message: error.message
            })
        };
    }
};

