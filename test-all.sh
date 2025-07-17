#!/bin/bash

# Krapi CMS - Complete Test Runner
# This script runs all tests for both frontend and backend with coverage reports

set -e  # Exit on any error

echo "🧪 Krapi CMS - Running Complete Test Suite"
echo "==========================================="
echo ""

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

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed. Please install pnpm first."
    exit 1
fi

# Initialize variables
frontend_passed=false
backend_passed=false
frontend_coverage=""
backend_coverage=""

# Function to extract coverage percentage
extract_coverage() {
    local coverage_output="$1"
    echo "$coverage_output" | grep -oE 'All files\s+\|\s+[0-9.]+' | grep -oE '[0-9.]+' || echo "N/A"
}

print_status "Starting test execution..."
echo ""

# Run Frontend Tests
echo "🎨 Frontend Tests (React + TypeScript)"
echo "======================================"
cd admin-frontend

if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    pnpm install
fi

print_status "Running frontend tests with coverage..."
if frontend_output=$(pnpm test:coverage 2>&1); then
    frontend_passed=true
    frontend_coverage=$(extract_coverage "$frontend_output")
    print_success "Frontend tests passed! Coverage: ${frontend_coverage}%"
else
    print_error "Frontend tests failed!"
    echo "$frontend_output"
fi

echo ""

# Run Backend Tests
echo "🔧 Backend Tests (Node.js + TypeScript)"
echo "======================================="
cd ../api-server

if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    pnpm install
fi

print_status "Running backend tests with coverage..."
if backend_output=$(pnpm test:coverage 2>&1); then
    backend_passed=true
    backend_coverage=$(extract_coverage "$backend_output")
    print_success "Backend tests passed! Coverage: ${backend_coverage}%"
else
    print_error "Backend tests failed!"
    echo "$backend_output"
fi

cd ..

echo ""
echo "📊 Test Summary"
echo "==============="

if [ "$frontend_passed" = true ]; then
    print_success "✅ Frontend Tests: PASSED (Coverage: ${frontend_coverage}%)"
else
    print_error "❌ Frontend Tests: FAILED"
fi

if [ "$backend_passed" = true ]; then
    print_success "✅ Backend Tests: PASSED (Coverage: ${backend_coverage}%)"
else
    print_error "❌ Backend Tests: FAILED"
fi

echo ""

# Overall result
if [ "$frontend_passed" = true ] && [ "$backend_passed" = true ]; then
    print_success "🎉 All tests passed successfully!"
    echo ""
    echo "📋 Coverage Reports:"
    echo "  Frontend: admin-frontend/coverage/lcov-report/index.html"
    echo "  Backend:  api-server/coverage/lcov-report/index.html"
    echo ""
    echo "🚀 Ready for deployment!"
    exit 0
else
    print_error "💥 Some tests failed. Please fix them before deployment."
    echo ""
    echo "🔍 Debugging Tips:"
    echo "  - Run 'cd admin-frontend && pnpm test:watch' for frontend test debugging"
    echo "  - Run 'cd api-server && pnpm test:watch' for backend test debugging"
    echo "  - Check the TESTING-GUIDE.md for detailed instructions"
    exit 1
fi 