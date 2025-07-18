@echo off
setlocal enabledelayedexpansion
title Krapi CMS Development Manager
color 0A
cls

echo ================================================
echo      KRAPI CMS - DEVELOPMENT MANAGER
echo ================================================
echo Cross-platform development environment manager

:: Navigate to the project root directory
cd /d "%~dp0"

set "python_found=false"
for %%i in (python python3 py) do (
    %%i --version >nul 2>&1
    if !errorlevel! equ 0 (
        set "python_found=true"
        set "python_exec=%%i"
        goto :python_found
    )
)

:python_not_found
echo ERROR: Python is not installed or not in PATH.
echo Please install Python from https://python.org/
echo.
pause
exit /b 1

:python_found
echo Found Python executable: !python_exec!
echo.

:: Check if virtual environment exists, create if not
if not exist "manager-env" (
  echo Creating Python virtual environment...
  !python_exec! -m venv manager-env
  if !errorlevel! neq 0 (
    echo ERROR: Failed to create virtual environment.
    echo Please ensure python-venv is installed.
    echo.
    pause
    exit /b 1
  )
)

:: Activate virtual environment
call manager-env\Scripts\activate.bat
if !errorlevel! neq 0 (
  echo ERROR: Failed to activate virtual environment.
  echo.
  pause
  exit /b 1
)

:: Install dependencies if requirements.txt exists
if exist "requirements.txt" (
  echo Installing Python dependencies...
  pip install -r requirements.txt
  if !errorlevel! neq 0 (
    echo ERROR: Failed to install dependencies.
    echo.
    pause
    exit /b 1
  )
)

:: Start the Development Manager
echo.
echo Starting Krapi CMS Development Manager...
echo.

python StartManager.py
if !errorlevel! neq 0 (
  echo.
  echo ERROR: Failed to start Development Manager.
  echo.
  pause
  exit /b 1
)

echo.
echo Development Manager has exited.
:found_python
echo Found Python: %PYTHON_CMD%

:: Check Python version
%PYTHON_CMD% --version
if %errorlevel% neq 0 (
    echo ERROR: Python command failed.
    pause
    exit /b 1
)

:: Check if virtual environment exists, create if not
if not exist "venv" (
    echo Creating Python virtual environment...
    %PYTHON_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment.
        echo Please ensure python-venv is installed.
        echo Try: %PYTHON_CMD% -m pip install --upgrade pip
        echo.
        pause
        exit /b 1
    )
    echo Virtual environment created successfully.
)

:: Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo ERROR: Failed to activate virtual environment.
    pause
    exit /b 1
)

:: Check if psutil is installed, install if not
python -c "import psutil" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing required Python dependencies...
    pip install --upgrade pip
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Python dependencies.
        echo Please check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully.
)

echo.
echo Starting Krapi CMS Development Manager...
echo Note: If GUI is not available, web interface will start automatically
echo Platform: Windows
echo.

:: Run the Python manager (will auto-detect GUI availability)
python start-manager.py %*

:: Check exit code
if %errorlevel% neq 0 (
    echo.
    echo Manager exited with error code: %errorlevel%
    pause
)

echo.
echo Manager has stopped.
pause