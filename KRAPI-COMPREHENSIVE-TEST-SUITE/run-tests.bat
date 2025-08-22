@echo off
REM KRAPI Comprehensive Test Suite Runner
REM This script runs the complete test suite with database reset

echo 🚀 KRAPI Comprehensive Test Suite
echo ==================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the KRAPI-COMPREHENSIVE-TEST-SUITE directory
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if pnpm is available
pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: pnpm is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Docker is not installed or not in PATH
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    pnpm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
    echo.
)

REM Run the comprehensive test suite
echo 🧪 Starting comprehensive test suite...
echo This will:
echo 1. Start backend and frontend services in dev mode
echo 2. Reset database with fresh container and volumes
echo 3. Run all functionality tests
echo 4. Clean up test resources
echo.

REM Run the comprehensive test runner
node run-comprehensive-tests.js

REM Check exit code
if %errorlevel% equ 0 (
    echo.
    echo 🎉 All tests passed successfully!
    pause
    exit /b 0
) else (
    echo.
    echo 💥 Some tests failed. Please check the output above.
    pause
    exit /b 1
)
