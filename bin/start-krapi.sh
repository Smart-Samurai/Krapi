#!/bin/bash

echo "Starting Krapi CMS..."
echo ""

# Function to check if PostgreSQL is running
check_postgres() {
    echo "Checking PostgreSQL connection..."
    for i in {1..30}; do
        if docker-compose -f "$(dirname "$0")/docker-compose.yml" ps | grep -q "krapi-postgres" && docker-compose -f "$(dirname "$0")/docker-compose.yml" exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
            echo "PostgreSQL is ready!"
            return 0
        fi
        echo "Waiting for PostgreSQL to be ready... (attempt $i/30)"
        sleep 2
    done
    echo "ERROR: PostgreSQL is not responding after 60 seconds"
    return 1
}

# Start PostgreSQL if not already running
if ! docker-compose -f "$(dirname "$0")/docker-compose.yml" ps | grep -q "krapi-postgres"; then
    echo "Starting PostgreSQL..."
    docker-compose -f "$(dirname "$0")/docker-compose.yml" up -d postgres
    sleep 5
fi

# Check if PostgreSQL is ready
if ! check_postgres; then
    echo "Failed to connect to PostgreSQL. Please check your Docker installation and try again."
    exit 1
fi

echo ""
echo "PostgreSQL is ready. Starting application services..."
echo ""

# Get the project root directory (one level up from bin)
PROJECT_ROOT="$(dirname "$0")/.."

# Start SDK in watch mode
echo "Starting SDK in watch mode..."
(cd "$PROJECT_ROOT/packages/krapi-sdk" && pnpm run dev) &
SDK_PID=$!

# Wait a bit for SDK to start building
sleep 3

# Start Backend Server
echo "Starting Backend Server on port 3470..."
(cd "$PROJECT_ROOT/backend-server" && pnpm run dev) &
BACKEND_PID=$!

# Start Frontend Manager
echo "Starting Frontend Manager on port 3469..."
(cd "$PROJECT_ROOT/frontend-manager" && pnpm run dev) &
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