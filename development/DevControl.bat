@echo off
title Krapi Development Control Panel
color 0F

echo.
echo ========================================
echo   🎮 Krapi Development Control Panel
echo ========================================
echo.

:: Go to project root directory
cd /d "%~dp0\.."

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed!
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo Then run this program again.
    pause
    exit /b 1
)

:: Check if we're in the right directory
if not exist "development\dev-control\server.js" (
    echo ❌ Error: Control panel files not found!
    echo.
    echo Make sure you're running this from the correct directory.
    echo Current directory: %CD%
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies!
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully!
    echo.
)

:: Check if already running
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:4000' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop | Out-Null; Write-Host '⚠️  Control panel is already running!'; Start-Process 'http://localhost:4000'; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    echo Opening existing control panel...
    timeout /t 2 >nul
    exit /b 0
)

:: Start the control panel
echo 🚀 Starting Krapi Development Control Panel...
echo.
echo ✅ Control Panel: http://localhost:4000
echo ✅ WebSocket Logs: ws://localhost:4001
echo.
echo 💡 Tip: Keep this window open while using the control panel
echo 🛑 Press Ctrl+C to stop the control panel
echo.

node development\dev-control\server.js

echo.
echo 👋 Control panel stopped. Press any key to exit.
pause >nul 