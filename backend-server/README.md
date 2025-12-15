# KRAPI Backend Server

The KRAPI Backend Server is an Express.js-based API server that provides database operations, file storage, user management, and all core KRAPI functionality.

## Architecture

### SDK-Driven Architecture

The backend uses a **SDK-driven architecture** where:

- **All business logic** lives in the `@smartsamurai/krapi-sdk` package
- **Backend routes** are thin wrappers that call SDK methods
- **Database operations** go through the SDK's database adapter
- **No duplicate implementations** - single source of truth in SDK

### Multi-Database Architecture

KRAPI uses a revolutionary multi-database architecture:

- **Main Database** (`krapi_main.db`): Stores admin users, projects, sessions, API keys, email templates
- **Project Databases** (`project_{projectId}.db`): Each project gets its own SQLite database containing collections, documents, files, project users

Benefits:
- Independent backups per project
- Data isolation between projects
- Scalability (can move project DBs to separate servers)
- Security (breaches affect only individual projects)

### Technology Stack

- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3) with multi-database support
- **Language**: TypeScript
- **SDK**: @smartsamurai/krapi-sdk (BackendSDK mode)
- **Authentication**: JWT tokens
- **File Storage**: Local filesystem with versioning

## Project Structure

```
backend-server/
├── src/
│   ├── app.ts              # Express app setup
│   ├── routes/             # API route handlers
│   │   ├── index.ts        # Main router
│   │   ├── auth.routes.ts  # Authentication routes
│   │   ├── projects.routes.ts
│   │   └── ...             # Other route modules
│   ├── controllers/        # Request controllers
│   ├── services/           # Business logic services
│   │   ├── database.service.ts      # Database service
│   │   ├── multi-database-manager.service.ts
│   │   └── sdk-database-adapter.ts  # SDK adapter
│   ├── middleware/         # Express middleware
│   ├── mcp/                # Model Context Protocol
│   └── types/              # TypeScript types
├── packages/               # Internal packages
│   ├── krapi-logger/
│   ├── krapi-error-handler/
│   └── krapi-monitor/
└── data/                    # Database files and uploads
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- SQLite (included with better-sqlite3)

### Installation

```bash
# Install dependencies
npm install

# Or with pnpm
pnpm install
```

### Environment Configuration

Create `.env` file (or copy from `env.example`):

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5435
DB_NAME=krapi
DB_USER=postgres
DB_PASSWORD=your_password

# Server Configuration
PORT=3470
HOST=localhost
NODE_ENV=development

# Authentication
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRES_IN=7d
SESSION_EXPIRES_IN=1h

# Default Admin
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3498
KRAPI_FRONTEND_URL=http://localhost:3498

# File Storage
UPLOAD_PATH=./data/uploads
MAX_FILE_SIZE=52428800
```

**Note**: Configuration can also be managed using the centralized management script:
```bash
npm run krapi config set backend.port 8080
```

### Development Mode

```bash
# Start development server with auto-reload
npm run dev

# Or use the centralized management script
npm run krapi start --dev
```

The backend will be available at `http://localhost:3470`

### Building for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm run start
```

## API Routes

All routes are prefixed with `/krapi/k1`:

### Authentication
- `POST /krapi/k1/auth/login` - Admin login
- `POST /krapi/k1/auth/logout` - Logout
- `GET /krapi/k1/auth/me` - Get current user

### Projects
- `GET /krapi/k1/projects` - List projects
- `POST /krapi/k1/projects` - Create project
- `GET /krapi/k1/projects/:id` - Get project
- `PUT /krapi/k1/projects/:id` - Update project
- `DELETE /krapi/k1/projects/:id` - Delete project

### Collections
- `GET /krapi/k1/projects/:id/collections` - List collections
- `POST /krapi/k1/projects/:id/collections` - Create collection
- `GET /krapi/k1/projects/:id/collections/:name` - Get collection
- `PUT /krapi/k1/projects/:id/collections/:name` - Update collection
- `DELETE /krapi/k1/projects/:id/collections/:name` - Delete collection

### Documents
- `GET /krapi/k1/projects/:id/collections/:name/documents` - List documents
- `POST /krapi/k1/projects/:id/collections/:name/documents` - Create document
- `GET /krapi/k1/projects/:id/collections/:name/documents/:docId` - Get document
- `PUT /krapi/k1/projects/:id/collections/:name/documents/:docId` - Update document
- `DELETE /krapi/k1/projects/:id/collections/:name/documents/:docId` - Delete document

### File Storage
- `GET /krapi/k1/projects/:id/storage/files` - List files
- `POST /krapi/k1/projects/:id/storage/files` - Upload file
- `GET /krapi/k1/projects/:id/storage/files/:fileId` - Get file
- `DELETE /krapi/k1/projects/:id/storage/files/:fileId` - Delete file

See [API Documentation](../API_DOCUMENTATION.md) for complete API reference.

## Database Management

### Database Initialization

Databases are created automatically on first use. The main database and project databases are created in the `data/` directory.

### Database Structure

**Main Database Tables:**
- `admin_users` - Admin user accounts
- `projects` - Project metadata
- `sessions` - Admin user sessions
- `api_keys` - API keys
- `email_templates` - Email templates
- `system_checks` - System health checks
- `migrations` - Migration history

**Project Database Tables:**
- `collections` - Collection definitions
- `documents` - Document data
- `files` - File metadata
- `project_users` - Project-specific users
- `changelog` - Activity log
- `folders` - File folder structure
- `file_permissions` - File access permissions

### Database Health

The backend includes automatic database health checks and repair:

```bash
# Check database health (via API)
GET /krapi/k1/system/health/database

