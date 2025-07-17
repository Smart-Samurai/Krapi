#!/usr/bin/env pwsh

Write-Host ""
Write-Host "🧪 Krapi CMS - Test Runner (PowerShell)" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if pnpm is installed
try {
    $pnpmVersion = pnpm --version 2>$null
    if (-not $pnpmVersion) {
        throw "pnpm not found"
    }
} catch {
    Write-Host "[ERROR] pnpm is not installed. Please install pnpm first." -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

Write-Host "[INFO] Starting test execution at $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
Write-Host ""

function Run-FrontendTests {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "🎨 FRONTEND TESTS (Next.js + TypeScript)" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    
    Set-Location admin-frontend
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "[INFO] Installing frontend dependencies..." -ForegroundColor Cyan
        pnpm install
        Write-Host ""
    }
    
    Write-Host "[INFO] Running frontend tests..." -ForegroundColor Cyan
    $frontendResult = pnpm test:coverage
    $frontendExitCode = $LASTEXITCODE
    
    if ($frontendExitCode -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] ✅ Frontend tests passed!" -ForegroundColor Green
        return $true
    } else {
        Write-Host ""
        Write-Host "[ERROR] ❌ Frontend tests failed (exit code: $frontendExitCode)" -ForegroundColor Red
        return $false
    }
}

function Run-BackendTests {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "🔧 BACKEND TESTS (Node.js + TypeScript)" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    
    Set-Location ..\api-server
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "[INFO] Installing backend dependencies..." -ForegroundColor Cyan
        pnpm install
        Write-Host ""
    }
    
    Write-Host "[INFO] Running backend tests..." -ForegroundColor Cyan
    $backendResult = pnpm test:coverage
    $backendExitCode = $LASTEXITCODE
    
    if ($backendExitCode -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] ✅ Backend tests passed!" -ForegroundColor Green
        return $true
    } else {
        Write-Host ""
        Write-Host "[ERROR] ❌ Backend tests failed (exit code: $backendExitCode)" -ForegroundColor Red
        return $false
    }
}

function Show-Summary($frontendPassed, $backendPassed) {
    Set-Location ..
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "📊 RESULTS SUMMARY" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    
    if ($frontendPassed) {
        Write-Host "Frontend: ✅ PASSED" -ForegroundColor Green
    } else {
        Write-Host "Frontend: ❌ FAILED" -ForegroundColor Red
    }
    
    if ($backendPassed) {
        Write-Host "Backend:  ✅ PASSED" -ForegroundColor Green
    } else {
        Write-Host "Backend:  ❌ FAILED" -ForegroundColor Red
    }
    
    Write-Host ""
    
    if ($frontendPassed -and $backendPassed) {
        Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Coverage reports:"
        Write-Host "  - Frontend: admin-frontend\coverage\lcov-report\index.html"
        Write-Host "  - Backend:  api-server\coverage\lcov-report\index.html"
    } else {
        Write-Host "💥 SOME TESTS FAILED" -ForegroundColor Red
        Write-Host ""
        Write-Host "🔧 Common Issues:" -ForegroundColor Yellow
        Write-Host ""
        
        if (-not $frontendPassed) {
            Write-Host "Frontend Problems:" -ForegroundColor Red
            Write-Host "  - Component tests expect different UI than current implementation"
            Write-Host "  - Check console output above for specific test failures"
            Write-Host "  - Try: cd admin-frontend && pnpm test --verbose"
            Write-Host ""
        }
        
        if (-not $backendPassed) {
            Write-Host "Backend Problems:" -ForegroundColor Red
            Write-Host "  - TypeScript compilation errors in test files"
            Write-Host "  - Missing imports or type mismatches"
            Write-Host "  - Try: cd api-server && npx tsc --noEmit"
            Write-Host ""
        }
    }
}

function Show-Menu {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "💬 OPTIONS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "What would you like to do?"
    Write-Host "  [R] Run all tests again"
    Write-Host "  [F] Run frontend tests only"
    Write-Host "  [B] Run backend tests only"
    Write-Host "  [E] Exit"
    Write-Host ""
    
    do {
        $choice = Read-Host "Your choice"
        $choice = $choice.ToUpper()
    } while ($choice -notin @('R', 'F', 'B', 'E'))
    
    return $choice
}

# Main execution loop
do {
    $frontendPassed = Run-FrontendTests
    $backendPassed = Run-BackendTests
    Show-Summary $frontendPassed $backendPassed
    
    $choice = Show-Menu
    
    switch ($choice) {
        'R' { 
            Write-Host ""
            Write-Host "Restarting all tests..." -ForegroundColor Yellow
            continue 
        }
        'F' { 
            Write-Host ""
            Write-Host "Running frontend tests only..." -ForegroundColor Yellow
            Set-Location admin-frontend
            pnpm test:coverage
            Set-Location ..
            Write-Host ""
            Write-Host "Press any key to return to main menu..." -ForegroundColor Yellow
            $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
        }
        'B' { 
            Write-Host ""
            Write-Host "Running backend tests only..." -ForegroundColor Yellow
            Set-Location api-server
            pnpm test:coverage
            Set-Location ..
            Write-Host ""
            Write-Host "Press any key to return to main menu..." -ForegroundColor Yellow
            $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
        }
        'E' { 
            Write-Host ""
            Write-Host "Goodbye! 👋" -ForegroundColor Green
            exit 0
        }
    }
} while ($choice -ne 'E') 