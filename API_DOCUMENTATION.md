# KRAPI API Documentation

Complete API reference for KRAPI backend database and file storage solution.

## Base URL

```
Development: http://localhost:3470
Production: https://your-domain.com
```

All API endpoints are prefixed with `/krapi/k1`

## Authentication

KRAPI supports multiple authentication methods:

### 1. Admin Session Token

```http
Authorization: Bearer <admin-session-token>
```

### 2. Project Session Token

```http
Authorization: Bearer <project-session-token>
X-Project-ID: <project-id>
```

### 3. API Key

```http
Authorization: Bearer <api-key>
X-Project-ID: <project-id>  # If project-specific
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "data": null
}
```

## Endpoints

### Authentication

#### Admin Login

```http
POST /krapi/k1/auth/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "session-token",
    "expires_at": "2024-01-01T00:00:00Z",
    "user": {
      "id": "user-id",
      "username": "admin",
      "email": "admin@example.com"
    }
  }
}
```

#### Project User Login

```http
POST /krapi/k1/auth/project/:projectId/session
Content-Type: application/json

{
  "username": "project-user",
  "password": "password"
}
```

### Projects

#### List Projects

```http
GET /krapi/k1/projects
Authorization: Bearer <token>
```

#### Get Project

```http
GET /krapi/k1/projects/:projectId
Authorization: Bearer <token>
```

#### Create Project

```http
POST /krapi/k1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description",
  "allowed_origins": ["https://example.com"]
}
```

#### Update Project

```http
PUT /krapi/k1/projects/:projectId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Delete Project

```http
DELETE /krapi/k1/projects/:projectId
Authorization: Bearer <token>
```

### Collections

#### List Collections

```http
GET /krapi/k1/projects/:projectId/collections
Authorization: Bearer <token>
```

#### Get Collection

```http
GET /krapi/k1/projects/:projectId/collections/:collectionName
Authorization: Bearer <token>
```

#### Create Collection

```http
POST /krapi/k1/projects/:projectId/collections
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "users",
  "description": "User collection",
  "fields": [
    {
      "name": "email",
      "type": "string",
      "required": true
    },
    {
      "name": "age",
      "type": "number",
      "required": false
    }
  ],
  "indexes": [
    {
      "fields": ["email"],
      "unique": true
    }
  ]
}
```

#### Update Collection

```http
PUT /krapi/k1/projects/:projectId/collections/:collectionName
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Updated description",
  "fields": [ ... ]
}
```

#### Delete Collection

```http
DELETE /krapi/k1/projects/:projectId/collections/:collectionName
Authorization: Bearer <token>
```

### Documents

#### List Documents

```http
GET /krapi/k1/projects/:projectId/collections/:collectionName/documents
Authorization: Bearer <token>
Query Parameters:
  - limit: number (default: 100)
  - offset: number (default: 0)
  - filter: JSON object
  - sort: JSON object
```

#### Get Document

```http
GET /krapi/k1/projects/:projectId/collections/:collectionName/documents/:documentId
Authorization: Bearer <token>
```

#### Create Document

```http
POST /krapi/k1/projects/:projectId/collections/:collectionName/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@example.com",
  "age": 30,
  "name": "John Doe"
}
```

#### Bulk Create Documents

```http
POST /krapi/k1/projects/:projectId/collections/:collectionName/documents/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "documents": [
    { "email": "user1@example.com", "age": 25 },
    { "email": "user2@example.com", "age": 30 }
  ]
}
```

#### Update Document

```http
PUT /krapi/k1/projects/:projectId/collections/:collectionName/documents/:documentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "age": 31
}
```

#### Bulk Update Documents

```http
PUT /krapi/k1/projects/:projectId/collections/:collectionName/documents/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "filter": { "age": { "$lt": 18 } },
  "updates": { "status": "minor" }
}
```

#### Delete Document

```http
DELETE /krapi/k1/projects/:projectId/collections/:collectionName/documents/:documentId
Authorization: Bearer <token>
```

#### Bulk Delete Documents

```http
DELETE /krapi/k1/projects/:projectId/collections/:collectionName/documents/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "filter": { "status": "deleted" }
}
```

#### Search Documents

```http
POST /krapi/k1/projects/:projectId/collections/:collectionName/documents/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "search term",
  "fields": ["name", "description"],
  "limit": 10
}
```

#### Aggregate Documents

```http
POST /krapi/k1/projects/:projectId/collections/:collectionName/documents/aggregate
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupBy": "category",
  "operations": [
    { "field": "price", "operation": "sum" },
    { "field": "quantity", "operation": "avg" }
  ]
}
```

### Files

#### List Files

```http
GET /krapi/k1/projects/:projectId/files
Authorization: Bearer <token>
Query Parameters:
  - folder_id: string
  - limit: number
  - offset: number
```

#### Upload File

```http
POST /krapi/k1/projects/:projectId/files
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
folder_id: <optional-folder-id>
metadata: <optional-json>
```

#### Get File

```http
GET /krapi/k1/projects/:projectId/files/:fileId
Authorization: Bearer <token>
```

#### Download File

```http
GET /krapi/k1/projects/:projectId/files/:fileId/download
Authorization: Bearer <token>
```

#### Update File Metadata

```http
PUT /krapi/k1/projects/:projectId/files/:fileId
Authorization: Bearer <token>
Content-Type: application/json

