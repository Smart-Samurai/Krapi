# 📚 KRAPI Complete Documentation

> **The Ultimate Guide to KRAPI - Revolutionary Backend-as-a-Service with Perfect Plug & Socket Architecture**

## 🎯 Table of Contents

1. [Quick Start](#-quick-start)
2. [Architecture Overview](#-architecture-overview)
3. [Startup Modes](#-startup-modes)
4. [Complete API Reference](#-complete-api-reference)
5. [SDK Methods Documentation](#-sdk-methods-documentation)
6. [Frontend Integration](#-frontend-integration)
7. [External Application Integration](#-external-application-integration)
8. [Production Deployment](#-production-deployment)
9. [Environment Configuration](#-environment-configuration)
10. [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

### One-Command Development Setup

```bash
# Clone and start everything instantly
git clone <repository-url>
cd krapi
pnpm run dev
```

**What happens:**

- ✅ Installs all dependencies
- ✅ Builds the KRAPI SDK
- ✅ Starts PostgreSQL database
- ✅ Starts backend API server (port 3470)
- ✅ Starts frontend manager (port 3469)
- ✅ Creates default admin user

**Access URLs:**

- **Frontend Manager**: http://localhost:3469
- **Backend API**: http://localhost:3470/krapi/k1
- **Admin Login**: `admin` / `admin123`

### Lightning Fast Development

```bash
# Skip build for instant startup
pnpm run dev:quick
```

---

## 🏗️ Architecture Overview

KRAPI implements a revolutionary **"Plug and Socket"** architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │   BACKEND       │    │   DATABASE      │
│   (The Plug)    │    │   (The Socket)  │    │   (PostgreSQL)  │
│                 │    │                 │    │                 │
│  React/Vue/etc  │◄──►│  Express API    │◄──►│  Auto-healing   │
│  Uses HTTP      │    │  Direct Access  │    │  Schema Mgmt    │
│  krapi.method() │    │  krapi.method() │    │  Migrations     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   KRAPI SDK     │
                    │ (Unified API)   │
                    │                 │
                    │ Same methods    │
                    │ everywhere!     │
                    └─────────────────┘
```

### Core Components

1. **KRAPI SDK** (`/packages/krapi-sdk/`) - The unified API layer
2. **Backend Server** (`/backend-server/`) - Express.js API with database
3. **Frontend Manager** (`/frontend-manager/`) - Next.js admin interface

---

## 🛠️ Startup Modes

### Development Mode

#### Option 1: Complete Development Setup

```bash
pnpm run dev
```

**Features:**

- Full dependency check
- SDK rebuild
- Health verification
- Both services with hot reload

#### Option 2: Quick Development

```bash
pnpm run dev:quick
```

**Features:**

- Instant startup
- Skip SDK build
- Perfect for daily development

#### Option 3: Individual Services

```bash
# Backend only
pnpm run dev:backend

# Frontend only
pnpm run dev:frontend

# SDK development
pnpm run dev:sdk
```

### Production Mode

#### Complete Production Deployment

```bash
pnpm run start
```

**Features:**

- Builds all packages
- Optimized production builds
- Environment validation
- Process management

#### Manual Production Build

```bash
# Build everything
pnpm run build

# Start backend
cd backend-server && pnpm start

# Start frontend
cd frontend-manager && pnpm start
```

### Maintenance Mode

#### Health Checks

```bash
# Complete system health check
pnpm run health

# Individual checks
pnpm run lint:all
pnpm run type-check:all
pnpm run build:all
```

#### System Maintenance

```bash
# Clean all build artifacts
pnpm run clean

# Complete reset (clean + reinstall)
pnpm run reset

# Database management
pnpm run docker:up
pnpm run docker:down
```

---

## 🌐 Complete API Reference

### Base URLs

#### Development

- **Backend API**: `http://localhost:3470/krapi/k1`
- **Frontend Proxy**: `http://localhost:3469/api/krapi/k1`

#### Production

- **Backend API**: `https://your-backend.com/krapi/k1`
- **Frontend Proxy**: `https://your-frontend.com/api/krapi/k1`

### Authentication

All API requests require authentication via:

#### API Key (Header)

```http
X-API-Key: your-api-key
```

#### Session Token (Header)

```http
Authorization: Bearer session-token
```

### HTTP Status Codes

| Code | Meaning               | Description                    |
| ---- | --------------------- | ------------------------------ |
| 200  | OK                    | Request successful             |
| 201  | Created               | Resource created               |
| 400  | Bad Request           | Invalid request data           |
| 401  | Unauthorized          | Missing/invalid authentication |
| 403  | Forbidden             | Insufficient permissions       |
| 404  | Not Found             | Resource not found             |
| 429  | Too Many Requests     | Rate limit exceeded            |
| 500  | Internal Server Error | Server error                   |

---

## 📋 SDK Methods Documentation

### Authentication Service

#### `auth.createSession(apiKey: string)`

Create a session using an API key.

**Parameters:**

- `apiKey` (string): Valid API key

**Returns:**

```typescript
{
  session_token: string;
  expires_at: string;
  user_type: "admin" | "project";
  scopes: string[];
}
```

**Example:**

```typescript
const session = await krapi.auth.createSession("pk_live_...");
```

#### `auth.login(credentials: LoginRequest)`

Authenticate with username/password.

**Parameters:**

```typescript
interface LoginRequest {
  username: string;
  password: string;
  remember_me?: boolean;
}
```

**Returns:**

```typescript
{
  session_token: string;
  expires_at: string;
  user: AdminUser;
  scopes: string[];
}
```

**Example:**

```typescript
const result = await krapi.auth.login({
  username: "admin",
  password: "admin123",
  remember_me: true,
});
```

#### `auth.getCurrentUser()`

Get current authenticated user.

**Returns:**

```typescript
{
  id: string;
  username: string;
  email?: string;
  permissions: string[];
  created_at: string;
}
```

#### `auth.logout()`

Logout current session.

**Returns:**

```typescript
{
  success: boolean;
}
```

#### `auth.changePassword(data: ChangePasswordRequest)`

Change user password.

**Parameters:**

```typescript
interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
```

#### `auth.refreshSession()`

Refresh current session token.

**Returns:**

```typescript
{
  session_token: string;
  expires_at: string;
}
```

#### `auth.validateSession(token: string)`

Validate a session token.

**Parameters:**

- `token` (string): Session token to validate

**Returns:**

```typescript
{
  valid: boolean;
  user?: AdminUser;
  expires_at?: string;
}
```

#### `auth.revokeSession(sessionId: string)`

Revoke a specific session.

**Parameters:**

- `sessionId` (string): Session ID to revoke

**Returns:**

```typescript
{
  success: boolean;
}
```

---

### Projects Service

#### `projects.create(data: CreateProjectRequest)`

Create a new project.

**Parameters:**

```typescript
interface CreateProjectRequest {
  name: string;
  description?: string;
  settings?: Record<string, unknown>;
}
```

**Returns:**

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

**Example:**

```typescript
const project = await krapi.projects.create({
  name: "My Application",
  description: "A revolutionary app built with KRAPI",
  settings: {
    timezone: "UTC",
    environment: "production",
  },
});
```

#### `projects.get(projectId: string)`

Get project by ID.

**Parameters:**

- `projectId` (string): Project identifier

**Returns:** `Project`

#### `projects.getAll(options?: QueryOptions)`

Get all projects with optional filtering.

**Parameters:**

```typescript
interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
  filter?: Record<string, unknown>;
}
```

**Returns:**

```typescript
{
  data: Project[];
  total: number;
  limit: number;
  offset: number;
}
```

#### `projects.update(projectId: string, updates: Partial<Project>)`

Update project.

**Parameters:**

- `projectId` (string): Project identifier
- `updates` (Partial<Project>): Fields to update

**Returns:** `Project`

#### `projects.delete(projectId: string)`

Delete project.

**Parameters:**

- `projectId` (string): Project identifier

**Returns:**

```typescript
{
  success: boolean;
}
```

#### `projects.getStatistics(projectId: string)`

Get project statistics.

**Parameters:**

- `projectId` (string): Project identifier

**Returns:**

```typescript
{
  totalCollections: number;
  totalDocuments: number;
  totalUsers: number;
  storageUsed: number;
  apiCallsThisMonth: number;
  lastActivity?: string;
}
```

#### `projects.getSettings(projectId: string)`

Get project settings.

**Parameters:**

- `projectId` (string): Project identifier

**Returns:**

```typescript
Record<string, unknown>;
```

#### `projects.updateSettings(projectId: string, settings: Record<string, unknown>)`

Update project settings.

**Parameters:**

- `projectId` (string): Project identifier
- `settings` (Record<string, unknown>): New settings

**Returns:**

```typescript
Record<string, unknown>;
```

#### `projects.getActivity(projectId: string, options?: ActivityOptions)`

Get project activity log.

**Parameters:**

```typescript
interface ActivityOptions {
  limit?: number;
  days?: number;
}
```

**Returns:**

```typescript
{
  activities: ActivityLog[];
  total: number;
}

interface ActivityLog {
  id: string;
  action: string;
  details: Record<string, unknown>;
  user_id?: string;
  created_at: string;
}
```

---

### Collections Service

#### `collections.create(projectId: string, data: CreateCollectionRequest)`

Create a new collection with dynamic schema.

**Parameters:**

```typescript
interface CreateCollectionRequest {
  name: string;
  description?: string;
  fields: FieldDefinition[];
  indexes?: IndexDefinition[];
}

interface FieldDefinition {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
}

type FieldType =
  | "string"
  | "integer"
  | "decimal"
  | "boolean"
  | "date"
  | "timestamp"
  | "text"
  | "json"
  | "uuid";

interface IndexDefinition {
  name: string;
  fields: string[];
  unique?: boolean;
}
```

**Returns:**

```typescript
interface Collection {
  id: string;
  name: string;
  description?: string;
  fields: FieldDefinition[];
  indexes: IndexDefinition[];
  created_at: string;
  updated_at: string;
}
```

**Example:**

```typescript
const collection = await krapi.collections.create("project-123", {
  name: "users",
  description: "User management collection",
  fields: [
    { name: "email", type: "string", required: true, unique: true },
    { name: "name", type: "string", required: true },
    { name: "age", type: "integer" },
    { name: "is_active", type: "boolean", default: true },
    { name: "metadata", type: "json", default: {} },
    { name: "created_at", type: "timestamp", default: "NOW()" },
  ],
  indexes: [
    { name: "email_idx", fields: ["email"], unique: true },
    { name: "name_idx", fields: ["name"] },
  ],
});
```

#### `collections.get(projectId: string, collectionName: string)`

Get collection by name.

**Parameters:**

- `projectId` (string): Project identifier
- `collectionName` (string): Collection name

**Returns:** `Collection`

#### `collections.getAll(projectId: string, options?: QueryOptions)`

Get all collections in a project.

**Parameters:**

- `projectId` (string): Project identifier
- `options` (QueryOptions): Optional filtering

**Returns:**

```typescript
{
  data: Collection[];
  total: number;
}
```

#### `collections.update(projectId: string, collectionName: string, updates: UpdateCollectionRequest)`

Update collection schema.

**Parameters:**

```typescript
interface UpdateCollectionRequest {
  description?: string;
  fields?: FieldDefinition[];
  indexes?: IndexDefinition[];
}
```

**Returns:** `Collection`

#### `collections.delete(projectId: string, collectionName: string)`

Delete collection and all its documents.

**Parameters:**

- `projectId` (string): Project identifier
- `collectionName` (string): Collection name

**Returns:**

```typescript
{
  success: boolean;
}
```

#### `collections.validateSchema(projectId: string, collectionName: string)`

Validate collection schema.

**Parameters:**

- `projectId` (string): Project identifier
- `collectionName` (string): Collection name

**Returns:**

```typescript
{
  valid: boolean;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  type: string;
  field?: string;
  message: string;
  severity: "error" | "warning" | "info";
}
```

#### `collections.getStatistics(projectId: string, collectionName: string)`

Get collection statistics.

**Parameters:**

- `projectId` (string): Project identifier
- `collectionName` (string): Collection name

**Returns:**

```typescript
{
  total_documents: number;
  total_size_bytes: number;
  average_document_size: number;
  field_statistics: Record<string, FieldStats>;
  index_usage: Record<string, IndexStats>;
}

interface FieldStats {
  null_count: number;
  unique_values: number;
  most_common_values?: Array<{ value: unknown; count: number }>;
}

interface IndexStats {
  size_bytes: number;
  scans: number;
  last_used?: string;
}
```

---

### Documents Service

#### `documents.create(projectId: string, collectionName: string, data: CreateDocumentRequest)`

Create a new document.

**Parameters:**

```typescript
interface CreateDocumentRequest {
  data: Record<string, unknown>;
  created_by?: string;
}
```

**Returns:**

```typescript
interface Document {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}
```

**Example:**

```typescript
const user = await krapi.documents.create("project-123", "users", {
  data: {
    email: "john@example.com",
    name: "John Doe",
    age: 30,
    is_active: true,
    metadata: { role: "admin" },
  },
  created_by: "admin-user-id",
});
```

#### `documents.get(projectId: string, collectionName: string, documentId: string)`

Get document by ID.

**Parameters:**

- `projectId` (string): Project identifier
- `collectionName` (string): Collection name
- `documentId` (string): Document identifier

**Returns:** `Document`

#### `documents.getAll(projectId: string, collectionName: string, options?: QueryOptions)`

Get all documents with filtering and pagination.

**Parameters:**

```typescript
interface QueryOptions {
  filter?: DocumentFilter;
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

interface DocumentFilter {
  [field: string]:
    | unknown
    | {
        $eq?: unknown;
        $ne?: unknown;
        $gt?: unknown;
        $gte?: unknown;
        $lt?: unknown;
        $lte?: unknown;
        $in?: unknown[];
        $nin?: unknown[];
      };
}
```

**Returns:**

```typescript
{
  data: Document[];
  total: number;
  limit: number;
  offset: number;
}
```

**Example:**

```typescript
const users = await krapi.documents.getAll("project-123", "users", {
  filter: {
    is_active: true,
    age: { $gte: 18, $lt: 65 },
  },
  limit: 10,
  offset: 0,
  orderBy: "created_at",
  order: "desc",
});
```

#### `documents.update(projectId: string, collectionName: string, documentId: string, data: UpdateDocumentRequest)`

Update document.

**Parameters:**

```typescript
interface UpdateDocumentRequest {
  data: Record<string, unknown>;
  updated_by?: string;
}
```

**Returns:** `Document`

#### `documents.delete(projectId: string, collectionName: string, documentId: string, options?: DeleteDocumentOptions)`

Delete document.

**Parameters:**

```typescript
interface DeleteDocumentOptions {
  deleted_by?: string;
}
```

**Returns:**

```typescript
{
  success: boolean;
}
```

#### `documents.bulkCreate(projectId: string, collectionName: string, documents: CreateDocumentRequest[])`

Create multiple documents.

**Parameters:**

- `documents` (CreateDocumentRequest[]): Array of documents to create

**Returns:**

```typescript
{
  created: Document[];
  errors: Array<{
    index: number;
    error: string;
  }>;
}
```

#### `documents.bulkUpdate(projectId: string, collectionName: string, updates: BulkUpdateRequest[])`

Update multiple documents.

**Parameters:**

```typescript
interface BulkUpdateRequest {
  id: string;
  data: Record<string, unknown>;
  updated_by?: string;
}
```

**Returns:**

```typescript
{
  updated: Document[];
  errors: Array<{
    id: string;
    error: string;
  }>;
}
```

#### `documents.bulkDelete(projectId: string, collectionName: string, documentIds: string[], options?: DeleteDocumentOptions)`

Delete multiple documents.

**Parameters:**

- `documentIds` (string[]): Array of document IDs to delete
- `options` (DeleteDocumentOptions): Optional delete options

**Returns:**

```typescript
{
  deleted_count: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}
```

#### `documents.count(projectId: string, collectionName: string, filter?: DocumentFilter)`

Count documents matching filter.

**Parameters:**

- `filter` (DocumentFilter): Optional filter criteria

**Returns:**

```typescript
{
  count: number;
}
```

#### `documents.aggregate(projectId: string, collectionName: string, aggregation: AggregationRequest)`

Perform aggregation operations.

**Parameters:**

```typescript
interface AggregationRequest {
  group_by?: string[];
  aggregations: Record<string, AggregationFunction>;
  filters?: DocumentFilter;
}

interface AggregationFunction {
  type: "count" | "sum" | "avg" | "min" | "max";
  field?: string;
}
```

**Returns:**

```typescript
{
  groups: Record<string, Record<string, number>>;
  total_groups: number;
}
```

**Example:**

```typescript
const stats = await krapi.documents.aggregate("project-123", "users", {
  group_by: ["is_active"],
  aggregations: {
    total_count: { type: "count" },
    average_age: { type: "avg", field: "age" },
    max_age: { type: "max", field: "age" },
  },
  filters: { age: { $gte: 18 } },
});
```

---

### Users Service

#### `users.create(projectId: string, data: CreateUserRequest)`

Create a project user.

**Parameters:**

```typescript
interface CreateUserRequest {
  email: string;
  name: string;
  role: string;
  permissions?: string[];
}
```

**Returns:**

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}
```

#### `users.get(projectId: string, userId: string)`

Get user by ID.

**Parameters:**

- `projectId` (string): Project identifier
- `userId` (string): User identifier

**Returns:** `User`

#### `users.getAll(projectId: string, options?: QueryOptions)`

Get all project users.

**Parameters:**

- `options` (QueryOptions): Optional filtering

**Returns:**

```typescript
{
  data: User[];
  total: number;
}
```

#### `users.update(projectId: string, userId: string, updates: Partial<User>)`

Update user.

**Parameters:**

- `projectId` (string): Project identifier
- `userId` (string): User identifier
- `updates` (Partial<User>): Fields to update

**Returns:** `User`

#### `users.delete(projectId: string, userId: string)`

Delete user.

**Parameters:**

- `projectId` (string): Project identifier
- `userId` (string): User identifier

**Returns:**

```typescript
{
  success: boolean;
}
```

#### `users.updateRole(projectId: string, userId: string, role: string)`

Update user role.

**Parameters:**

- `projectId` (string): Project identifier
- `userId` (string): User identifier
- `role` (string): New role

**Returns:** `User`

#### `users.updatePermissions(projectId: string, userId: string, permissions: string[])`

Update user permissions.

**Parameters:**

- `projectId` (string): Project identifier
- `userId` (string): User identifier
- `permissions` (string[]): New permissions array

**Returns:** `User`

#### `users.getActivity(projectId: string, userId: string, options?: ActivityOptions)`

Get user activity log.

**Parameters:**

- `projectId` (string): Project identifier
- `userId` (string): User identifier
- `options` (ActivityOptions): Optional filtering

**Returns:**

```typescript
{
  activities: ActivityLog[];
  total: number;
}
```

#### `users.getStatistics(projectId: string)`

Get user statistics for project.

**Parameters:**

- `projectId` (string): Project identifier

**Returns:**

```typescript
{
  total_users: number;
  active_users: number;
  users_by_role: Record<string, number>;
  recent_signups: number;
}
```

---

### Storage Service

#### `storage.uploadFile(projectId: string, file: FileUploadRequest)`

Upload a file.

**Parameters:**

```typescript
interface FileUploadRequest {
  file: Buffer | File;
  filename: string;
  mimetype: string;
  folder?: string;
  uploaded_by?: string;
}
```

**Returns:**

```typescript
interface FileInfo {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  folder?: string;
  url: string;
  uploaded_by?: string;
  uploaded_at: string;
}
```

#### `storage.downloadFile(projectId: string, fileId: string)`

Download a file.

**Parameters:**

- `projectId` (string): Project identifier
- `fileId` (string): File identifier

**Returns:**

```typescript
{
  buffer: Buffer;
  filename: string;
  mimetype: string;
}
```

#### `storage.getFile(projectId: string, fileId: string)`

Get file information.

**Parameters:**

- `projectId` (string): Project identifier
- `fileId` (string): File identifier

**Returns:** `FileInfo`

#### `storage.getFiles(projectId: string, options?: StorageQueryOptions)`

Get all files with filtering.

**Parameters:**

```typescript
interface StorageQueryOptions {
  folder?: string;
  mimetype?: string;
  limit?: number;
  offset?: number;
}
```

**Returns:**

```typescript
{
  files: FileInfo[];
  total: number;
}
```

#### `storage.deleteFile(projectId: string, fileId: string)`

Delete a file.

**Parameters:**

- `projectId` (string): Project identifier
- `fileId` (string): File identifier

**Returns:**

```typescript
{
  success: boolean;
}
```

#### `storage.createFolder(projectId: string, data: CreateFolderRequest)`

Create a folder.

**Parameters:**

```typescript
interface CreateFolderRequest {
  name: string;
  parent_folder?: string;
}
```

**Returns:**

```typescript
interface Folder {
  id: string;
  name: string;
  parent_folder?: string;
  created_at: string;
}
```

#### `storage.getFolders(projectId: string, parentFolder?: string)`

Get folders.

**Parameters:**

- `projectId` (string): Project identifier
- `parentFolder` (string, optional): Parent folder ID

**Returns:**

```typescript
{ folders: Folder[] }
```

#### `storage.deleteFolder(projectId: string, folderId: string)`

Delete a folder.

**Parameters:**

- `projectId` (string): Project identifier
- `folderId` (string): Folder identifier

**Returns:**

```typescript
{
  success: boolean;
}
```

#### `storage.getFileUrl(projectId: string, fileId: string)`

Get direct file URL.

**Parameters:**

- `projectId` (string): Project identifier
- `fileId` (string): File identifier

**Returns:**

```typescript
{
  url: string;
}
```

#### `storage.getStorageStatistics(projectId: string)`

Get storage statistics.

**Parameters:**

- `projectId` (string): Project identifier

**Returns:**

```typescript
{
  total_files: number;
  total_size: number;
  storage_quota: number;
  files_by_type: Record<string, number>;
  folder_statistics: Array<{
    folder: string;
    file_count: number;
    total_size: number;
  }>;
}
```

---

## 🌐 Frontend Integration

### External Application Integration

KRAPI now supports **frontend proxy functionality**, allowing external applications to use the frontend URL to access the backend API seamlessly.

#### How It Works

External applications can make API requests to:

```
https://your-frontend.com/api/krapi/k1/...
```

This will automatically proxy to:

```
https://your-backend.com/krapi/k1/...
```

#### Benefits

1. **Single URL**: External apps only need the frontend URL
2. **CORS Handling**: Automatic CORS headers
3. **Load Balancing**: Can distribute load across multiple backends
4. **SSL Termination**: Handle SSL at the frontend level
5. **Rate Limiting**: Can add rate limiting at the proxy level

#### Configuration

Set the backend URL in your frontend environment:

```env
# Frontend environment
KRAPI_BACKEND_URL=https://your-backend.com
```

#### Example Usage

```typescript
// External application using the frontend proxy
import { krapi } from "@krapi/sdk";

// Connect through the frontend proxy
await krapi.connect({
  endpoint: "https://your-frontend.com/api/krapi/k1",
  apiKey: "your-api-key",
});

// All methods work normally
const project = await krapi.projects.create({
  name: "External App Project",
});
```

#### Direct vs Proxy Comparison

| Method             | URL                                 | Best For                              |
| ------------------ | ----------------------------------- | ------------------------------------- |
| **Direct Backend** | `https://backend.com/krapi/k1`      | Maximum performance, server-to-server |
| **Frontend Proxy** | `https://frontend.com/api/krapi/k1` | External apps, unified endpoint       |

---

## 🚀 Production Deployment

### Complete Production Setup

#### 1. Backend Production

```bash
# Build backend
cd backend-server
pnpm run build

# Set production environment
export NODE_ENV=production
export DB_HOST=your-production-db-host
export DB_PORT=5432
export JWT_SECRET=your-super-secure-secret

# Start production server
pnpm start
```

#### 2. Frontend Production

```bash
# Build frontend
cd frontend-manager
pnpm run build

# Set production environment
export KRAPI_BACKEND_URL=https://your-backend.com
export NEXT_PUBLIC_API_URL=https://your-backend.com

# Start production server
pnpm start
```

#### 3. Database Production

```sql
-- Create production database
CREATE DATABASE krapi_production;

-- Create user with limited permissions
CREATE USER krapi_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE krapi_production TO krapi_user;
```

### Environment Variables

#### Backend Production Variables

```env
# Database
DB_HOST=your-production-db.com
DB_PORT=5432
DB_NAME=krapi_production
DB_USER=krapi_user
DB_PASSWORD=secure_password

# Security
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRES_IN=7d
SESSION_EXPIRES_IN=1h

# Server
PORT=3470
HOST=0.0.0.0
NODE_ENV=production

# Features
DEFAULT_ADMIN_PASSWORD=change-this-immediately
ENABLE_CORS=true
CORS_ORIGIN=https://your-frontend.com
```

#### Frontend Production Variables

```env
# Backend connection
KRAPI_BACKEND_URL=https://your-backend.com
NEXT_PUBLIC_API_URL=https://your-backend.com

# Application
NEXT_PUBLIC_APP_NAME=KRAPI Manager
NEXT_PUBLIC_APP_VERSION=2.0.0

# Security
KRAPI_ADMIN_API_KEY=your-admin-api-key
```

### Docker Production Deployment

#### Complete Docker Setup

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: krapi_production
      POSTGRES_USER: krapi_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build: ./backend-server
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: krapi_production
      DB_USER: krapi_user
      DB_PASSWORD: secure_password
      JWT_SECRET: your-256-bit-secret
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build: ./frontend-manager
    environment:
      KRAPI_BACKEND_URL: http://backend:3470
      NEXT_PUBLIC_API_URL: https://your-domain.com/backend
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3470;
    }

    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Frontend routes
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Backend API routes
        location /krapi/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Frontend proxy routes
        location /api/krapi/ {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### Cloud Deployment Options

#### Vercel + Railway

```bash
# Deploy frontend to Vercel
vercel --prod

# Deploy backend to Railway
railway up
```

#### AWS ECS

```bash
# Build and push Docker images
docker build -t krapi-backend ./backend-server
docker build -t krapi-frontend ./frontend-manager

# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin
docker tag krapi-backend:latest your-account.dkr.ecr.region.amazonaws.com/krapi-backend
docker push your-account.dkr.ecr.region.amazonaws.com/krapi-backend
```

#### DigitalOcean App Platform

```yaml
# .do/app.yaml
name: krapi
services:
  - name: backend
    source_dir: backend-server
    build_command: pnpm run build
    run_command: pnpm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs

  - name: frontend
    source_dir: frontend-manager
    build_command: pnpm run build
    run_command: pnpm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs

databases:
  - name: postgres
    engine: PG
    version: "15"
```

---

## ⚙️ Environment Configuration

### Development Configuration

#### Root Environment

```env
# Development defaults (no file needed)
NODE_ENV=development
```

#### Backend Development

```env
# backend-server/.env
DB_HOST=localhost
DB_PORT=5420
DB_NAME=krapi
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=default-secret-change-this
JWT_EXPIRES_IN=7d
SESSION_EXPIRES_IN=1h
DEFAULT_ADMIN_PASSWORD=admin123
PORT=3470
HOST=localhost
NODE_ENV=development
```

#### Frontend Development

```env
# frontend-manager/.env.local
KRAPI_BACKEND_URL=http://localhost:3470
NEXT_PUBLIC_API_URL=http://localhost:3470
KRAPI_ADMIN_API_KEY=dev-admin-key
NEXT_PUBLIC_APP_NAME=KRAPI Manager
NEXT_PUBLIC_APP_VERSION=2.0.0
```

### Production Configuration

#### Backend Production

```env
# backend-server/.env.production
NODE_ENV=production
DB_HOST=your-prod-db.com
DB_PORT=5432
DB_NAME=krapi_production
DB_USER=krapi_prod_user
DB_PASSWORD=super-secure-password
JWT_SECRET=your-256-bit-production-secret
JWT_EXPIRES_IN=7d
SESSION_EXPIRES_IN=1h
DEFAULT_ADMIN_PASSWORD=change-immediately
PORT=3470
HOST=0.0.0.0
ENABLE_CORS=true
CORS_ORIGIN=https://your-frontend.com
```

#### Frontend Production

```env
# frontend-manager/.env.production
KRAPI_BACKEND_URL=https://api.your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
KRAPI_ADMIN_API_KEY=prod-admin-api-key
NEXT_PUBLIC_APP_NAME=KRAPI Manager
NEXT_PUBLIC_APP_VERSION=2.0.0
```

---

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Check what's using the ports
lsof -i :3469  # Frontend
lsof -i :3470  # Backend

# Kill processes
npx kill-port 3469 3470

# Or use different ports
PORT=3471 pnpm run dev:backend
```

#### Database Connection Issues

```bash
# Check database status
pnpm run docker:logs

# Restart database
pnpm run docker:down
pnpm run docker:up

# Check connection
psql -h localhost -p 5420 -U postgres -d krapi
```

#### Build Errors

```bash
# Clean everything
pnpm run clean

# Reset everything
pnpm run reset

# Manual cleanup
rm -rf node_modules */node_modules */dist */.next
pnpm install
```

#### SDK Type Errors

```bash
# Rebuild SDK
cd packages/krapi-sdk
pnpm run build

# Check types
pnpm run type-check
```

#### Authentication Issues

```bash
# Reset admin password
# In backend console:
UPDATE admin_users SET password_hash = '$2a$10$...' WHERE username = 'admin';

# Or use environment variable
DEFAULT_ADMIN_PASSWORD=newpassword pnpm run dev:backend
```

### Health Diagnostics

#### Complete Health Check

```bash
# Run comprehensive health check
pnpm run health

# Individual checks
pnpm run lint:all      # Code quality
pnpm run type-check:all # Type safety
pnpm run build:all     # Build verification
```

#### Database Health

```bash
# Check database connection
curl http://localhost:3470/health

# Run database diagnostics
curl http://localhost:3470/krapi/k1/health/database
```

#### API Health

```bash
# Test API endpoints
curl -H "X-API-Key: your-key" http://localhost:3470/krapi/k1/projects

# Test authentication
curl -X POST http://localhost:3470/krapi/k1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Performance Optimization

#### Development Performance

```bash
# Use quick startup
pnpm run dev:quick

# Skip health checks
pnpm run dev:backend & pnpm run dev:frontend
```

#### Production Performance

```bash
# Enable all optimizations
NODE_ENV=production pnpm run build:all

# Use PM2 for process management
pm2 start ecosystem.config.js
```

#### Database Performance

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM collections WHERE project_id = 'xxx';

-- Create additional indexes
CREATE INDEX CONCURRENTLY idx_documents_created_at ON documents(created_at);

-- Update statistics
ANALYZE;
```

---

## 🎯 Advanced Usage Examples

### Complete Application Example

```typescript
// Task Management Application
class TaskManager {
  constructor(private projectId: string) {}

  async initialize() {
    // Create collections
    await krapi.collections.create(this.projectId, {
      name: "tasks",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "description", type: "text" },
        { name: "status", type: "string", default: "todo" },
        { name: "priority", type: "string", default: "medium" },
        { name: "assignee_id", type: "uuid" },
        { name: "due_date", type: "date" },
        { name: "labels", type: "json", default: [] },
      ],
    });

    await krapi.collections.create(this.projectId, {
      name: "team_members",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "email", type: "string", required: true, unique: true },
        { name: "role", type: "string", default: "member" },
        { name: "avatar", type: "string" },
      ],
    });
  }

  async createTask(data: {
    title: string;
    description?: string;
    priority: "low" | "medium" | "high";
    assignee_id?: string;
    due_date?: string;
  }) {
    return krapi.documents.create(this.projectId, "tasks", { data });
  }

  async getTasks(filter?: {
    status?: string;
    assignee_id?: string;
    priority?: string;
  }) {
    return krapi.documents.getAll(this.projectId, "tasks", {
      filter,
      orderBy: "created_at",
      order: "desc",
    });
  }

  async updateTaskStatus(taskId: string, status: string) {
    return krapi.documents.update(this.projectId, "tasks", taskId, {
      data: { status },
    });
  }

  async getTaskStatistics() {
    return krapi.documents.aggregate(this.projectId, "tasks", {
      group_by: ["status"],
      aggregations: {
        count: { type: "count" },
        avg_priority: { type: "avg", field: "priority" },
      },
    });
  }
}

// Use identically in frontend and backend!
const taskManager = new TaskManager("project-123");
await taskManager.initialize();

const task = await taskManager.createTask({
  title: "Implement user authentication",
  priority: "high",
  due_date: "2024-02-15",
});
```

---

## 🎉 Conclusion

KRAPI provides a **revolutionary Backend-as-a-Service** with perfect plug and socket architecture. This documentation covers:

✅ **Complete API Reference** - All 80+ methods documented  
✅ **Perfect Startup System** - One command development setup  
✅ **Frontend Proxy** - External apps can use frontend URL  
✅ **Production Deployment** - Complete deployment guides  
✅ **Troubleshooting** - Common issues and solutions

### Quick Reference Commands

```bash
# Development
pnpm run dev           # Complete development setup
pnpm run dev:quick     # Fast development startup

# Production
pnpm run start         # Production deployment

# Maintenance
pnpm run health        # Complete health check
pnpm run reset         # Clean reset

# Docker
pnpm run docker:up     # Start database
```

### Support & Resources

- **GitHub**: [Repository Link]
- **Documentation**: This comprehensive guide
- **SDK Reference**: `packages/krapi-sdk/README.md`
- **Examples**: Real-world application examples
- **Discord**: Community support channel

**Start building amazing applications with KRAPI today!** 🚀
