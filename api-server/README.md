# KRAPI Backend v2.0

A project-driven API backend with session-based authentication, built with TypeScript, Express, and SQLite.

## Features

- **Session-based Authentication**: Secure session creation and JWT token management
- **Admin User Management**: Multiple access levels (Master Admin, Admin, Project Admin, Limited Admin)
- **Project Management**: Create and manage multiple projects with isolated data
- **Dynamic Database**: Create custom table schemas with field validation
- **Document Management**: CRUD operations with sorting and filtering
- **File Storage**: Upload/download files with unique IDs and project isolation
- **Email Service**: Project-specific SMTP configuration
- **Changelog System**: Track all changes with detailed audit logs
- **TypeScript SDK**: Type-safe client SDK included

## Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.sample .env

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## Environment Variables

Key environment variables:

- `PORT`: Server port (default: 3470)
- `DATABASE_PATH`: SQLite database path
- `JWT_SECRET`: Secret for JWT tokens
- `SESSION_EXPIRES_IN`: Session duration (e.g., "1h")
- `UPLOAD_PATH`: File upload directory
- `DEFAULT_ADMIN_EMAIL`: Default admin email
- `DEFAULT_ADMIN_PASSWORD`: Default admin password

## API Structure

Base URL: `http://localhost:3470/krapi/v1`

### Authentication Flow

1. **Create Session** (first request):
   ```
   POST /auth/admin/session
   POST /auth/project/:projectId/session
   ```

2. **Use Session Token** to get JWT:
   ```
   Headers: { "X-Session-Token": "session-token" }
   ```

3. **Use JWT** for subsequent requests:
   ```
   Headers: { "Authorization": "Bearer jwt-token" }
   ```

### Main Endpoints

#### Auth
- `POST /auth/admin/login` - Admin login
- `POST /auth/admin/session` - Create admin session
- `POST /auth/project/:projectId/session` - Create project session
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

#### Admin
- `GET /admin/users` - List admin users
- `POST /admin/users` - Create admin user
- `PUT /admin/users/:id` - Update admin user
- `DELETE /admin/users/:id` - Delete admin user

#### Projects
- `GET /projects` - List projects
- `POST /projects` - Create project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `GET /projects/:id/stats` - Get project statistics

#### Database
- `GET /database/:projectId/schemas` - List table schemas
- `POST /database/:projectId/schemas` - Create table schema
- `GET /database/:projectId/:tableName/documents` - List documents
- `POST /database/:projectId/:tableName/documents` - Create document
- `PUT /database/:projectId/:tableName/documents/:id` - Update document
- `DELETE /database/:projectId/:tableName/documents/:id` - Delete document

#### Storage
- `GET /storage/:projectId/files` - List files
- `POST /storage/:projectId/files` - Upload file
- `GET /storage/:projectId/files/:id/download` - Download file
- `DELETE /storage/:projectId/files/:id` - Delete file

## TypeScript SDK

The backend includes a TypeScript SDK for easy client integration:

```typescript
import { createKrapiClient } from 'krapi-backend/sdk';

const client = createKrapiClient({
  baseURL: 'http://localhost:3470'
});

// Create session
const session = await client.auth.createProjectSession('project-id', 'api-key');

// Create document
const doc = await client.database.createDocument('project-id', 'users', {
  email: 'user@example.com',
  name: 'John Doe'
});
```

## Database Schema

### Admin Users
- Multiple role levels with granular permissions
- Password hashing with bcrypt
- Activity tracking

### Projects
- Isolated data per project
- Custom settings (email, storage, auth, rate limits)
- API key generation

### Table Schemas
- Dynamic field types: string, number, boolean, date, datetime, json, reference, file
- Field validation: min/max, pattern, enum
- Indexes for performance

### Documents
- JSON data storage
- Automatic timestamps
- Creator/updater tracking

### Files
- Unique ID generation
- Project isolation
- Metadata tracking

## Security Features

- Session-based authentication with single-use tokens
- JWT for subsequent requests
- Role-based access control
- API key authentication for projects
- Rate limiting
- CORS protection
- Helmet security headers

## Development

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Production Deployment

1. Build the project:
   ```bash
   pnpm build
   ```

2. Set production environment variables

3. Run with process manager:
   ```bash
   pm2 start dist/app.js --name krapi-backend
   ```

## License

MIT