{
  "metadata": {
    "title": "New Title",
    "tags": ["tag1", "tag2"]
  }
}
```

#### Move File

```http
POST /krapi/k1/projects/:projectId/files/:fileId/move
Authorization: Bearer <token>
Content-Type: application/json

{
  "folder_id": "target-folder-id"
}
```

#### Delete File

```http
DELETE /krapi/k1/projects/:projectId/files/:fileId
Authorization: Bearer <token>
```

### Users

#### List Project Users

```http
GET /krapi/k1/projects/:projectId/users
Authorization: Bearer <token>
```

#### Create Project User

```http
POST /krapi/k1/projects/:projectId/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "user1",
  "email": "user@example.com",
  "password": "secure-password",
  "permissions": ["read", "write"]
}
```

#### Update Project User

```http
PUT /krapi/k1/projects/:projectId/users/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "permissions": ["read"]
}
```

#### Delete Project User

```http
DELETE /krapi/k1/projects/:projectId/users/:userId
Authorization: Bearer <token>
```

### API Keys

#### List API Keys

```http
GET /krapi/k1/projects/:projectId/api-keys
Authorization: Bearer <token>
```

#### Create API Key

```http
POST /krapi/k1/projects/:projectId/api-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My API Key",
  "description": "Key for mobile app",
  "scopes": ["documents:read", "documents:write"],
  "expires_at": "2024-12-31T23:59:59Z"
}
```

#### Update API Key

```http
PUT /krapi/k1/projects/:projectId/api-keys/:keyId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "scopes": ["documents:read"]
}
```

#### Delete API Key

```http
DELETE /krapi/k1/projects/:projectId/api-keys/:keyId
Authorization: Bearer <token>
```

### Backups

#### Create Project Backup

```http
POST /krapi/k1/projects/:projectId/backup
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Monthly backup",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "success": true,
  "backup_id": "backup_123...",
  "password": "generated-or-provided-password",
  "created_at": "2024-01-01T00:00:00Z",
  "size": 1048576
}
```

#### Restore Project Backup

```http
POST /krapi/k1/projects/:projectId/restore
Authorization: Bearer <token>
Content-Type: application/json

{
  "backup_id": "backup_123...",
  "password": "secure-password",
  "overwrite": false
}
```

#### List Backups

```http
GET /krapi/k1/projects/:projectId/backups
Authorization: Bearer <token>
Query Parameters:
  - type: "project" | "system"
```

#### Create System Backup

```http
POST /krapi/k1/backup/system
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Full system backup",
  "password": "secure-password"
}
```

#### Delete Backup

```http
DELETE /krapi/k1/backups/:backupId
Authorization: Bearer <token>
```

### Email

#### List Email Templates

```http
GET /krapi/k1/projects/:projectId/email/templates
Authorization: Bearer <token>
```

#### Create Email Template

```http
POST /krapi/k1/projects/:projectId/email/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Welcome Email",
  "subject": "Welcome to {{company_name}}!",
  "body": "Hello {{user_name}}, welcome!",
  "variables": ["company_name", "user_name"]
}
```

#### Send Test Email

```http
POST /krapi/k1/email/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "test@example.com",
  "subject": "Test Email",
  "body": "This is a test"
}
```

### Activity Logs

#### Get Activity Logs

```http
GET /krapi/k1/projects/:projectId/activity/logs
Authorization: Bearer <token>
Query Parameters:
  - limit: number
  - offset: number
  - action: string
  - user_id: string
```

#### Get Activity Stats

```http
GET /krapi/k1/projects/:projectId/activity/stats
Authorization: Bearer <token>
```

### System

#### Health Check

```http
GET /krapi/k1/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "database": {
    "connected": true,
    "health": "healthy"
  }
}
```

#### System Stats

```http
GET /krapi/k1/system/stats
Authorization: Bearer <token>
```

## Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., duplicate collection name)
- `500` - Internal Server Error

## Rate Limiting

API keys can have rate limits configured. When exceeded:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

## Pagination

Endpoints that return lists support pagination:

```http
GET /endpoint?limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 150,
    "has_more": true
  }
}
```

## Filtering

Documents endpoint supports filtering:

```http
GET /documents?filter={"age":{"$gt":18},"status":"active"}
```

Supported operators:
- `$eq` - Equal
- `$ne` - Not equal
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - In array
- `$nin` - Not in array
- `$like` - SQL LIKE pattern

## Sorting

Documents endpoint supports sorting:

```http
GET /documents?sort={"age":"desc","name":"asc"}
```

## SDK Usage

KRAPI provides a TypeScript SDK for easy integration:

```typescript
import { KrapiSDK } from '@krapi/sdk';

// Initialize SDK
const krapi = await KrapiSDK.connect({
  endpoint: 'http://localhost:3470',
  apiKey: 'your-api-key'
});

// Use SDK methods
const projects = await krapi.projects.list();
const documents = await krapi.collections.documents.list('project-id', 'collection-name');
```

For complete SDK documentation, see the SDK README in `packages/krapi-sdk/`.
