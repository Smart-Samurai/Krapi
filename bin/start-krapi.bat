@echo off
echo Starting Krapi CMS...
echo.

echo Starting SDK in watch mode...
start "SDK Development" cmd /k "cd /d %~dp0..\packages\krapi-sdk && pnpm run dev"

echo Starting Backend Server on port 3470...
start "Backend Server" cmd /k "cd /d %~dp0..\backend-server && pnpm run dev"

echo Starting Frontend Manager on port 3469...
start "Frontend Manager" cmd /k "cd /d %~dp0..\frontend-manager && pnpm run dev"

echo.
echo Both services are starting in separate windows...
echo Backend Server: http://localhost:3470
echo Frontend Manager: http://localhost:3469
echo SDK: Building and watching for changes
echo.
echo Note: Closing this window will NOT stop the services.
echo To stop the services, close the individual Backend Server and Frontend Manager windows.
echo.
pause 