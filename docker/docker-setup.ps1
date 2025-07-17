param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("install", "reinstall", "force-reinstall", "uninstall", "status", "start", "stop", "logs-frontend", "logs-backend")]
    [string]$Command,
    [switch]$Force
)

$ProjectPath = $PSScriptRoot
$DockerComposeFile = Join-Path $ProjectPath "docker-compose.yml"
$EnvFile = Join-Path $ProjectPath ".env"

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host " $Message" -ForegroundColor Magenta
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host ""
}

function Test-Prerequisites {
    Write-Header "Checking Prerequisites"
    
    $missing = @()
    
    if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
        $missing += "Docker"
    } else {
        $dockerVersion = docker --version 2>$null
        Write-Host "[INFO] Docker found: $dockerVersion" -ForegroundColor Green
    }
    
    if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
        $composeVersion = docker-compose --version 2>$null
        Write-Host "[INFO] Docker Compose found: $composeVersion" -ForegroundColor Green
    } elseif (Get-Command "docker" -ErrorAction SilentlyContinue) {
        try {
            $composeVersion = docker compose version 2>$null
            Write-Host "[INFO] Docker Compose (plugin) found: $composeVersion" -ForegroundColor Green
        } catch {
            $missing += "Docker Compose"
        }
    } else {
        $missing += "Docker Compose"
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "[ERROR] Missing prerequisites: $($missing -join ', ')" -ForegroundColor Red
        Write-Host "[INFO] Please install Docker and Docker Compose" -ForegroundColor Cyan
        return $false
    }
    
    Write-Host "[SUCCESS] All prerequisites satisfied!" -ForegroundColor Green
    return $true
}

function Initialize-Environment {
    if (-not (Test-Path $EnvFile)) {
        Write-Host "[INFO] Creating default .env file..." -ForegroundColor Cyan
        
        $envContent = @"
# Krapi CMS Environment Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Security
JWT_SECRET=$(Get-Random -Minimum 100000 -Maximum 999999)_krapi_jwt_secret_$(Get-Random -Minimum 100000 -Maximum 999999)
JWT_EXPIRES_IN=24h

# Database Configuration
DATABASE_TYPE=sqlite
DB_PATH=/app/data/app.db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=krapi
DB_USER=krapi
DB_PASSWORD=krapi

# Admin Configuration
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123

# Network Configuration
API_PORT=3001
FRONTEND_PORT=3000
NGINX_HTTP_PORT=8428
NGINX_HTTPS_PORT=8424

# Application URL (for CORS and redirects)
APP_URL=http://localhost:8428

# Upload Configuration
MAX_FILE_SIZE=50M
UPLOAD_PATH=/app/uploads

# Environment
NODE_ENV=production
"@

        try {
            # Create .env file without BOM
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($EnvFile, $envContent, $utf8NoBom)
            Write-Host "[SUCCESS] Default .env file created" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] Failed to create .env file: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "[INFO] .env file already exists" -ForegroundColor Green
    }
    return $true
}

