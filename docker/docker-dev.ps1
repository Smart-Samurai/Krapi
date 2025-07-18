# Krapi CMS Development Control Script
# Usage: .\krapi-dev.ps1 [start|stop|restart|status|logs|health|clean]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "health", "clean", "build")]
    [string]$Action
)

# Configuration
$API_PORT = 3469
$FRONTEND_PORT = 3470
$LOG_DIR = "logs"
$API_LOG = "$LOG_DIR\api-server.log"
$FRONTEND_LOG = "$LOG_DIR\frontend.log"

# Colors for output
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }

# Create logs directory if it doesn't exist
if (!(Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR | Out-Null
}

# Function to check if a port is in use
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

# Function to get process using a port
function Get-ProcessOnPort {
    param([int]$Port)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            $connection = $connections | Select-Object -First 1
            if ($connection -and $connection.OwningProcess) {
                $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
                return $process
            }
        }
    }
    catch {
        # Silently handle errors - return null if we can't find the process
    }
    return $null
}

# Function to kill processes on specific ports
function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)
    
    try {
        $process = Get-ProcessOnPort -Port $Port
        if ($process) {
            Write-Info "Stopping $ServiceName (PID: $($process.Id)) on port $Port..."
            try {
                Stop-Process -Id $process.Id -Force -ErrorAction Stop
                Start-Sleep -Seconds 2
                
                # Verify it's stopped
                if (Test-Port -Port $Port) {
                    Write-Warning "$ServiceName may still be running on port $Port"
                }
                else {
                    Write-Success "$ServiceName stopped successfully"
                }
            }
            catch {
                Write-Error "Failed to stop ${ServiceName}: $($_.Exception.Message)"
            }
        }
        else {
            Write-Info "$ServiceName is not running on port $Port"
        }
    }
    catch {
        Write-Error "Error checking $ServiceName on port ${Port}: $($_.Exception.Message)"
    }
}

# Function to start API server
function Start-ApiServer {
    Write-Info "Starting API Server on port $API_PORT..."
    
    # Check if already running
    if (Test-Port -Port $API_PORT) {
        Write-Warning "API Server already running on port $API_PORT"
        return
    }
    
    # Navigate to api-server directory and start
    try {
        Set-Location "api-server"
        
        # Install dependencies if needed
        if (!(Test-Path "node_modules")) {
            Write-Info "Installing API server dependencies..."
            pnpm install
        }
        
        # Create log file if it doesn't exist
        $logPath = Join-Path $PSScriptRoot $API_LOG
        if (!(Test-Path $logPath)) {
            New-Item -Path $logPath -ItemType File -Force | Out-Null
        }
        
        # Start in background and redirect output to log
        $apiJob = Start-Job -ScriptBlock {
            param($WorkingDir, $LogFile)
            Set-Location $WorkingDir
            pnpm run dev 2>&1 | Tee-Object -FilePath $LogFile -Append
        } -ArgumentList (Get-Location).Path, $logPath
        
        # Wait a moment and check if it started
        Start-Sleep -Seconds 3
        if (Test-Port -Port $API_PORT) {
            Write-Success "API Server started successfully on port $API_PORT (Job ID: $($apiJob.Id))"
        }
        else {
            Write-Error "API Server failed to start. Check logs: $API_LOG"
        }
        
        Set-Location ".."
    }
    catch {
        Write-Error "Failed to start API Server: $($_.Exception.Message)"
        Set-Location ".."
    }
}

