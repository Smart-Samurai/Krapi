@echo off
echo Installing and Starting Krapi CMS...
echo.

REM Function to check if PostgreSQL is accessible
:check_postgres_connection
echo Checking PostgreSQL connection...
echo.

REM Try to connect using psql if available
where psql >nul 2>&1
if %errorlevel% equ 0 (
    set PGPASSWORD=postgres
    psql -h localhost -p 5432 -U postgres -d krapi -c "SELECT 1;" >nul 2>&1
    if %errorlevel% equ 0 (
        echo PostgreSQL is accessible via psql!
        goto :postgres_ready
    )
)

REM Try using docker exec if container is running
docker ps | findstr "krapi-postgres" >nul 2>&1
if %errorlevel% equ 0 (
    docker exec krapi-postgres pg_isready -U postgres >nul 2>&1
    if %errorlevel% equ 0 (
        echo PostgreSQL container is running and ready!
        goto :postgres_ready
    )
)

REM Try using netcat to check if port is open (if available)
where nc >nul 2>&1
if %errorlevel% equ 0 (
    nc -z localhost 5432 >nul 2>&1
    if %errorlevel% equ 0 (
        echo PostgreSQL port 5432 is open, but connection test failed
        goto :start_postgres_docker
    )
)

echo PostgreSQL is not accessible. Attempting to start with Docker...
goto :start_postgres_docker

:check_docker
REM Check if Docker is available
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker and try again
    pause
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running
    echo Please start Docker and try again
    pause
    exit /b 1
)
goto :eof

:check_docker_compose
REM Check if docker-compose is available
where docker-compose >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: docker-compose is not installed or not in PATH
    echo Please install docker-compose and try again
    pause
    exit /b 1
)
goto :eof

:start_postgres_docker
echo Starting PostgreSQL with Docker...
echo.

call :check_docker
if %errorlevel% neq 0 (
    pause
    exit /b 1
)

call :check_docker_compose
if %errorlevel% neq 0 (
    pause
    exit /b 1
)

REM Check if docker-compose.yml exists in the bin directory
if not exist "%~dp0docker-compose.yml" (
    echo ERROR: docker-compose.yml not found in bin directory
    pause
    exit /b 1
)

REM Start PostgreSQL container
docker-compose -f "%~dp0docker-compose.yml" up -d postgres
if %errorlevel% neq 0 (
    echo ERROR: Failed to start PostgreSQL container
    pause
    exit /b 1
)

echo PostgreSQL container started successfully!
echo.

REM Wait for PostgreSQL to be ready
echo Waiting for PostgreSQL to be ready...
for /l %%i in (1,1,30) do (
    call :check_postgres_connection
    if %errorlevel% equ 0 (
        echo PostgreSQL is ready!
        goto :postgres_ready
    )
    echo Waiting for PostgreSQL to be ready... (attempt %%i/30)
    timeout /t 2 /nobreak >nul
)

echo ERROR: PostgreSQL is not responding after 60 seconds
pause
exit /b 1

:postgres_ready
echo.
echo PostgreSQL is ready. Installing dependencies...
echo.

echo Step 1: Installing SDK dependencies and building...
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

echo Step 2: Installing Backend Server dependencies...
cd /d %~dp0..\backend-server
pnpm install
if %errorlevel% neq 0 (
    echo Error: Failed to install Backend Server dependencies
    pause
    exit /b 1
)
echo Backend Server dependencies installed successfully!
echo.

echo Step 3: Installing Frontend Manager dependencies...
cd /d %~dp0..\frontend-manager
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
start "SDK Development" cmd /k "cd /d %~dp0..\packages\krapi-sdk && pnpm run dev"

echo Starting Backend Server on port 3470...
start "Backend Server" cmd /k "cd /d %~dp0..\backend-server && pnpm run dev"

echo Starting Frontend Manager on port 3469...
start "Frontend Manager" cmd /k "cd /d %~dp0..\frontend-manager && pnpm run dev"

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