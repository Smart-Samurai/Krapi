@echo off
echo Starting Krapi CMS...
echo.

echo Starting Backend Server on port 3001...
start "Backend Server" cmd /k "cd /d %~dp0backend-server && pnpm run dev"

echo Starting Frontend Manager on port 3000...
start "Frontend Manager" cmd /k "cd /d %~dp0frontend-manager && pnpm run dev"

echo.
echo Both services are starting in separate windows...
echo Backend Server: http://localhost:3001
echo Frontend Manager: http://localhost:3000
echo.
echo Note: Closing this window will NOT stop the services.
echo To stop the services, close the individual Backend Server and Frontend Manager windows.
echo.
pause 