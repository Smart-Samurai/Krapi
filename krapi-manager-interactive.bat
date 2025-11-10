@echo off
REM KRAPI Application Manager - Interactive Mode
REM Menu-based interface for managing KRAPI application

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

REM Detect package manager
set "PACKAGE_MANAGER="
where pnpm >nul 2>&1
if !errorlevel! equ 0 (
    set "PACKAGE_MANAGER=pnpm"
    goto :package_detected
)

where npm >nul 2>&1
if !errorlevel! equ 0 (
    set "PACKAGE_MANAGER=npm"
    goto :package_detected
)

echo [ERROR] Neither npm nor pnpm found. Please install Node.js.
pause
exit /b 1

:package_detected
echo ========================================
echo   KRAPI Application Manager
echo   Interactive Mode
echo ========================================
echo.

:main_menu
echo.
echo Main Menu:
echo   1. Install dependencies
echo   2. Build all (backend + frontend)
echo   3. Start development mode
echo   4. Start production mode
echo   5. SDK Management
echo   6. Run health checks
echo   7. Stop services
echo   8. Exit
echo.
set /p "choice=Select an option (1-8): "

if "%choice%"=="1" (
    call :install_dependencies
    goto :main_menu
) else if "%choice%"=="2" (
    call :build_all
    goto :main_menu
) else if "%choice%"=="3" (
    call :start_dev
    goto :main_menu
) else if "%choice%"=="4" (
    call :start_prod
    goto :main_menu
) else if "%choice%"=="5" (
    call :sdk_menu
    goto :main_menu
) else if "%choice%"=="6" (
    call :health_check
    goto :main_menu
) else if "%choice%"=="7" (
    call :stop_services
    goto :main_menu
) else if "%choice%"=="8" (
    echo [SUCCESS] Goodbye!
    exit /b 0
) else (
    echo [ERROR] Invalid option. Please try again.
    goto :main_menu
)

REM ============================================
REM Functions
REM ============================================

:init_environment
if not exist ".env" (
    call %PACKAGE_MANAGER% run init-env >nul 2>&1
)
exit /b 0

:install_dependencies
echo [INFO] Installing/updating dependencies...
call :init_environment
REM Always run install to update dependencies (especially SDK to latest)
call %PACKAGE_MANAGER% install
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed/updated
exit /b 0

:build_all
echo [INFO] Building backend and frontend...
call :stop_running_services
call %PACKAGE_MANAGER% run build:all
if !errorlevel! neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [SUCCESS] Build complete
exit /b 0

:start_dev
echo [INFO] Starting development mode...
echo [INFO] Backend: http://localhost:3470
echo [INFO] Frontend: http://localhost:3498
echo [INFO] Press Ctrl+C to stop
echo.
call %PACKAGE_MANAGER% run dev:all
exit /b 0

:start_prod
echo [INFO] Starting production mode...
echo [INFO] Backend: http://localhost:3470
echo [INFO] Frontend: http://localhost:3498
echo [INFO] Press Ctrl+C to stop
echo.
call %PACKAGE_MANAGER% run start:all
exit /b 0

:sdk_menu
echo.
echo SDK Management:
echo   1. Check SDK status
echo   2. Link local SDK (for debugging)
echo   3. Unlink SDK (use npm package)
echo   4. Build SDK
echo   5. Check SDK (lint + type-check)
echo   6. Back to main menu
echo.
set /p "sdk_choice=Select option (1-6): "

if "%sdk_choice%"=="1" (
    call %PACKAGE_MANAGER% run sdk:status
    pause
    exit /b 0
) else if "%sdk_choice%"=="2" (
    echo [INFO] Linking local SDK...
    call %PACKAGE_MANAGER% run sdk:link
    echo [SUCCESS] Local SDK linked. Don't forget to build: pnpm run sdk:build
    pause
    exit /b 0
) else if "%sdk_choice%"=="3" (
    echo [INFO] Unlinking SDK (switching to npm)...
    call %PACKAGE_MANAGER% run sdk:unlink
    echo [SUCCESS] Now using npm package
    pause
    exit /b 0
) else if "%sdk_choice%"=="4" (
    echo [INFO] Building SDK...
    call %PACKAGE_MANAGER% run sdk:build
    if !errorlevel! neq 0 (
        echo [ERROR] SDK build failed
        pause
        exit /b 1
    )
    echo [SUCCESS] SDK built successfully
    pause
    exit /b 0
) else if "%sdk_choice%"=="5" (
    echo [INFO] Checking SDK...
    call %PACKAGE_MANAGER% run sdk:check
    if !errorlevel! neq 0 (
        echo [ERROR] SDK checks failed
        pause
        exit /b 1
    )
    echo [SUCCESS] SDK checks passed
    pause
    exit /b 0
) else if "%sdk_choice%"=="6" (
    exit /b 0
) else (
    echo [ERROR] Invalid option
    pause
    exit /b 1
)

:health_check
echo [INFO] Running health checks...
call %PACKAGE_MANAGER% run health
if !errorlevel! neq 0 (
    echo [ERROR] Health checks failed
    pause
    exit /b 1
)
echo [SUCCESS] All health checks passed
pause
exit /b 0

:stop_running_services
echo [INFO] Checking for running services...
REM Port checking disabled - manual stop required
echo [INFO] Please stop services manually if needed
exit /b 0

:stop_services
call :stop_running_services
pause
exit /b 0

