# Krapi Server - Self-Hosted Backend Database and File Storage Solution

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/@smartsamurai/krapi-sdk)](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)

**Krapi Server** is a comprehensive, self-hosted backend solution that provides database, file storage, user management, and API capabilities for your applications. Perfect for developers who want to focus on their frontend and app logic while using Krapi Server as their backend infrastructure.

## 🔗 Links

- **📦 NPM Package**: [@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- **🏢 GitHub Organization**: [Smart-Samurai](https://github.com/Smart-Samurai)
- **👤 Author**: [GenorTG](https://github.com/GenorTG)
- **📚 Repository**: [https://github.com/GenorTG/Krapi](https://github.com/GenorTG/Krapi)

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)
- [Code Ownership](#-code-ownership)

## 🚀 Features

- **Multi-Database Architecture**: One main controller database plus separate SQLite database files for each project
- **Encrypted Backups**: Built-in AES-256-GCM encrypted backup and restore functionality per project
- **Collection-Based Database**: Create dynamic collections with custom schemas, indexes, and validation
- **File Storage**: Secure file upload, versioning, and management with folder organization
- **User Management**: Admin users and project-specific users with role-based access control
- **API Key Management**: Secure API key generation with scope-based permissions
- **Activity Logging**: Comprehensive changelog and activity tracking
- **Email Integration**: SMTP email templates with variable substitution
- **RESTful API**: Full REST API for all operations
- **Web UI**: Beautiful Next.js-based management interface
- **Type-Safe SDK**: TypeScript SDK for seamless integration
- **Model Context Protocol (MCP)**: AI-powered database operations via LLM integration

## 🏗️ Architecture

### Multi-Database Architecture

KRAPI uses a revolutionary multi-database architecture:

- **Main Database (`krapi_main.db`)**: Stores:
  - Admin users
  - Project metadata
  - Global sessions
  - API keys
  - Email templates
  - System checks
  - Migration history
  - Backup metadata

- **Project Databases (`project_{projectId}.db`)**: Each project gets its own SQLite database file containing:
  - Collections
  - Documents
  - Files and versions
  - Project users
  - Project API keys
  - Changelog entries
  - Folders and file permissions

### Benefits

✅ **Independent Backups**: Each project can be backed up and restored independently  
✅ **Version Control**: Project database files can be versioned separately  
✅ **Isolation**: Project data is completely isolated  
✅ **Scalability**: Each project database can be moved to separate servers if needed  
✅ **Security**: Data breaches affect only individual projects, not the entire system

### Plug and Socket Design

KRAPI implements a "plug and socket" architecture where:

- **Frontend (Plug) 🔌**: Uses the KRAPI SDK to connect to the backend
- **Backend (Socket) ⚡**: Receives requests and routes them through the SDK
- **SDK (Interface)**: Provides identical methods for both client and server environments

All SDK methods work identically whether called from:
- Frontend (via HTTP)
- Backend (via direct database connection)
- External applications (via API)

## 📦 Prerequisites

Before installing KRAPI, ensure you have the following installed on your system:

### Required Dependencies

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - **Default** - Comes with Node.js, fully supported
- **pnpm** (v8 or higher) - **Optional** - Faster alternative, fully compatible - [Install](https://pnpm.io/installation)
  ```bash
  npm install -g pnpm
  # or
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  ```

### Optional Dependencies

- **Docker** (for containerized database if needed) - [Download](https://www.docker.com/)

### Platform-Specific Requirements

- **Linux/macOS**: Bash shell (comes pre-installed)
- **Windows**: PowerShell 5.1+ or Windows Terminal

## 🌐 Hosting & Deployment

Krapi Server can be hosted in various ways:

- **Local Development**: Run on your local machine
- **Network Access**: Expose to your local network
- **Custom Domain**: Deploy with your own domain
- **Cloud Hosting**: Deploy on VPS, Railway, Render, Fly.io, etc.

For complete hosting instructions, see **[HOSTING.md](./HOSTING.md)**.

## 🚀 Installation

### Quick Start (All Platforms)

```bash
# Clone the repository
git clone https://github.com/GenorTG/Krapi.git
cd Krapi

# Install dependencies
npm install

# Initialize environment
npm run init-env

# Start in development mode (interactive menu)
npm run krapi

# Or use CLI commands
npm run krapi start --dev    # Start development mode
npm run krapi start --prod   # Start production mode
npm run krapi status         # Check service status
npm run krapi stop           # Stop services
```

### Manual Installation

#### Using pnpm (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/GenorTG/Krapi.git
   cd Krapi
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Initialize environment**:
   ```bash
   npm run init-env
   ```

4. **Build packages and SDK**:
   ```bash
   pnpm run build:packages
   ```

5. **Start the application**:
   ```bash
   # Development mode
   pnpm run dev:all

   # Production mode
   pnpm run start:all
   ```

#### Using npm

1. **Clone the repository**:
   ```bash
   git clone https://github.com/GenorTG/Krapi.git
   cd Krapi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize environment**:
   ```bash
   npm run init-env
   ```

4. **Build packages and SDK**:
   ```bash
   npm run build:packages
   ```

5. **Start the application**:
   ```bash
   # Development mode
   npm run dev:all

   # Production mode
   npm run start:all
   ```

### Environment Configuration

After installation, configure your environment:

1. **Initialize environment files**:
   ```bash
   npm run init-env
   ```
   This creates `.env` files from examples if they don't exist.

2. **Configure using management script** (recommended):
   ```bash
   npm run krapi config list              # View all settings
   npm run krapi config set <key> <value> # Update settings
   npm run krapi security show            # View security settings
   ```

3. **Or manually edit `.env` files**:
   - Root `.env`: Main application configuration
   - `frontend-manager/.env.local`: Frontend-specific settings
   - `backend-server/.env`: Backend-specific settings
   
   Important settings to update:
   - `JWT_SECRET`: Generate a secure 256-bit secret key (use `openssl rand -hex 32`)
   - `DEFAULT_ADMIN_PASSWORD`: Change from default `admin`
   - `DB_PASSWORD`: Set a secure database password (if using PostgreSQL)
   - `FRONTEND_URL`: Set your public frontend URL for security
   - `ALLOWED_ORIGINS`: Configure CORS allowed origins

4. **Database Setup**:
   - **SQLite** (default): No additional setup needed, databases are created automatically
   - **PostgreSQL**: Ensure Docker is running or configure connection in `.env`

## 🎯 Quick Start Guide

### First Time Setup (After Cloning)

1. **Clone and install**:
   ```bash
   git clone https://github.com/GenorTG/Krapi.git
   cd Krapi
   npm install
   ```

2. **Initialize environment**:
   ```bash
   npm run init-env
   ```
   This creates `.env` files with default values.

3. **Change default admin password** (IMPORTANT):
   ```bash
   # Edit .env file and change:
   DEFAULT_ADMIN_PASSWORD=your-secure-password-here
   
   # Or use the management script:
   npm run krapi config set app.nodeEnv production
   ```
   
   **Default credentials** (change immediately!):
   - Username: `admin`
   - Password: `admin` (change this!)
   - Email: `admin@yourdomain.com`

4. **Generate secure JWT secret**:
   ```bash
   # On Linux/Mac:
   openssl rand -hex 32
   
   # On Windows (PowerShell):
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
   
   # Then update .env:
   JWT_SECRET=your-generated-secret-here
   ```

5. **Start the application**:
```bash
   # Interactive mode (recommended for first-time users)
   npm run krapi
   
   # Or use CLI:
   npm run krapi start --dev    # Development mode
   npm run krapi start --prod   # Production mode
   ```

### Accessing the Application

Once started, access KRAPI at:

- **Frontend UI (Web Interface)**: http://localhost:3498
- **Backend API (Internal Only)**: http://localhost:3470

**Important**: External applications should **always** connect to the Frontend URL (port 3498), never directly to the backend.

### Local Development

For local development and testing:

```bash
# Start in development mode (auto-reloads on changes)
npm run krapi start --dev

# Check service status
npm run krapi status

# View logs
npm run krapi logs

# Stop services
npm run krapi stop
```

**Development Mode Features**:
- Auto-reload on code changes
- Detailed error messages
- Hot module replacement
- Development tools enabled

### Hosting on Your Local Network

To make KRAPI accessible on your local network:

1. **Configure network access**:
   ```bash
   # Set host to 0.0.0.0 to listen on all interfaces
   npm run krapi config set frontend.host 0.0.0.0
   npm run krapi config set backend.host 0.0.0.0
   ```

2. **Find your local IP address**:
   ```bash
   # On Linux/Mac:
   ip addr show | grep "inet " | grep -v 127.0.0.1
   
   # On Windows:
   ipconfig
   ```

3. **Access from other devices**:
   - Frontend: `http://YOUR_LOCAL_IP:3498`
   - Example: `http://192.168.1.100:3498`

4. **Configure firewall** (if needed):
   - Allow incoming connections on ports 3498 (frontend) and 3470 (backend)
   - On Linux: `sudo ufw allow 3498` and `sudo ufw allow 3470`

### Hosting on the Web (Production)

For production deployment with a public domain:

1. **Set your public frontend URL**:
   ```bash
   npm run krapi config set frontend.url https://your-domain.com
   ```

2. **Configure CORS allowed origins**:
   ```bash
   npm run krapi security set-allowed-origins https://app.your-domain.com,https://api.your-domain.com
   ```

3. **Set up reverse proxy** (nginx, Caddy, etc.):
   ```nginx
   # Example nginx configuration
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3498;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Enable HTTPS** (recommended):
   - Use Let's Encrypt with Certbot
   - Or use Caddy (automatic HTTPS)
   - Or configure SSL certificates in your reverse proxy

5. **Build and start in production mode**:
   ```bash
   # Build for production
   npm run build:all
   
   # Start in production mode
   npm run krapi start --prod
   ```

6. **Set production environment**:
   ```bash
   npm run krapi config set app.nodeEnv production
   ```

### Changing Default Credentials

**After first login, change the admin password immediately:**

1. **Via Web UI**:
   - Log in at http://localhost:3498
   - Go to Settings → Profile
   - Change password

2. **Via Configuration** (before first start):
   ```bash
   # Edit .env file:
   DEFAULT_ADMIN_PASSWORD=your-new-secure-password
   DEFAULT_ADMIN_USERNAME=your-username  # Optional: change username too
   DEFAULT_ADMIN_EMAIL=your-email@domain.com
   ```

3. **After changing .env, restart services**:
   ```bash
   npm run krapi restart --prod
   ```

### Security Configuration

**Essential security settings for production**:

1. **Change JWT Secret**:
   ```bash
   # Generate secure secret (see above)
   # Then update .env:
   JWT_SECRET=your-256-bit-secret-here
   ```

2. **Configure CORS**:
   ```bash
   # Only allow specific origins
   npm run krapi security set-allowed-origins https://your-app.com,https://your-api.com
   ```

3. **Set frontend URL**:
   ```bash
   # Prevents access from wrong domains
   npm run krapi security set-frontend-url https://your-domain.com
   ```

4. **View security settings**:
   ```bash
   npm run krapi security show
   ```

### Configuration Management

The management script provides easy configuration management:

```bash
# View all configuration
npm run krapi config list

# Get a specific config value
npm run krapi config get frontend.url

# Set configuration values
npm run krapi config set frontend.url https://your-domain.com
npm run krapi config set frontend.port 8080

# Security settings
npm run krapi security set-allowed-origins https://app.example.com,https://api.example.com
npm run krapi security set-frontend-url https://your-domain.com
npm run krapi security show
```

**Note**: Configuration changes are automatically synced to `.env` files.

### Accessing the Application

Once started, access the application at:

- **Frontend UI**: http://localhost:3498 (for web interface and external client connections)
- **Backend API**: http://localhost:3470 (internal only, not for external clients)

### Connection Guide

**For External Applications:**
- ✅ Connect to **Frontend URL** (port 3498): `http://localhost:3498` or `https://your-domain.com`
- ✅ The frontend proxies requests to the backend automatically
- ✅ Handles CORS, authentication, and routing

**For Internal/Server-Side Code:**
- ✅ Can connect directly to **Backend URL** (port 3470) for faster access
- ✅ Use when building custom API layers (see [NEXTJS_API_ROUTES.md](./NEXTJS_API_ROUTES.md))

**⚠️ Important**: External client applications should **always** use the Frontend URL (port 3498), never the Backend URL (port 3470).

### Default Admin Account

On first run, a default admin account is created:

- **Username**: `admin`
- **Password**: `admin` (change immediately!)
- **Email**: `admin@yourdomain.com`

**⚠️ IMPORTANT**: Change the default admin password immediately after first login!

### Using the SDK

#### For External Client Applications

**⚠️ CRITICAL: Always connect to the FRONTEND URL (port 3498), NOT the backend URL (port 3470).**

```typescript
// In your external application (web app, mobile app, etc.)
import { krapi } from '@smartsamurai/krapi-sdk';

// Connect to the FRONTEND URL (port 3498)
await krapi.connect({
  endpoint: 'https://your-krapi-instance.com', // Frontend URL (port 3498)
  apiKey: 'your-api-key-here'
});

// Use it - no custom API calls needed!
const projects = await krapi.projects.list();
const documents = await krapi.collections.documents.list('project-id', 'collection-name');
```

**Why the Frontend URL?**
- The frontend (port 3498) acts as a proxy and handles CORS, routing, and authentication
- The backend (port 3470) is internal-only and should not be exposed to external clients
- The SDK automatically appends `/api/krapi/k1/` to your endpoint URL

**✨ Enhanced SDK Features:**
The SDK now includes automatic endpoint validation, health checks, retry logic, and improved error messages. All features are documented in the [@smartsamurai/krapi-sdk npm package](https://www.npmjs.com/package/@smartsamurai/krapi-sdk).

**URL Examples:**
- ✅ **Correct**: `https://your-krapi-instance.com` (frontend, port 3498)
- ✅ **Correct**: `http://localhost:3498` (local development, frontend)
- ❌ **Wrong**: `https://your-krapi-instance.com:3470` (backend port)
- ❌ **Wrong**: `http://localhost:3470` (backend port)

**Install the SDK:**
```bash
npm install @smartsamurai/krapi-sdk
# or
pnpm add @smartsamurai/krapi-sdk
```

For complete SDK documentation and architecture details, see:
- [@smartsamurai/krapi-sdk npm package](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- [ARCHITECTURE_DATA_FLOW.md](./ARCHITECTURE_DATA_FLOW.md) - Complete architecture and data flow documentation

## 📚 Documentation

### Getting Started

- **[ARCHITECTURE_DATA_FLOW.md](./ARCHITECTURE_DATA_FLOW.md)** - Complete architecture overview, data flow, and connection guide
  - How external clients connect to Krapi Server
  - URL configuration (frontend vs backend)
  - Authentication and API key usage
  - Complete integration examples

### API Documentation

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete REST API reference
  - All available endpoints
  - Request/response formats
  - Authentication methods
  - Error handling

### Integration Guides

- **[NEXTJS_API_ROUTES.md](./NEXTJS_API_ROUTES.md)** - Using Krapi SDK in Next.js API routes
  - Creating custom API layers
  - Server-side integration patterns
  - Authentication handling

### SDK Documentation

- **[@smartsamurai/krapi-sdk npm package](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)** - Official SDK documentation with all features and usage examples

**Quick Links:**
- 📦 [NPM Package](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- 🏢 [GitHub Organization](https://github.com/Smart-Samurai)
- 👤 [Author GitHub](https://github.com/GenorTG)

### Development Documentation

- [JSDoc Template Guide](./JSDOC_TEMPLATE.md) - Standards for code documentation
- [Architecture Documentation](./backend-server/src/ARCHITECTURE_USERS.md) - User architecture details
- [Project Structure](./backend-server/src/PROJECT_FOLDER_STRUCTURE.md) - Project organization

## 🛠️ Development

### Building

```bash
# Build all packages
pnpm run build:all

# Build individual packages
pnpm run build:sdk
pnpm run build:backend
pnpm run build:frontend
```

### Testing

```bash
# Run comprehensive test suite
pnpm run test:comprehensive

# Or from test suite directory
cd KRAPI-COMPREHENSIVE-TEST-SUITE
npm run test:comprehensive
```

### Code Quality

```bash
# Run linting
pnpm run lint:all

# Fix linting issues
pnpm run lint:fix:all

# Type checking
pnpm run type-check:all

# Full health check (install + lint + type-check + build)
pnpm run health
```

### Development Workflow

1. **Make changes** to code
2. **Run linting**: `pnpm run lint:all`
3. **Fix issues**: `pnpm run lint:fix:all`
4. **Type check**: `pnpm run type-check:all`
5. **Test**: `pnpm run test:comprehensive`
6. **Build**: `pnpm run build:all`

## 🔒 Security

### Authentication

- **Admin Users**: Username/password authentication with JWT tokens
- **Project Users**: Project-specific user accounts with scopes
- **API Keys**: Bearer token authentication with scope-based permissions

### Authorization

- **Scope-Based**: Fine-grained permissions using scopes
- **Project Isolation**: Projects cannot access each other's data
- **Role-Based**: Admin, developer, and viewer roles

### Best Practices

1. **Change Default Credentials**: Immediately change admin password
2. **Use Strong Secrets**: Generate secure `JWT_SECRET` (256 bits)
3. **Enable HTTPS**: Use reverse proxy (nginx, Caddy) for production
4. **Regular Backups**: Use built-in encrypted backup system
5. **API Key Rotation**: Regularly rotate API keys

## 📁 Project Structure

```
Krapi/
├── backend-server/          # Backend Express.js server
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── controllers/     # Request controllers
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Express middleware
│   │   ├── mcp/             # Model Context Protocol (MCP)
│   │   └── types/           # TypeScript type definitions
│   └── data/                # Database files (SQLite)
├── frontend-manager/         # Next.js frontend UI
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   └── lib/                 # Frontend utilities
├── packages/
│   ├── krapi-logger/        # Logging package
│   ├── krapi-error-handler/ # Error handling package
│   └── krapi-monitor/       # Monitoring package
├── scripts/                 # Utility scripts
│   ├── krapi-manager.js     # Centralized management script
│   └── init-env.js          # Environment initialization
├── config/                  # Configuration files
│   └── krapi-config.json    # Centralized configuration
├── data/                    # Application data directory
│   ├── krapi_main.db        # Main database
│   ├── projects/            # Project databases
│   ├── uploads/             # File uploads
│   └── backups/             # Encrypted backups
└── README.md                # This file
```

## 💾 Backups

### Creating Backups

#### Project Backup

```bash
# Via API
POST /krapi/k1/projects/{projectId}/backup
{
  "description": "Monthly backup",
  "password": "secure-password"
}
```

#### System Backup

```bash
# Via API
POST /krapi/k1/backup/system
{
  "description": "Full system backup",
  "password": "secure-password"
}
```

### Restoring Backups

```bash
# Via API
POST /krapi/k1/projects/{projectId}/restore
{
  "backup_id": "backup_123...",
  "password": "secure-password",
  "overwrite": false
}
```

### Backup Features

- **Encryption**: AES-256-GCM encryption
- **Compression**: Gzip compression before encryption
- **Versioning**: Automatic version tracking
- **Metadata**: Backup descriptions and timestamps

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the code style and documentation standards
4. **Add JSDoc comments** to all new functions and classes (see [JSDOC_TEMPLATE.md](./JSDOC_TEMPLATE.md))
5. **Run tests and linting**: `pnpm run lint:all && pnpm run type-check:all`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Submit a pull request**

### Code Standards

- **TypeScript**: All code must be written in TypeScript
- **JSDoc**: All exported functions must have comprehensive JSDoc comments
- **Linting**: Code must pass ESLint checks
- **Type Safety**: No `any` types allowed
- **Testing**: New features should include tests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Code Ownership

### Repository

- **GitHub Repository**: [https://github.com/GenorTG/Krapi](https://github.com/GenorTG/Krapi)
- **GitHub Organization**: [Smart-Samurai](https://github.com/Smart-Samurai)
- **Author**: [GenorTG](https://github.com/GenorTG)
- **NPM Package**: [@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- **License**: MIT

### Code Ownership Rights

All code in this repository is owned by **GenorTG** and contributors as specified in the LICENSE file.

### Contributing

When contributing to this project:
- You retain copyright of your contributions
- You grant GenorTG and the project maintainers a license to use your contributions
- All contributions must comply with the MIT License

### Attribution

If you use this project, please:
- Maintain attribution to the original authors
- Include the LICENSE file
- Credit the project in your documentation

## 🆘 Support

For issues, questions, or feature requests:

- **GitHub Issues**: [https://github.com/GenorTG/Krapi/issues](https://github.com/GenorTG/Krapi/issues)
- **Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) and the [@smartsamurai/krapi-sdk npm package](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- **GitHub Organization**: [Smart-Samurai](https://github.com/Smart-Samurai)
- **Author**: [GenorTG](https://github.com/GenorTG)

## 🗺️ Roadmap

- [ ] GraphQL API support
- [ ] WebSocket real-time updates
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant SaaS mode
- [ ] Database replication
- [ ] Automated backup scheduling
- [ ] Enhanced MCP tool capabilities

## 🙏 Acknowledgments

Built with ❤️ for developers who want control over their backend infrastructure.

---

**Repository**: [https://github.com/GenorTG/Krapi](https://github.com/GenorTG/Krapi)  
**GitHub Organization**: [Smart-Samurai](https://github.com/Smart-Samurai)  
**Author**: [GenorTG](https://github.com/GenorTG)  
**NPM Package**: [@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)  
**License**: MIT
