@echo off
echo Installing Krapi CMS dependencies...
echo.

echo Installing API Server dependencies...
cd /d %~dp0api-server
pnpm install
if %errorlevel% neq 0 (
    echo Error: Failed to install API Server dependencies
    pause
    exit /b 1
)
echo API Server dependencies installed successfully!
echo.

echo Installing Frontend dependencies...
cd /d %~dp0admin-frontend
pnpm install
if %errorlevel% neq 0 (
    echo Error: Failed to install Frontend dependencies
    pause
    exit /b 1
)
echo Frontend dependencies installed successfully!
echo.

echo.
echo All dependencies installed successfully!
echo You can now run start-krapi.bat to start the services.
echo.
pause 