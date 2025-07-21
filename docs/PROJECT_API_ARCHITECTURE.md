# Krapi CMS - Project-Based API Architecture

## Overview

Krapi CMS has been refactored to use a modern, Appwrite-like architecture that simplifies content management and provides better scalability. This new system replaces the previous route/content model with a project-based approach.

## Key Changes

### 1. Project-Based Organization

- **Projects**: Each project is a self-contained environment with its own collections, users, and API keys
- **Collections**: Replace the old "routes" concept with flexible document collections
- **Documents**: Store structured data within collections
- **API Keys**: Project-specific authentication for client applications

### 2. Unified API Endpoint

- Single API endpoint (`/api/v2`) for all project operations
- Consistent authentication using API keys or JWT tokens
- RESTful design following modern standards

### 3. Enhanced Authentication

- **API Key Authentication**: For client applications and external integrations
- **User Authentication**: For project users and admin access
- **Role-Based Permissions**: Granular control over project resources

## Architecture Components

### Database Structure

#### Projects Table

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  settings TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  status TEXT DEFAULT 'active'
);
```

#### Collections Table

```sql
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  schema TEXT NOT NULL,
  indexes TEXT DEFAULT '[]',
  permissions TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  document_count INTEGER DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  UNIQUE(project_id, name)
);
```

#### Documents Table

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);
```

#### Project Users Table

```sql
CREATE TABLE project_users (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'active',
  email_verified BOOLEAN DEFAULT 0,
  phone_verified BOOLEAN DEFAULT 0,
  oauth_providers TEXT DEFAULT '[]',
  preferences TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  UNIQUE(project_id, email)
);
```

#### Project API Keys Table

```sql
CREATE TABLE project_api_keys (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,
  permissions TEXT NOT NULL,
  expires_at DATETIME,
  last_used DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);
```

## API Endpoints

### Authentication

#### User Login

```http
POST /api/v2/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "project_id": "project-id"
}
```

#### API Key Verification

```http
POST /api/v2/auth/verify
X-API-Key: your-api-key
```

### Project Management (Admin)

#### Get All Projects

```http
GET /api/v2/admin/projects
Authorization: Bearer <admin-token>
```

#### Create Project

```http
POST /api/v2/admin/projects
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description",
  "domain": "example.com",
  "settings": {
    "auth": {
      "enabled": true,
      "methods": ["email"],
      "oauth_providers": [],
      "email_verification": false,
      "phone_verification": false
    },
    "storage": {
      "max_file_size": 10485760,
      "allowed_types": ["image/*", "application/pdf", "text/*"],
      "compression": true
    },
    "api": {
      "rate_limit": 1000,
      "cors_origins": ["*"]
    },
    "database": {
      "max_collections": 100,
      "max_documents_per_collection": 10000
    }
  }
}
```

### Collections

#### Get Collections

```http
GET /api/v2/projects/{projectId}/collections
X-API-Key: <project-api-key>
```

#### Create Collection

```http
POST /api/v2/projects/{projectId}/collections
X-API-Key: <project-api-key>
Content-Type: application/json

{
  "name": "posts",
  "description": "Blog posts collection",
  "schema": {
    "fields": [
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "content",
        "type": "string",
        "required": true
      },
      {
        "name": "author",
        "type": "string",
        "required": false
      }
    ],
    "required": ["title", "content"],
    "unique": ["title"]
  },
  "permissions": {
    "read": ["*"],
    "write": ["*"],
    "delete": ["*"],
    "create": ["*"]
  }
}
```

### Documents

#### Get Documents

```http
GET /api/v2/projects/{projectId}/collections/{collectionId}/documents?limit=100&offset=0
X-API-Key: <project-api-key>
```

#### Create Document

```http
POST /api/v2/projects/{projectId}/collections/{collectionId}/documents
X-API-Key: <project-api-key>
Content-Type: application/json

{
  "data": {
    "title": "My First Post",
    "content": "This is the content of my blog post.",
    "author": "John Doe"
  }
}
```

#### Update Document

```http
PUT /api/v2/projects/{projectId}/collections/{collectionId}/documents/{documentId}
X-API-Key: <project-api-key>
Content-Type: application/json

{
  "data": {
    "title": "Updated Post Title",
    "content": "Updated content",
    "author": "John Doe"
  }
}
```

#### Delete Document

```http
DELETE /api/v2/projects/{projectId}/collections/{collectionId}/documents/{documentId}
X-API-Key: <project-api-key>
```

### Users

#### Get Project Users

