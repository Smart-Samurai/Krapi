#!/bin/bash

# Krapi CMS Development Startup Script
# This script starts both the API server and frontend in development mode

set -e  # Exit on any error

echo "🚀 Starting Krapi CMS Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 1
    fi
    return 0
}

# Function to start API server
start_api() {
    echo -e "${BLUE}📡 Starting API Server on port 3470...${NC}"
    cd api-server
    export PORT=3470
    export NODE_ENV=development
    npm run dev &
    API_PID=$!
    echo $API_PID > ../api.pid
    cd ..
    echo -e "${GREEN}✅ API Server started (PID: $API_PID)${NC}"
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}🎨 Starting Frontend on port 3469...${NC}"
    cd admin-frontend
    export PORT=3469
    export NEXT_PUBLIC_API_URL=http://localhost:3470/api
    export NEXT_PUBLIC_WS_URL=ws://localhost:3470/ws
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    
    if [ -f api.pid ]; then
        API_PID=$(cat api.pid)
        if kill -0 $API_PID 2>/dev/null; then
            echo -e "${BLUE}📡 Stopping API Server...${NC}"
            kill $API_PID
        fi
        rm -f api.pid
    fi
    
    if [ -f frontend.pid ]; then
        FRONTEND_PID=$(cat frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            echo -e "${BLUE}🎨 Stopping Frontend...${NC}"
            kill $FRONTEND_PID
        fi
        rm -f frontend.pid
    fi
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check dependencies
echo -e "${BLUE}🔍 Checking dependencies...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm first.${NC}"
    exit 1
fi

# Check if project directories exist
if [ ! -d "api-server" ] || [ ! -d "admin-frontend" ]; then
    echo -e "${RED}❌ Project directories not found. Run this script from the project root.${NC}"
    exit 1
fi

# Check for node_modules
echo -e "${BLUE}📦 Checking node modules...${NC}"

if [ ! -d "api-server/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing API server dependencies...${NC}"
    cd api-server && npm install && cd ..
fi

if [ ! -d "admin-frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing Frontend dependencies...${NC}"
    cd admin-frontend && npm install && cd ..
fi

# Check ports
echo -e "${BLUE}🔌 Checking ports...${NC}"

if ! check_port 3470; then
    echo -e "${RED}❌ Port 3470 is busy. Please stop the service using this port.${NC}"
    exit 1
fi

if ! check_port 3469; then
    echo -e "${RED}❌ Port 3469 is busy. Please stop the service using this port.${NC}"
    exit 1
fi

# Start services
echo -e "${GREEN}🎯 All checks passed! Starting services...${NC}"

start_api
sleep 3  # Give API server time to start

start_frontend
sleep 3  # Give frontend time to start

# Display status
echo -e "\n${GREEN}🎉 Krapi CMS is now running!${NC}"
echo -e "${BLUE}📡 API Server:${NC}     http://localhost:3470"
echo -e "${BLUE}📊 Health Check:${NC}   http://localhost:3470/api/health"
echo -e "${BLUE}🎨 Frontend:${NC}       http://localhost:3469"
echo -e "${BLUE}🔌 WebSocket:${NC}      ws://localhost:3470/ws"
echo -e "${BLUE}👤 Default Admin:${NC}  admin / admin123"
echo -e "\n${YELLOW}💡 Press Ctrl+C to stop all services${NC}"

# Wait for processes
wait