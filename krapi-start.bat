@echo off
REM KRAPI Application Manager - Non-Interactive Mode
REM Auto-installs, builds, and starts services automatically

setlocal enabledelayedexpansion

REM Check if we're in Git Bash and relaunch in cmd.exe
if defined MSYSTEM (
    if "%MSYSTEM%"=="MINGW64" (
        cmd.exe /c "%~f0" %*
        exit /b %errorlevel%
    )
    if "%MSYSTEM%"=="MINGW32" (
        cmd.exe /c "%~f0" %*
        exit /b %errorlevel%
    )
)

REM Change to script directory
cd /d "%~dp0"
if errorlevel 1 (
    echo [ERROR] Failed to change to script directory
    pause
    exit /b 1
)

REM Check for package.json
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run from KRAPI root directory.
    pause
    exit /b 1
)

REM Detect package manager - KRAPI requires pnpm (uses pnpm workspaces)
set "PACKAGE_MANAGER="
where pnpm >nul 2>&1
if !errorlevel! equ 0 (
    set "PACKAGE_MANAGER=pnpm"
    goto :package_detected
)

echo [ERROR] pnpm is required but not found. Please install pnpm:
echo [ERROR]   npm install -g pnpm
echo [ERROR]   or visit: https://pnpm.io/installation
echo.
pause
exit /b 1

:package_detected
echo ========================================
echo   KRAPI Start Script
echo   Non-Interactive Mode
echo ========================================
echo.

REM Check for flags
if "%1"=="--dev" goto :start_dev_mode
if "%1"=="--help" goto :show_help
if "%1"=="/?" goto :show_help

REM Default: Auto-build and start in PRODUCTION MODE
echo [INFO] Auto-starting: Installing, building, and starting PRODUCTION mode...
echo.

REM Step 0: Initialize environment files
echo [INFO] Step 0/5: Initializing environment files...
call :init_environment
echo.

REM Step 1: Stop running services
echo [INFO] Step 1/5: Stopping running services...
call :stop_running_services
echo.

REM Step 2: Install dependencies
echo [INFO] Step 2/5: Installing/updating dependencies...
call :install_dependencies
if !errorlevel! neq 0 (
    echo [ERROR] Dependency installation failed
    echo.
    pause
    exit /b 1
)
echo.

REM Step 3: Build all
echo [INFO] Step 3/5: Building backend and frontend...
call :build_all
if !errorlevel! neq 0 (
    echo [ERROR] Build failed
    echo.
    pause
    exit /b 1
)
echo.

REM Step 4: Start production
echo [INFO] Step 4/5: Starting production services...
echo [INFO] Backend API: http://localhost:3470
echo [INFO] Frontend UI: http://localhost:3498
echo [INFO] Database will be initialized automatically if missing
echo [INFO] Press Ctrl+C to stop services
echo.
call :start_prod
set START_EXIT_CODE=!errorlevel!
if !START_EXIT_CODE! neq 0 (
    echo.
    echo [ERROR] Services stopped unexpectedly with exit code !START_EXIT_CODE!
    pause
    exit /b !START_EXIT_CODE!
)
pause
exit /b 0

:start_dev_mode
echo [INFO] Starting in development mode...
echo.
call :init_environment
call :install_dependencies
if !errorlevel! neq 0 (
    echo [ERROR] Installation failed
    echo.
    pause
    exit /b 1
)
echo.
echo [INFO] Starting development services...
echo [INFO] Backend API: http://localhost:3470
echo [INFO] Frontend UI: http://localhost:3498
echo [INFO] Press Ctrl+C to stop services
echo.
call :start_dev
set START_EXIT_CODE=!errorlevel!
if !START_EXIT_CODE! neq 0 (
    echo.
    echo [ERROR] Services stopped unexpectedly with exit code !START_EXIT_CODE!
    pause
    exit /b !START_EXIT_CODE!
)
pause
exit /b 0

:show_help
echo.
echo KRAPI Start Script - Non-Interactive Mode
echo.
echo Usage:
echo   krapi-start.bat           Start in PRODUCTION mode (default)
echo   krapi-start.bat --dev     Start in DEVELOPMENT mode
echo   krapi-start.bat --help     Show this help
echo.
echo Default behavior:
echo   - Installs/updates dependencies (always runs)
echo   - Builds backend and frontend
echo   - Starts services in PRODUCTION mode
echo.
echo For interactive menu, use: krapi-manager-interactive.bat
echo.
pause
exit /b 0

REM ============================================
REM Functions
REM ============================================

:init_environment
REM Initialize both root .env and frontend .env.local files
REM The init-env script handles both automatically
if not exist ".env" (
    echo [INFO] Initializing environment files (root and frontend)...
    call %PACKAGE_MANAGER% run init-env
    if !errorlevel! neq 0 (
        echo [WARNING] Failed to initialize environment files, continuing anyway...
    )
) else (
    REM Always run init-env to merge new variables from env.example (for both root and frontend)
    call %PACKAGE_MANAGER% run init-env >nul 2>&1 || true
)
exit /b 0

:install_dependencies
REM Environment files are initialized before this function is called

REM Always run install to update dependencies (especially SDK to latest)
echo [INFO] Installing/updating dependencies...
call %PACKAGE_MANAGER% install
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)
echo [SUCCESS] Dependencies installed/updated
exit /b 0

:build_all
call :stop_running_services
call %PACKAGE_MANAGER% run build:all
if !errorlevel! neq 0 (
    echo [ERROR] Build failed
    exit /b 1
)
echo [SUCCESS] Build complete
exit /b 0

:start_dev
call %PACKAGE_MANAGER% run dev:all
exit /b 0

:start_prod
call %PACKAGE_MANAGER% run start:all
exit /b 0

:stop_running_services
echo [INFO] Checking for running services...
REM Port checking disabled - manual stop required
exit /b 0