# Auto-fix database issues (via API)
POST /krapi/k1/system/health/auto-fix
```

## Services

### DatabaseService

Singleton service providing unified database access:
- Main database queries
- Project database queries
- Connection pooling
- Health checks

### MultiDatabaseManager

Manages multiple SQLite database connections:
- Main database connection
- Per-project database connections
- Automatic database creation
- Connection lifecycle management

### SDK Database Adapter

Implements SDK's `DatabaseConnection` interface:
- Routes queries to correct database (main vs project)
- Handles SQLite-specific operations
- Provides SDK-compatible interface

## Route Implementation Pattern

All routes follow this pattern:

```typescript
// 1. Initialize BackendSDK
const sdk = new BackendSDK({ database: dbAdapter });

// 2. Route handler calls SDK method
export async function GET(req: Request, res: Response) {
  const projects = await sdk.projects.list();
  res.json({ success: true, data: projects });
}
```

**Key Principle**: Backend routes are thin wrappers - all logic is in the SDK.

## Configuration Options

### Server Configuration

```bash
# Change port
npm run krapi config set backend.port 8080

# Change host
npm run krapi config set backend.host 0.0.0.0
```

### Database Configuration

Database paths are configured in the main `.env` file:
- `DB_PATH` - Main database path
- `PROJECTS_DB_DIR` - Project databases directory

### Security Configuration

```bash
# Set frontend URL for CORS
npm run krapi config set frontend.url https://your-domain.com

# Configure allowed origins
npm run krapi security set-allowed-origins https://app.example.com
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
```

## Development Guidelines

### Adding New Routes

1. Create route file in `src/routes/{resource}.routes.ts`
2. Import and use BackendSDK
3. Call SDK method (verify method exists in SDK first)
4. Return formatted response

### Adding New Services

1. Create service in `src/services/{service}.service.ts`
2. Use DatabaseService for database access
3. Follow existing service patterns
4. Add JSDoc comments

### Database Operations

Always use DatabaseService:
```typescript
const db = DatabaseService.getInstance();
await db.waitForReady();
const result = await db.queryMain('SELECT * FROM projects');
```

## Troubleshooting

### Port Already in Use

```bash
# Check status
npm run krapi status

# Stop services
npm run krapi stop

# Or change port
npm run krapi config set backend.port 8080
```

### Database Errors

```bash
# Check database health
curl http://localhost:3470/krapi/k1/system/health/database

# Auto-fix issues
curl -X POST http://localhost:3470/krapi/k1/system/health/auto-fix
```

### SDK Connection Issues

Ensure SDK is properly initialized:
- Check that BackendSDK is created with database adapter
- Verify database adapter is connected
- Check logs for SDK errors

## Security Considerations

1. **JWT Secret**: Use a strong, randomly generated secret (256 bits)
2. **CORS**: Configure `ALLOWED_ORIGINS` in production
3. **HTTPS**: Use reverse proxy for HTTPS in production
4. **Database Access**: Database files should have restricted permissions
5. **File Uploads**: Validate file types and sizes

## Related Documentation

- [Main README](../README.md) - Overall project documentation
- [Frontend README](../frontend-manager/README.md) - Frontend architecture
- [SDK Documentation](https://www.npmjs.com/package/@smartsamurai/krapi-sdk) - SDK reference

