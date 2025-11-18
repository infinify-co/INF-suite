# Lambda function for Codex chat/completion (Python version)
import json
import os
import boto3
import psycopg2
from openai import OpenAI
from botocore.exceptions import ClientError

# Initialize AWS clients
secrets_manager = boto3.client('secretsmanager', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

def get_openai_api_key():
    """Get OpenAI API key from environment variable or AWS Secrets Manager"""
    # Try environment variable first (for local development)
    if os.environ.get('OPENAI_API_KEY'):
        return os.environ.get('OPENAI_API_KEY')
    
    # Try AWS Secrets Manager (for production)
    secret_name = os.environ.get('OPENAI_SECRET_NAME')
    if secret_name:
        try:
            response = secrets_manager.get_secret_value(SecretId=secret_name)
            secret = json.loads(response['SecretString'])
            return secret.get('OPENAI_API_KEY') or secret.get('openai_api_key')
        except ClientError as e:
            print(f'Error retrieving OpenAI API key from Secrets Manager: {e}')
            raise Exception('Failed to retrieve OpenAI API key')
    
    raise Exception('OpenAI API key not configured. Set OPENAI_API_KEY environment variable or configure AWS Secrets Manager.')

def get_database_connection():
    """Get PostgreSQL database connection"""
    try:
        # Get database credentials from environment or Secrets Manager
        db_host = os.environ.get('DB_HOST')
        db_name = os.environ.get('DB_NAME')
        db_user = os.environ.get('DB_USER')
        
        # Get password from Secrets Manager if specified
        db_password = None
        db_password_secret = os.environ.get('DB_PASSWORD_SECRET')
        if db_password_secret:
            try:
                response = secrets_manager.get_secret_value(SecretId=db_password_secret)
                secret = json.loads(response['SecretString'])
                db_password = secret.get('password') or secret.get('DB_PASSWORD')
            except ClientError as e:
                print(f'Error retrieving DB password: {e}')
        else:
            db_password = os.environ.get('DB_PASSWORD')
        
        if not all([db_host, db_name, db_user, db_password]):
            raise Exception('Database credentials not fully configured')
        
        conn = psycopg2.connect(
            host=db_host,
            database=db_name,
            user=db_user,
            password=db_password
        )
        return conn
    except Exception as e:
        print(f'Database connection error: {e}')
        return None

def lambda_handler(event, context):
    """Lambda handler for Codex chat requests"""
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({})
        }
    
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event.get('body', '{}'))
        else:
            body = event.get('body', {})
        
        message = body.get('message', '')
        code = body.get('code', '')
        language = body.get('language', '')
        task = body.get('task', 'chat')
        context = body.get('context', '')
        cognito_user_id = body.get('cognitoUserId', '')
        
        if not cognito_user_id:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Get OpenAI API key and initialize client
        api_key = get_openai_api_key()
        client = OpenAI(api_key=api_key)
        
        # Build the prompt based on task type
        system_prompt = 'You are Codex, an AI coding assistant. Help users with code generation, explanation, refactoring, bug fixing, and documentation.'
        user_prompt = ''
        
        if task == 'generate':
            system_prompt = 'You are Codex, an expert code generator. Generate clean, well-documented code based on user requirements.'
            user_prompt = f"Generate {language or 'code'} for: {message}\n{code if code else ''}"
        elif task == 'explain':
            system_prompt = 'You are Codex, an expert code explainer. Explain code clearly and comprehensively.'
            user_prompt = f"Explain this code:\n\n{code}\n\n{message if message else 'Explain what this code does, how it works, and any important details.'}"
        elif task == 'refactor':
            system_prompt = 'You are Codex, an expert code refactoring assistant. Improve code quality, readability, and maintainability.'
            user_prompt = f"Refactor this {language or 'code'}:\n\n{code}\n\n{message if message else 'Refactor this code to follow best practices and improve quality.'}"
        elif task == 'debug':
            system_prompt = 'You are Codex, an expert debugging assistant. Identify bugs and suggest fixes.'
            user_prompt = f"Debug this {language or 'code'}:\n\n{code}\n\n{message if message else 'Find and fix any bugs in this code.'}"
        elif task == 'translate':
            system_prompt = 'You are Codex, an expert code translator. Convert code between programming languages accurately.'
            user_prompt = f"Translate this code to {message or 'the requested language'}:\n\n{code}"
        elif task == 'document':
            system_prompt = 'You are Codex, an expert documentation generator. Create comprehensive code documentation.'
            user_prompt = f"Generate documentation for this {language or 'code'}:\n\n{code}\n\n{message if message else 'Generate comprehensive documentation including comments and docstrings.'}"
        else:
            # General chat
            user_prompt = message or ''
            if code:
                user_prompt += f"\n\nCode context:\n{code}"
        
        # Call OpenAI API
        completion = client.chat.completions.create(
            model='gpt-4-turbo-preview',  # or 'gpt-3.5-turbo' for faster/cheaper
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        response_text = completion.choices[0].message.content
        usage = {
            'prompt_tokens': completion.usage.prompt_tokens,
            'completion_tokens': completion.usage.completion_tokens,
            'total_tokens': completion.usage.total_tokens
        }
        
        # Optionally save conversation to database
        try:
            conn = get_database_connection()
            if conn:
                cursor = conn.cursor()
                cursor.execute(
                    """INSERT INTO codex_conversations 
                       (cognito_user_id, task, language, user_input, ai_response, created_at)
                       VALUES (%s, %s, %s, %s, %s, NOW())""",
                    [cognito_user_id, task or 'chat', language or None, user_prompt, response_text]
                )
                conn.commit()
                cursor.close()
                conn.close()
        except Exception as db_error:
            print(f'Error saving conversation: {db_error}')
            # Don't fail the request if DB save fails
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'response': response_text,
                'usage': usage
            })
        }
    
    except Exception as error:
        print(f'Codex error: {error}')
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': str(error) or 'Failed to process Codex request'
            })
        }

