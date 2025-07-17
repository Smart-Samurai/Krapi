# Krapi Development Control Panel Launcher
param(
    [switch]$Install,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Help
)

# Go to project root directory
$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

# Colors for output
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }

# Display help
function Show-Help {
    Write-Host "🎮 Krapi Development Control Panel" -ForegroundColor Magenta
    Write-Host "=================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\dev-control.ps1 -Start    # Start the control panel"
    Write-Host "  .\dev-control.ps1 -Stop     # Stop the control panel"
    Write-Host "  .\dev-control.ps1 -Install  # Install dependencies"
    Write-Host "  .\dev-control.ps1 -Help     # Show this help"
    Write-Host ""
    Write-Host "Control Panel Features:" -ForegroundColor Yellow
    Write-Host "  • Start/Stop API server and Frontend"
    Write-Host "  • Reset database to zero"
    Write-Host "  • Live logs with real-time updates"
    Write-Host "  • Install dependencies"
    Write-Host "  • Service status monitoring"
    Write-Host ""
    Write-Host "Default URL: http://localhost:4000" -ForegroundColor Green
}

# Check if Node.js is installed
function Test-NodeJs {
    try {
        $version = node --version 2>$null
        if ($version) {
            Write-Success "✓ Node.js found: $version"
            return $true
        }
    }
    catch {
        Write-Error "✗ Node.js not found. Please install Node.js first."
        return $false
    }
}

# Install dependencies
function Install-Dependencies {
    Write-Info "Installing control panel dependencies..."
    
    if (!(Test-NodeJs)) {
        return
    }
    
    try {
        npm install
        Write-Success "✓ Dependencies installed successfully"
    }
    catch {
        Write-Error "✗ Failed to install dependencies: $($_.Exception.Message)"
    }
}

# Start control panel
function Start-ControlPanel {
    Write-Info "Starting Krapi Development Control Panel..."
    
    if (!(Test-NodeJs)) {
        return
    }
    
    # Check if dependencies are installed
    if (!(Test-Path "node_modules")) {
        Write-Warning "Dependencies not found. Installing..."
        Install-Dependencies
    }
    
    # Check if control panel is already running
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Warning "Control panel is already running at http://localhost:4000"
            Start-Process "http://localhost:4000"
            return
        }
    }
    catch {
        # Not running, continue to start
    }
    
    Write-Info "Starting control server..."
    Write-Success "🎮 Control Panel will be available at: http://localhost:4000"
    Write-Success "📡 WebSocket logs will be available at: ws://localhost:4001"
    Write-Info ""
    Write-Info "Press Ctrl+C to stop the control panel"
    Write-Info ""
    
    # Start the control panel
    try {
        node development\dev-control\server.js
    }
    catch {
        Write-Error "Failed to start control panel: $($_.Exception.Message)"
    }
}

# Stop control panel
function Stop-ControlPanel {
    Write-Info "Stopping Krapi Development Control Panel..."
    
    try {
        # Find and kill processes on ports 4000 and 4001
        $processes = Get-NetTCPConnection -LocalPort 4000, 4001 -State Listen -ErrorAction SilentlyContinue
        
        if ($processes) {
            foreach ($proc in $processes) {
                $process = Get-Process -Id $proc.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Info "Stopping control panel process (PID: $($process.Id))"
                    Stop-Process -Id $process.Id -Force
                }
            }
            Write-Success "✓ Control panel stopped"
        }
        else {
            Write-Info "Control panel is not running"
        }
    }
    catch {
        Write-Error "Error stopping control panel: $($_.Exception.Message)"
    }
}

# Main logic
if ($Help) {
    Show-Help
}
elseif ($Install) {
    Install-Dependencies
}
elseif ($Start) {
    Start-ControlPanel
}
elseif ($Stop) {
    Stop-ControlPanel
}
else {
    Write-Host "🎮 Krapi Development Control Panel" -ForegroundColor Magenta
    Write-Host ""
    Write-Info "No action specified. Use -Help for usage information."
    Write-Info ""
    Write-Info "Quick start:"
    Write-Info "  .\dev-control.ps1 -Start"
    Write-Info ""
    Write-Info "Then open: http://localhost:4000"
} 