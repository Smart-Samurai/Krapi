@echo off
setlocal enabledelayedexpansion

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

REM Detect package manager
set "PACKAGE_MANAGER="
where npm >nul 2>&1
if !errorlevel! equ 0 (
    set "PACKAGE_MANAGER=npm"
    echo [INFO] Using npm (default)
    goto :package_detected
)

where pnpm >nul 2>&1
if !errorlevel! equ 0 (
    set "PACKAGE_MANAGER=pnpm"
    echo [INFO] Using pnpm (npm not found)
    goto :package_detected
)

echo [ERROR] Neither npm nor pnpm found. Please install Node.js.
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

REM Default: Production mode
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
    goto :error_exit
)
echo.

REM Step 3: Build all
echo [INFO] Step 3/5: Building backend and frontend...
call :build_all
if !errorlevel! neq 0 (
    echo [ERROR] Build failed
    goto :error_exit
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
    goto :error_exit
)
echo.
echo [SUCCESS] Script completed successfully
echo.
echo Press any key to exit...
pause >nul
exit /b 0

:start_dev_mode
echo [INFO] Starting in development mode...
echo.
call :init_environment
call :install_dependencies
if !errorlevel! neq 0 (
    echo [ERROR] Installation failed
    goto :error_exit
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
    goto :error_exit
)
echo.
echo [SUCCESS] Script completed successfully
echo.
echo Press any key to exit...
pause >nul
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
pause
exit /b 0

:error_exit
echo.
echo ========================================
echo ERROR: Script failed with errors
echo ========================================
echo.
echo Press any key to exit...
pause >nul
exit /b 1

REM ============================================
REM Functions
REM ============================================

:init_environment
if not exist ".env" (
    echo [INFO] Initializing environment files...
    call %PACKAGE_MANAGER% run init-env
) else (
    call %PACKAGE_MANAGER% run init-env
)
exit /b 0

:install_dependencies
REM Check if node_modules exist - if they do, skip full install
if exist "node_modules" if exist "backend-server\node_modules" if exist "frontend-manager\node_modules" (
    echo [INFO] node_modules detected - skipping full install
    echo [INFO] Running quick dependency check instead...
    call %PACKAGE_MANAGER% install --prefer-offline --no-audit
    if !errorlevel! neq 0 (
        echo [WARNING] Quick install failed, running full install...
    ) else (
        echo [SUCCESS] Dependencies are up to date
        exit /b 0
    )
)
echo [INFO] Installing/updating dependencies...
echo [INFO] Cleaning up pnpm leftovers and corrupted node_modules...
if exist "node_modules\.pnpm" (
    echo [INFO] Removing pnpm store leftovers from root...
    rmdir /s /q "node_modules\.pnpm" 2>nul
)
if exist "backend-server\node_modules\.pnpm" (
    echo [INFO] Removing pnpm leftovers from backend-server...
    rmdir /s /q "backend-server\node_modules\.pnpm" 2>nul
)
if exist "frontend-manager\node_modules\.pnpm" (
    echo [INFO] Removing pnpm leftovers from frontend-manager...
    rmdir /s /q "frontend-manager\node_modules\.pnpm" 2>nul
)
REM Clean corrupted node_modules that might have pnpm structure
if exist "node_modules\@smartsamurai" (
    echo [INFO] Cleaning corrupted SDK installation...
    rmdir /s /q "node_modules\@smartsamurai" 2>nul
)
if exist "backend-server\node_modules\@smartsamurai" (
    rmdir /s /q "backend-server\node_modules\@smartsamurai" 2>nul
)
REM Clean corrupted package-lock.json files that might cause "Invalid Version" errors
echo [INFO] Cleaning potentially corrupted package-lock.json files...
if exist "backend-server\package-lock.json" (
    del /q "backend-server\package-lock.json" 2>nul
)
if exist "backend-server\packages\krapi-logger\package-lock.json" (
    del /q "backend-server\packages\krapi-logger\package-lock.json" 2>nul
)
if exist "backend-server\packages\krapi-error-handler\package-lock.json" (
    del /q "backend-server\packages\krapi-error-handler\package-lock.json" 2>nul
)
if exist "backend-server\packages\krapi-monitor\package-lock.json" (
    del /q "backend-server\packages\krapi-monitor\package-lock.json" 2>nul
)
echo [INFO] Installing root dependencies first...
if "%PACKAGE_MANAGER%"=="npm" (
    call %PACKAGE_MANAGER% install --legacy-peer-deps
) else (
    call %PACKAGE_MANAGER% install
)
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install root dependencies
    exit /b 1
)
echo [INFO] Installing package dependencies...
cd backend-server\packages\krapi-logger
if "%PACKAGE_MANAGER%"=="npm" (
    call %PACKAGE_MANAGER% install --legacy-peer-deps
) else (
    call %PACKAGE_MANAGER% install
)
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install krapi-logger dependencies
    cd ..\..\..
    exit /b 1
)
cd ..\krapi-error-handler
if "%PACKAGE_MANAGER%"=="npm" (
    call %PACKAGE_MANAGER% install --legacy-peer-deps
) else (
    call %PACKAGE_MANAGER% install
)
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install krapi-error-handler dependencies
    cd ..\..\..
    exit /b 1
)
cd ..\krapi-monitor
if "%PACKAGE_MANAGER%"=="npm" (
    call %PACKAGE_MANAGER% install --legacy-peer-deps
) else (
    call %PACKAGE_MANAGER% install
)
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install krapi-monitor dependencies
    cd ..\..\..
    exit /b 1
)
cd ..\..
echo [INFO] Installing backend-server dependencies...
if "%PACKAGE_MANAGER%"=="npm" (
    call %PACKAGE_MANAGER% install --legacy-peer-deps --ignore-scripts
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install backend-server dependencies
        cd ..
        exit /b 1
    )
    echo [INFO] Running postinstall scripts...
    call %PACKAGE_MANAGER% rebuild better-sqlite3 2>nul
) else (
    call %PACKAGE_MANAGER% install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install backend-server dependencies
        cd ..
        exit /b 1
    )
)
cd ..
echo [INFO] Installing frontend-manager dependencies...
cd frontend-manager
if "%PACKAGE_MANAGER%"=="npm" (
    call %PACKAGE_MANAGER% install --legacy-peer-deps
) else (
    call %PACKAGE_MANAGER% install
)
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install frontend-manager dependencies
    cd ..
    exit /b 1
)
cd ..
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
exit /b 0
