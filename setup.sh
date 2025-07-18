#!/bin/bash

# Krapi CMS Setup Script
# This script helps you set up the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "start-manager.py" ]; then
    error "Please run this script from the Krapi CMS root directory"
    exit 1
fi

log "Setting up Krapi CMS development environment..."

# Create environment files from samples
log "Checking environment files..."

if [ ! -f "api-server/.env" ]; then
    if [ -f "api-server/.env.sample" ]; then
        cp "api-server/.env.sample" "api-server/.env"
        success "Created API server environment file from sample"
    else
        warn "API server sample environment file not found"
    fi
else
    success "API server environment file already exists"
fi

if [ ! -f "admin-frontend/.env.local" ]; then
    if [ -f "admin-frontend/.env.sample" ]; then
        cp "admin-frontend/.env.sample" "admin-frontend/.env.local"
        success "Created frontend environment file from sample"
    else
        warn "Frontend sample environment file not found"
    fi
else
    success "Frontend environment file already exists"
fi

# Install Python dependencies
log "Checking Python dependencies..."
if command -v python3 &> /dev/null; then
    if ! python3 -c "import psutil" &> /dev/null; then
        log "Installing Python dependencies..."
        pip3 install psutil
        success "Python dependencies installed"
    else
        success "Python dependencies already installed"
    fi
else
    warn "Python3 not found. Please install Python 3.x"
fi

# Install Node.js dependencies
log "Installing Node.js dependencies..."

# Check for package manager
PKG_MANAGER=""
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
else
    error "Neither pnpm nor npm found. Please install Node.js and npm."
    exit 1
fi

success "Using package manager: $PKG_MANAGER"

# Install API server dependencies
if [ -d "api-server" ]; then
    log "Installing API server dependencies..."
    cd api-server
    $PKG_MANAGER install
    cd ..
    success "API server dependencies installed"
fi

# Install frontend dependencies
if [ -d "admin-frontend" ]; then
    log "Installing frontend dependencies..."
    cd admin-frontend
    $PKG_MANAGER install
    cd ..
    success "Frontend dependencies installed"
fi

# Create logs directory
if [ ! -d "logs" ]; then
    mkdir -p logs
    success "Created logs directory"
fi

# Create data directory for database
if [ ! -d "api-server/data" ]; then
    mkdir -p api-server/data
    success "Created database directory"
fi

echo ""
success "Setup complete!"
echo ""
log "Next steps:"
echo "  1. Review and update environment files if needed:"
echo "     - api-server/.env"
echo "     - admin-frontend/.env.local"
echo ""
echo "  2. Start the development environment:"
echo "     - Run: python3 start-manager.py"
echo "     - Or use: ./start-manager.sh (Unix/Linux/Mac)"
echo "     - Or use: start-manager.bat (Windows)"
echo ""
log "For more information, see README.md"