function Invoke-DockerCompose {
    param([string[]]$Arguments)
    
    if (-not (Test-Path $DockerComposeFile)) {
        Write-Host "[ERROR] Docker Compose file not found: $DockerComposeFile" -ForegroundColor Red
        return $false
    }
    
    $composeCommand = if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
        "docker-compose"
    } else {
        "docker compose"
    }
    
    $fullCommand = "$composeCommand -f `"$DockerComposeFile`" $($Arguments -join ' ')"
    Write-Host "[INFO] Executing: $fullCommand" -ForegroundColor Cyan
    Write-Host "[INFO] Docker output:" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    
    try {
        # Execute command directly to show output in real-time
        & $composeCommand -f $DockerComposeFile @Arguments
        $exitCode = $LASTEXITCODE
        
        Write-Host "----------------------------------------" -ForegroundColor DarkGray
        
        if ($exitCode -eq 0) {
            Write-Host "[SUCCESS] Docker command completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[ERROR] Docker command failed with exit code: $exitCode" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "----------------------------------------" -ForegroundColor DarkGray
        Write-Host "[ERROR] Docker Compose command failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ServicesRunning {
    try {
        $composeCommand = if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
            "docker-compose"
        } else {
            "docker compose"
        }
        $output = & $composeCommand -f $DockerComposeFile ps -q 2>$null
        return -not [string]::IsNullOrWhiteSpace($output)
    } catch {
        return $false
    }
}

function Install-Project {
    Write-Header "Installing Krapi CMS (First Time Setup)"
    
    if (-not (Test-Prerequisites)) { 
        exit 1 
    }
    
    if (-not (Initialize-Environment)) { 
        exit 1 
    }
    
    Write-Host "[INFO] Building and starting all services..." -ForegroundColor Cyan
    if (Invoke-DockerCompose @("up", "-d", "--build")) {
        Write-Host "[SUCCESS] Installation completed successfully!" -ForegroundColor Green
        Write-Host "[INFO] Access your Krapi CMS at: http://localhost:8428" -ForegroundColor Cyan
        Write-Host "[INFO] API available at: http://localhost:8428/api" -ForegroundColor Cyan
        Write-Host "[INFO] Admin Dashboard: http://localhost:8428/dashboard" -ForegroundColor Cyan
    } else {
        Write-Host "[ERROR] Installation failed!" -ForegroundColor Red
        exit 1
    }
}

function Invoke-Reinstall {
    Write-Header "Reinstalling Krapi CMS (Soft Update)"
    
    Write-Host "[INFO] This will rebuild containers but preserve data and volumes." -ForegroundColor Cyan
    
    if (-not $Force) {
        $confirm = Read-Host "Continue with reinstall? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Host "[INFO] Reinstall cancelled" -ForegroundColor Cyan
            return
        }
    }
    
    Write-Host "[INFO] Stopping services..." -ForegroundColor Cyan
    Invoke-DockerCompose @("down")
    
    Write-Host "[INFO] Rebuilding and starting services..." -ForegroundColor Cyan
    if (Invoke-DockerCompose @("up", "-d", "--build", "--force-recreate")) {
        Write-Host "[SUCCESS] Reinstall completed successfully!" -ForegroundColor Green
        Write-Host "[INFO] Your data has been preserved." -ForegroundColor Cyan
    } else {
        Write-Host "[ERROR] Reinstall failed!" -ForegroundColor Red
        exit 1
    }
}

function Invoke-ForceReinstall {
    Write-Header "Force Reinstalling Krapi CMS (Hard Reset)"
    
    Write-Host "[WARNING] This will DELETE all containers, networks, volumes, and data!" -ForegroundColor Yellow
    Write-Host "[WARNING] This action cannot be undone!" -ForegroundColor Yellow
    
    if (-not $Force) {
        $confirm = Read-Host "Type 'DELETE' to confirm force reinstall"
        if ($confirm -ne "DELETE") {
            Write-Host "[INFO] Force reinstall cancelled" -ForegroundColor Cyan
            return
        }
    }
    
    Write-Host "[INFO] Stopping and removing all KRAPI components..." -ForegroundColor Cyan
    Invoke-DockerCompose @("down", "--volumes", "--remove-orphans")
    
    if (-not (Initialize-Environment)) { 
        exit 1 
    }
    
    Write-Host "[INFO] Rebuilding everything from scratch..." -ForegroundColor Cyan
    if (Invoke-DockerCompose @("up", "-d", "--build")) {
        Write-Host "[SUCCESS] Force reinstall completed successfully!" -ForegroundColor Green
        Write-Host "[WARNING] All previous data has been deleted." -ForegroundColor Yellow
    } else {
        Write-Host "[ERROR] Force reinstall failed!" -ForegroundColor Red
        exit 1
    }
}

function Uninstall-Project {
    Write-Header "Uninstalling Krapi CMS (Complete Removal)"
    
    Write-Host "[WARNING] This will PERMANENTLY DELETE:" -ForegroundColor Yellow
    Write-Host "[WARNING]   - All KRAPI Docker containers" -ForegroundColor Yellow
    Write-Host "[WARNING]   - All KRAPI Docker images" -ForegroundColor Yellow
    Write-Host "[WARNING]   - All KRAPI Docker volumes (YOUR DATA)" -ForegroundColor Yellow
    Write-Host "[WARNING]   - All KRAPI Docker networks" -ForegroundColor Yellow
    Write-Host "[INFO] PRESERVED: Your .env file will NOT be deleted" -ForegroundColor Cyan
    
    if (-not $Force) {
        $confirm = Read-Host "Type 'UNINSTALL' to confirm complete removal"
        if ($confirm -ne "UNINSTALL") {
            Write-Host "[INFO] Uninstall cancelled" -ForegroundColor Cyan
            return
        }
    }
    
    Write-Host "[INFO] Removing all KRAPI components..." -ForegroundColor Cyan
    Invoke-DockerCompose @("down", "--rmi", "all", "--volumes", "--remove-orphans")
    
    Write-Host "[SUCCESS] Krapi CMS completely uninstalled from Docker!" -ForegroundColor Green
    Write-Host "[INFO] Your .env file has been preserved." -ForegroundColor Cyan
}

function Get-Status {
    Write-Header "Krapi CMS Status"
    
    if (Test-ServicesRunning) {
        Write-Host "[SUCCESS] Krapi CMS is RUNNING" -ForegroundColor Green
        Write-Host "[INFO] Service details:" -ForegroundColor Cyan
        Invoke-DockerCompose @("ps")
        
        Write-Host ""
        Write-Host "[INFO] Access URLs:" -ForegroundColor Cyan
        Write-Host "[INFO]   Frontend: http://localhost:8428" -ForegroundColor Cyan
        Write-Host "[INFO]   API:      http://localhost:8428/api" -ForegroundColor Cyan
        Write-Host "[INFO]   Admin:    http://localhost:8428/dashboard" -ForegroundColor Cyan
    } else {
        Write-Host "[WARNING] Krapi CMS is NOT RUNNING" -ForegroundColor Yellow
        Write-Host "[INFO] Use 'setup.ps1 start' to start the services" -ForegroundColor Cyan
    }
}

function Start-Services {
    Write-Header "Starting Krapi CMS Services"
    
    if (Test-ServicesRunning) {
        Write-Host "[INFO] Services are already running" -ForegroundColor Cyan
        Get-Status
        return
    }
    
    Write-Host "[INFO] Starting all services..." -ForegroundColor Cyan
    if (Invoke-DockerCompose @("up", "-d")) {
        Write-Host "[SUCCESS] All services started successfully!" -ForegroundColor Green
        Write-Host "[INFO] Access your Krapi CMS at: http://localhost:8428" -ForegroundColor Cyan
    } else {
        Write-Host "[ERROR] Failed to start services!" -ForegroundColor Red
        exit 1
    }
}

function Stop-Services {
    Write-Header "Stopping Krapi CMS Services"
    
    if (-not (Test-ServicesRunning)) {
        Write-Host "[INFO] Services are already stopped" -ForegroundColor Cyan
        return
    }
    
    Write-Host "[INFO] Stopping all services..." -ForegroundColor Cyan
    if (Invoke-DockerCompose @("down")) {
        Write-Host "[SUCCESS] All services stopped successfully!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to stop services!" -ForegroundColor Red
        exit 1
    }
}

function Show-FrontendLogs {
    Write-Header "Krapi CMS Frontend Debug Logs"
    
    if (-not (Test-ServicesRunning)) {
        Write-Host "[WARNING] Services are not running. Start them first with: setup.ps1 start" -ForegroundColor Yellow
        return
    }
    
    Write-Host "[INFO] Showing live frontend logs (Press Ctrl+C to exit)..." -ForegroundColor Cyan
    Invoke-DockerCompose @("logs", "-f", "frontend")
}

function Show-BackendLogs {
    Write-Header "Krapi CMS Backend Debug Logs"
    
    if (-not (Test-ServicesRunning)) {
        Write-Host "[WARNING] Services are not running. Start them first with: setup.ps1 start" -ForegroundColor Yellow
        return
    }
    
    Write-Host "[INFO] Showing live backend logs (Press Ctrl+C to exit)..." -ForegroundColor Cyan
    Invoke-DockerCompose @("logs", "-f", "api")
}

try {
    switch ($Command.ToLower()) {
        "install" { 
            Install-Project 
        }
        "reinstall" { 
            Invoke-Reinstall 
        }
        "force-reinstall" { 
            Invoke-ForceReinstall 
        }
        "uninstall" { 
            Uninstall-Project 
        }
        "status" { 
            Get-Status 
        }
        "start" { 
            Start-Services 
        }
        "stop" { 
            Stop-Services 
        }
        "logs-frontend" { 
            Show-FrontendLogs 
        }
        "logs-backend" { 
            Show-BackendLogs 
        }
        default {
            Write-Host "[ERROR] Unknown command: $Command" -ForegroundColor Red
            Write-Host "[INFO] Available commands: install, reinstall, force-reinstall, uninstall, status, start, stop, logs-frontend, logs-backend" -ForegroundColor Cyan
            exit 1
        }
    }
} catch {
    Write-Host "[ERROR] An error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
