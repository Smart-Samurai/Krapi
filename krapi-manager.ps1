# KRAPI Application Manager - Non-Interactive Mode
# Auto-installs, builds, and starts services automatically

param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "prod", "help")]
    [string]$Mode = "prod"
)

$ErrorActionPreference = "Continue"

# Colors
function Write-Status { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Change to script directory
Set-Location $PSScriptRoot

# Check for package.json
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run from KRAPI root directory."
    exit 1
}

# Detect package manager
$PACKAGE_MANAGER = "pnpm"
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        $PACKAGE_MANAGER = "npm"
    } else {
        Write-Error "Neither npm nor pnpm found. Please install Node.js."
        exit 1
    }
}

Write-Host "========================================"
Write-Host "  KRAPI Application Manager"
Write-Host "  Non-Interactive Mode"
Write-Host "========================================"
Write-Host ""

if ($Mode -eq "help") {
    Write-Host "Usage: .\krapi-manager.ps1 [MODE]"
    Write-Host ""
    Write-Host "Modes:"
    Write-Host "  prod (default)  - Start in PRODUCTION mode"
    Write-Host "  dev             - Start in DEVELOPMENT mode"
    Write-Host "  help            - Show this help"
    Write-Host ""
    Write-Host "Default behavior:"
    Write-Host "  - Installs dependencies (if needed)"
    Write-Host "  - Builds backend and frontend"
    Write-Host "  - Starts services automatically"
    Write-Host ""
    Write-Host "For interactive menu, use: .\krapi-manager-interactive.ps1"
    exit 0
}

if ($Mode -eq "dev") {
    Write-Status "Starting in DEVELOPMENT mode..."
    Write-Host ""
    
    # Install dependencies
    Write-Status "Installing dependencies..."
    if (-not (Test-Path ".env")) {
        & $PACKAGE_MANAGER run init-env 2>&1 | Out-Null
    }
    
    # Install dependencies for packages first
    Write-Status "Installing package dependencies..."
    Set-Location "backend-server\packages\krapi-logger"
    & $PACKAGE_MANAGER install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install krapi-logger dependencies"
        Set-Location $PSScriptRoot
        exit 1
    }
    
    Set-Location "..\krapi-error-handler"
    & $PACKAGE_MANAGER install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install krapi-error-handler dependencies"
        Set-Location $PSScriptRoot
        exit 1
    }
    
    Set-Location "..\krapi-monitor"
    & $PACKAGE_MANAGER install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install krapi-monitor dependencies"
        Set-Location $PSScriptRoot
        exit 1
    }
    
    Set-Location $PSScriptRoot
    
    # Install backend-server dependencies
    Set-Location "backend-server"
    & $PACKAGE_MANAGER install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install backend-server dependencies"
        Set-Location $PSScriptRoot
        exit 1
    }
    Set-Location $PSScriptRoot
    
    # Install frontend-manager dependencies
    Set-Location "frontend-manager"
    & $PACKAGE_MANAGER install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install frontend-manager dependencies"
        Set-Location $PSScriptRoot
        exit 1
    }
    Set-Location $PSScriptRoot
    
    # Install root dependencies
    if (-not (Test-Path "node_modules")) {
        & $PACKAGE_MANAGER install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install root dependencies"
            exit 1
        }
    } else {
        Write-Status "Dependencies already installed, skipping..."
    }
    
    Write-Host ""
    Write-Status "Starting development services..."
    Write-Host "[INFO] Backend: http://localhost:3470"
    Write-Host "[INFO] Frontend: http://localhost:3498"
    Write-Host "[INFO] Press Ctrl+C to stop"
    Write-Host ""
    & $PACKAGE_MANAGER run dev:all
    exit 0
}

# Default: Production mode
Write-Status "Auto-starting: Installing, building, and starting PRODUCTION mode..."
Write-Host ""

# Step 1: Install dependencies
Write-Status "Step 1/3: Installing dependencies..."
if (-not (Test-Path ".env")) {
    & $PACKAGE_MANAGER run init-env 2>&1 | Out-Null
}

# Install dependencies for packages first
Write-Status "Installing package dependencies..."
Set-Location "backend-server\packages\krapi-logger"
& $PACKAGE_MANAGER install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install krapi-logger dependencies"
    Set-Location $PSScriptRoot
    exit 1
}

Set-Location "..\krapi-error-handler"
& $PACKAGE_MANAGER install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install krapi-error-handler dependencies"
    Set-Location $PSScriptRoot
    exit 1
}

Set-Location "..\krapi-monitor"
& $PACKAGE_MANAGER install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install krapi-monitor dependencies"
    Set-Location $PSScriptRoot
    exit 1
}

Set-Location $PSScriptRoot

# Install backend-server dependencies
Write-Status "Installing backend-server dependencies..."
Set-Location "backend-server"
& $PACKAGE_MANAGER install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install backend-server dependencies"
    Set-Location $PSScriptRoot
    exit 1
}
Set-Location $PSScriptRoot

# Install frontend-manager dependencies
Write-Status "Installing frontend-manager dependencies..."
Set-Location "frontend-manager"
& $PACKAGE_MANAGER install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install frontend-manager dependencies"
    Set-Location $PSScriptRoot
    exit 1
}
Set-Location $PSScriptRoot

# Install root dependencies
if (-not (Test-Path "node_modules")) {
    & $PACKAGE_MANAGER install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install root dependencies"
        exit 1
    }
    Write-Success "Dependencies installed"
} else {
    Write-Status "Dependencies already installed, skipping..."
}
Write-Host ""

# Step 2: Build all
Write-Status "Step 2/3: Building backend and frontend..."
& $PACKAGE_MANAGER run build:all
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}
Write-Success "Build complete"
Write-Host ""

# Step 3: Start production
Write-Status "Step 3/3: Starting production services..."
Write-Host "[INFO] Backend API: http://localhost:3470"
Write-Host "[INFO] Frontend UI: http://localhost:3498"
Write-Host "[INFO] Database will be initialized automatically if missing"
Write-Host "[INFO] Press Ctrl+C to stop services"
Write-Host ""
& $PACKAGE_MANAGER run start:all
