@echo off
REM KRAPI Application Manager for Windows
REM A comprehensive batch script to manage the KRAPI application
REM Supports unattended install and launch mode

REM Enable delayed expansion immediately
setlocal enabledelayedexpansion

echo [DEBUG] Script started - Line 1
echo [DEBUG] Auto-running with 5 second delays between steps...
timeout /t 2 /nobreak >nul 2>&1

REM Check if we're in Git Bash and relaunch in cmd.exe
echo [DEBUG] Checking MSYSTEM variable...
if defined MSYSTEM (
    echo [DEBUG] MSYSTEM is defined: %MSYSTEM%
    if "%MSYSTEM%"=="MINGW64" (
        echo [INFO] Detected Git Bash. Relaunching in cmd.exe...
        cmd.exe /c "%~f0" %*
        if !errorlevel! neq 0 (
            echo [ERROR] Relaunch failed with errorlevel !errorlevel!
            echo [ERROR] Pausing for 10 seconds to review error...
            timeout /t 10 /nobreak >nul 2>&1 2>&1
        )
        exit /b !errorlevel!
    )
    if "%MSYSTEM%"=="MINGW32" (
        echo [INFO] Detected Git Bash. Relaunching in cmd.exe...
        cmd.exe /c "%~f0" %*
        if !errorlevel! neq 0 (
            echo [ERROR] Relaunch failed with errorlevel !errorlevel!
            echo [ERROR] Pausing for 10 seconds to review error...
            timeout /t 10 /nobreak >nul 2>&1 2>&1
        )
        exit /b !errorlevel!
    )
) else (
    echo [DEBUG] MSYSTEM not defined, continuing...
)

REM Change to script directory (important when double-clicking)
echo [DEBUG] About to change directory to: %~dp0
cd /d "%~dp0"
if errorlevel 1 (
    echo [ERROR] Failed to change to script directory
    echo Script location: %~dp0
    echo Current directory: %CD%
    echo [ERROR] Pausing for 10 seconds before exit...
    timeout /t 10 /nobreak >nul 2>&1
    exit /b 1
)
echo [DEBUG] Successfully changed to directory: %CD%

REM Display header
echo [DEBUG] Displaying header...
echo ========================================
echo   KRAPI Application Manager
echo ========================================
echo.

REM Check if we're in the correct directory
echo [DEBUG] Checking for package.json in: %CD%
if not exist "package.json" (
    echo [ERROR] package.json not found.
    echo.
    echo Current directory: %CD%
    echo Script directory: %~dp0
    echo.
    echo Please run this script from the KRAPI root directory.
    echo [ERROR] Pausing for 10 seconds before exit...
    timeout /t 10 /nobreak >nul 2>&1
    exit /b 1
)
echo [DEBUG] package.json found!

REM Detect package manager
echo [DEBUG] Detecting package manager...
set "PACKAGE_MANAGER="
where pnpm >nul 2>&1
if !errorlevel! equ 0 (
    set "PACKAGE_MANAGER=pnpm"
    echo [SUCCESS] Detected: pnpm (recommended)
    echo [DEBUG] PACKAGE_MANAGER set to: !PACKAGE_MANAGER!
    goto :package_detected
)

where npm >nul 2>&1
if !errorlevel! equ 0 (
    set "PACKAGE_MANAGER=npm"
    echo [WARNING] Detected: npm (pnpm recommended for faster installs)
    echo [DEBUG] PACKAGE_MANAGER set to: !PACKAGE_MANAGER!
    goto :package_detected
)

echo [ERROR] Neither npm nor pnpm found.
echo.
echo Please install Node.js from https://nodejs.org/
echo npm should come with Node.js installation.
echo [ERROR] Pausing for 10 seconds before exit...
timeout /t 10 /nobreak >nul
exit /b 1

:package_detected
echo [DEBUG] Package manager detected, continuing...

