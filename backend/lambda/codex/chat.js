// Lambda function for Codex chat/completion
const { getOpenAIClient } = require('../../config/openai-config');
const { getDatabaseConnection } = require('../../config/database-config');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({})
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { 
            message, 
            code, 
            language, 
            task, 
            context,
            cognitoUserId 
        } = body;

        if (!cognitoUserId) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        // Get OpenAI client
        const openai = await getOpenAIClient();

        // Build the prompt based on task type
        let systemPrompt = 'You are Codex, an AI coding assistant. Help users with code generation, explanation, refactoring, bug fixing, and documentation.';
        let userPrompt = '';

        if (task === 'generate') {
            systemPrompt = 'You are Codex, an expert code generator. Generate clean, well-documented code based on user requirements.';
            userPrompt = `Generate ${language || 'code'} for: ${message}\n${code ? `\nContext:\n${code}` : ''}`;
        } else if (task === 'explain') {
            systemPrompt = 'You are Codex, an expert code explainer. Explain code clearly and comprehensively.';
            userPrompt = `Explain this code:\n\n${code}\n\n${message ? `User question: ${message}` : 'Explain what this code does, how it works, and any important details.'}`;
        } else if (task === 'refactor') {
            systemPrompt = 'You are Codex, an expert code refactoring assistant. Improve code quality, readability, and maintainability.';
            userPrompt = `Refactor this ${language || 'code'}:\n\n${code}\n\n${message ? `Requirements: ${message}` : 'Refactor this code to follow best practices and improve quality.'}`;
        } else if (task === 'debug') {
            systemPrompt = 'You are Codex, an expert debugging assistant. Identify bugs and suggest fixes.';
            userPrompt = `Debug this ${language || 'code'}:\n\n${code}\n\n${message ? `Issue: ${message}` : 'Find and fix any bugs in this code.'}`;
        } else if (task === 'translate') {
            systemPrompt = 'You are Codex, an expert code translator. Convert code between programming languages accurately.';
            userPrompt = `Translate this code to ${message || 'the requested language'}:\n\n${code}`;
        } else if (task === 'document') {
            systemPrompt = 'You are Codex, an expert documentation generator. Create comprehensive code documentation.';
            userPrompt = `Generate documentation for this ${language || 'code'}:\n\n${code}\n\n${message ? `Requirements: ${message}` : 'Generate comprehensive documentation including comments and docstrings.'}`;
        } else {
            // General chat
            userPrompt = message || '';
            if (code) {
                userPrompt += `\n\nCode context:\n${code}`;
            }
        }

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview', // or 'gpt-3.5-turbo' for faster/cheaper
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        const response = completion.choices[0].message.content;

        // Optionally save conversation to database
        try {
            const db = await getDatabaseConnection();
            await db.query(
                `INSERT INTO codex_conversations (cognito_user_id, task, language, user_input, ai_response, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [cognitoUserId, task || 'chat', language || null, userPrompt, response]
            );
        } catch (dbError) {
            console.error('Error saving conversation:', dbError);
            // Don't fail the request if DB save fails
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                response: response,
                usage: completion.usage
            })
        };

    } catch (error) {
        console.error('Codex error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Failed to process Codex request'
            })
        };
    }
};

