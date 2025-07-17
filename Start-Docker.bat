@echo off
title Krapi CMS - Docker Development
echo.
echo 🐳 Starting Docker Development Environment...
echo.

cd /d "%~dp0"

:: Check if Docker is running
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not installed or not running!
    echo Please install Docker Desktop and make sure it's running.
    pause
    exit /b 1
)

:: Navigate to docker directory and start
cd docker
echo 📦 Starting Docker containers...
docker-compose up -d

if errorlevel 1 (
    echo ❌ Failed to start Docker containers!
    pause
    exit /b 1
)

echo ✅ Docker environment started successfully!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 API: http://localhost:3001
echo.
echo To stop the environment, run: docker-compose down
echo.
pause 