# Function to start Frontend server
function Start-Frontend {
    Write-Info "Starting Frontend on port $FRONTEND_PORT..."
    
    # Check if already running
    if (Test-Port -Port $FRONTEND_PORT) {
        Write-Warning "Frontend already running on port $FRONTEND_PORT"
        return
    }
    
    # Navigate to admin-frontend directory and start
    try {
        Set-Location "admin-frontend"
        
        # Install dependencies if needed
        if (!(Test-Path "node_modules")) {
            Write-Info "Installing frontend dependencies..."
            pnpm install
        }
        
        # Build if needed
        if (!(Test-Path ".next")) {
            Write-Info "Building frontend..."
            pnpm run build
        }
        
        # Create log file if it doesn't exist
        $logPath = Join-Path $PSScriptRoot $FRONTEND_LOG
        if (!(Test-Path $logPath)) {
            New-Item -Path $logPath -ItemType File -Force | Out-Null
        }
        
        # Start in background and redirect output to log
        $frontendJob = Start-Job -ScriptBlock {
            param($WorkingDir, $LogFile)
            Set-Location $WorkingDir
            pnpm run dev 2>&1 | Tee-Object -FilePath $LogFile -Append
        } -ArgumentList (Get-Location).Path, $logPath
        
        # Wait a moment and check if it started
        Start-Sleep -Seconds 5
        if (Test-Port -Port $FRONTEND_PORT) {
            Write-Success "Frontend started successfully on port $FRONTEND_PORT (Job ID: $($frontendJob.Id))"
        }
        else {
            Write-Error "Frontend failed to start. Check logs: $FRONTEND_LOG"
        }
        
        Set-Location ".."
    }
    catch {
        Write-Error "Failed to start Frontend: $($_.Exception.Message)"
        Set-Location ".."
    }
}

# Function to show status
function Show-Status {
    Write-Info "=== Krapi CMS Development Status ==="
    
    $apiRunning = $false
    $frontendRunning = $false
    
    # Check API Server
    try {
        if (Test-Port -Port $API_PORT) {
            $apiProcess = Get-ProcessOnPort -Port $API_PORT
            if ($apiProcess) {
                Write-Success "✓ API Server: Running on port $API_PORT (PID: $($apiProcess.Id))"
                $apiRunning = $true
            }
            else {
                Write-Warning "⚠ API Server: Port $API_PORT is occupied but process not found"
            }
        }
        else {
            Write-Error "✗ API Server: Not running on port $API_PORT"
        }
    }
    catch {
        Write-Error "✗ API Server: Error checking status - $($_.Exception.Message)"
    }
    
    # Check Frontend
    try {
        if (Test-Port -Port $FRONTEND_PORT) {
            $frontendProcess = Get-ProcessOnPort -Port $FRONTEND_PORT
            if ($frontendProcess) {
                Write-Success "✓ Frontend: Running on port $FRONTEND_PORT (PID: $($frontendProcess.Id))"
                $frontendRunning = $true
            }
            else {
                Write-Warning "⚠ Frontend: Port $FRONTEND_PORT is occupied but process not found"
            }
        }
        else {
            Write-Error "✗ Frontend: Not running on port $FRONTEND_PORT"
        }
    }
    catch {
        Write-Error "✗ Frontend: Error checking status - $($_.Exception.Message)"
    }
    
    # Show running jobs
    try {
        $jobs = Get-Job -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Running" }
        if ($jobs -and $jobs.Count -gt 0) {
            Write-Info "`nRunning background jobs:"
            $jobs | ForEach-Object {
                Write-Info "  Job ID $($_.Id): $($_.Name) - $($_.State)"
            }
        }
        else {
            Write-Info "`nNo background jobs running"
        }
    }
    catch {
        Write-Warning "Could not check background jobs: $($_.Exception.Message)"
    }
    
    # Show URLs and status summary
    Write-Info "`nService URLs:"
    Write-Info "  Frontend: http://localhost:$FRONTEND_PORT $(if ($frontendRunning) { '(RUNNING)' } else { '(STOPPED)' })"
    Write-Info "  API: http://localhost:$API_PORT $(if ($apiRunning) { '(RUNNING)' } else { '(STOPPED)' })"
    Write-Info "  API Health: http://localhost:$API_PORT/api/health $(if ($apiRunning) { '(AVAILABLE)' } else { '(UNAVAILABLE)' })"
    
    # Overall status
    if ($apiRunning -and $frontendRunning) {
        Write-Success "`n🟢 All services are running"
    }
    elseif ($apiRunning -or $frontendRunning) {
        Write-Warning "`n🟡 Some services are running"
    }
    else {
        Write-Error "`n🔴 No services are running"
        Write-Info "Use '.\krapi-dev.ps1 start' to start all services"
    }
}

