#!/bin/bash
# KRAPI Backend Development Startup Script
# This script loads environment variables from .env file if it exists
# Otherwise uses secure defaults for development

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "No .env file found. Using development defaults..."
    echo "⚠️  WARNING: Using default development values. Create .env file for production!"
    
    # Development defaults - CHANGE THESE FOR PRODUCTION
    export DB_HOST=localhost
    export DB_PORT=5435
    export DB_NAME=krapi
    export DB_USER=postgres
    export DB_PASSWORD=postgres
    export JWT_SECRET=dev-jwt-secret-change-in-production
    export JWT_EXPIRES_IN=7d
    export SESSION_EXPIRES_IN=1h
    export DEFAULT_ADMIN_USERNAME=admin
    export DEFAULT_ADMIN_PASSWORD=admin123
    export DEFAULT_ADMIN_EMAIL=admin@localhost
    export PORT=3470
    export HOST=localhost
    export NODE_ENV=development
fi

echo "Starting KRAPI Backend..."
pnpm run dev