REM Check Node.js version
echo [DEBUG] Checking Node.js version...
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo Make sure to add Node.js to your system PATH during installation.
    echo [ERROR] Pausing for 10 seconds before exit...
    timeout /t 10 /nobreak >nul 2>&1
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version 2^>nul') do set "NODE_VERSION=%%i"
if "!NODE_VERSION!"=="" (
    echo [ERROR] Failed to get Node.js version
    echo Node.js may not be properly installed.
    echo [ERROR] Pausing for 10 seconds before exit...
    timeout /t 10 /nobreak >nul 2>&1
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ("!NODE_VERSION!") do set "MAJOR_VERSION=%%a"
set "MAJOR_VERSION=!MAJOR_VERSION:v=!"
if !MAJOR_VERSION! lss 18 (
    echo [ERROR] Node.js version !NODE_VERSION! is too old.
    echo Node.js v18 or higher is required.
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo [ERROR] Pausing for 10 seconds before exit...
    timeout /t 10 /nobreak >nul 2>&1
    exit /b 1
) else (
    echo [SUCCESS] Node.js version: !NODE_VERSION!
)

echo [DEBUG] Docker check removed (not needed for this project)
echo.
echo [DEBUG] Continuing to main flow in 5 seconds...
timeout /t 5 /nobreak >nul 2>&1 2>&1
echo.

REM Check for flags
if "%1"=="--menu" goto :menu
if "%1"=="--interactive" goto :menu
if "%1"=="--dev" goto :start_dev_mode
if "%1"=="--help" goto :show_help
if "%1"=="/?" goto :show_help

REM Default: Auto-build and start in PRODUCTION MODE
echo [DEBUG] Starting default production mode flow...
echo [INFO] Auto-starting: Building everything and starting PRODUCTION mode...
echo.
echo [DEBUG] Step 1/4: Stopping running services (5 second delay)...
timeout /t 5 /nobreak >nul 2>&1 2>&1
REM Stop any running services before building to avoid file locks
echo [DEBUG] About to call stop_running_services...
call :stop_running_services
if errorlevel 1 (
    echo [ERROR] stop_running_services failed with errorlevel !errorlevel!
    echo [ERROR] Pausing for 10 seconds to review error...
    timeout /t 10 /nobreak >nul 2>&1
    exit /b 1
)
echo [DEBUG] stop_running_services completed successfully
echo.
echo [DEBUG] Step 2/4: Installing dependencies (5 second delay)...
timeout /t 5 /nobreak >nul 2>&1 2>&1
echo [DEBUG] About to call install_dependencies...
call :install_dependencies
echo [DEBUG] install_dependencies completed, errorlevel=!errorlevel!
if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Dependency installation failed. Showing menu for manual options...
    echo [ERROR] Pausing for 10 seconds to review error...
    timeout /t 10 /nobreak >nul 2>&1
    goto :menu
)
echo.
echo [DEBUG] Step 3/4: Building all packages (5 second delay)...
timeout /t 5 /nobreak >nul 2>&1
echo [DEBUG] About to call build_all...
call :build_all
echo [DEBUG] build_all completed, errorlevel=!errorlevel!
if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Build failed. Showing menu for manual options...
    echo [ERROR] Pausing for 10 seconds to review error...
    timeout /t 10 /nobreak >nul 2>&1
    goto :menu
)
echo.
echo [DEBUG] Step 4/4: Starting production services (5 second delay)...
timeout /t 5 /nobreak >nul 2>&1
echo [DEBUG] About to call start_prod...
echo [INFO] Starting production services...
echo [INFO] Database will be initialized automatically if missing...
echo.
call :start_prod
echo [DEBUG] start_prod completed (should not reach here)
REM start_prod should keep running, so we shouldn't reach here
exit /b 0

:start_dev_mode
echo [INFO] Starting in development mode...
echo.
call :install_and_build
if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Build failed. Showing menu for manual options...
    echo [ERROR] Pausing for 10 seconds to review error...
    timeout /t 10 /nobreak >nul 2>&1
    goto :menu
)
echo.
echo [INFO] Starting development services...
echo.
call :start_dev
REM start_dev should keep running, so we shouldn't reach here
exit /b 0

:show_help
echo.
echo KRAPI Application Manager - Usage:
echo.
echo   krapi-manager.bat              Start in PRODUCTION mode (default)
echo   krapi-manager.bat --dev         Start in DEVELOPMENT mode
echo   krapi-manager.bat --menu        Show interactive menu
echo   krapi-manager.bat --interactive Show interactive menu
echo   krapi-manager.bat --help        Show this help message
echo.
echo Default behavior:
echo   - Installs dependencies (if needed)
echo   - Builds all packages and applications
echo   - Initializes database (if missing)
echo   - Starts services in PRODUCTION mode
echo.
echo [INFO] Closing help in 5 seconds...
timeout /t 5 /nobreak >nul 2>&1
exit /b 0

:menu
echo.
echo Main Menu:
echo   1. Install dependencies and build SDK
echo   2. Start development mode
echo   3. Start production mode
echo   4. Build all packages (including SDK)
echo   5. Run health checks
echo   6. Stop services
echo   7. Exit
echo.
set /p "choice=Select an option (1-7): "

