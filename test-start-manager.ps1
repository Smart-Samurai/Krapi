# Test Start Manager Script
# This script tests the start manager with proper PowerShell syntax

Write-Host "Testing Krapi CMS Start Manager..." -ForegroundColor Green

# Check if Python is available
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "✓ Python is available" -ForegroundColor Green
} else {
    Write-Host "✗ Python is not available" -ForegroundColor Red
    exit 1
}

# Check if npm is available
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "✓ npm is available" -ForegroundColor Green
} else {
    Write-Host "✗ npm is not available" -ForegroundColor Red
    exit 1
}

# Check if the start manager script exists
if (Test-Path "start-manager.py") {
    Write-Host "✓ start-manager.py found" -ForegroundColor Green
} else {
    Write-Host "✗ start-manager.py not found" -ForegroundColor Red
    exit 1
}

# Check if API server directory exists
if (Test-Path "api-server") {
    Write-Host "✓ API server directory found" -ForegroundColor Green
} else {
    Write-Host "✗ API server directory not found" -ForegroundColor Red
    exit 1
}

# Check if frontend directory exists
if (Test-Path "admin-frontend") {
    Write-Host "✓ Frontend directory found" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend directory not found" -ForegroundColor Red
    exit 1
}

# Check if ports are available
Write-Host "Checking port availability..." -ForegroundColor Yellow

# Check port 3469 (Frontend)
$frontendPort = Get-NetTCPConnection -LocalPort 3469 -ErrorAction SilentlyContinue
if ($frontendPort) {
    Write-Host "⚠ Port 3469 (Frontend) is in use" -ForegroundColor Yellow
} else {
    Write-Host "✓ Port 3469 (Frontend) is available" -ForegroundColor Green
}

# Check port 3470 (API)
$apiPort = Get-NetTCPConnection -LocalPort 3470 -ErrorAction SilentlyContinue
if ($apiPort) {
    Write-Host "⚠ Port 3470 (API) is in use" -ForegroundColor Yellow
} else {
    Write-Host "✓ Port 3470 (API) is available" -ForegroundColor Green
}

# Check port 3471 (WebSocket)
$wsPort = Get-NetTCPConnection -LocalPort 3471 -ErrorAction SilentlyContinue
if ($wsPort) {
    Write-Host "⚠ Port 3471 (WebSocket) is in use" -ForegroundColor Yellow
} else {
    Write-Host "✓ Port 3471 (WebSocket) is available" -ForegroundColor Green
}

# Test TypeScript compilation in API server
Write-Host "Testing TypeScript compilation..." -ForegroundColor Yellow
Set-Location "api-server"

# Check if TypeScript is installed
if (Test-Path "node_modules\.bin\tsc.cmd") {
    Write-Host "✓ TypeScript compiler found" -ForegroundColor Green
    
    # Try to compile
    $buildResult = & npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ TypeScript compilation successful" -ForegroundColor Green
    } else {
        Write-Host "⚠ TypeScript compilation had issues: $buildResult" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ TypeScript compiler not found in node_modules" -ForegroundColor Yellow
    
    # Try to install TypeScript
    Write-Host "Installing TypeScript..." -ForegroundColor Yellow
    $installResult = & npm install typescript --save-dev 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ TypeScript installed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install TypeScript: $installResult" -ForegroundColor Red
    }
}

Set-Location ".."

# Test frontend dependencies
Write-Host "Testing frontend dependencies..." -ForegroundColor Yellow
Set-Location "admin-frontend"

if (Test-Path "node_modules") {
    Write-Host "✓ Frontend node_modules found" -ForegroundColor Green
} else {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    $installResult = & npm install 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install frontend dependencies: $installResult" -ForegroundColor Red
    }
}

Set-Location ".."

Write-Host "`nAll tests completed!" -ForegroundColor Green
Write-Host "You can now run: python start-manager.py" -ForegroundColor Cyan
Write-Host "Expected ports:" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:3469" -ForegroundColor Cyan
Write-Host "  - API: http://localhost:3470" -ForegroundColor Cyan
Write-Host "  - WebSocket: ws://localhost:3471" -ForegroundColor Cyan 