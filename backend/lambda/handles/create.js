// Lambda function: Create Reserved Handle
// Saves a new reserved handle to DynamoDB

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.HANDLES_TABLE_NAME || 'infinify-reserved-handles';

/**
 * Lambda handler for creating a reserved handle
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
        const { handle, reservedBy } = body;

        // Validation
        if (!handle || !reservedBy) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'handle and reservedBy are required'
                })
            };
        }

        // Normalize handle (ensure @ prefix, lowercase)
        const normalizedHandle = handle.startsWith('@') 
            ? handle.toLowerCase() 
            : `@${handle.toLowerCase()}`;

        // Check if handle already exists
        const { DynamoDBClient: CheckClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient: CheckDocClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
        const checkClient = CheckDocClient.from(new CheckClient({ region: process.env.AWS_REGION || 'us-east-1' }));

        const existing = await checkClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { handle: normalizedHandle }
        }));

        if (existing.Item) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    error: `Handle ${normalizedHandle} is already reserved`
                })
            };
        }

        // Create new handle record
        const now = new Date().toISOString();
        const handleData = {
            handle: normalizedHandle,
            reservedBy: reservedBy,
            reservedDate: new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            status: 'reserved',
            expires: 'Never',
            createdAt: now,
            updatedAt: now,
            // TTL for DynamoDB (optional - set to never expire)
            ttl: null
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: handleData,
            ConditionExpression: 'attribute_not_exists(handle)' // Prevent overwrites
        }));

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Handle reserved successfully',
                data: handleData
            })
        };

    } catch (error) {
        console.error('Error creating handle:', error);
        
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    error: 'Handle already exists'
                })
            };
        }

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

