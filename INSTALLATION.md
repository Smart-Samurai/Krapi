# KRAPI Installation & Setup Guide

Complete guide for installing, configuring, and running KRAPI server instance for first-time users.

## 🔗 Links

- **📦 NPM Package**: [@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- **🏢 GitHub Organization**: [Smart-Samurai](https://github.com/Smart-Samurai)
- **👤 Author**: [GenorTG](https://github.com/GenorTG)
- **📚 Repository**: [https://github.com/GenorTG/Krapi](https://github.com/GenorTG/Krapi)

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Installation](#detailed-installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running KRAPI](#running-krapi)
- [Production Deployment](#production-deployment)
- [Reverse Proxy Setup](#reverse-proxy-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before installing KRAPI, ensure you have the following installed:

### Required

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **pnpm** (v8 or higher) - Preferred package manager - [Install](https://pnpm.io/installation)
  ```bash
  npm install -g pnpm
  ```
- **Git** - [Download](https://git-scm.com/)

### Optional (for PostgreSQL)

- **Docker** (for containerized PostgreSQL) - [Download](https://www.docker.com/)
- **PostgreSQL** (v15 or higher) - [Download](https://www.postgresql.org/download/)

### Platform Support

- ✅ **Linux** (Ubuntu, Debian, CentOS, etc.)
- ✅ **macOS** (Intel & Apple Silicon)
- ✅ **Windows** (10/11 with PowerShell 5.1+)

## Quick Start

### Linux/macOS

```bash
# Clone the repository
git clone https://github.com/GenorTG/Krapi.git
cd Krapi

# Run the setup script
chmod +x krapi-manager.sh
./krapi-manager.sh
```

### Windows

**Option 1: Using Batch File (Recommended)**

Double-click `krapi-manager.bat` or run:
```cmd
krapi-manager.bat
```

**Option 2: Using PowerShell**

```powershell
# Clone the repository
git clone https://github.com/GenorTG/Krapi.git
cd Krapi

# Run the setup script
.\krapi-manager.ps1
```

The setup script will:
1. Install all dependencies
2. Build the SDK and packages
3. Initialize environment files
4. Start the services

## Detailed Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/GenorTG/Krapi.git
cd Krapi
```

### Step 2: Install Dependencies

**Using pnpm (Recommended):**

```bash
pnpm install
```

**Using npm:**

```bash
npm install
```

### Step 3: Initialize Environment

```bash
npm run init-env
```

This creates `.env` files in the root, `backend-server/`, and `frontend-manager/` directories.

### Step 4: Build Packages

```bash
# Build all packages and SDK
pnpm run build:packages
```

Or build everything:

```bash
pnpm run build:all
```

### Step 5: Start Services

**Development Mode:**

```bash
pnpm run dev:all
```

**Production Mode:**

```bash
pnpm run start:all
```

## Environment Configuration

### Root `.env` File

Located at the project root. Copy from `env.example`:

```bash
cp env.example .env
```

**Key Variables:**

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5420
DB_NAME=krapi
DB_USER=postgres
DB_PASSWORD=your_secure_password_here

# Authentication & Security
JWT_SECRET=your-256-bit-jwt-secret-key-here-change-this-in-production
JWT_EXPIRES_IN=7d
SESSION_EXPIRES_IN=1h

# Default Admin Account (change immediately after first login!)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com

# Server Ports
BACKEND_PORT=3470
FRONTEND_PORT=3498

# File Storage
UPLOAD_PATH=./data/uploads
MAX_FILE_SIZE=52428800

# Email Configuration (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
```

### Backend `.env` File

Located at `backend-server/.env`. Copy from `backend-server/env.example`:

```bash
cd backend-server
cp env.example .env
```

**Key Variables:**

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5435
DB_NAME=krapi
DB_USER=postgres
DB_PASSWORD=your_secure_password_here

# Authentication
JWT_SECRET=your-256-bit-jwt-secret-key-here-change-this-in-production
JWT_EXPIRES_IN=7d
SESSION_EXPIRES_IN=1h

# Server Configuration
PORT=3470
HOST=localhost
NODE_ENV=development

# File Storage
UPLOAD_PATH=./data/uploads
MAX_FILE_SIZE=52428800
```

### Frontend `.env.local` File

Located at `frontend-manager/.env.local`. Copy from `frontend-manager/env.example`:

```bash
cd frontend-manager
cp env.example .env.local
```

**Key Variables:**

```env
# API Configuration
KRAPI_BACKEND_URL=http://localhost:3470
NEXT_PUBLIC_API_URL=http://localhost:3470

# Application Configuration
NEXT_PUBLIC_APP_NAME=KRAPI Manager
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_APP_URL=http://localhost:3498
```

### Generating Secure Secrets

**Generate JWT Secret (256-bit):**

```bash
# Linux/macOS
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Generate Database Password:**

```bash
# Linux/macOS
openssl rand -base64 24

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object {[char]$_})
```

## Database Setup

KRAPI supports two database options:

### Option 1: SQLite (Default - No Setup Required)

SQLite is the default database. No additional setup is required. Databases are created automatically in the `data/` directory:

- `data/krapi_main.db` - Main database
- `data/projects/project_{id}.db` - Project databases

**Advantages:**
- ✅ No installation required
- ✅ Perfect for development
- ✅ Easy backups (just copy files)
- ✅ Zero configuration

**Limitations:**
- ⚠️ Not recommended for high-concurrency production
- ⚠️ Single-file databases

### Option 2: PostgreSQL (Recommended for Production)

#### Using Docker (Easiest)

```bash
# Start PostgreSQL container
docker run -d \
  --name krapi-postgres \
  -e POSTGRES_DB=krapi \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5420:5432 \
  postgres:15

# Verify container is running
docker ps
```

#### Manual PostgreSQL Installation

1. **Install PostgreSQL** (if not using Docker)
2. **Create Database:**

```sql
CREATE DATABASE krapi;
CREATE USER postgres WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE krapi TO postgres;
```

3. **Update `.env` files** with PostgreSQL connection details:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=krapi
DB_USER=postgres
DB_PASSWORD=your_secure_password
```

## Running KRAPI

### Development Mode

Development mode includes hot-reload and detailed logging:

```bash
# Start both backend and frontend
pnpm run dev:all

# Or start individually
pnpm run dev:backend  # Backend only (port 3470)
pnpm run dev:frontend # Frontend only (port 3498)
```

**Access Points:**
- Frontend UI: http://localhost:3498
- Backend API: http://localhost:3470

### Production Mode

Production mode uses optimized builds:

```bash
# Build and start everything
pnpm run start:all

# Or build first, then start
pnpm run build:all
pnpm run start:all
```

### Default Admin Account

On first run, a default admin account is created:

- **Username:** `admin`
- **Password:** `admin` (or value from `DEFAULT_ADMIN_PASSWORD`)
- **Email:** Value from `DEFAULT_ADMIN_EMAIL`

**⚠️ IMPORTANT:** Change the default admin password immediately after first login!

## Production Deployment

### System Requirements

**Minimum:**
- 2 CPU cores
- 2GB RAM
- 10GB disk space

**Recommended:**
- 4 CPU cores
- 8GB RAM
- 50GB+ disk space (for file storage)

### Process Management

#### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

**Example `ecosystem.config.js`:**

```javascript
module.exports = {
  apps: [
    {
      name: 'krapi-backend',
      script: './backend-server/dist/index.js',
      cwd: './backend-server',
      env: {
        NODE_ENV: 'production',
        PORT: 3470
      }
    },
    {
      name: 'krapi-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend-manager',
      env: {
        NODE_ENV: 'production',
        PORT: 3498
      }
    }
  ]
};
```

#### Using systemd (Linux)

Create `/etc/systemd/system/krapi-backend.service`:

```ini
[Unit]
Description=KRAPI Backend Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/Krapi/backend-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3470

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/krapi-frontend.service`:

```ini
[Unit]
Description=KRAPI Frontend Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/Krapi/frontend-manager
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3498

[Install]
WantedBy=multi-user.target
```

Enable and start services:

```bash
sudo systemctl enable krapi-backend
sudo systemctl enable krapi-frontend
sudo systemctl start krapi-backend
sudo systemctl start krapi-frontend
```

## Reverse Proxy Setup

Using a reverse proxy (nginx, Caddy, or Traefik) is **highly recommended** for production. It provides:

- ✅ HTTPS/SSL termination
- ✅ Load balancing
- ✅ Rate limiting
- ✅ Security headers
- ✅ Domain-based routing

### Nginx Configuration

**Example `/etc/nginx/sites-available/krapi`:**

```nginx
# Upstream backend
upstream krapi_backend {
    server localhost:3470;
}

# Upstream frontend
upstream krapi_frontend {
    server localhost:3498;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.yourdomain.com manager.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Backend API (api.yourdomain.com)
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API endpoints
    location / {
        proxy_pass http://krapi_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for file uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Increase body size for file uploads
    client_max_body_size 50M;
}

# Frontend Manager (manager.yourdomain.com)
server {
    listen 443 ssl http2;
    server_name manager.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://krapi_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable the site:**

```bash
sudo ln -s /etc/nginx/sites-available/krapi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Caddy Configuration

**Example `Caddyfile`:**

```
api.yourdomain.com {
    reverse_proxy localhost:3470 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}

manager.yourdomain.com {
    reverse_proxy localhost:3498 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

**Start Caddy:**

```bash
caddy run
```

### Best Practices

1. **Use HTTPS:** Always use SSL/TLS certificates (Let's Encrypt is free)
2. **Rate Limiting:** Configure rate limits in your reverse proxy
3. **Security Headers:** Add security headers (CSP, HSTS, etc.)
4. **Firewall:** Only expose ports 80 and 443, keep backend/frontend ports internal
5. **Monitoring:** Set up monitoring and logging for your reverse proxy

## Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3470`

**Solution:**

```bash
# Find process using the port
# Linux/macOS
lsof -i :3470
kill -9 <PID>

# Windows
netstat -ano | findstr :3470
taskkill /PID <PID> /F
```

### Database Connection Failed

**Error:** `ECONNREFUSED` or database connection errors

**Solutions:**

1. **Check PostgreSQL is running:**
   ```bash
   # Docker
   docker ps | grep postgres
   
   # System service
   sudo systemctl status postgresql
   ```

2. **Verify connection details in `.env`:**
   - Check `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

3. **Test connection:**
   ```bash
   psql -h localhost -p 5420 -U postgres -d krapi
   ```

### Build Errors

**Error:** Build fails with TypeScript or dependency errors

**Solutions:**

1. **Clean and reinstall:**
   ```bash
   pnpm run clean:all
   pnpm install
   pnpm run build:all
   ```

2. **Check Node.js version:**
   ```bash
   node --version  # Should be v18 or higher
   ```

3. **Clear caches:**
   ```bash
   pnpm store prune
   rm -rf node_modules
   pnpm install
   ```

### Frontend Can't Connect to Backend

**Error:** Frontend shows connection errors

**Solutions:**

1. **Verify backend is running:**
   ```bash
   curl http://localhost:3470/health
   ```

2. **Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3470
   ```

3. **Check CORS settings** in backend `.env`:
   ```env
   ENABLE_CORS=true
   CORS_ORIGIN=http://localhost:3498
   ```

### Permission Errors

**Error:** File permission errors on Linux/macOS

**Solution:**

```bash
# Fix data directory permissions
sudo chown -R $USER:$USER data/
chmod -R 755 data/
```

## Next Steps

After installation:

1. ✅ **Change default admin password** immediately
2. ✅ **Create your first project** via the web UI
3. ✅ **Generate API keys** for your applications
4. ✅ **Set up backups** (use the built-in backup system)
5. ✅ **Configure email** (optional, for user notifications)
6. ✅ **Review security settings** and enable HTTPS

## Getting Help

- **GitHub Issues:** [https://github.com/GenorTG/Krapi/issues](https://github.com/GenorTG/Krapi/issues)
- **Documentation:** See [README.md](./README.md) and [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **SDK Documentation:** [@smartsamurai/krapi-sdk npm package](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)

---

**Need more help?** Check the [README.md](./README.md) for additional documentation and examples.

