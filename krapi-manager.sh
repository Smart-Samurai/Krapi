#!/bin/bash

# KRAPI Application Manager
# A comprehensive script to manage the KRAPI application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command_exists pnpm; then
        print_error "pnpm is not installed. Please install pnpm first."
        exit 1
    fi
    
    if ! command_exists docker; then
        print_warning "Docker is not installed. Some features may not work."
    fi
    
    print_success "Prerequisites check completed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies for all packages..."
    
    # Use the unified install script from root package.json
    pnpm run install:all
    
    print_success "All dependencies installed successfully"
}

# Function to run linting checks
run_linting() {
    print_status "Running linting checks..."
    
    # Use the unified linting script from root package.json
    if ! pnpm run lint:all; then
        print_error "Linting checks failed! Please fix the issues before continuing."
        exit 1
    fi
    
    print_success "All linting checks passed"
}

# Function to run type checking
run_type_checking() {
    print_status "Running TypeScript type checks..."
    
    # Use the unified type checking script from root package.json
    if ! pnpm run type-check:all; then
        print_error "Type checking failed! Please fix the type errors before continuing."
        exit 1
    fi
    
    print_success "All type checks passed"
}

# Function to start development mode
start_dev_mode() {
    print_status "Starting KRAPI in development mode..."
    
    # Check if Docker is running
    if command_exists docker; then
        print_status "Starting Docker services..."
        pnpm run docker:up
    fi
    
    print_success "KRAPI development mode started!"
    print_status "Backend will run on http://localhost:3470"
    print_status "Frontend will run on http://localhost:3469"
    print_status "Press Ctrl+C to stop all services"
    
    # Use the unified development script from root package.json
    pnpm run dev:all
}

# Function to start production mode
start_production_mode() {
    print_status "Starting KRAPI in production mode..."
    
    # Start Docker services
    if command_exists docker; then
        print_status "Starting Docker services..."
        pnpm run docker:up
    fi
    
    print_success "KRAPI production mode started!"
    print_status "Backend will run on http://localhost:3470"
    print_status "Frontend will run on http://localhost:3469"
    print_status "Press Ctrl+C to stop all services"
    
    # Use the unified production script from root package.json (builds and starts)
    pnpm run start:all
}

# Function to show help
show_help() {
    echo "KRAPI Application Manager"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev           Start the application in development mode"
    echo "  quick-dev     Start the application in development mode (skip linting/type checks)"
    echo "  prod          Start the application in production mode"
    echo "  install       Install all dependencies"
    echo "  lint          Run linting checks"
    echo "  type-check    Run TypeScript type checks"
    echo "  health        Run comprehensive health checks (install + lint + type-check)"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev        # Start development mode"
    echo "  $0 prod       # Start production mode"
    echo "  $0 health     # Run all health checks"
}

# Function to run health checks
run_health_checks() {
    print_status "Running comprehensive health checks..."
    
    # Use the unified health check script from root package.json
    if ! pnpm run health; then
        print_error "Health checks failed! Please fix the issues before continuing."
        exit 1
    fi
    
    print_success "All health checks passed! The application is ready to run."
}

# Main script logic
main() {
    case "${1:-help}" in
        "dev")
            check_prerequisites
            install_dependencies
            run_linting
            run_type_checking
            start_dev_mode
            ;;
        "quick-dev")
            check_prerequisites
            install_dependencies
            start_dev_mode
            ;;
        "prod")
            check_prerequisites
            install_dependencies
            run_linting
            run_type_checking
            start_production_mode
            ;;
        "install")
            check_prerequisites
            install_dependencies
            ;;
        "lint")
            check_prerequisites
            run_linting
            ;;
        "type-check")
            check_prerequisites
            run_type_checking
            ;;
        "health")
            check_prerequisites
            run_health_checks
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
