#!/bin/bash

# KRAPI Comprehensive Test Suite Runner
# This script runs the complete test suite with database reset

echo "🚀 KRAPI Comprehensive Test Suite"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the KRAPI-COMPREHENSIVE-TEST-SUITE directory"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed or not in PATH"
    exit 1
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
    echo ""
fi

# Run the comprehensive test suite
echo "🧪 Starting comprehensive test suite..."
echo "This will:"
echo "1. Start backend and frontend services in dev mode"
echo "2. Reset database with fresh container and volumes"
echo "3. Run all functionality tests"
echo "4. Clean up test resources"
echo ""

# Run the comprehensive test runner
node run-comprehensive-tests.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed successfully!"
    exit 0
else
    echo ""
    echo "💥 Some tests failed. Please check the output above."
    exit 1
fi
