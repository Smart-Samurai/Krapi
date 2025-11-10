@echo off
REM KRAPI SDK Version Publisher - Windows Batch Script

cd /d "%~dp0"

echo.
echo ========================================
echo   KRAPI SDK Version Publisher
echo ========================================
echo.

node publish-version.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Script exited with error code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

pause

