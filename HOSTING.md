# Krapi Server - Hosting Guide

Complete guide for hosting and deploying Krapi Server in various environments.

## 🔗 Links

- **📦 NPM Package**: [@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- **🏢 GitHub Organization**: [Smart-Samurai](https://github.com/Smart-Samurai)
- **👤 Author**: [GenorTG](https://github.com/GenorTG)
- **📚 Repository**: [https://github.com/GenorTG/Krapi](https://github.com/GenorTG/Krapi)

## 📋 Table of Contents

- [Overview](#overview)
- [Local Hosting](#local-hosting)
- [Exposing to Network](#exposing-to-network)
- [Domain Configuration](#domain-configuration)
- [Free Hosting Platforms](#free-hosting-platforms)
- [Production Deployment](#production-deployment)
- [SDK Integration](#sdk-integration)
- [API Key Management](#api-key-management)
- [Security Configuration](#security-configuration)
- [Troubleshooting](#troubleshooting)

## Overview

Krapi Server consists of two main components:

- **Frontend Manager** (Port 3498): Web UI for managing Krapi Server
- **Backend API** (Port 3470): REST API server that handles all database operations

Both components work together to provide a complete backend solution. The frontend acts as a proxy to the backend, and external applications connect through the frontend.

## Local Hosting

### Basic Local Setup

By default, Krapi Server listens on `localhost` (127.0.0.1), which means it's only accessible from your local machine.

**Start Krapi Server:**

```bash
# Development mode
pnpm run dev:all

# Production mode
pnpm run build:all
pnpm run start:all
```

**Access Points:**

- Frontend UI: http://localhost:3498
- Backend API: http://localhost:3470

### Network Interface Configuration

To allow access from other devices on your network, you need to configure the server to listen on all network interfaces (`0.0.0.0`).

#### Option 1: Environment Variables (Recommended)

**Frontend Configuration** (`frontend-manager/.env.local`):

```env
# Listen on all network interfaces (0.0.0.0) or localhost only
NEXT_PUBLIC_LISTEN_HOST=0.0.0.0

# Your server's IP address or domain
NEXT_PUBLIC_APP_URL=http://192.168.1.100:3498

# Backend URL (use your machine's IP if accessing from network)
NEXT_PUBLIC_API_URL=http://192.168.1.100:3470/krapi/k1
KRAPI_BACKEND_URL=http://192.168.1.100:3470
```

**Backend Configuration** (`.env` in root):

```env
# Listen on all network interfaces
HOST=0.0.0.0
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3470
```

**⚠️ Security Warning:** Listening on `0.0.0.0` exposes your server to all network interfaces. Make sure you have proper firewall rules and authentication configured.

#### Option 2: Web UI Settings

1. Log into the Krapi Server web UI
2. Navigate to **Settings** → **Security**
3. Configure **Allowed Origins** to specify which domains can access the server
4. Set **Network Interface** to:
   - `localhost` - Only accessible from local machine
   - `0.0.0.0` - Accessible from network (with security warning)

### Starting with Network Access

**Using Environment Variables:**

```bash
# Set environment variables
export FRONTEND_HOST=0.0.0.0
export BACKEND_HOST=0.0.0.0
export NEXT_PUBLIC_APP_URL=http://YOUR_IP:3498
export NEXT_PUBLIC_API_URL=http://YOUR_IP:3470/krapi/k1

# Start services
pnpm run dev:all
```

**Windows PowerShell:**

```powershell
$env:FRONTEND_HOST="0.0.0.0"
$env:BACKEND_HOST="0.0.0.0"
$env:NEXT_PUBLIC_APP_URL="http://YOUR_IP:3498"
$env:NEXT_PUBLIC_API_URL="http://YOUR_IP:3470/krapi/k1"
pnpm run dev:all
```

**Find Your IP Address:**

```bash
# Linux/macOS
ip addr show | grep "inet " | grep -v 127.0.0.1
# or
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr IPv4
```

## Exposing to Network

### Using Port Forwarding

If you want to access Krapi Server from outside your local network:

1. **Configure Router Port Forwarding:**

   - Forward external port 3498 → Your machine's IP:3498 (Frontend)
   - Forward external port 3470 → Your machine's IP:3470 (Backend)

2. **Update Environment Variables:**

   ```env
   NEXT_PUBLIC_APP_URL=http://YOUR_PUBLIC_IP:3498
   NEXT_PUBLIC_API_URL=http://YOUR_PUBLIC_IP:3470/krapi/k1
   ```

3. **Configure Firewall:**

   ```bash
   # Linux (ufw)
   sudo ufw allow 3498/tcp
   sudo ufw allow 3470/tcp

   # macOS
   # Configure in System Preferences → Security → Firewall

   # Windows
   # Configure in Windows Defender Firewall
   ```

### Using SSH Tunneling

For secure remote access without exposing ports:

```bash
# Create SSH tunnel
ssh -L 3498:localhost:3498 -L 3470:localhost:3470 user@your-server

# Then access via localhost on your local machine
```

### Using ngrok (Development/Testing)

For quick temporary access:

```bash
# Install ngrok
npm install -g ngrok

# Expose frontend
ngrok http 3498

# Expose backend (in another terminal)
ngrok http 3470
```

**Note:** Update your environment variables with the ngrok URLs.

## Domain Configuration

### Setting Up a Custom Domain

1. **Point Domain to Your Server:**

   - Add A record: `yourdomain.com` → Your server's IP
   - Add A record: `api.yourdomain.com` → Your server's IP (optional, for API)

2. **Configure Reverse Proxy (Recommended):**

   **Nginx Configuration** (`/etc/nginx/sites-available/krapi`):

   ```nginx
   # Frontend (Web UI)
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3498;
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

   # Backend API (optional separate subdomain)
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:3470;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable HTTPS with Let's Encrypt:**

   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx

   # Get certificate
   sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
   ```

4. **Update Krapi Server Settings:**

   In the Web UI → Settings → Security:

   - Set **Allowed Origins** to: `https://yourdomain.com`
   - Set **Site URL** to: `https://yourdomain.com`

5. **Update Environment Variables:**

   ```env
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   NEXT_PUBLIC_API_URL=https://yourdomain.com/krapi/k1
   KRAPI_BACKEND_URL=http://localhost:3470
   ```

### Caddy Reverse Proxy (Alternative)

Caddy automatically handles HTTPS:

```caddy
yourdomain.com {
    reverse_proxy localhost:3498
}

api.yourdomain.com {
    reverse_proxy localhost:3470
}
```

## Free Hosting Platforms

### Vercel (Frontend Only - Limited)

**⚠️ Important Limitations:**

- Vercel's free tier has limitations with SQLite databases
- SQLite requires file system access, which Vercel's serverless functions don't fully support
- Database files cannot persist between function invocations
- **Not recommended for production use with SQLite**

**If you still want to try:**

1. **Deploy Frontend to Vercel:**

   ```bash
   npm install -g vercel
   cd frontend-manager
   vercel
   ```

2. **Configure Environment Variables in Vercel Dashboard:**

   - `NEXT_PUBLIC_API_URL`: Your backend API URL
   - `KRAPI_BACKEND_URL`: Your backend API URL

3. **Host Backend Separately:**
   - Use a VPS (DigitalOcean, Linode, etc.) for the backend
   - Or use Railway, Render, or Fly.io for full-stack hosting

### Railway

Railway supports full-stack applications with persistent storage:

1. **Connect Repository:**

   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub repository

2. **Configure Services:**

   - **Backend Service:** Set root directory to `backend-server`
   - **Frontend Service:** Set root directory to `frontend-manager`

3. **Environment Variables:**

   ```env
   # Backend
   HOST=0.0.0.0
   PORT=3470
   NODE_ENV=production

   # Frontend
   NEXT_PUBLIC_API_URL=${{BACKEND_URL}}/krapi/k1
   KRAPI_BACKEND_URL=${{BACKEND_URL}}
   ```

4. **Database Storage:**
   - Railway provides persistent volumes for SQLite databases
   - Mount volume at `/data` directory

### Render

1. **Create Web Service (Backend):**

   - Build Command: `cd backend-server && npm install && npm run build`
   - Start Command: `cd backend-server && npm start`
   - Environment: `Node`

2. **Create Web Service (Frontend):**

   - Build Command: `cd frontend-manager && npm install && npm run build`
   - Start Command: `cd frontend-manager && npm start`
   - Environment: `Node`

3. **Add Persistent Disk:**
   - Attach disk for SQLite database files
   - Mount at `/opt/render/project/src/data`

### Fly.io

1. **Install Fly CLI:**

   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create `fly.toml` for Backend:**

   ```toml
   app = "krapi-backend"
   primary_region = "iad"

   [build]

   [http_service]
     internal_port = 3470
     force_https = true
     auto_stop_machines = false
     auto_start_machines = true
     min_machines_running = 1

   [[mounts]]
     source = "krapi_data"
     destination = "/data"
   ```

3. **Deploy:**
   ```bash
   fly launch
   fly volumes create krapi_data --size 10
   ```

### DigitalOcean App Platform

1. **Create App:**

   - Connect GitHub repository
   - Auto-detect services

2. **Configure Services:**

   - Backend: Node.js service
   - Frontend: Node.js service

3. **Add Database Volume:**
   - Create persistent volume for SQLite files

## Production Deployment

### VPS Deployment (Recommended)

**Recommended Providers:**

- DigitalOcean Droplets
- Linode
- Vultr
- AWS EC2
- Google Cloud Compute Engine

**Setup Steps:**

1. **Provision Server:**

   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y nodejs npm git
   npm install -g pnpm
   ```

2. **Clone and Setup:**

   ```bash
   git clone https://github.com/GenorTG/Krapi.git
   cd Krapi
   pnpm install
   pnpm run build:all
   ```

3. **Configure Environment:**

   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

4. **Setup as System Service:**

   **Backend Service** (`/etc/systemd/system/krapi-backend.service`):

   ```ini
   [Unit]
   Description=Krapi Backend Server
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/path/to/Krapi/backend-server
   ExecStart=/usr/bin/node dist/app.js
   Restart=always
   Environment=NODE_ENV=production
   Environment=HOST=0.0.0.0
   Environment=PORT=3470

   [Install]
   WantedBy=multi-user.target
   ```

   **Frontend Service** (`/etc/systemd/system/krapi-frontend.service`):

   ```ini
   [Unit]
   Description=Krapi Frontend Server
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/path/to/Krapi/frontend-manager
   ExecStart=/usr/bin/npm start
   Restart=always
   Environment=NODE_ENV=production
   Environment=PORT=3498
   Environment=NEXT_PUBLIC_APP_URL=https://yourdomain.com
   Environment=NEXT_PUBLIC_API_URL=https://yourdomain.com/krapi/k1

   [Install]
   WantedBy=multi-user.target
   ```

5. **Enable and Start:**

   ```bash
   sudo systemctl enable krapi-backend
   sudo systemctl enable krapi-frontend
   sudo systemctl start krapi-backend
   sudo systemctl start krapi-frontend
   ```

6. **Setup Reverse Proxy (Nginx):**

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3498;
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

## SDK Integration

### Initializing the SDK in External Applications

The Krapi SDK can be used in any application (web, mobile, desktop) to connect to your Krapi Server.

#### Installation

```bash
npm install @smartsamurai/krapi-sdk
# or
pnpm add @smartsamurai/krapi-sdk
```

**NPM Package**: [@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)

#### Basic Setup

```typescript
import { krapi } from "@smartsamurai/krapi-sdk";

// Connect to your Krapi Server
await krapi.connect({
  endpoint: "https://yourdomain.com", // Your Krapi Server URL
  apiKey: "your-api-key-here", // API key from Krapi Server
});

// Now you can use all SDK methods
const projects = await krapi.projects.list();
const documents = await krapi.collections.documents.list(
  "project-id",
  "collection-name"
);
```

#### Complete Example

```typescript
import { krapi } from "@smartsamurai/krapi-sdk";

async function initializeApp() {
  try {
    // Connect to Krapi Server
    await krapi.connect({
      endpoint: process.env.KRAPI_ENDPOINT || "http://localhost:3470",
      apiKey: process.env.KRAPI_API_KEY || "",
    });

    console.log("✅ Connected to Krapi Server");

    // List all projects
    const projects = await krapi.projects.list();
    console.log("Projects:", projects);

    // Create a new project
    const newProject = await krapi.projects.create({
      name: "My New Project",
      description: "Project description",
    });
    console.log("Created project:", newProject);

    // Work with collections
    const collections = await krapi.collections.list(newProject.id);
    console.log("Collections:", collections);
  } catch (error) {
    console.error("Failed to connect to Krapi Server:", error);
  }
}

initializeApp();
```

#### Environment Variables

Create a `.env` file in your application:

```env
KRAPI_ENDPOINT=https://yourdomain.com
KRAPI_API_KEY=your-api-key-here
```

#### React/Next.js Example

```typescript
"use client";

import { useEffect, useState } from "react";
import { krapi } from "@smartsamurai/krapi-sdk";

export default function MyComponent() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Initialize SDK
        await krapi.connect({
          endpoint: process.env.NEXT_PUBLIC_KRAPI_ENDPOINT!,
          apiKey: process.env.NEXT_PUBLIC_KRAPI_API_KEY!,
        });

        // Fetch projects
        const projectList = await krapi.projects.list();
        setProjects(projectList);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>My Projects</h1>
      {projects.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

#### Node.js/Backend Example

```typescript
import { krapi } from "@smartsamurai/krapi-sdk";

async function serverFunction() {
  // Connect to Krapi Server
  await krapi.connect({
    endpoint: process.env.KRAPI_ENDPOINT!,
    apiKey: process.env.KRAPI_API_KEY!,
  });

  // Perform operations
  const project = await krapi.projects.create({
    name: "Server Project",
    description: "Created from server",
  });

  // Create collection
  await krapi.collections.create(project.id, {
    name: "users",
    schema: {
      name: { type: "string", required: true },
      email: { type: "string", required: true },
    },
  });

  // Add document
  await krapi.collections.documents.create(project.id, "users", {
    name: "John Doe",
    email: "john@example.com",
  });
}
```

## API Key Management

### Creating API Keys

#### Via Web UI

1. Log into Krapi Server web UI
2. Navigate to **Settings** → **API Keys**
3. Click **Create New API Key**
4. Configure:
   - **Name**: Descriptive name for the key
   - **Scopes**: Permissions (e.g., `projects:read`, `collections:write`)
   - **Expiration**: Optional expiration date
   - **Project**: If creating project-specific key
5. Click **Create**
6. **⚠️ IMPORTANT**: Copy the API key immediately - it's only shown once!

#### Via API

```bash
curl -X POST https://yourdomain.com/krapi/k1/admin/api-keys \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key",
    "permissions": ["projects:read", "collections:read", "collections:write"],
    "expires_at": "2025-12-31T23:59:59Z"
  }'
```

#### Project-Specific API Keys

```bash
curl -X POST https://yourdomain.com/krapi/k1/projects/PROJECT_ID/api-keys \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Project API Key",
    "permissions": ["collections:read", "documents:write"]
  }'
```

### API Key Scopes

**Admin Scopes:**

- `admin:read` - View admin users
- `admin:write` - Create/update admin users
- `admin:delete` - Delete admin users

**Project Scopes:**

- `projects:read` - View projects
- `projects:write` - Create/update projects
- `projects:delete` - Delete projects

**Collection Scopes:**

- `collections:read` - View collections
- `collections:write` - Create/update collections
- `collections:delete` - Delete collections

**Document Scopes:**

- `documents:read` - View documents
- `documents:write` - Create/update documents
- `documents:delete` - Delete documents

**Storage Scopes:**

- `storage:read` - View files
- `storage:write` - Upload files
- `storage:delete` - Delete files

### Using API Keys

```typescript
// In your application
await krapi.connect({
  endpoint: "https://yourdomain.com",
  apiKey: "krapi_xxxxxxxxxxxxxxxxxxxx", // Your API key
});

// All SDK methods will use this API key for authentication
const projects = await krapi.projects.list();
```

### Security Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables** for API keys
3. **Rotate API keys regularly**
4. **Use project-specific keys** when possible (principle of least privilege)
5. **Set expiration dates** for temporary access
6. **Revoke unused keys** immediately

## Security Configuration

### Allowed Origins

Configure which domains can access your Krapi Server:

1. **Via Web UI:**

   - Settings → Security → Allowed Origins
   - Add domains: `https://yourdomain.com`, `https://app.yourdomain.com`

2. **Via Environment Variables:**
   ```env
   ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```

### Network Interface Settings

**Localhost Only (Default - Most Secure):**

```env
FRONTEND_HOST=localhost
BACKEND_HOST=localhost
```

**Network Access (Use with Caution):**

```env
FRONTEND_HOST=0.0.0.0
BACKEND_HOST=0.0.0.0
```

**⚠️ Warning:** Listening on `0.0.0.0` exposes your server to all network interfaces. Only use this if:

- You have proper firewall rules configured
- You're using HTTPS
- You have strong authentication enabled
- You understand the security implications

### Firewall Configuration

**Linux (ufw):**

```bash
# Allow only specific IPs
sudo ufw allow from 192.168.1.0/24 to any port 3498
sudo ufw allow from 192.168.1.0/24 to any port 3470

# Or allow all (less secure)
sudo ufw allow 3498/tcp
sudo ufw allow 3470/tcp
```

**Windows:**

- Configure in Windows Defender Firewall
- Create inbound rules for ports 3498 and 3470

### HTTPS/SSL

**Always use HTTPS in production!**

1. **Get SSL Certificate:**

   - Use Let's Encrypt (free)
   - Or purchase from a certificate authority

2. **Configure Reverse Proxy:**

   - Nginx or Caddy (recommended)
   - Handles SSL termination

3. **Update Environment Variables:**
   ```env
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   NEXT_PUBLIC_API_URL=https://yourdomain.com/krapi/k1
   ```

## Troubleshooting

### Server Not Accessible from Network

**Check Network Interface:**

```bash
# Verify server is listening on correct interface
netstat -tulpn | grep 3498
netstat -tulpn | grep 3470

# Should show 0.0.0.0:3498 for network access
# Or 127.0.0.1:3498 for localhost only
```

**Check Firewall:**

```bash
# Linux
sudo ufw status
sudo iptables -L

# Windows
netsh advfirewall show allprofiles
```

### CORS Errors

**Symptoms:** Browser shows CORS errors when accessing API

**Solution:**

1. Add your domain to **Allowed Origins** in Settings → Security
2. Or set `ALLOWED_ORIGINS` environment variable:
   ```env
   ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```

### Database Connection Issues

**SQLite File Permissions:**

```bash
# Ensure data directory is writable
chmod -R 755 data/
chown -R www-data:www-data data/
```

**Database Location:**

- Default: `./data/krapi_main.db`
- Project databases: `./data/projects/project_*.db`

### Port Already in Use

**Find process using port:**

```bash
# Linux/macOS
lsof -i :3498
lsof -i :3470

# Windows
netstat -ano | findstr :3498
netstat -ano | findstr :3470
```

**Kill process:**

```bash
# Linux/macOS
kill -9 <PID>

# Windows
taskkill /PID <PID> /F
```

### SDK Connection Errors

**Check Endpoint URL:**

- Must include protocol: `https://yourdomain.com` (not just `yourdomain.com`)
- Must not include trailing slash for endpoint
- API path is added automatically by SDK

**Check API Key:**

- Verify API key is correct
- Check if API key has expired
- Ensure API key has required scopes

**Test Connection:**

```bash
curl https://yourdomain.com/krapi/k1/health
```

## Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Installation Guide](./INSTALLATION.md)
- [SDK Documentation](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- [GitHub Organization](https://github.com/Smart-Samurai)
- [Author GitHub](https://github.com/GenorTG)

## Support

For issues or questions:

- **GitHub Issues**: [https://github.com/GenorTG/Krapi/issues](https://github.com/GenorTG/Krapi/issues)
- **GitHub Organization**: [Smart-Samurai](https://github.com/Smart-Samurai)
- **Author**: [GenorTG](https://github.com/GenorTG)
- **NPM Package**: [@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- Check the help menu in the Krapi Server web UI