# Function to show logs
function Show-Logs {
    Write-Info "=== Recent Logs ==="
    
    if (Test-Path $API_LOG) {
        Write-Info "`n--- API Server Logs (last 20 lines) ---"
        Get-Content $API_LOG -Tail 20 | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    }
    
    if (Test-Path $FRONTEND_LOG) {
        Write-Info "`n--- Frontend Logs (last 20 lines) ---"
        Get-Content $FRONTEND_LOG -Tail 20 | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    }
    
    Write-Info "`nTo follow logs in real-time, use:"
    Write-Info "  Get-Content $API_LOG -Wait -Tail 10"
    Write-Info "  Get-Content $FRONTEND_LOG -Wait -Tail 10"
}

# Function to check health
function Check-Health {
    Write-Info "=== Health Check ==="
    
    # Check API health endpoint
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$API_PORT/api/health" -TimeoutSec 5
        if ($response.status -eq "OK") {
            Write-Success "✓ API Health: OK"
        }
        else {
            Write-Warning "⚠ API Health: Unexpected response"
        }
    }
    catch {
        Write-Error "✗ API Health: Failed - $($_.Exception.Message)"
    }
    
    # Check Frontend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$FRONTEND_PORT" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Success "✓ Frontend: Responding"
        }
        else {
            Write-Warning "⚠ Frontend: Status $($response.StatusCode)"
        }
    }
    catch {
        Write-Error "✗ Frontend: Failed - $($_.Exception.Message)"
    }
}

# Function to clean up
function Clean-All {
    Write-Info "=== Cleaning Development Environment ==="
    
    # Stop all services
    Stop-ProcessOnPort -Port $API_PORT -ServiceName "API Server"
    Stop-ProcessOnPort -Port $FRONTEND_PORT -ServiceName "Frontend"
    
    # Remove background jobs
    Get-Job | Remove-Job -Force 2>$null
    
    # Clean logs
    if (Test-Path $LOG_DIR) {
        Remove-Item "$LOG_DIR\*" -Force
        Write-Info "Logs cleaned"
    }
    
    # Clean build artifacts
    if (Test-Path "admin-frontend\.next") {
        Remove-Item "admin-frontend\.next" -Recurse -Force
        Write-Info "Frontend build artifacts cleaned"
    }
    
    Write-Success "Environment cleaned"
}

# Function to build projects
function Build-All {
    Write-Info "=== Building Projects ==="
    
    # Build API server
    try {
        Set-Location "api-server"
        Write-Info "Building API server..."
        pnpm run build
        Write-Success "API server built successfully"
        Set-Location ".."
    }
    catch {
        Write-Error "Failed to build API server: $($_.Exception.Message)"
        Set-Location ".."
    }
    
    # Build Frontend
    try {
        Set-Location "admin-frontend"
        Write-Info "Building frontend..."
        pnpm run build
        Write-Success "Frontend built successfully"
        Set-Location ".."
    }
    catch {
        Write-Error "Failed to build frontend: $($_.Exception.Message)"
        Set-Location ".."
    }
}

# Main script logic
Write-Info "Krapi CMS Development Control - Action: $Action"
Write-Info "======================================="

switch ($Action) {
    "start" {
        Start-ApiServer
        Start-Sleep -Seconds 2
        Start-Frontend
        Start-Sleep -Seconds 2
        Show-Status
    }
    
    "stop" {
        Stop-ProcessOnPort -Port $API_PORT -ServiceName "API Server"
        Stop-ProcessOnPort -Port $FRONTEND_PORT -ServiceName "Frontend"
        Get-Job | Remove-Job -Force 2>$null
        Write-Success "All services stopped"
    }
    
    "restart" {
        Write-Info "Restarting services..."
        Stop-ProcessOnPort -Port $API_PORT -ServiceName "API Server"
        Stop-ProcessOnPort -Port $FRONTEND_PORT -ServiceName "Frontend"
        Get-Job | Remove-Job -Force 2>$null
        Start-Sleep -Seconds 3
        Start-ApiServer
        Start-Sleep -Seconds 2
        Start-Frontend
        Start-Sleep -Seconds 2
        Show-Status
    }
    
    "status" {
        Show-Status
    }
    
    "logs" {
        Show-Logs
    }
    
    "health" {
        Check-Health
    }
    
    "clean" {
        Clean-All
    }
    
    "build" {
        Build-All
    }
}

Write-Info "`nDone! Use '.\docker-dev.ps1 status' to check the current state."
