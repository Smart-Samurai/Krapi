# Krapi API Migration Guide

This guide helps you migrate from incorrect API usage patterns to the correct ones.

## Common Migration Issues

### 1. Authentication - Username vs Email

❌ **Incorrect** (using email):
```javascript
const loginResult = await krapi.auth.login('admin@example.com', 'password');
```

✅ **Correct** (using username):
```javascript
const loginResult = await krapi.auth.login('admin', 'admin123');
```

**Note**: The backend expects `username` field, not `email` for login.

### 2. API Endpoint - Version

❌ **Incorrect** (old version k1):
```javascript
const krapi = createKrapi({
  endpoint: 'http://localhost:3470/krapi/k1'
});
```

✅ **Correct** (current version):
```javascript
const krapi = createKrapi({
  endpoint: 'http://localhost:3470/krapi/v1'
});
```

### 3. Project Operations - Wrong Module

❌ **Incorrect** (using projects module):
```javascript
const projects = await krapi.projects.list();
const newProject = await krapi.projects.create({ name: 'My Project' });
const deleted = await krapi.projects.delete('project-id');
```

✅ **Correct** (using admin module):
```javascript
const projects = await krapi.admin.listProjects();
const newProject = await krapi.admin.createProject({ name: 'My Project' });
const deleted = await krapi.admin.deleteProject('project-id');
```

**Note**: Project CRUD operations are in the `admin` module. The `projects` module is only for project-specific operations like API key management.

### 4. Database Operations - Missing ProjectId

❌ **Incorrect** (no projectId):
```javascript
const collections = await krapi.database.listCollections();
const newCollection = await krapi.database.createCollection({
  name: 'posts',
  schema: { /* ... */ }
});
```

✅ **Correct** (with projectId when using admin auth):
```javascript
const collections = await krapi.database.listCollections({ projectId: 'project-id' });
const newCollection = await krapi.database.createCollection({
  projectId: 'project-id',
  name: 'posts',
  schema: { /* ... */ }
});
```

**Important**: When using admin JWT authentication, you must pass `projectId` explicitly. When using API key authentication, the backend adds it automatically.

### 5. Storage Operations - Missing ProjectId

❌ **Incorrect** (no projectId):
```javascript
const files = await krapi.storage.listFiles();
```

✅ **Correct** (with projectId when using admin auth):
```javascript
const files = await krapi.storage.listFiles({ projectId: 'project-id' });
```

### 6. Type Property Names

❌ **Incorrect** (camelCase):
```javascript
// Collection properties
collection.documentCount
collection.createdAt
collection.updatedAt

// File properties
file.mimeType
file.createdAt
```

✅ **Correct** (snake_case):
```javascript
// Collection properties
collection.document_count
collection.created_at
collection.updated_at

// File properties
file.mime_type
file.created_at
```

### 7. File URLs

❌ **Incorrect** (direct URL property):
```javascript
window.open(file.url, '_blank');
```

✅ **Correct** (using getFileUrl method):
```javascript
const url = krapi.storage.getFileUrl(file.id);
window.open(url, '_blank');
```

## Authentication Context Summary

### Admin Authentication (JWT)
- Used for admin operations
- Requires explicit `projectId` for project-scoped operations
- Token passed via `Authorization: Bearer <token>` header
- Login with username/password

### Project API Authentication
- Used for project-specific operations
- `projectId` automatically added by backend
- API key passed via `X-API-Key: <key>` header
- No login required, just use the API key

## Response Format

All API responses follow this structure:
```typescript
{
  success: boolean;
  data?: T;           // Present on success
  error?: string;     // Present on failure
  message?: string;   // Optional message
}
```

## Quick Reference

| Operation | Module | Auth Type | ProjectId Required |
|-----------|--------|-----------|-------------------|
| List Projects | `admin` | JWT | No |
| Create Project | `admin` | JWT | No |
| List Collections | `database` | JWT/API Key | Yes (JWT only) |
| Create Document | `database` | JWT/API Key | Yes (JWT only) |
| List Files | `storage` | JWT/API Key | Yes (JWT only) |
| Create API Key | `projects` | JWT | Yes |

## Need Help?

- Check the [Unified API Documentation](./UNIFIED_API_DOCUMENTATION.md)
- Review the [Krapi Client Library README](./admin-frontend/lib/krapi/README.md)
- Look at example implementations in the frontend pages