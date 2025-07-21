@echo off
echo Starting Krapi CMS...
echo.

echo Starting API Server on port 3470...
start "API Server" cmd /k "cd /d %~dp0api-server && pnpm run dev"

echo Starting Frontend on port 3469...
start "Frontend" cmd /k "cd /d %~dp0admin-frontend && pnpm run dev"

echo.
echo Both services are starting in separate windows...
echo API Server: http://localhost:3470
echo Frontend: http://localhost:3469
echo.
echo Note: Closing this window will NOT stop the services.
echo To stop the services, close the individual API Server and Frontend windows.
echo.
pause 