if "%choice%"=="1" (
    call :install_and_build
    goto menu
) else if "%choice%"=="2" (
    call :start_dev
    goto menu
) else if "%choice%"=="3" (
    call :start_prod
    goto menu
) else if "%choice%"=="4" (
    call :build_all
    goto menu
) else if "%choice%"=="5" (
    call :health_check
    goto menu
) else if "%choice%"=="6" (
    call :stop_services
    goto menu
) else if "%choice%"=="7" (
    echo [SUCCESS] Goodbye!
    exit /b 0
) else (
    echo [ERROR] Invalid option. Please try again.
    goto menu
)

REM ============================================
REM Functions
REM ============================================

:init_environment
echo [INFO] Initializing environment configuration...
if not exist ".env" (
    call %PACKAGE_MANAGER% run init-env
    if !errorlevel! neq 0 (
        echo [WARNING] Environment initialization had issues, continuing anyway...
    )
) else (
    echo [INFO] Environment file already exists
)
exit /b 0

:install_dependencies
echo [INFO] Installing dependencies using %PACKAGE_MANAGER%...
call :init_environment

REM Check if node_modules exists - skip install if it does (faster startup)
if exist "node_modules" (
    echo [INFO] Dependencies already installed, skipping install...
    echo [SUCCESS] Dependencies ready
    exit /b 0
)

call %PACKAGE_MANAGER% install
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install dependencies
    echo.
    echo This might be a temporary issue. You can try running manually:
    echo   %PACKAGE_MANAGER% install
    echo.
    exit /b 1
)
echo [SUCCESS] Dependencies installed successfully
exit /b 0

:build_packages
echo [INFO] Building internal packages (including SDK)...
call %PACKAGE_MANAGER% run build:packages
if !errorlevel! neq 0 (
    echo [ERROR] Failed to build packages
    exit /b 1
)
echo [SUCCESS] All packages built successfully (SDK ready)
exit /b 0

:build_all
echo [INFO] Building all packages and applications...
REM Stop services before building to avoid better-sqlite3 file locks
call :stop_running_services
call %PACKAGE_MANAGER% run build:all
if !errorlevel! neq 0 (
    echo [ERROR] Failed to build application
    echo.
    echo [TIP] If you see better-sqlite3 rebuild errors, make sure no backend services are running.
    echo [TIP] You can stop services manually using option 6 from the menu.
    exit /b 1
)
echo [SUCCESS] Application built successfully
exit /b 0

:install_and_build
call :install_dependencies
set "INSTALL_ERROR=!errorlevel!"
call :build_packages
set "BUILD_ERROR=!errorlevel!"

if !INSTALL_ERROR! neq 0 (
    echo [WARNING] Installation had issues, but continuing with build...
)

if !BUILD_ERROR! neq 0 (
    echo [ERROR] Build failed!
    echo.
    echo You can try building manually:
    echo   %PACKAGE_MANAGER% run build:packages
    echo.
    exit /b 1
)

if !INSTALL_ERROR! equ 0 (
    echo [SUCCESS] Installation and build complete!
) else (
    echo [SUCCESS] Build complete! (Installation had warnings)
)
exit /b 0

:start_docker
REM Docker removed - this function does nothing now
echo [DEBUG] Docker startup skipped (not needed)
exit /b 0

:start_dev
echo [INFO] Starting KRAPI in DEVELOPMENT mode...
echo [SUCCESS] Development mode starting...
echo [INFO] Backend API: http://localhost:3470
echo [INFO] Frontend UI: http://localhost:3498
echo [INFO] Database will be initialized automatically if missing
echo [INFO] Press Ctrl+C to stop services
echo.
call %PACKAGE_MANAGER% run dev:all
REM dev:all builds packages and starts services, so this should keep running
exit /b 0

:start_prod
echo [INFO] Starting KRAPI in PRODUCTION mode...
echo [INFO] Production mode starting...
echo [INFO] Backend API: http://localhost:3470
echo [INFO] Frontend UI: http://localhost:3498
echo [INFO] Database will be initialized automatically if missing
echo [INFO] Press Ctrl+C to stop services
echo.
call %PACKAGE_MANAGER% run start:all
REM start:all builds everything and starts services, so this should keep running
exit /b 0

:health_check
echo [INFO] Running comprehensive health checks...
call %PACKAGE_MANAGER% run health
if !errorlevel! neq 0 (
    echo [ERROR] Health checks failed!
    exit /b 1
)
echo [SUCCESS] All health checks passed!
exit /b 0

:stop_running_services
echo [DEBUG] stop_running_services function started
echo [INFO] Checking for running services...
echo [DEBUG] Port checking temporarily disabled to avoid crashes
echo [INFO] Skipping automatic service stopping - please stop services manually if needed
echo [DEBUG] stop_running_services function ending
exit /b 0

:stop_services
call :stop_running_services
exit /b 0
