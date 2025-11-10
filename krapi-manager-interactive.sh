#!/bin/bash

# KRAPI Application Manager - Interactive Mode
# Menu-based interface for managing KRAPI application

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    exit 1
fi

# Detect package manager
if command -v pnpm >/dev/null 2>&1; then
    PACKAGE_MANAGER="pnpm"
elif command -v npm >/dev/null 2>&1; then
    PACKAGE_MANAGER="npm"
else
    print_error "Neither npm nor pnpm found. Please install Node.js."
    exit 1
fi

echo "========================================"
echo "  KRAPI Application Manager"
echo "  Interactive Mode"
echo "========================================"
echo

show_main_menu() {
    echo
    echo "Main Menu:"
    echo "  1. Install dependencies"
    echo "  2. Build all (backend + frontend)"
    echo "  3. Start development mode"
    echo "  4. Start production mode"
    echo "  5. SDK Management"
    echo "  6. Run health checks"
    echo "  7. Stop services"
    echo "  8. Exit"
    echo
}

show_sdk_menu() {
    echo
    echo "SDK Management:"
    echo "  1. Check SDK status"
    echo "  2. Link local SDK (for debugging)"
    echo "  3. Unlink SDK (use npm package)"
    echo "  4. Build SDK"
    echo "  5. Check SDK (lint + type-check)"
    echo "  6. Back to main menu"
    echo
}

install_dependencies() {
    print_status "Installing dependencies..."
    if [ ! -f ".env" ]; then
        $PACKAGE_MANAGER run init-env >/dev/null 2>&1 || true
    fi
    $PACKAGE_MANAGER install
    print_success "Dependencies installed"
}

build_all() {
    print_status "Building backend and frontend..."
    $PACKAGE_MANAGER run build:all
    print_success "Build complete"
}

start_dev() {
    print_status "Starting development mode..."
    echo "[INFO] Backend: http://localhost:3470"
    echo "[INFO] Frontend: http://localhost:3498"
    echo "[INFO] Press Ctrl+C to stop"
    echo
    $PACKAGE_MANAGER run dev:all
}

start_prod() {
    print_status "Starting production mode..."
    echo "[INFO] Backend: http://localhost:3470"
    echo "[INFO] Frontend: http://localhost:3498"
    echo "[INFO] Press Ctrl+C to stop"
    echo
    $PACKAGE_MANAGER run start:all
}

sdk_status() {
    $PACKAGE_MANAGER run sdk:status
}

sdk_link() {
    print_status "Linking local SDK..."
    $PACKAGE_MANAGER run sdk:link
    print_success "Local SDK linked. Don't forget to build: pnpm run sdk:build"
}

sdk_unlink() {
    print_status "Unlinking SDK (switching to npm)..."
    $PACKAGE_MANAGER run sdk:unlink
    print_success "Now using npm package"
}

sdk_build() {
    print_status "Building SDK..."
    $PACKAGE_MANAGER run sdk:build
    print_success "SDK built successfully"
}

sdk_check() {
    print_status "Checking SDK..."
    $PACKAGE_MANAGER run sdk:check
    print_success "SDK checks passed"
}

health_check() {
    print_status "Running health checks..."
    $PACKAGE_MANAGER run health
    print_success "All health checks passed"
}

stop_services() {
    print_status "Checking for running services..."
    print_status "Please stop services manually if needed"
}

# Main loop
while true; do
    show_main_menu
    read -p "Select an option (1-8): " choice
    
    case $choice in
        1)
            install_dependencies
            read -p "Press Enter to continue..."
            ;;
        2)
            build_all
            read -p "Press Enter to continue..."
            ;;
        3)
            start_dev
            ;;
        4)
            start_prod
            ;;
        5)
            show_sdk_menu
            read -p "Select option (1-6): " sdk_choice
            case $sdk_choice in
                1) sdk_status; read -p "Press Enter to continue..."; ;;
                2) sdk_link; read -p "Press Enter to continue..."; ;;
                3) sdk_unlink; read -p "Press Enter to continue..."; ;;
                4) sdk_build; read -p "Press Enter to continue..."; ;;
                5) sdk_check; read -p "Press Enter to continue..."; ;;
                6) continue; ;;
                *) print_error "Invalid option"; read -p "Press Enter to continue..."; ;;
            esac
            ;;
        6)
            health_check
            read -p "Press Enter to continue..."
            ;;
        7)
            stop_services
            read -p "Press Enter to continue..."
            ;;
        8)
            print_success "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option. Please try again."
            read -p "Press Enter to continue..."
            ;;
    esac
done

