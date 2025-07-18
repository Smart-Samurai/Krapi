@echo off
echo ================================================
echo     KRAPI CMS - DEVELOPMENT MANAGER
echo ================================================
echo.
echo Expected Ports:
echo   - Frontend: http://localhost:3469
echo   - API: http://localhost:3470
echo   - WebSocket: ws://localhost:3471
echo.
echo ================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

echo Found Python executable: python
echo.

REM Install Python dependencies if needed
echo Installing Python dependencies...
pip install -r requirements.txt
echo.

echo Starting Krapi CMS Development Manager...
echo.

REM Start the Python manager
python start-manager.py

pause 