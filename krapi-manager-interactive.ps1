# KRAPI Application Manager - Interactive Mode
# Menu-based interface for managing KRAPI application

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
Write-Host "  Interactive Mode"
Write-Host "========================================"
Write-Host ""

function Show-MainMenu {
    Write-Host ""
    Write-Host "Main Menu:"
    Write-Host "  1. Install dependencies"
    Write-Host "  2. Build all (backend + frontend)"
    Write-Host "  3. Start development mode"
    Write-Host "  4. Start production mode"
    Write-Host "  5. SDK Management"
    Write-Host "  6. Run health checks"
    Write-Host "  7. Stop services"
    Write-Host "  8. Exit"
    Write-Host ""
}

function Show-SDKMenu {
    Write-Host ""
    Write-Host "SDK Management:"
    Write-Host "  1. Check SDK status"
    Write-Host "  2. Link local SDK (for debugging)"
    Write-Host "  3. Unlink SDK (use npm package)"
    Write-Host "  4. Build SDK"
    Write-Host "  5. Check SDK (lint + type-check)"
    Write-Host "  6. Back to main menu"
    Write-Host ""
}

function Install-Dependencies {
    Write-Status "Installing dependencies..."
    if (-not (Test-Path ".env")) {
        & $PACKAGE_MANAGER run init-env 2>&1 | Out-Null
    }
    & $PACKAGE_MANAGER install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        return $false
    }
    Write-Success "Dependencies installed"
    return $true
}

function Build-All {
    Write-Status "Building backend and frontend..."
    & $PACKAGE_MANAGER run build:all
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        return $false
    }
    Write-Success "Build complete"
    return $true
}

function Start-Dev {
    Write-Status "Starting development mode..."
    Write-Host "[INFO] Backend: http://localhost:3470"
    Write-Host "[INFO] Frontend: http://localhost:3498"
    Write-Host "[INFO] Press Ctrl+C to stop"
    Write-Host ""
    & $PACKAGE_MANAGER run dev:all
}

function Start-Prod {
    Write-Status "Starting production mode..."
    Write-Host "[INFO] Backend: http://localhost:3470"
    Write-Host "[INFO] Frontend: http://localhost:3498"
    Write-Host "[INFO] Press Ctrl+C to stop"
    Write-Host ""
    & $PACKAGE_MANAGER run start:all
}

function SDK-Status {
    & $PACKAGE_MANAGER run sdk:status
}

function SDK-Link {
    Write-Status "Linking local SDK..."
    & $PACKAGE_MANAGER run sdk:link
    Write-Success "Local SDK linked. Don't forget to build: pnpm run sdk:build"
}

function SDK-Unlink {
    Write-Status "Unlinking SDK (switching to npm)..."
    & $PACKAGE_MANAGER run sdk:unlink
    Write-Success "Now using npm package"
}

function SDK-Build {
    Write-Status "Building SDK..."
    & $PACKAGE_MANAGER run sdk:build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "SDK build failed"
        return $false
    }
    Write-Success "SDK built successfully"
    return $true
}

function SDK-Check {
    Write-Status "Checking SDK..."
    & $PACKAGE_MANAGER run sdk:check
    if ($LASTEXITCODE -ne 0) {
        Write-Error "SDK checks failed"
        return $false
    }
    Write-Success "SDK checks passed"
    return $true
}

function Health-Check {
    Write-Status "Running health checks..."
    & $PACKAGE_MANAGER run health
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Health checks failed"
        return $false
    }
    Write-Success "All health checks passed"
    return $true
}

function Stop-Services {
    Write-Status "Checking for running services..."
    Write-Status "Please stop services manually if needed"
}

# Main loop
while ($true) {
    Show-MainMenu
    $choice = Read-Host "Select an option (1-8)"
    
    switch ($choice) {
        "1" {
            Install-Dependencies
            Read-Host "Press Enter to continue"
        }
        "2" {
            Build-All
            Read-Host "Press Enter to continue"
        }
        "3" {
            Start-Dev
        }
        "4" {
            Start-Prod
        }
        "5" {
            Show-SDKMenu
            $sdkChoice = Read-Host "Select option (1-6)"
            switch ($sdkChoice) {
                "1" { SDK-Status; Read-Host "Press Enter to continue" }
                "2" { SDK-Link; Read-Host "Press Enter to continue" }
                "3" { SDK-Unlink; Read-Host "Press Enter to continue" }
                "4" { SDK-Build; Read-Host "Press Enter to continue" }
                "5" { SDK-Check; Read-Host "Press Enter to continue" }
                "6" { continue }
                default { Write-Error "Invalid option"; Read-Host "Press Enter to continue" }
            }
        }
        "6" {
            Health-Check
            Read-Host "Press Enter to continue"
        }
        "7" {
            Stop-Services
            Read-Host "Press Enter to continue"
        }
        "8" {
            Write-Success "Goodbye!"
            exit 0
        }
        default {
            Write-Error "Invalid option. Please try again."
            Read-Host "Press Enter to continue"
        }
    }
}

