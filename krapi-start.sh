#!/bin/bash

# KRAPI Start Script - Non-Interactive Mode
# Auto-installs, builds, and starts services automatically

# Don't use set -e as it can cause issues with error handling
# We'll handle errors explicitly

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Change to script directory
cd "$(dirname "$0")"

# Check for package.json
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run from KRAPI root directory."
    read -p "Press Enter to exit..."
    exit 1
fi

# Detect package manager
if command -v pnpm >/dev/null 2>&1; then
    PACKAGE_MANAGER="pnpm"
elif command -v npm >/dev/null 2>&1; then
    PACKAGE_MANAGER="npm"
else
    print_error "Neither npm nor pnpm found. Please install Node.js."
    read -p "Press Enter to exit..."
    exit 1
fi

echo "========================================"
echo "  KRAPI Start Script"
echo "  Non-Interactive Mode"
echo "========================================"
echo

# Check command line argument
MODE="${1:-prod}"

if [ "$MODE" = "--help" ] || [ "$MODE" = "-h" ]; then
    echo "Usage: $0 [MODE]"
    echo
    echo "Modes:"
    echo "  prod (default)  - Start in PRODUCTION mode"
    echo "  dev             - Start in DEVELOPMENT mode"
    echo "  --help, -h      - Show this help"
    echo
    echo "Default behavior:"
    echo "  - Installs/updates dependencies (always runs)"
    echo "  - Builds backend and frontend"
    echo "  - Starts services automatically"
    echo
    echo "For interactive menu, use: ./krapi-manager-interactive.sh"
    exit 0
fi

if [ "$MODE" = "dev" ]; then
    print_status "Starting in DEVELOPMENT mode..."
    echo
    
    # Install dependencies
    print_status "Installing/updating dependencies..."
    if [ ! -f ".env" ]; then
        $PACKAGE_MANAGER run init-env >/dev/null 2>&1 || true
    fi
    # Always run install to update dependencies (especially SDK to latest)
    if ! $PACKAGE_MANAGER install; then
        print_error "Failed to install dependencies"
        echo
        read -p "Press Enter to exit..."
        exit 1
    fi
    
    echo
    print_status "Starting development services..."
    echo "[INFO] Backend: http://localhost:3470"
    echo "[INFO] Frontend: http://localhost:3498"
    echo "[INFO] Press Ctrl+C to stop"
    echo
    if ! $PACKAGE_MANAGER run dev:all; then
        EXIT_CODE=$?
        echo
        print_error "Services stopped unexpectedly with exit code $EXIT_CODE"
        read -p "Press Enter to exit..."
        exit $EXIT_CODE
    fi
    read -p "Press Enter to exit..."
    exit 0
fi

# Default: Production mode
print_status "Auto-starting: Installing, building, and starting PRODUCTION mode..."
echo

# Step 1: Install dependencies
print_status "Step 1/3: Installing/updating dependencies..."
if [ ! -f ".env" ]; then
    $PACKAGE_MANAGER run init-env >/dev/null 2>&1 || true
fi
# Always run install to update dependencies (especially SDK to latest)
if ! $PACKAGE_MANAGER install; then
    print_error "Failed to install dependencies"
    echo
    read -p "Press Enter to exit..."
    exit 1
fi
print_success "Dependencies installed/updated"
echo

# Step 2: Build all
print_status "Step 2/3: Building backend and frontend..."
if ! $PACKAGE_MANAGER run build:all; then
    print_error "Build failed"
    echo
    read -p "Press Enter to exit..."
    exit 1
fi
print_success "Build complete"
echo

# Step 3: Start production
print_status "Step 3/3: Starting production services..."
echo "[INFO] Backend API: http://localhost:3470"
echo "[INFO] Frontend UI: http://localhost:3498"
echo "[INFO] Database will be initialized automatically if missing"
echo "[INFO] Press Ctrl+C to stop services"
echo
if ! $PACKAGE_MANAGER run start:all; then
    EXIT_CODE=$?
    echo
    print_error "Services stopped unexpectedly with exit code $EXIT_CODE"
    read -p "Press Enter to exit..."
    exit $EXIT_CODE
fi
read -p "Press Enter to exit..."
exit 0
