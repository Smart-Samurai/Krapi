@echo off
echo Installing Krapi CMS dependencies...
echo.

echo Installing Backend Server dependencies...
cd /d %~dp0backend-server
pnpm install
if %errorlevel% neq 0 (
    echo Error: Failed to install Backend Server dependencies
    pause
    exit /b 1
)
echo Backend Server dependencies installed successfully!
echo.

echo Installing Frontend Manager dependencies...
cd /d %~dp0frontend-manager
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