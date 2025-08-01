#!/bin/bash

echo "Starting KRAPI backend with recovery support..."

# Change to backend directory
cd /workspace/backend-server

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the project
echo "Building backend..."
npm run build

# Set environment variables for development
export NODE_ENV=development
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=krapi
export DB_USER=postgres
export DB_PASSWORD=postgres
export JWT_SECRET=your-super-secret-jwt-key-change-in-production
export PORT=3470

# Start the server
echo "Starting server on port 3470..."
echo "The server will automatically handle database issues and attempt recovery."
npm start