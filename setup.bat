@echo off
REM Krapi CMS Setup Script for Windows
REM This script helps you set up the development environment

setlocal enabledelayedexpansion

echo [%time%] Setting up Krapi CMS development environment...

REM Check if we're in the right directory
if not exist "start-manager.py" (
    echo [ERROR] Please run this script from the Krapi CMS root directory
    pause
    exit /b 1
)

REM Create environment files from samples
echo [%time%] Checking environment files...

if not exist "api-server\.env" (
    if exist "api-server\.env.sample" (
        copy "api-server\.env.sample" "api-server\.env" >nul
        echo [SUCCESS] Created API server environment file from sample
    ) else (
        echo [WARNING] API server sample environment file not found
    )
) else (
    echo [SUCCESS] API server environment file already exists
)

if not exist "admin-frontend\.env.local" (
    if exist "admin-frontend\.env.sample" (
        copy "admin-frontend\.env.sample" "admin-frontend\.env.local" >nul
        echo [SUCCESS] Created frontend environment file from sample
    ) else (
        echo [WARNING] Frontend sample environment file not found
    )
) else (
    echo [SUCCESS] Frontend environment file already exists
)

REM Check Python dependencies
echo [%time%] Checking Python dependencies...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    python -c "import psutil" >nul 2>&1
    if !errorlevel! neq 0 (
        echo [%time%] Installing Python dependencies...
        pip install psutil
        echo [SUCCESS] Python dependencies installed
    ) else (
        echo [SUCCESS] Python dependencies already installed
    )
) else (
    python3 --version >nul 2>&1
    if !errorlevel! equ 0 (
        python3 -c "import psutil" >nul 2>&1
        if !errorlevel! neq 0 (
            echo [%time%] Installing Python dependencies...
            pip3 install psutil
            echo [SUCCESS] Python dependencies installed
        ) else (
            echo [SUCCESS] Python dependencies already installed
        )
    ) else (
        echo [WARNING] Python not found. Please install Python 3.x
    )
)

REM Install Node.js dependencies
echo [%time%] Installing Node.js dependencies...

REM Check for package manager
set PKG_MANAGER=
pnpm --version >nul 2>&1
if %errorlevel% equ 0 (
    set PKG_MANAGER=pnpm
) else (
    npm --version >nul 2>&1
    if %errorlevel% equ 0 (
        set PKG_MANAGER=npm
    ) else (
        echo [ERROR] Neither pnpm nor npm found. Please install Node.js and npm.
        pause
        exit /b 1
    )
)

echo [SUCCESS] Using package manager: %PKG_MANAGER%

REM Install API server dependencies
if exist "api-server" (
    echo [%time%] Installing API server dependencies...
    cd api-server
    %PKG_MANAGER% install
    cd ..
    echo [SUCCESS] API server dependencies installed
)

REM Install frontend dependencies
if exist "admin-frontend" (
    echo [%time%] Installing frontend dependencies...
    cd admin-frontend
    %PKG_MANAGER% install
    cd ..
    echo [SUCCESS] Frontend dependencies installed
)

REM Create logs directory
if not exist "logs" (
    mkdir logs
    echo [SUCCESS] Created logs directory
)

REM Create data directory for database
if not exist "api-server\data" (
    mkdir "api-server\data"
    echo [SUCCESS] Created database directory
)

echo.
echo [SUCCESS] Setup complete!
echo.
echo [%time%] Next steps:
echo   1. Review and update environment files if needed:
echo      - api-server\.env
echo      - admin-frontend\.env.local
echo.
echo   2. Start the development environment:
echo      - Run: python start-manager.py
echo      - Or use: start-manager.bat
echo.
echo [%time%] For more information, see README.md

pause