#!/usr/bin/env pwsh

Write-Host "Installing and Starting Krapi CMS..." -ForegroundColor Green
Write-Host ""

# Function to check if PostgreSQL is accessible
function Test-PostgreSQLConnection {
    Write-Host "Checking PostgreSQL connection..." -ForegroundColor Yellow
    
    # Try to connect using psql if available
    if (Get-Command psql -ErrorAction SilentlyContinue) {
        try {
            $env:PGPASSWORD = "postgres"
            $result = psql -h localhost -p 5432 -U postgres -d krapi -c "SELECT 1;" 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "PostgreSQL is accessible via psql!" -ForegroundColor Green
                return $true
            }
        }
        catch {
            # Continue to next check
        }
    }
    
    # Try using docker exec if container is running
    try {
        $containerRunning = docker ps --format "table {{.Names}}" | Select-String "krapi-postgres"
        if ($containerRunning) {
            $result = docker exec krapi-postgres pg_isready -U postgres 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "PostgreSQL container is running and ready!" -ForegroundColor Green
                return $true
            }
        }
    }
    catch {
        # Continue to next check
    }
    
    # Try using Test-NetConnection to check if port is open
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "PostgreSQL port 5432 is open, but connection test failed" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        # Continue to next check
    }
    
    # Try using Node.js health check script
    if (Get-Command node -ErrorAction SilentlyContinue) {
        if (Test-Path "scripts/db-health-check.js") {
            try {
                $result = node scripts/db-health-check.js 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "PostgreSQL is accessible via Node.js health check!" -ForegroundColor Green
                    return $true
                }
            }
            catch {
                # Continue to next check
            }
        }
    }
    
    return $false
}

# Function to check if Docker is available
function Test-DockerAvailability {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: Docker is not installed or not in PATH" -ForegroundColor Red
        Write-Host "Please install Docker and try again" -ForegroundColor Red
        return $false
    }
    
    try {
        docker info | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Docker is not running" -ForegroundColor Red
            Write-Host "Please start Docker and try again" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "ERROR: Docker is not running" -ForegroundColor Red
        Write-Host "Please start Docker and try again" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# Function to check if docker-compose is available
function Test-DockerComposeAvailability {
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: docker-compose is not installed or not in PATH" -ForegroundColor Red
        Write-Host "Please install docker-compose and try again" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# Function to start PostgreSQL with Docker
function Start-PostgreSQLDocker {
    Write-Host "Starting PostgreSQL with Docker..." -ForegroundColor Yellow
    
    if (-not (Test-DockerAvailability)) {
        return $false
    }
    
    if (-not (Test-DockerComposeAvailability)) {
        return $false
    }
    
    # Check if docker-compose.yml exists
    if (-not (Test-Path "docker-compose.yml")) {
        Write-Host "ERROR: docker-compose.yml not found in current directory" -ForegroundColor Red
        return $false
    }
    
    # Start PostgreSQL container
    try {
        docker-compose up -d postgres
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to start PostgreSQL container" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "ERROR: Failed to start PostgreSQL container" -ForegroundColor Red
        return $false
    }
    
    Write-Host "PostgreSQL container started successfully!" -ForegroundColor Green
    return $true
}

# Function to wait for PostgreSQL to be ready
function Wait-PostgreSQLReady {
    Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    for ($i = 1; $i -le 30; $i++) {
        if (Test-PostgreSQLConnection) {
            Write-Host "PostgreSQL is ready!" -ForegroundColor Green
            return $true
        }
        Write-Host "Waiting for PostgreSQL to be ready... (attempt $i/30)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
    Write-Host "ERROR: PostgreSQL is not responding after 60 seconds" -ForegroundColor Red
    return $false
}

# Check if PostgreSQL is already accessible
if (Test-PostgreSQLConnection) {
    Write-Host "PostgreSQL is already accessible!" -ForegroundColor Green
}
else {
    Write-Host "PostgreSQL is not accessible. Attempting to start with Docker..." -ForegroundColor Yellow
    
    if (-not (Start-PostgreSQLDocker)) {
        Write-Host "Failed to start PostgreSQL with Docker. Please check your Docker installation and try again." -ForegroundColor Red
        exit 1
    }
    
    # Wait for PostgreSQL to be ready
    if (-not (Wait-PostgreSQLReady)) {
        Write-Host "Failed to connect to PostgreSQL. Please check your Docker installation and try again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "PostgreSQL is ready. Installing dependencies..." -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Installing SDK dependencies and building..." -ForegroundColor Cyan
Set-Location "packages/krapi-sdk"
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install SDK dependencies" -ForegroundColor Red
    exit 1
}
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to build SDK" -ForegroundColor Red
    exit 1
}
Write-Host "SDK built successfully!" -ForegroundColor Green
Write-Host ""
Set-Location "../.."

Write-Host "Step 2: Installing Backend Server dependencies..." -ForegroundColor Cyan
Set-Location "backend-server"
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install Backend Server dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "Backend Server dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Set-Location ".."

Write-Host "Step 3: Installing Frontend Manager dependencies..." -ForegroundColor Cyan
Set-Location "frontend-manager"
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install Frontend Manager dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "Frontend Manager dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Set-Location ".."

Write-Host "Step 4: Starting all services..." -ForegroundColor Cyan
Write-Host ""

# Start SDK in watch mode
Write-Host "Starting SDK in watch mode..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/packages/krapi-sdk'; pnpm run dev" -WindowStyle Normal

# Start Backend Server
Write-Host "Starting Backend Server on port 3470..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/backend-server'; pnpm run dev" -WindowStyle Normal

# Start Frontend Manager
Write-Host "Starting Frontend Manager on port 3469..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/frontend-manager'; pnpm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "All services are starting in separate windows..." -ForegroundColor Green
Write-Host "Backend Server: http://localhost:3470" -ForegroundColor Cyan
Write-Host "Frontend Manager: http://localhost:3469" -ForegroundColor Cyan
Write-Host "SDK: Building and watching for changes" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Closing this window will NOT stop the services." -ForegroundColor Yellow
Write-Host "To stop the services, close the individual PowerShell windows." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit" 