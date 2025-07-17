@echo off
title Krapi CMS Development Manager
color 0A
cls

echo ================================================
echo      KRAPI CMS - DEVELOPMENT MANAGER
echo ================================================
echo.

:: Navigate to the project root directory
cd /d "%~dp0"

:: Check if Python is installed
where python >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Python is not installed or not in PATH.
  echo Please install Python from https://python.org/
  echo.
  pause
  exit /b 1
)

:: Check if virtual environment exists, create if not
if not exist "manager-env" (
  echo Creating Python virtual environment...
  python -m venv manager-env
  if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment.
    echo Please ensure python-venv is installed.
    echo.
    pause
    exit /b 1
  )
)

:: Activate virtual environment and install dependencies
echo Activating virtual environment...
call manager-env\Scripts\activate.bat

:: Check if psutil is installed, install if not
python -c "import psutil" >nul 2>&1
if %errorlevel% neq 0 (
  echo Installing required Python dependencies...
  pip install -r requirements.txt
  if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies.
    echo.
    pause
    exit /b 1
  )
  echo.
)

echo Starting Krapi CMS Development Manager...
echo Note: If GUI is not available, web interface will start automatically
echo.

:: Run the Python manager (will auto-detect GUI availability)
python StartManager.py

pause