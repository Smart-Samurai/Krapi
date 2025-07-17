@echo off
title Krapi CMS - Unified Development Environment
color 0A
cls

echo ================================================
echo      KRAPI CMS - UNIFIED DEVELOPMENT LAUNCHER
echo ================================================
echo.

:: Navigate to the project root directory
cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Please install Node.js and npm from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

:: Check if pnpm is installed
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
  echo WARNING: pnpm is not installed or not in PATH.
  echo Installing pnpm globally...
  npm install -g pnpm
  if %errorlevel% neq 0 (
    echo ERROR: Failed to install pnpm.
    pause
    exit /b 1
  )
)

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Check for port conflicts and warn user
echo Checking for port conflicts...
set /a port4000=0
set /a port3000=0
set /a port3001=0

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do set /a port4000+=1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do set /a port3000+=1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do set /a port3001+=1

if %port4000% gtr 0 (
  echo WARNING: Port 4000 is in use. Dev control panel may not start properly.
)
if %port3000% gtr 0 (
  echo WARNING: Port 3000 is in use. Frontend may not start properly.
)
if %port3001% gtr 0 (
  echo WARNING: Port 3001 is in use. API server may not start properly.
)

if %port4000% gtr 0 if %port3000% gtr 0 if %port3001% gtr 0 (
  echo.
  echo All required ports are in use. Please close other applications using these ports:
  echo - Port 4000: Dev Control Panel
  echo - Port 3000: Frontend
  echo - Port 3001: API Server
  echo.
  echo Press any key to continue anyway, or Ctrl+C to cancel...
  pause >nul
)

echo.
echo Starting all services...
echo.

:: Run the Node.js launcher
node launcher.js

:: This will run when the launcher exits (user pressed Ctrl+C)
echo.
echo All services have been stopped.
echo.
pause 