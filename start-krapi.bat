@echo off
echo Starting Krapi CMS...
echo.

echo Starting API Server on port 3470...
start "API Server" cmd /k "cd /d %~dp0api-server && pnpm run dev"

echo Starting Frontend on port 3469...
start "Frontend" cmd /k "cd /d %~dp0admin-frontend && pnpm run dev"

echo.
echo Both services are starting...
echo API Server: http://localhost:3470
echo Frontend: http://localhost:3469
echo.
echo Press any key to stop all services...
pause >nul

echo Stopping all services...
taskkill /F /IM node.exe
echo Services stopped. 