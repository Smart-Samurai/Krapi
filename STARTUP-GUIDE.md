# 🚀 KRAPI Startup Guide

## Quick Start (Recommended)

### 🎯 Development Mode

```bash
# From the root directory
pnpm run dev
```

This will:

1. Build the SDK
2. Start backend server (localhost:3470)
3. Start frontend manager (localhost:3469)
4. Show colored logs for both services

### ⚡ Quick Development (Skip Build)

```bash
# Skip SDK build for faster startup
pnpm run dev:quick
```

### 🏭 Production Mode

```bash
# From the root directory
pnpm run start
```

This will:

1. Build all packages (SDK, backend, frontend)
2. Start both services in production mode

## Alternative Methods

### Method 1: Using Manager Scripts

#### Linux/macOS:

```bash
# Make executable (first time only)
chmod +x krapi-manager.sh

# Run development mode
./krapi-manager.sh dev

# Run with health checks
./krapi-manager.sh health
./krapi-manager.sh dev

# Quick development (skip checks)
./krapi-manager.sh quick-dev
```

#### Windows (PowerShell):

```powershell
# Run development mode
.\krapi-manager.ps1 dev

# Run with health checks
.\krapi-manager.ps1 health
.\krapi-manager.ps1 dev
```

### Method 2: Manual Service Control

#### Start Individual Services:

```bash
# Backend only
pnpm run dev:backend

# Frontend only
pnpm run dev:frontend

# SDK development mode
pnpm run dev:sdk
```

## Complete Command Reference

### 📦 Installation & Setup

```bash
pnpm run install:all    # Install all dependencies
pnpm run clean          # Clean all build artifacts
pnpm run reset          # Clean + reinstall everything
```

### 🔨 Development

```bash
pnpm run dev            # Full development mode
pnpm run dev:quick      # Quick development mode
pnpm run dev:backend    # Backend only
pnpm run dev:frontend   # Frontend only
pnpm run dev:sdk        # SDK development mode
```

### 🏗️ Building

```bash
pnpm run build          # Build all packages
pnpm run build:backend  # Build backend only
pnpm run build:frontend # Build frontend only
pnpm run build:sdk      # Build SDK only
```

### 🚀 Production

```bash
pnpm run start          # Start in production mode
pnpm run start:backend  # Backend production only
pnpm run start:frontend # Frontend production only
```

### 🔍 Quality Assurance

```bash
pnpm run lint           # Run all linting
pnpm run lint:fix       # Fix all linting issues
pnpm run type-check     # TypeScript type checking
pnpm run health         # Complete health check
```

### 🐳 Docker Management

```bash
pnpm run docker:up      # Start Docker services
pnpm run docker:down    # Stop Docker services
pnpm run docker:logs    # View Docker logs
```

## Environment Setup

### Prerequisites

- **Node.js** 18+
- **pnpm** package manager
- **Docker** (optional, for database)
- **PostgreSQL** (if not using Docker)

### Database Options

#### Option 1: Docker (Recommended)

```bash
# Start PostgreSQL with Docker
pnpm run docker:up
```

#### Option 2: Local PostgreSQL

Set these environment variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=krapi
DB_USER=postgres
DB_PASSWORD=your_password
```

### Environment Variables

The app comes with sensible defaults, but you can customize:

```env
# Database
DB_HOST=localhost
DB_PORT=5420
DB_NAME=krapi
DB_USER=postgres
DB_PASSWORD=postgres

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
SESSION_EXPIRES_IN=1h
DEFAULT_ADMIN_PASSWORD=admin123

# Server
PORT=3470
HOST=localhost
NODE_ENV=development
```

## Service URLs

### Development Mode

- **Frontend Manager**: http://localhost:3469
- **Backend API**: http://localhost:3470
- **Backend Health**: http://localhost:3470/health

### Default Login

- **Username**: `admin`
- **Password**: `admin123` (change in production!)

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Kill processes on ports
npx kill-port 3469 3470

# Or use different ports
PORT=3471 pnpm run dev:backend
```

#### Database Connection Issues

```bash
# Check Docker status
docker ps

# Restart database
pnpm run docker:down
pnpm run docker:up
```

#### Build Errors

```bash
# Clean rebuild
pnpm run reset
pnpm run dev
```

#### Permission Issues (Linux/macOS)

```bash
# Make scripts executable
chmod +x krapi-manager.sh
chmod +x backend-server/start-dev.sh
```

### Health Check

```bash
# Comprehensive health check
pnpm run health
```

This will:

1. Install all dependencies
2. Run linting on all packages
3. Run TypeScript type checking
4. Build all packages
5. Report any issues

## Development Workflow

### 1. First Time Setup

```bash
git clone <repository>
cd krapi
pnpm run install:all
pnpm run health      # Verify everything works
pnpm run dev         # Start development
```

### 2. Daily Development

```bash
# Quick start (most common)
pnpm run dev:quick

# With fresh build
pnpm run dev

# Check health periodically
pnpm run health
```

### 3. Before Deployment

```bash
pnpm run health      # Ensure everything passes
pnpm run start       # Test production build
```

## Manager Script Features

Both `krapi-manager.sh` (Linux/macOS) and `krapi-manager.ps1` (Windows) provide:

- **Comprehensive health checks**
- **Dependency management**
- **Colored output and logging**
- **Error handling and cleanup**
- **Docker integration**
- **Background process management**

### Manager Commands

```bash
./krapi-manager.sh help           # Show help
./krapi-manager.sh install        # Install dependencies
./krapi-manager.sh lint           # Run linting
./krapi-manager.sh type-check     # Run type checking
./krapi-manager.sh health         # Full health check
./krapi-manager.sh dev            # Development mode
./krapi-manager.sh quick-dev      # Quick development
./krapi-manager.sh prod           # Production mode
```

## Performance Notes

- **dev:quick**: Fastest startup (skips SDK build)
- **dev**: Slower startup but ensures SDK is fresh
- **Manager scripts**: Add overhead but provide better error handling
- **Docker**: Adds ~2-3 seconds to startup time

## Next Steps

Once running:

1. Visit http://localhost:3469 for the frontend manager
2. Login with admin/admin123
3. Explore the project management interface
4. Check out the API at http://localhost:3470
5. Review the comprehensive SDK documentation in `packages/krapi-sdk/README.md`

Happy coding! 🎉
