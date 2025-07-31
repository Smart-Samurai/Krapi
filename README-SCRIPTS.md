# Krapi CMS Startup Scripts

This document describes the enhanced startup scripts for Krapi CMS that automatically check for PostgreSQL availability and start Docker containers if needed.

## Available Scripts

### 1. `tall-krapi.sh` (Linux/macOS)

Bash script for Unix-like systems with comprehensive PostgreSQL checking.

### 2. `tall-krapi.bat` (Windows)

Batch script for Windows with PostgreSQL checking and Docker management.

### 3. `tall-krapi.ps1` (Windows PowerShell)

PowerShell script for Windows with enhanced features and better error handling.

### 4. `scripts/db-health-check.js` (Cross-platform)

Node.js script for detailed database health checking and diagnostics.

## Features

### Automatic PostgreSQL Detection

The scripts automatically check for PostgreSQL availability using multiple methods:

1. **Direct psql connection** - If `psql` is available in PATH
2. **Docker container check** - If PostgreSQL is running in Docker
3. **Port availability** - Check if port 5432 is open
4. **Node.js health check** - Comprehensive database connectivity test

### Docker Integration

If PostgreSQL is not accessible, the scripts will:

1. Check if Docker is installed and running
2. Verify docker-compose is available
3. Start PostgreSQL container using `docker-compose up -d postgres`
4. Wait for the database to be ready (up to 60 seconds)

### Database Health Check

The `scripts/db-health-check.js` script provides detailed database diagnostics:

- Connection testing
- PostgreSQL version detection
- Schema validation (checks for required tables)
- Admin user count
- Project count
- Detailed error messages with suggestions

## Usage

### Linux/macOS

```bash
# Make script executable
chmod +x tall-krapi.sh

# Run the script
./tall-krapi.sh
```

### Windows (Command Prompt)

```cmd
tall-krapi.bat
```

### Windows (PowerShell)

```powershell
# Set execution policy if needed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run the script
.\tall-krapi.ps1
```

### Database Health Check Only

```bash
# Using Node.js
node scripts/db-health-check.js

# Using npm script (if available)
npm run db:health-check
```

## Database Configuration

The scripts use the following default database configuration:

- **Host**: localhost
- **Port**: 5432
- **Database**: krapi
- **Username**: postgres
- **Password**: postgres

You can override these settings using environment variables:

```bash
export DB_HOST=your-host
export DB_PORT=5432
export DB_NAME=krapi
export DB_USER=postgres
export DB_PASSWORD=your-password
```

## Docker Requirements

The scripts require:

1. **Docker** - For running PostgreSQL container
2. **docker-compose** - For managing the PostgreSQL service
3. **docker-compose.yml** - Configuration file in the project root

The PostgreSQL container uses:

- **Image**: postgres:15-alpine
- **Container name**: krapi-postgres
- **Port mapping**: 5432:5432
- **Volume**: postgres_data (persistent storage)

## Error Handling

The scripts provide comprehensive error handling:

### Common Issues and Solutions

1. **Docker not installed**

   ```
   ERROR: Docker is not installed or not in PATH
   Solution: Install Docker Desktop or Docker Engine
   ```

2. **Docker not running**

   ```
   ERROR: Docker is not running
   Solution: Start Docker Desktop or Docker service
   ```

3. **docker-compose not found**

   ```
   ERROR: docker-compose is not installed or not in PATH
   Solution: Install docker-compose or use Docker Compose plugin
   ```

4. **PostgreSQL connection failed**

   ```
   ERROR: PostgreSQL is not responding after 60 seconds
   Solution: Check Docker logs, restart container, verify port availability
   ```

5. **Database schema missing**
   ```
   Database "krapi" does not exist
   Solution: Run the application to create the database schema
   ```

## Troubleshooting

### Check Docker Status

```bash
# Check if Docker is running
docker info

# Check running containers
docker ps

# Check PostgreSQL container logs
docker logs krapi-postgres
```

### Manual Database Check

```bash
# Test connection with psql
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d krapi -c "SELECT 1;"

# Test with Node.js health check
node scripts/db-health-check.js
```

### Restart PostgreSQL Container

```bash
# Stop and remove container
docker-compose down postgres

# Start fresh
docker-compose up -d postgres

# Check logs
docker-compose logs postgres
```

## Script Output

The scripts provide detailed output with color coding:

- 🟢 **Green**: Success messages
- 🟡 **Yellow**: Warning messages and progress indicators
- 🔴 **Red**: Error messages
- 🔵 **Blue**: Information messages

## Security Notes

- Default database credentials are for development only
- Production deployments should use strong passwords
- Consider using Docker secrets or environment files for sensitive data
- The scripts do not expose database credentials in logs

## Contributing

When modifying the scripts:

1. Test on multiple platforms (Linux, macOS, Windows)
2. Maintain backward compatibility
3. Add appropriate error handling
4. Update this documentation
5. Test with different PostgreSQL configurations
