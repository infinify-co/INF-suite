// Lambda function: Delete Reserved Handle
// Deletes a reserved handle from DynamoDB

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.HANDLES_TABLE_NAME || 'infinify-reserved-handles';

/**
 * Lambda handler for deleting a reserved handle
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
        const handle = event.pathParameters?.handle;

        if (!handle) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'handle is required'
                })
            };
        }

        const normalizedHandle = handle.startsWith('@') 
            ? handle.toLowerCase() 
            : `@${handle.toLowerCase()}`;

        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { handle: normalizedHandle }
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Handle deleted successfully'
            })
        };

    } catch (error) {
        console.error('Error deleting handle:', error);
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

