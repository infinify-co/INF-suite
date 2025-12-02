// Lambda function: List Reserved Handles
// Retrieves all reserved handles from DynamoDB

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.HANDLES_TABLE_NAME || 'infinify-reserved-handles';

/**
 * Lambda handler for listing reserved handles
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
        const searchTerm = event.queryStringParameters?.search?.toLowerCase() || '';

        // Scan table (for small datasets) or use Query with GSI for larger datasets
        const result = await docClient.send(new ScanCommand({
            TableName: TABLE_NAME
        }));

        let handles = result.Items || [];

        // Filter by search term if provided
        if (searchTerm) {
            handles = handles.filter(handle => 
                handle.handle.toLowerCase().includes(searchTerm) ||
                handle.reservedBy.toLowerCase().includes(searchTerm)
            );
        }

        // Sort by reserved date (newest first)
        handles.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.reservedDate);
            const dateB = new Date(b.createdAt || b.reservedDate);
            return dateB - dateA;
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                data: handles,
                count: handles.length
            })
        };

    } catch (error) {
        console.error('Error listing handles:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

