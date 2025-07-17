@echo off
setlocal enabledelayedexpansion
title Krapi CMS Development Manager
color 0A
cls

echo ================================================
echo      KRAPI CMS - DEVELOPMENT MANAGER
echo ================================================
echo.

:: Navigate to the project root directory
cd /d "%~dp0"

:: Check for Python executable using delayed expansion
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

!python_exec! StartManager.py
if !errorlevel! neq 0 (
  echo.
  echo ERROR: Failed to start Development Manager.
  echo.
  pause
  exit /b 1
)

echo.
echo Development Manager has exited.
pause