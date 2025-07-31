#!/bin/bash

echo "Installing and Starting Krapi CMS..."
echo ""

# Function to check if PostgreSQL is accessible
check_postgres_connection() {
    echo "Checking PostgreSQL connection..."
    
    # Try to connect using psql if available
    if command -v psql >/dev/null 2>&1; then
        if PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d krapi -c "SELECT 1;" >/dev/null 2>&1; then
            echo "PostgreSQL is accessible via psql!"
            return 0
        fi
    fi
    
    # Try using docker exec if container is running
    if docker ps | grep -q "krapi-postgres"; then
        if docker exec krapi-postgres pg_isready -U postgres >/dev/null 2>&1; then
            echo "PostgreSQL container is running and ready!"
            return 0
        fi
    fi
    
    # Try using netcat to check if port is open
    if command -v nc >/dev/null 2>&1; then
        if nc -z localhost 5432 2>/dev/null; then
            echo "PostgreSQL port 5432 is open, but connection test failed"
            return 1
        fi
    fi
    
    # Try using Node.js health check script
    if command -v node >/dev/null 2>&1 && [ -f "scripts/db-health-check.js" ]; then
        if node scripts/db-health-check.js >/dev/null 2>&1; then
            echo "PostgreSQL is accessible via Node.js health check!"
            return 0
        fi
    fi
    
    return 1
}

# Function to check if Docker is available
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        echo "ERROR: Docker is not installed or not in PATH"
        echo "Please install Docker and try again"
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        echo "ERROR: Docker is not running"
        echo "Please start Docker and try again"
        return 1
    fi
    
    return 0
}

# Function to check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose >/dev/null 2>&1; then
        echo "ERROR: docker-compose is not installed or not in PATH"
        echo "Please install docker-compose and try again"
        return 1
    fi
    
    return 0
}

# Function to start PostgreSQL with Docker
start_postgres_docker() {
    echo "Starting PostgreSQL with Docker..."
    
    if ! check_docker; then
        return 1
    fi
    
    if ! check_docker_compose; then
        return 1
    fi
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        echo "ERROR: docker-compose.yml not found in current directory"
        return 1
    fi
    
    # Start PostgreSQL container
    docker-compose up -d postgres
    
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to start PostgreSQL container"
        return 1
    fi
    
    echo "PostgreSQL container started successfully!"
    return 0
}

# Function to wait for PostgreSQL to be ready
wait_for_postgres() {
    echo "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if check_postgres_connection; then
            echo "PostgreSQL is ready!"
            return 0
        fi
        echo "Waiting for PostgreSQL to be ready... (attempt $i/30)"
        sleep 2
    done
    echo "ERROR: PostgreSQL is not responding after 60 seconds"
    return 1
}

# Check if PostgreSQL is already accessible
if check_postgres_connection; then
    echo "PostgreSQL is already accessible!"
else
    echo "PostgreSQL is not accessible. Attempting to start with Docker..."
    
    if ! start_postgres_docker; then
        echo "Failed to start PostgreSQL with Docker. Please check your Docker installation and try again."
        exit 1
    fi
    
    # Wait for PostgreSQL to be ready
    if ! wait_for_postgres; then
        echo "Failed to connect to PostgreSQL. Please check your Docker installation and try again."
        exit 1
    fi
fi

echo ""
echo "PostgreSQL is ready. Installing dependencies..."
echo ""

echo "Step 1: Installing SDK dependencies and building..."
cd packages/krapi-sdk
pnpm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install SDK dependencies"
    exit 1
fi
pnpm run build
if [ $? -ne 0 ]; then
    echo "Error: Failed to build SDK"
    exit 1
fi
echo "SDK built successfully!"
echo ""
cd ../..

echo "Step 2: Installing Backend Server dependencies..."
cd backend-server
pnpm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install Backend Server dependencies"
    exit 1
fi
echo "Backend Server dependencies installed successfully!"
echo ""
cd ..

echo "Step 3: Installing Frontend Manager dependencies..."
cd frontend-manager
pnpm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install Frontend Manager dependencies"
    exit 1
fi
echo "Frontend Manager dependencies installed successfully!"
echo ""
cd ..

echo "Step 4: Starting all services..."
echo ""

# Start SDK in watch mode
echo "Starting SDK in watch mode..."
(cd packages/krapi-sdk && pnpm run dev) &
SDK_PID=$!

# Wait a bit for SDK to start
sleep 3

# Start Backend Server
echo "Starting Backend Server on port 3470..."
(cd backend-server && pnpm run dev) &
BACKEND_PID=$!

# Start Frontend Manager
echo "Starting Frontend Manager on port 3469..."
(cd frontend-manager && pnpm run dev) &
FRONTEND_PID=$!

echo ""
echo "All services are starting..."
echo "Backend Server: http://localhost:3470"
echo "Frontend Manager: http://localhost:3469"
echo "SDK: Building and watching for changes"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $SDK_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "Services stopped."
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Wait for all background processes
wait