```http
GET /api/v2/projects/{projectId}/users
X-API-Key: <project-api-key>
```

#### Create User

```http
POST /api/v2/projects/{projectId}/users
X-API-Key: <project-api-key>
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

### API Keys

#### Get API Keys

```http
GET /api/v2/projects/{projectId}/keys
X-API-Key: <project-api-key>
```

#### Create API Key

```http
POST /api/v2/projects/{projectId}/keys
X-API-Key: <project-api-key>
Content-Type: application/json

{
  "name": "My API Key",
  "permissions": ["*"]
}
```

### Stats

#### Get Project Stats

```http
GET /api/v2/projects/{projectId}/stats
X-API-Key: <project-api-key>
```

## Unified API (Appwrite-Style)

For client applications, you can also use the unified API endpoint:

```http
GET /api/v2/databases/{databaseId}/collections/{collectionId}/documents
X-API-Key: <project-api-key>
```

Where `databaseId` is your project ID.

## Migration from Old System

### 1. Data Migration

The old route/content system data can be migrated to the new project-based system:

- **Routes** → **Collections** (with appropriate schemas)
- **Content Items** → **Documents** (within collections)
- **Users** → **Project Users** (within specific projects)

### 2. API Migration

Old API endpoints are still available for backward compatibility:

- `/api/content/*` - Old content endpoints
- `/api/admin/*` - Old admin endpoints

New endpoints are available at:

- `/api/v2/*` - New project-based endpoints

### 3. Frontend Migration

The frontend has been updated to support both systems:

- **Projects Page**: `/projects` - Manage projects
- **Legacy Pages**: Still available for existing functionality

## Benefits of New Architecture

### 1. Scalability

- **Multi-tenant**: Each project is isolated
- **Performance**: Optimized database queries
- **Storage**: Separate file storage per project

### 2. Developer Experience

- **Simple API**: Consistent RESTful endpoints
- **Flexible Schema**: Dynamic collection schemas
- **Easy Integration**: Standard API key authentication

### 3. Security

- **Project Isolation**: Complete separation between projects
- **Granular Permissions**: Fine-grained access control
- **API Key Management**: Secure key generation and rotation

### 4. Modern Features

- **Real-time Updates**: WebSocket support for live data
- **File Management**: Integrated file storage
- **User Management**: Built-in authentication system

## Getting Started

### 1. Create a Project

```javascript
const response = await fetch("/api/v2/admin/projects", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "My Website",
    description: "My personal website project",
  }),
});
```

### 2. Generate API Key

```javascript
const response = await fetch(`/api/v2/projects/${projectId}/keys`, {
  method: "POST",
  headers: {
    "X-API-Key": adminApiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Website API Key",
    permissions: ["*"],
  }),
});
```

### 3. Create Collection

```javascript
const response = await fetch(`/api/v2/projects/${projectId}/collections`, {
  method: "POST",
  headers: {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "blog_posts",
    schema: {
      fields: [
        { name: "title", type: "string", required: true },
        { name: "content", type: "string", required: true },
        { name: "published", type: "boolean", required: false },
      ],
    },
  }),
});
```

### 4. Add Documents

```javascript
const response = await fetch(
  `/api/v2/projects/${projectId}/collections/${collectionId}/documents`,
  {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        title: "Hello World",
        content: "This is my first blog post!",
        published: true,
      },
    }),
  }
);
```

## Testing

Use the provided test script to verify the API functionality:

```bash
node test-project-api.js
```

This will test all major endpoints and verify the system is working correctly.

## Future Enhancements

### Planned Features

1. **Real-time Subscriptions**: WebSocket-based live updates
2. **Advanced Queries**: Complex filtering and sorting
3. **File Storage**: Integrated file management
4. **Webhooks**: Event-driven integrations
5. **Analytics**: Usage tracking and insights
6. **Multi-region**: Geographic distribution
7. **Backup & Recovery**: Automated data protection

### Integration Examples

- **Next.js**: Server-side rendering with real-time data
- **React**: Client-side state management
- **Mobile Apps**: Native iOS/Android integration
- **Static Sites**: JAMstack with dynamic content
- **E-commerce**: Product catalog management

## Support

For questions and support:

- **Documentation**: Check this file and inline code comments
- **Issues**: Report bugs in the project repository
- **Discussions**: Use GitHub discussions for questions
- **Examples**: See the test scripts and frontend code

---

_This architecture provides a modern, scalable foundation for content management that rivals commercial solutions like Appwrite, Firebase, and Supabase while maintaining the simplicity and flexibility that makes Krapi CMS unique._
