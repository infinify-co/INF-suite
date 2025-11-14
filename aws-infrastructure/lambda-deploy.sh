#!/bin/bash

# AWS Lambda Deployment Script
# Deploys all Lambda functions to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION=${AWS_REGION:-us-east-1}
ROLE_NAME="LambdaExecutionRole"
FUNCTIONS_DIR="../backend/lambda"

echo -e "${GREEN}Starting Lambda deployment...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

# Get Lambda execution role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$ROLE_ARN" ]; then
    echo -e "${YELLOW}Lambda execution role not found. Creating...${NC}"
    # Create IAM role for Lambda (simplified - you should customize this)
    echo -e "${YELLOW}Please create IAM role manually with Lambda execution permissions${NC}"
    exit 1
fi

# Function to deploy a Lambda function
deploy_function() {
    local FUNCTION_NAME=$1
    local FUNCTION_PATH=$2
    local HANDLER=$3
    
    echo -e "${GREEN}Deploying $FUNCTION_NAME...${NC}"
    
    # Create deployment package
    cd "$FUNCTION_PATH"
    zip -r function.zip . -x "*.git*" "*.DS_Store*" > /dev/null
    
    # Check if function exists
    if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &> /dev/null; then
        # Update existing function
        aws lambda update-function-code \
            --function-name $FUNCTION_NAME \
            --zip-file fileb://function.zip \
            --region $REGION > /dev/null
        
        echo -e "${GREEN}✓ Updated $FUNCTION_NAME${NC}"
    else
        # Create new function
        aws lambda create-function \
            --function-name $FUNCTION_NAME \
            --runtime nodejs18.x \
            --role $ROLE_ARN \
            --handler $HANDLER \
            --zip-file fileb://function.zip \
            --timeout 30 \
            --memory-size 256 \
            --region $REGION > /dev/null
        
        echo -e "${GREEN}✓ Created $FUNCTION_NAME${NC}"
    fi
    
    # Clean up
    rm function.zip
    cd - > /dev/null
}

# Deploy authentication functions
deploy_function "infinify-auth-signup" "$FUNCTIONS_DIR/auth" "signup.handler"
deploy_function "infinify-auth-signin" "$FUNCTIONS_DIR/auth" "signin.handler"
deploy_function "infinify-auth-send-otp" "$FUNCTIONS_DIR/otp" "send-otp.handler"
deploy_function "infinify-auth-verify-otp" "$FUNCTIONS_DIR/otp" "verify-otp.handler"
deploy_function "infinify-auth-refresh" "$FUNCTIONS_DIR/auth" "refresh.handler"
deploy_function "infinify-auth-signout" "$FUNCTIONS_DIR/auth" "signout.handler"

# Deploy database functions
deploy_function "infinify-db-create-table" "$FUNCTIONS_DIR/database" "create-table.handler"
deploy_function "infinify-db-list-tables" "$FUNCTIONS_DIR/database" "list-tables.handler"
deploy_function "infinify-db-query-rows" "$FUNCTIONS_DIR/database" "query-rows.handler"
deploy_function "infinify-db-insert-row" "$FUNCTIONS_DIR/database" "insert-row.handler"
deploy_function "infinify-db-update-row" "$FUNCTIONS_DIR/database" "update-row.handler"
deploy_function "infinify-db-delete-row" "$FUNCTIONS_DIR/database" "delete-row.handler"

# Deploy storage functions
deploy_function "infinify-storage-upload" "$FUNCTIONS_DIR/storage" "upload.handler"
deploy_function "infinify-storage-get-url" "$FUNCTIONS_DIR/storage" "get-url.handler"
deploy_function "infinify-storage-delete" "$FUNCTIONS_DIR/storage" "delete.handler"

echo -e "${GREEN}All Lambda functions deployed successfully!${NC}"

