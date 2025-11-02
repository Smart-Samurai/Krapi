# KRAPI - Self-Hosted Backend Database and File Storage Solution

**KRAPI** is a comprehensive, self-hosted backend solution that provides database, file storage, user management, and API capabilities for your applications. Perfect for developers who want to focus on their frontend and app logic while using KRAPI as their backend infrastructure.

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

## 📋 Prerequisites

Before installing KRAPI, ensure you have the following installed on your system:

### Required Dependencies

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher) - Preferred package manager
- **npm** (v9 or higher) - Alternative package manager

### Optional Dependencies

- **Docker** (for containerized database if needed)

### Platform-Specific Requirements

- **Linux/macOS**: Bash shell (comes pre-installed)
- **Windows**: PowerShell 5.1+ or Windows Terminal

## 🔧 Installation

### Quick Start (Linux/macOS)

```bash
# Clone the repository
git clone <repository-url>
cd krapi

# Run the setup script
chmod +x krapi-manager.sh
./krapi-manager.sh install

# Initialize environment
npm run init-env

# Start development server
./krapi-manager.sh dev
```

### Quick Start (Windows)

```powershell
# Clone the repository
git clone <repository-url>
cd krapi

# Run the setup script
.\krapi-manager.ps1 install

# Initialize environment
npm run init-env

# Start development server
.\krapi-manager.ps1 dev
```

### Manual Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd krapi
   ```

2. **Install dependencies**:
   ```bash
   npm run install:all
   # Or use pnpm
   pnpm run install:all
   ```

3. **Initialize environment**:
   ```bash
   npm run init-env
   ```
   This creates a `.env` file from `env.example` with default values.

4. **Configure your environment**:
   Edit `.env` file and update:
   - `JWT_SECRET`: Generate a secure 256-bit secret key
   - `DEFAULT_ADMIN_PASSWORD`: Change from default
   - `DB_PASSWORD`: Set a secure database password
   - Other configuration values as needed

5. **Build the application**:
   ```bash
   npm run build:all
   ```

6. **Start the application**:
   ```bash
   # Development mode
   npm run dev:all

   # Production mode
   npm run start:all
   ```

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

## 📖 Usage

### Starting the Application

#### Using Management Scripts

**Linux/macOS**:
```bash
./krapi-manager.sh dev          # Development mode
./krapi-manager.sh prod         # Production mode
./krapi-manager.sh install      # Install dependencies
./krapi-manager.sh health       # Run health checks
```

**Windows**:
```powershell
.\krapi-manager.ps1 dev          # Development mode
.\krapi-manager.ps1 prod         # Production mode
.\krapi-manager.ps1 install      # Install dependencies
.\krapi-manager.ps1 health       # Run health checks
```

#### Using npm Scripts

```bash
npm run dev:all      # Start in development mode
npm run start:all    # Start in production mode
npm run build:all    # Build all packages
npm run lint:all     # Run linting
npm run type-check   # Run TypeScript checks
```

### Accessing the Application

Once started, access the application at:

- **Frontend UI**: http://localhost:3469
- **Backend API**: http://localhost:3470

### Default Admin Account

On first run, a default admin account is created:

- **Username**: `admin`
- **Password**: `admin` (change immediately!)
- **Email**: `admin@yourdomain.com`

**⚠️ IMPORTANT**: Change the default admin password immediately after first login!

## 🔐 Security

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
krapi/
├── backend-server/          # Backend Express.js server
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── controllers/     # Request controllers
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Express middleware
│   │   └── types/           # TypeScript type definitions
│   └── data/                # Database files (SQLite)
├── frontend-manager/        # Next.js frontend UI
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   └── lib/                 # Frontend utilities
├── packages/
│   └── krapi-sdk/           # Core SDK (shared by frontend/backend)
│       ├── src/
│       │   ├── services/    # SDK services
│       │   └── types/       # Shared types
│       └── dist/            # Compiled SDK
├── scripts/                 # Utility scripts
│   └── init-env.js          # Environment initialization
├── data/                    # Application data directory
│   ├── krapi_main.db        # Main database
│   ├── projects/            # Project databases
│   ├── uploads/             # File uploads
│   └── backups/             # Encrypted backups
├── krapi-manager.sh         # Linux/macOS management script
├── krapi-manager.ps1        # Windows management script
├── env.example              # Environment configuration template
└── README.md                # This file
```

## 🛠️ Development

### Building

```bash
# Build all packages
npm run build:all

# Build individual packages
npm run build:sdk
npm run build:backend
npm run build:frontend
```

### Testing

```bash
# Run comprehensive test suite
npm run test:comprehensive

# Or from test suite directory
cd KRAPI-COMPREHENSIVE-TEST-SUITE
node comprehensive-test-runner.js
```

### Code Quality

```bash
# Run linting
npm run lint:all

# Fix linting issues
npm run lint:fix:all

# Type checking
npm run type-check:all

# Full health check
npm run health
```

## 🔄 Backups

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

## 📚 API Documentation

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📝 License

[Add your license here]

## 🆘 Support

For issues, questions, or feature requests:

- Open an issue on GitHub
- Check existing documentation
- Review API documentation

## 🎯 Roadmap

- [ ] GraphQL API support
- [ ] WebSocket real-time updates
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant SaaS mode
- [ ] Database replication
- [ ] Automated backup scheduling

---

**Built with ❤️ for developers who want control over their backend infrastructure.**
