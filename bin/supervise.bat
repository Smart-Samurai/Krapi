@echo off
setlocal enabledelayedexpansion

REM Unified supervisor for KRAPI (Windows)
REM - Interactive menu to:
REM   1) Full setup: install deps, start Postgres (Docker), build apps, start (prod)
REM   2) Dev mode: ensure Postgres, start SDK/Backend/Frontend in dev in separate windows
REM   3) Utilities: install deps, build apps, start/reset Postgres
REM - Non-interactive: pass -y or --auto to default to option 1
REM
REM Usage:
REM   bin\supervise.bat [-y|--auto]

set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
set LOG_DIR=%PROJECT_ROOT%\logs
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Defaults
if not defined BACKEND_PORT set BACKEND_PORT=3470
if not defined FRONTEND_PORT set FRONTEND_PORT=3469

REM DB env for local dev
if not defined DB_HOST set DB_HOST=localhost
if not defined DB_PORT set DB_PORT=5432
if not defined DB_NAME set DB_NAME=krapi
if not defined DB_USER set DB_USER=postgres
if not defined DB_PASSWORD set DB_PASSWORD=postgres

set AUTO=0
set "ARGS=%*"
if defined ARGS (
  for %%A in (%ARGS%) do (
    if "%%~A"=="-y" set AUTO=1
    if "%%~A"=="--auto" set AUTO=1
    if /I "%%~A"=="--dev" set MODE=DEV
    if /I "%%~A"=="--prod" set MODE=PROD
    if /I "%%~A"=="--install" set MODE=INSTALL
    if /I "%%~A"=="--build" set MODE=BUILD
    if /I "%%~A"=="--start-db" set MODE=STARTDB
    if /I "%%~A"=="--reset-db" set MODE=RESETDB
    if /I "%%~A"=="--help" set MODE=HELP
  )
)

REM Jump over function definitions to :main
goto :main

:has_pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
  echo [supervise] pnpm not found. Please install pnpm ^(via corepack^) and retry:
  echo         1^) npm i -g corepack
  echo         2^) corepack enable
  echo         3^) corepack prepare pnpm@latest --activate
  exit /b 1
)
exit /b 0

:compose
REM Call docker compose (or docker-compose) with args: %*
where docker >nul 2>&1
if %errorlevel% neq 0 (
  echo [supervise] ERROR: docker not found in PATH
  exit /b 1
)
set COMPOSE_CMD=docker compose
where docker-compose >nul 2>&1
if %errorlevel% equ 0 set COMPOSE_CMD=docker-compose
for /f "delims=" %%C in ('powershell -NoProfile -Command "$args -join ' '" -- %*') do set COMPOSE_ARGS=%%C
%COMPOSE_CMD% %COMPOSE_ARGS%
exit /b %errorlevel%

:ensure_postgres
call :compose -f "%SCRIPT_DIR%docker-compose.yml" ps | findstr /i "krapi-postgres" >nul 2>&1
if %errorlevel% neq 0 (
  echo [supervise] Starting Postgres in Docker...
  call :compose -f "%SCRIPT_DIR%docker-compose.yml" up -d postgres
)

echo [supervise] Waiting for Postgres to be ready...
for /l %%i in (1,1,30) do (
  call :compose -f "%SCRIPT_DIR%docker-compose.yml" exec -T postgres pg_isready -U %DB_USER% >nul 2>&1
  if !errorlevel! equ 0 (
    echo [supervise] Postgres is ready
    goto :eof
  )
  timeout /t 2 /nobreak >nul
)
echo [supervise] WARNING: Postgres readiness timed out; proceeding anyway.
exit /b 0

:reset_postgres
set /p CONFIRM=This will STOP Postgres, DELETE its data volume 'postgres_data', and start fresh. Type RESET to continue: 
if /i not "%CONFIRM%"=="RESET" (
  echo [supervise] Aborted.
  goto :eof
)
call :compose -f "%SCRIPT_DIR%docker-compose.yml" down --remove-orphans
echo [supervise] Removing volume postgres_data...
docker volume rm postgres_data >nul 2>&1
call :compose -f "%SCRIPT_DIR%docker-compose.yml" up -d postgres
exit /b 0

:install_deps
call :has_pnpm
pushd "%PROJECT_ROOT%"
echo [supervise] Installing workspace dependencies...
pnpm install -w
if %errorlevel% neq 0 (
  echo [supervise] ERROR: pnpm install failed
  popd
  exit /b 1
)
popd
exit /b 0

:build_all
call :has_pnpm
echo [supervise] Building SDK...
pushd "%PROJECT_ROOT%\packages\krapi-sdk"
pnpm run build || (popd & exit /b 1)
popd

echo [supervise] Building Backend...
pushd "%PROJECT_ROOT%\backend-server"
pnpm run build || (popd & exit /b 1)
popd

echo [supervise] Building Frontend...
pushd "%PROJECT_ROOT%\frontend-manager"
pnpm run build || (popd & exit /b 1)
popd
exit /b 0

:start_dev_all
call :has_pnpm
call :ensure_postgres

