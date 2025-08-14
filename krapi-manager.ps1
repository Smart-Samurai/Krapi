# KRAPI Application Manager
# A comprehensive PowerShell script to manage the KRAPI application

param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "prod", "install", "lint", "type-check", "health", "help")]
    [string]$Command = "help"
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# Function to check if command exists
function Test-Command {
    param([string]$CommandName)
    try {
        Get-Command $CommandName -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    if (-not (Test-Command "node")) {
        Write-Error "Node.js is not installed. Please install Node.js first."
        exit 1
    }
    
    if (-not (Test-Command "pnpm")) {
        Write-Error "pnpm is not installed. Please install pnpm first."
        exit 1
    }
    
    if (-not (Test-Command "docker")) {
        Write-Warning "Docker is not installed. Some features may not work."
    }
    
    Write-Success "Prerequisites check completed"
}

# Function to install dependencies
function Install-Dependencies {
    Write-Status "Installing dependencies for all packages..."
    
    # Use the unified install script from root package.json
    pnpm run install:all
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
    
    Write-Success "All dependencies installed successfully"
}

# Function to run linting checks
function Test-Linting {
    Write-Status "Running linting checks..."
    
    # Use the unified linting script from root package.json
    pnpm run lint:all
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Linting checks failed! Please fix the issues before continuing."
        exit 1
    }
    
    Write-Success "All linting checks passed"
}

# Function to run type checking
function Test-TypeChecking {
    Write-Status "Running TypeScript type checks..."
    
    # Use the unified type checking script from root package.json
    pnpm run type-check:all
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Type checking failed! Please fix the type errors before continuing."
        exit 1
    }
    
    Write-Success "All type checks passed"
}

# Function to start development mode
function Start-DevMode {
    Write-Status "Starting KRAPI in development mode..."
    
    # Check if Docker is running
    if (Test-Command "docker") {
        Write-Status "Starting Docker services..."
        pnpm run docker:up
    }
    
    Write-Success "KRAPI development mode started!"
    Write-Status "Backend will run on http://localhost:3470"
    Write-Status "Frontend will run on http://localhost:3469"
    Write-Status "Press Ctrl+C to stop all services"
    
    # Use the unified development script from root package.json
    pnpm run dev:all
}

# Function to start production mode
function Start-ProductionMode {
    Write-Status "Starting KRAPI in production mode..."
    
    # Start Docker services
    if (Test-Command "docker") {
        Write-Status "Starting Docker services..."
        pnpm run docker:up
    }
    
    Write-Success "KRAPI production mode started!"
    Write-Status "Backend will run on http://localhost:3470"
    Write-Status "Frontend will run on http://localhost:3469"
    Write-Status "Press Ctrl+C to stop all services"
    
    # Use the unified production script from root package.json (builds and starts)
    pnpm run start:all
}

# Function to show help
function Show-Help {
    Write-Host "KRAPI Application Manager" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Usage: .\krapi-manager.ps1 [COMMAND]" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor $Colors.White
    Write-Host "  dev           Start the application in development mode" -ForegroundColor $Colors.White
    Write-Host "  prod          Start the application in production mode" -ForegroundColor $Colors.White
    Write-Host "  install       Install all dependencies" -ForegroundColor $Colors.White
    Write-Host "  lint          Run linting checks" -ForegroundColor $Colors.White
    Write-Host "  type-check    Run TypeScript type checks" -ForegroundColor $Colors.White
    Write-Host "  health        Run comprehensive health checks (install + lint + type-check)" -ForegroundColor $Colors.White
    Write-Host "  help          Show this help message" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor $Colors.White
    Write-Host "  .\krapi-manager.ps1 dev        # Start development mode" -ForegroundColor $Colors.White
    Write-Host "  .\krapi-manager.ps1 prod       # Start production mode" -ForegroundColor $Colors.White
    Write-Host "  .\krapi-manager.ps1 health     # Run all health checks" -ForegroundColor $Colors.White
}

# Function to run health checks
function Test-Health {
    Write-Status "Running comprehensive health checks..."
    
    # Use the unified health check script from root package.json
    pnpm run health
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Health checks failed! Please fix the issues before continuing."
        exit 1
    }
    
    Write-Success "All health checks passed! The application is ready to run."
}

# Main script logic
switch ($Command) {
    "dev" {
        Test-Prerequisites
        Install-Dependencies
        Test-Linting
        Test-TypeChecking
        Start-DevMode
    }
    "prod" {
        Test-Prerequisites
        Install-Dependencies
        Test-Linting
        Test-TypeChecking
        Start-ProductionMode
    }
    "install" {
        Test-Prerequisites
        Install-Dependencies
    }
    "lint" {
        Test-Prerequisites
        Test-Linting
    }
    "type-check" {
        Test-Prerequisites
        Test-TypeChecking
    }
    "health" {
        Test-Prerequisites
        Test-Health
    }
    "help" {
        Show-Help
    }
    default {
        Show-Help
    }
}
