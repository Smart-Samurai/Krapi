# Krapi CMS Local Development Script
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "install")]
    [string]$Action
)

$API_PORT = 3001
$FRONTEND_PORT = 3000

function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }

function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("127.0.0.1", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            $process = Get-Process -Id $connections[0].OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                Write-Info "Stopping $ServiceName (PID: $($process.Id))"
                Stop-Process -Id $process.Id -Force
                Write-Success "$ServiceName stopped"
            }
        }
    }
    catch {
        Write-Info "$ServiceName is not running"
    }
}

function Start-Services {
    Write-Info "Starting local development environment..."
    
    # Set environment variables
    $env:NODE_ENV = "development"
    $env:JWT_SECRET = "dev-secret-key"
    $env:DB_PATH = "./data/app.db"
    $env:DEFAULT_ADMIN_USERNAME = "admin"
    $env:DEFAULT_ADMIN_PASSWORD = "admin123"
    
    # Start API server
    if (-not (Test-Port -Port $API_PORT)) {
        Write-Info "Starting API server..."
        Start-Process powershell -ArgumentList "-Command", "Set-Location 'api-server'; pnpm run dev" -WindowStyle Normal
        Start-Sleep -Seconds 5
    }
    
    # Start frontend
    if (-not (Test-Port -Port $FRONTEND_PORT)) {
        Write-Info "Starting frontend..."
        Start-Process powershell -ArgumentList "-Command", "Set-Location 'admin-frontend'; pnpm run dev" -WindowStyle Normal
        Start-Sleep -Seconds 5
    }
    
    Show-Status
}

function Show-Status {
    Write-Info "=== Development Status ==="
    
    if (Test-Port -Port $API_PORT) {
        Write-Success "✓ API Server: http://localhost:$API_PORT"
        Write-Info "  Health: http://localhost:$API_PORT/api/health"
    } else {
        Write-Error "✗ API Server: Not running"
    }
    
    if (Test-Port -Port $FRONTEND_PORT) {
        Write-Success "✓ Frontend: http://localhost:$FRONTEND_PORT"
    } else {
        Write-Error "✗ Frontend: Not running"
    }
}

function Install-Dependencies {
    Write-Info "Installing dependencies..."
    
    Set-Location "api-server"
    Write-Info "Installing API dependencies..."
    pnpm install
    Set-Location ".."
    
    Set-Location "admin-frontend" 
    Write-Info "Installing frontend dependencies..."
    pnpm install
    Set-Location ".."
    
    Write-Success "Dependencies installed!"
}

# Main logic
switch ($Action) {
    "install" {
        Install-Dependencies
    }
    "start" {
        Start-Services
        Write-Success "🚀 Development environment started!"
        Write-Info "Frontend: http://localhost:$FRONTEND_PORT"
        Write-Info "API: http://localhost:$API_PORT"
    }
    "stop" {
        Stop-ProcessOnPort -Port $API_PORT -ServiceName "API Server"
        Stop-ProcessOnPort -Port $FRONTEND_PORT -ServiceName "Frontend"
    }
    "restart" {
        Stop-ProcessOnPort -Port $API_PORT -ServiceName "API Server"
        Stop-ProcessOnPort -Port $FRONTEND_PORT -ServiceName "Frontend"
        Start-Sleep -Seconds 2
        Start-Services
    }
    "status" {
        Show-Status
    }
    "logs" {
        Write-Info "Check the PowerShell windows for live logs"
    }
} 