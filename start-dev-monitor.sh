#!/bin/bash

# Development startup script with crash monitoring
# This script starts both frontend and backend and monitors them for crashes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="api-server"
FRONTEND_DIR="admin-frontend"
BACKEND_PORT=3470
FRONTEND_PORT=3000
MAX_RESTARTS=5
RESTART_DELAY=5

# Counters
backend_restarts=0
frontend_restarts=0

# PID storage
backend_pid=""
frontend_pid=""

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Cleanup function
cleanup() {
    log "Shutting down services..."
    
    if [ ! -z "$backend_pid" ] && kill -0 $backend_pid 2>/dev/null; then
        log "Stopping backend (PID: $backend_pid)"
        kill -TERM $backend_pid 2>/dev/null || true
        wait $backend_pid 2>/dev/null || true
    fi
    
    if [ ! -z "$frontend_pid" ] && kill -0 $frontend_pid 2>/dev/null; then
        log "Stopping frontend (PID: $frontend_pid)"
        kill -TERM $frontend_pid 2>/dev/null || true
        wait $frontend_pid 2>/dev/null || true
    fi
    
    # Kill any remaining processes on our ports
    pkill -f "node.*3470" 2>/dev/null || true
    pkill -f "next.*3000" 2>/dev/null || true
    
    success "Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if ports are already in use
check_port() {
    local port=$1
    local service=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        error "$service port $port is already in use"
        echo "Processes using port $port:"
        lsof -i :$port
        echo ""
        echo "Please stop these processes before running this script."
        exit 1
    fi
}

# Install dependencies if needed
install_deps() {
    local dir=$1
    local service=$2
    
    if [ ! -d "$dir/node_modules" ] || [ "$dir/package.json" -nt "$dir/node_modules" ]; then
        log "Installing $service dependencies..."
        cd $dir
        if command -v pnpm >/dev/null 2>&1; then
            pnpm install
        else
            npm install
        fi
        cd ..
        success "$service dependencies installed"
    fi
}

# Start backend service
start_backend() {
    if [ $backend_restarts -ge $MAX_RESTARTS ]; then
        error "Backend has crashed $MAX_RESTARTS times. Not restarting."
        return 1
    fi
    
    log "Starting backend service (attempt $((backend_restarts + 1)))..."
    
    cd $BACKEND_DIR
    
    # Start with proper error handling
    if command -v pnpm >/dev/null 2>&1; then
        pnpm run dev > ../backend.log 2>&1 &
    else
        npm run dev > ../backend.log 2>&1 &
    fi
    
    backend_pid=$!
    cd ..
    
    # Wait a moment to see if it starts successfully
    sleep 3
    
    if kill -0 $backend_pid 2>/dev/null; then
        success "Backend started successfully (PID: $backend_pid)"
        backend_restarts=$((backend_restarts + 1))
        return 0
    else
        error "Backend failed to start"
        cat backend.log | tail -20
        return 1
    fi
}

# Start frontend service
start_frontend() {
    if [ $frontend_restarts -ge $MAX_RESTARTS ]; then
        error "Frontend has crashed $MAX_RESTARTS times. Not restarting."
        return 1
    fi
    
    log "Starting frontend service (attempt $((frontend_restarts + 1)))..."
    
    cd $FRONTEND_DIR
    
    # Start with proper error handling
    if command -v pnpm >/dev/null 2>&1; then
        pnpm run dev > ../frontend.log 2>&1 &
    else
        npm run dev > ../frontend.log 2>&1 &
    fi
    
    frontend_pid=$!
    cd ..
    
    # Wait a moment to see if it starts successfully
    sleep 5
    
    if kill -0 $frontend_pid 2>/dev/null; then
        success "Frontend started successfully (PID: $frontend_pid)"
        frontend_restarts=$((frontend_restarts + 1))
        return 0
    else
        error "Frontend failed to start"
        cat frontend.log | tail -20
        return 1
    fi
}

# Monitor processes
monitor_services() {
    while true; do
        # Check backend
        if [ ! -z "$backend_pid" ] && ! kill -0 $backend_pid 2>/dev/null; then
            error "Backend process died (PID: $backend_pid)"
            cat backend.log | tail -10
            
            if [ $backend_restarts -lt $MAX_RESTARTS ]; then
                warn "Restarting backend in $RESTART_DELAY seconds..."
                sleep $RESTART_DELAY
                start_backend
            fi
        fi
        
        # Check frontend
        if [ ! -z "$frontend_pid" ] && ! kill -0 $frontend_pid 2>/dev/null; then
            error "Frontend process died (PID: $frontend_pid)"
            cat frontend.log | tail -10
            
            if [ $frontend_restarts -lt $MAX_RESTARTS ]; then
                warn "Restarting frontend in $RESTART_DELAY seconds..."
                sleep $RESTART_DELAY
                start_frontend
            fi
        fi
        
        sleep 10
    done
}

# Main execution
main() {
    log "🚀 Starting development environment with crash monitoring"
    
    # Check prerequisites
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check if directories exist
    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory '$BACKEND_DIR' not found"
        exit 1
    fi
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        error "Frontend directory '$FRONTEND_DIR' not found"
        exit 1
    fi
    
    # Check ports
    check_port $BACKEND_PORT "Backend"
    check_port $FRONTEND_PORT "Frontend"
    
    # Install dependencies
    install_deps $BACKEND_DIR "backend"
    install_deps $FRONTEND_DIR "frontend"
    
    # Create log files
    touch backend.log frontend.log
    
    # Start services
    start_backend || exit 1
    start_frontend || exit 1
    
    # Display information
    echo ""
    success "🎉 Development environment started successfully!"
    echo ""
    echo "📊 Backend API: http://localhost:$BACKEND_PORT"
    echo "🌐 Frontend:    http://localhost:$FRONTEND_PORT"
    echo "🔌 WebSocket:   ws://localhost:$BACKEND_PORT/ws"
    echo ""
    echo "📋 Logs:"
    echo "   Backend:  tail -f backend.log"
    echo "   Frontend: tail -f frontend.log"
    echo ""
    echo "🔄 Auto-restart: Enabled (max $MAX_RESTARTS restarts per service)"
    echo "⚠️  Press Ctrl+C to stop all services"
    echo ""
    
    # Start monitoring
    monitor_services
}

# Run main function
main