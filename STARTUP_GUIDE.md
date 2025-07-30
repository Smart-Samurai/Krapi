# Krapi CMS Startup Guide

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and pnpm installed
- PostgreSQL running via Docker Compose

## Important: SDK Requirement

**Yes, the SDK needs to be active with `pnpm run dev` for the application to function properly!**

The SDK (`@krapi/sdk`) is a workspace package that both the backend and frontend depend on. It must be:
1. Built initially (`pnpm run build`)
2. Running in watch mode (`pnpm run dev`) during development

Without the SDK running, you'll encounter import errors in both the backend and frontend.

## Quick Start

### For Linux/macOS:
```bash
# First time setup and start
./tall-krapi.sh

# Subsequent starts
./start-krapi.sh
```

### For Windows:
```batch
# First time setup and start
tall-krapi.bat

# Subsequent starts
start-krapi.bat
```

## Common Issues and Solutions

### 1. PostgreSQL Connection Timeout

**Problem**: Backend fails immediately with connection timeout to PostgreSQL.

**Solutions**:
- Ensure Docker is running
- Start PostgreSQL manually: `docker-compose up -d postgres`
- Wait for PostgreSQL to be ready before starting services
- The updated scripts now include automatic PostgreSQL health checks

### 2. Tailwind CSS PostCSS Error

**Problem**: Frontend fails with "tailwindcss directly as a PostCSS plugin" error.

**Solution**: This has been fixed by:
- Installing `@tailwindcss/postcss` package
- Updating `postcss.config.js` to use `@tailwindcss/postcss` instead of `tailwindcss`

### 3. SDK Not Found Errors

**Problem**: Import errors for `@krapi/sdk` in backend or frontend.

**Solution**: 
- Ensure SDK is built: `cd packages/krapi-sdk && pnpm run build`
- Keep SDK running in watch mode: `cd packages/krapi-sdk && pnpm run dev`

## Service Architecture

The application consists of three main services that must run simultaneously:

1. **SDK** (workspace package)
   - Location: `packages/krapi-sdk`
   - Must run in watch mode during development
   - Provides shared types and utilities

2. **Backend Server** (Port 3470)
   - Location: `backend-server`
   - Connects to PostgreSQL database
   - Provides API endpoints

3. **Frontend Manager** (Port 3469)
   - Location: `frontend-manager`
   - Next.js application
   - Depends on SDK for types and utilities

## Manual Service Management

If you prefer to start services manually:

```bash
# Terminal 1: Start PostgreSQL
docker-compose up -d postgres

# Terminal 2: SDK (must be first!)
cd packages/krapi-sdk
pnpm install
pnpm run build  # Initial build
pnpm run dev    # Watch mode

# Terminal 3: Backend
cd backend-server
pnpm install
pnpm run dev

# Terminal 4: Frontend
cd frontend-manager
pnpm install
pnpm run dev
```

## Troubleshooting Steps

1. **Check Docker**: `docker ps` - Ensure PostgreSQL container is running
2. **Check PostgreSQL**: `docker-compose logs postgres` - Look for errors
3. **Rebuild SDK**: `cd packages/krapi-sdk && pnpm run build`
4. **Clear node_modules**: `pnpm store prune && pnpm install` (from root)
5. **Check ports**: Ensure 3469, 3470, and 5432 are not in use

## Environment Variables

The application uses default values, but you can customize:

- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name (default: krapi)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password (default: postgres)