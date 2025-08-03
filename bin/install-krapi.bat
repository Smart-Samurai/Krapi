@echo off
echo Installing Krapi CMS dependencies...
echo.

echo Installing SDK dependencies and building...
cd /d %~dp0..\packages\krapi-sdk
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

echo Installing Backend Server dependencies...
cd /d %~dp0..\backend-server
pnpm install
if %errorlevel% neq 0 (
    echo Error: Failed to install Backend Server dependencies
    pause
    exit /b 1
)
echo Backend Server dependencies installed successfully!
echo.

echo Installing Frontend Manager dependencies...
cd /d %~dp0..\frontend-manager
pnpm install
if %errorlevel% neq 0 (
    echo Error: Failed to install Frontend Manager dependencies
    pause
    exit /b 1
)
echo Frontend Manager dependencies installed successfully!
echo.

echo.
echo All dependencies installed successfully!
echo You can now run start-krapi.bat to start the services.
echo.
pause 