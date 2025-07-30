@echo off
echo Installing and Starting Krapi CMS...
echo.

echo Step 1: Installing SDK dependencies and building...
cd /d %~dp0packages\krapi-sdk
pnpm install
if %errorlevel% neq 0 (
    echo Error: Failed to install SDK dependencies
    pause
    exit /b 1
)
pnpm run build
if %errorlevel% neq 0 (
    echo Error: Failed to build SDK
    pause
    exit /b 1
)
echo SDK built successfully!
echo.

echo Step 2: Installing Backend Server dependencies...
cd /d %~dp0backend-server
pnpm install
if %errorlevel% neq 0 (
    echo Error: Failed to install Backend Server dependencies
    pause
    exit /b 1
)
echo Backend Server dependencies installed successfully!
echo.

echo Step 3: Installing Frontend Manager dependencies...
cd /d %~dp0frontend-manager
pnpm install
if %errorlevel% neq 0 (
    echo Error: Failed to install Frontend Manager dependencies
    pause
    exit /b 1
)
echo Frontend Manager dependencies installed successfully!
echo.

echo Step 4: Starting all services...
echo.

echo Starting SDK in watch mode...
start "SDK Development" cmd /k "cd /d %~dp0packages\krapi-sdk && pnpm run dev"

echo Starting Backend Server on port 3470...
start "Backend Server" cmd /k "cd /d %~dp0backend-server && pnpm run dev"

echo Starting Frontend Manager on port 3469...
start "Frontend Manager" cmd /k "cd /d %~dp0frontend-manager && pnpm run dev"

echo.
echo All services are starting in separate windows...
echo Backend Server: http://localhost:3470
echo Frontend Manager: http://localhost:3469
echo SDK: Building and watching for changes
echo.
echo Note: Closing this window will NOT stop the services.
echo To stop the services, close the individual SDK Development, Backend Server and Frontend Manager windows.
echo.
pause