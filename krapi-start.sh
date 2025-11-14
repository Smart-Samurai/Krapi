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

# Detect package manager (prefer pnpm, fallback to npm)
NPMRC_BACKUP=""
if command -v pnpm >/dev/null 2>&1; then
    PACKAGE_MANAGER="pnpm"
    echo "[INFO] Using pnpm (preferred)"
    # Restore pnpm files if they were backed up
    if [ -f ".npmrc.pnpm" ]; then
        mv .npmrc.pnpm .npmrc 2>/dev/null || true
    fi
    if [ -f "pnpm-workspace.yaml.bak" ]; then
        mv pnpm-workspace.yaml.bak pnpm-workspace.yaml 2>/dev/null || true
    fi
elif command -v npm >/dev/null 2>&1; then
    PACKAGE_MANAGER="npm"
    echo "[INFO] Using npm (pnpm not found, npm will work but pnpm is recommended)"
    # Backup pnpm-specific files that npm can't handle
    if [ -f ".npmrc" ]; then
        mv .npmrc .npmrc.pnpm 2>/dev/null || true
        echo "[INFO] Temporarily disabled .npmrc (contains pnpm-specific configs)"
    fi
    if [ -f "pnpm-workspace.yaml" ]; then
        mv pnpm-workspace.yaml pnpm-workspace.yaml.bak 2>/dev/null || true
        echo "[INFO] Temporarily disabled pnpm-workspace.yaml (npm uses package.json workspaces)"
    fi
    # Clean node_modules and package-lock.json if they exist (may have been created by pnpm, causing conflicts)
    if [ -d "node_modules" ]; then
        echo "[INFO] Cleaning existing node_modules to avoid pnpm/npm conflicts..."
        rm -rf node_modules 2>/dev/null || true
    fi
    if [ -f "package-lock.json" ]; then
        echo "[INFO] Removing existing package-lock.json..."
        rm -f package-lock.json 2>/dev/null || true
    fi
    # Clear npm cache to avoid cached config issues
    echo "[INFO] Clearing npm cache..."
    npm cache clean --force 2>/dev/null || true
    # Check for and backup user home .npmrc if it exists (might have pnpm configs)
    if [ -f "$HOME/.npmrc" ]; then
        if ! grep -q "pnpm" "$HOME/.npmrc" 2>/dev/null; then
            echo "[INFO] Found user .npmrc, but it doesn't appear to have pnpm configs"
        else
            echo "[WARNING] Found user .npmrc with possible pnpm configs, but cannot modify user home directory"
            echo "[WARNING] If installation fails, try: mv ~/.npmrc ~/.npmrc.backup"
        fi
    fi
else
    print_error "Neither npm nor pnpm found. Please install Node.js."
    read -p "Press Enter to exit..."
    exit 1
fi

# Cleanup function to restore pnpm files on exit
cleanup_npmrc() {
    if [ "$PACKAGE_MANAGER" = "npm" ]; then
        if [ -f ".npmrc.pnpm" ]; then
            mv .npmrc.pnpm .npmrc 2>/dev/null || true
        fi
        if [ -f "pnpm-workspace.yaml.bak" ]; then
            mv pnpm-workspace.yaml.bak pnpm-workspace.yaml 2>/dev/null || true
        fi
        if [ -f "package.json.pnpm" ]; then
            mv package.json.pnpm package.json 2>/dev/null || true
        fi
    fi
}
trap cleanup_npmrc EXIT INT TERM

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
    
    # Initialize environment files
    # Always run init-env to create missing files or merge new variables from env.example
    print_status "Initializing environment files..."
    $PACKAGE_MANAGER run init-env 2>&1 || true
    
    # Install dependencies
    print_status "Installing/updating dependencies..."
    
    # For npm, ensure package.json is npm-compatible
    if [ "$PACKAGE_MANAGER" = "npm" ]; then
        if [ ! -f "package.json.npm" ]; then
            echo "[INFO] Creating npm-compatible package.json..."
            node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const workspaces = [
                'backend-server',
                'frontend-manager',
                'backend-server/packages/krapi-error-handler',
                'backend-server/packages/krapi-logger',
                'backend-server/packages/krapi-monitor',
                'mcp-server',
                'KRAPI-COMPREHENSIVE-TEST-SUITE'
            ];
            pkg.workspaces = workspaces;
            fs.writeFileSync('package.json.npm', JSON.stringify(pkg, null, 2));
            fs.writeFileSync('package.json.pnpm', JSON.stringify(pkg, null, 2));
            fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
            " 2>/dev/null || true
        else
            cp package.json package.json.pnpm 2>/dev/null || true
            cp package.json.npm package.json 2>/dev/null || true
        fi
    fi
    
    # Always run install to update dependencies (especially SDK to latest)
    if ! $PACKAGE_MANAGER install; then
        print_error "Failed to install dependencies"
        cleanup_npmrc
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
        cleanup_npmrc
        echo
        read -p "Press Enter to exit..."
        exit $EXIT_CODE
    fi
    
    # Restore .npmrc before exiting normally
    cleanup_npmrc
    read -p "Press Enter to exit..."
    exit 0
fi

# Default: Production mode
print_status "Auto-starting: Installing, building, and starting PRODUCTION mode..."
echo

# Step 0: Initialize environment files
print_status "Step 0/4: Initializing environment files..."
# Always run init-env to create missing files or merge new variables from env.example
$PACKAGE_MANAGER run init-env 2>&1 || true

# Step 1: Install dependencies
print_status "Step 1/4: Installing/updating dependencies..."

# For npm, create a temporary package.json with explicit workspace paths (npm has issues with glob patterns)
if [ "$PACKAGE_MANAGER" = "npm" ]; then
    if [ -f "package.json.npm" ]; then
        echo "[INFO] Using npm-compatible package.json..."
        cp package.json package.json.pnpm 2>/dev/null || true
        cp package.json.npm package.json 2>/dev/null || true
    else
        echo "[INFO] Creating npm-compatible package.json with explicit workspace paths..."
        # Create temporary package.json with explicit paths instead of glob
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const workspaces = [
            'backend-server',
            'frontend-manager',
            'backend-server/packages/krapi-error-handler',
            'backend-server/packages/krapi-logger',
            'backend-server/packages/krapi-monitor',
            'mcp-server',
            'KRAPI-COMPREHENSIVE-TEST-SUITE'
        ];
        pkg.workspaces = workspaces;
        fs.writeFileSync('package.json.npm', JSON.stringify(pkg, null, 2));
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        "
    fi
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
print_status "Step 2/4: Building backend and frontend..."
if ! $PACKAGE_MANAGER run build:all; then
    print_error "Build failed"
    cleanup_npmrc
    echo
    read -p "Press Enter to exit..."
    exit 1
fi
print_success "Build complete"
echo

# Step 3: Start production
print_status "Step 3/4: Starting production services..."
echo "[INFO] Backend API: http://localhost:3470"
echo "[INFO] Frontend UI: http://localhost:3498"
echo "[INFO] Database will be initialized automatically if missing"
echo "[INFO] Press Ctrl+C to stop services"
echo
if ! $PACKAGE_MANAGER run start:all; then
    EXIT_CODE=$?
    echo
    print_error "Services stopped unexpectedly with exit code $EXIT_CODE"
    cleanup_npmrc
    echo
    read -p "Press Enter to exit..."
    exit $EXIT_CODE
fi

# Restore .npmrc before exiting normally
cleanup_npmrc
read -p "Press Enter to exit..."
exit 0