echo [supervise] Starting SDK (dev) in new window...
start "SDK (dev)" cmd /k "cd /d %PROJECT_ROOT%\packages\krapi-sdk && pnpm run dev"

echo [supervise] Starting Backend (dev) on port %BACKEND_PORT% in new window...
start "Backend (dev)" cmd /k "cd /d %PROJECT_ROOT%\backend-server && pnpm run dev"

echo [supervise] Starting Frontend (dev) on port %FRONTEND_PORT% in new window...
start "Frontend (dev)" cmd /k "cd /d %PROJECT_ROOT%\frontend-manager && pnpm run dev"

echo [supervise] All dev services started. Close windows to stop them.
exit /b 0

:start_prod_all
call :has_pnpm
call :ensure_postgres

echo [supervise] Starting Backend (prod) in new window...
start "Backend (prod)" cmd /k "cd /d %PROJECT_ROOT%\backend-server && pnpm run start"

echo [supervise] Starting Frontend (prod) in new window...
start "Frontend (prod)" cmd /k "cd /d %PROJECT_ROOT%\frontend-manager && pnpm run start"

echo [supervise] Backend:  http://localhost:%BACKEND_PORT%
echo [supervise] Frontend: http://localhost:%FRONTEND_PORT%
echo [supervise] All prod services started. Close windows to stop them.
exit /b 0

:menu
cls
Echo KRAPI Supervisor (bat)
echo 1^) Full setup: install deps, start Postgres, build, start (prod)
echo 2^) Dev mode: ensure Postgres, start all in dev

echo 3^) Utilities
Echo    A^) Install deps only
Echo    B^) Build all only
Echo    C^) Start Postgres
Echo    D^) Reset Postgres (DESTROYS DATA)
Echo    E^) Back

echo Q^) Quit
set /p SELECTION=^> 
exit /b 0

:utilities
:utilities_loop
cls
echo Utilities:
echo A^) Install deps only
echo B^) Build all only
echo C^) Start Postgres
echo D^) Reset Postgres (DESTROYS DATA)
echo E^) Back
set /p UCHOICE=^> 
if /i "%UCHOICE%"=="A" call :install_deps & goto :utilities_loop
if /i "%UCHOICE%"=="B" call :build_all & goto :utilities_loop
if /i "%UCHOICE%"=="C" call :ensure_postgres & goto :utilities_loop
if /i "%UCHOICE%"=="D" call :reset_postgres & goto :utilities_loop
if /i "%UCHOICE%"=="E" goto :eof
echo Invalid option
goto :utilities_loop

:main
if defined MODE (
  if /I "%MODE%"=="HELP" (
    echo Usage: bin\supervise.bat [options]
    echo.
    echo Options:
    echo   --dev         Start SDK, Backend, Frontend in dev ^(ensures Postgres^)
    echo   --prod        Start Backend and Frontend in prod ^(ensures Postgres^)
    echo   --install     Install workspace dependencies
    echo   --build       Build SDK, Backend, Frontend
    echo   --start-db    Ensure Postgres Docker container is running
    echo   --reset-db    Reset Postgres Docker volume and start fresh
    echo   -y, --auto    Full setup: install, start Postgres, build, start ^(prod^)
    echo   --help        Show this help
    exit /b 0
  )
  if /I "%MODE%"=="DEV" (
    call :ensure_postgres
    call :start_dev_all
    exit /b %errorlevel%
  )
  if /I "%MODE%"=="PROD" (
    call :ensure_postgres
    call :start_prod_all
    exit /b %errorlevel%
  )
  if /I "%MODE%"=="INSTALL" (
    call :install_deps
    exit /b %errorlevel%
  )
  if /I "%MODE%"=="BUILD" (
    call :build_all
    exit /b %errorlevel%
  )
  if /I "%MODE%"=="STARTDB" (
    call :ensure_postgres
    exit /b %errorlevel%
  )
  if /I "%MODE%"=="RESETDB" (
    call :reset_postgres
    exit /b %errorlevel%
  )
)
if "%AUTO%"=="1" goto :auto_run

:loop
call :menu
if "%SELECTION%"=="1" (
  call :install_deps || goto :loop
  call :ensure_postgres
  call :build_all || goto :loop
  call :start_prod_all
  goto :loop
) else if "%SELECTION%"=="2" (
  call :start_dev_all
  goto :loop
) else if "%SELECTION%"=="3" (
  call :utilities
  goto :loop
) else if /i "%SELECTION%"=="Q" (
  exit /b 0
) else (
  echo Invalid selection
  timeout /t 1 >nul
  goto :loop
)

REM If the script was double-clicked, keep the window open on exit
if /I "%CMDEXTVERSION%" NEQ "" (
  echo.
  echo Press any key to exit...
  pause >nul
)

:auto_run
echo [supervise] Auto mode: running Option 1 - Full setup
call :install_deps
if errorlevel 1 exit /b 1
call :ensure_postgres
call :build_all
if errorlevel 1 exit /b 1
call :start_prod_all
exit /b 0
