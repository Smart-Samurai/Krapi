@echo off
REM KRAPI Application Manager for Windows
REM A comprehensive batch script to manage the KRAPI application
REM Supports unattended install and launch mode

setlocal enabledelayedexpansion

REM Check for unattended mode
set UNATTENDED=0
if "%1"=="--unattended" set UNATTENDED=1

REM Colors (Windows 10+)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Function to print colored output
call :print_status "KRAPI Application Manager"
call :print_status "=========================="
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    call :print_error "Error: package.json not found. Please run this script from the KRAPI root directory."
    pause
    exit /b 1
)

REM Detect package manager
set PACKAGE_MANAGER=
where pnpm >nul 2>&1
if %errorlevel%==0 (
    set PACKAGE_MANAGER=pnpm
    call :print_success "Detected: pnpm (recommended)"
) else (
    where npm >nul 2>&1
    if %errorlevel%==0 (
        set PACKAGE_MANAGER=npm
        call :print_warning "Detected: npm (pnpm recommended for faster installs)"
    ) else (
        call :print_error "Error: Neither npm nor pnpm found. Please install Node.js first."
        pause
        exit /b 1
    )
)

REM Check Node.js version
call :check_node_version
if %errorlevel% neq 0 (
    call :print_error "Error: Node.js v18 or higher is required."
    pause
    exit /b 1
)

REM Check for Docker (optional)
where docker >nul 2>&1
if %errorlevel%==0 (
    call :print_success "Docker detected (optional)"
) else (
    call :print_warning "Docker not found (optional - some features may not work)"
)

REM Main menu
if "%UNATTENDED%"=="1" (
    call :unattended_install
    exit /b 0
)

:menu
echo.
call :print_status "Main Menu"
echo   1. Install dependencies and build SDK
echo   2. Start development mode
echo   3. Start production mode
echo   4. Build all packages (including SDK)
echo   5. Run health checks
echo   6. Stop services
echo   7. Exit
echo.
set /p choice="Select an option (1-7): "

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
    call :print_success "Goodbye!"
    exit /b 0
) else (
    call :print_error "Invalid option. Please try again."
    goto menu
)

REM ============================================
REM Functions
REM ============================================

:check_node_version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%a in ("!NODE_VERSION!") do set MAJOR_VERSION=%%a
set MAJOR_VERSION=%MAJOR_VERSION:v=%
if %MAJOR_VERSION% geq 18 (
    call :print_success "Node.js version: !NODE_VERSION!"
    exit /b 0
) else (
    call :print_error "Node.js version !NODE_VERSION! is too old. v18+ required."
    exit /b 1
)

:init_environment
call :print_status "Initializing environment configuration..."
if not exist ".env" (
    call %PACKAGE_MANAGER% run init-env
    if !errorlevel! neq 0 (
        call :print_error "Failed to initialize environment"
        exit /b 1
    )
    call :print_success "Environment configuration created"
) else (
    call :print_status "Environment file already exists"
)
exit /b 0

:install_dependencies
call :print_status "Installing dependencies using %PACKAGE_MANAGER%..."
call :init_environment
call %PACKAGE_MANAGER% install
if !errorlevel! neq 0 (
    call :print_error "Failed to install dependencies"
    exit /b 1
)
call :print_success "Dependencies installed successfully"
exit /b 0

:build_packages
call :print_status "Building internal packages (including SDK)..."
call %PACKAGE_MANAGER% run build:packages
if !errorlevel! neq 0 (
    call :print_error "Failed to build packages"
    exit /b 1
)
call :print_success "All packages built successfully (SDK ready)"
exit /b 0

:build_all
call :print_status "Building all packages and applications..."
call %PACKAGE_MANAGER% run build:all
if !errorlevel! neq 0 (
    call :print_error "Failed to build application"
    exit /b 1
)
call :print_success "Application built successfully"
exit /b 0

:install_and_build
call :install_dependencies
if !errorlevel! neq 0 exit /b 1
call :build_packages
if !errorlevel! neq 0 exit /b 1
call :print_success "Installation and build complete!"
exit /b 0

:start_docker
where docker >nul 2>&1
if !errorlevel!==0 (
    call :print_status "Starting Docker services..."
    call %PACKAGE_MANAGER% run docker:up
)
exit /b 0

:start_dev
call :print_status "Starting KRAPI in development mode..."
call :start_docker
call :print_success "Development mode starting..."
call :print_status "Backend API: http://localhost:3499"
call :print_status "Frontend UI: http://localhost:3498"
call :print_status "Press Ctrl+C to stop services"
echo.
call %PACKAGE_MANAGER% run dev:all
exit /b 0

:start_prod
call :print_status "Starting KRAPI in production mode..."
call :start_docker
call :print_status "Building and starting production mode..."
call :print_status "Backend API: http://localhost:3499"
call :print_status "Frontend UI: http://localhost:3498"
call :print_status "Press Ctrl+C to stop services"
echo.
call %PACKAGE_MANAGER% run start:all
exit /b 0

:health_check
call :print_status "Running comprehensive health checks..."
call %PACKAGE_MANAGER% run health
if !errorlevel! neq 0 (
    call :print_error "Health checks failed!"
    exit /b 1
)
call :print_success "All health checks passed!"
exit /b 0

:stop_services
call :print_status "Stopping services..."
REM Try to stop Docker containers
where docker >nul 2>&1
if !errorlevel!==0 (
    call %PACKAGE_MANAGER% run docker:down >nul 2>&1
)
REM Kill Node processes for this project (optional - be careful)
call :print_status "Services stopped"
exit /b 0

:unattended_install
call :print_status "Unattended installation mode..."
call :install_dependencies
if !errorlevel! neq 0 (
    call :print_error "Installation failed!"
    pause
    exit /b 1
)
call :build_packages
if !errorlevel! neq 0 (
    call :print_error "Build failed!"
    pause
    exit /b 1
)
call :print_success "Installation complete! Starting development mode..."
timeout /t 2 /nobreak >nul
call :start_dev
exit /b 0

REM ============================================
REM Print Functions
REM ============================================

:print_status
echo %BLUE%[INFO]%NC% %~1
exit /b 0

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
exit /b 0

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
exit /b 0

:print_error
echo %RED%[ERROR]%NC% %~1
exit /b 0