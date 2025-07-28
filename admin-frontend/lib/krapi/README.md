# Krapi Client Library

A comprehensive TypeScript/JavaScript client library for interacting with the Krapi backend API.

## Installation

The library is already included in the Next.js frontend application. No additional installation is needed.

## Quick Start

### Basic Usage

```typescript
import { createDefaultKrapi } from '@/lib/krapi';

// Create a Krapi instance with default configuration
const krapi = createDefaultKrapi();

// Check API health
const health = await krapi.client.health();
console.log('API Health:', health);
```

### Custom Configuration

```typescript
import { createKrapi } from '@/lib/krapi';

// Create a Krapi instance with custom configuration
const krapi = createKrapi({
  endpoint: 'https://api.yourserver.com/krapi/v1',
  apiKey: 'your-api-key',
  secret: 'your-secret',
  timeout: 60000, // 60 seconds
});
```

## Architecture

The Krapi library follows a modular architecture with separate modules for different API operations:

- **Client**: Core HTTP client with authentication handling
- **Auth**: Authentication operations (login, verify, logout)
- **Admin**: Admin-specific operations (projects, system management)
- **Database**: Database operations (collections, documents)
- **Storage**: File storage operations
- **Users**: User management
- **Projects**: Project-specific operations (API keys, stats)
- **Email**: Email operations

**Important Note**: Project CRUD operations (create, read, update, delete) are handled by the **Admin** module, not the Projects module. The Projects module is for project-specific operations like managing API keys.

## Authentication

The library supports two types of authentication:

### 1. Admin Authentication (JWT)

```typescript
// Login as admin (uses username, not email)
const loginResult = await krapi.auth.login('admin', 'admin123');
if (loginResult.success) {
  // Token is automatically stored and used for subsequent requests
  console.log('Logged in:', loginResult.data);
}
```

### 2. Project API Authentication

```typescript
// Create client with API key for project-specific operations
const projectKrapi = createKrapi({
  endpoint: 'http://localhost:3470/krapi/v1',
  apiKey: 'your-project-api-key',
});
```

**Important**: When using API key authentication, the backend automatically adds the `projectId` to requests. When using admin JWT authentication, you must explicitly pass `projectId` in the params for project-scoped operations (collections, documents, files).

## Module Usage

### Auth Module

```typescript
// Login (uses username, not email)
const loginResult = await krapi.auth.login('username', 'password');

// Verify token
const verifyResult = await krapi.auth.verify();

// Logout
const logoutResult = await krapi.auth.logout();
```

### Database Module

```typescript
// List collections (requires projectId when using admin auth)
const collections = await krapi.database.listCollections({ projectId: 'project-id' });

// Create collection (requires projectId when using admin auth)
const newCollection = await krapi.database.createCollection({
  name: 'posts',
  projectId: 'project-id', // Required when using admin auth
  schema: {
    title: { type: 'string', required: true },
    content: { type: 'string' },
    published: { type: 'boolean', default: false }
  }
});

// List documents
const documents = await krapi.database.listDocuments('posts', {
  limit: 10,
  offset: 0
});

// Create document
const newDoc = await krapi.database.createDocument('posts', {
  title: 'Hello World',
  content: 'This is my first post',
  published: true
});

// Get document
const doc = await krapi.database.getDocument('posts', 'document-id');

// Update document
const updated = await krapi.database.updateDocument('posts', 'document-id', {
  published: false
});

// Delete document
const deleted = await krapi.database.deleteDocument('posts', 'document-id');
```

### Storage Module

```typescript
// Upload file
const file = new File(['content'], 'test.txt', { type: 'text/plain' });
const uploaded = await krapi.storage.uploadFile(file);

// List files (requires projectId when using admin auth)
const files = await krapi.storage.listFiles({ projectId: 'project-id' });

// Get file
const fileData = await krapi.storage.getFile('file-id');

// Delete file
const deleted = await krapi.storage.deleteFile('file-id');
```

### Admin Module (Projects)

```typescript
// List projects (admin operations)
const projects = await krapi.admin.listProjects();

// Create project
const newProject = await krapi.admin.createProject({
  name: 'My CMS',
  description: 'A content management system'
});

// Get project
const project = await krapi.admin.getProject('project-id');

// Update project
const updated = await krapi.admin.updateProject('project-id', {
  description: 'Updated description'
});

// Delete project
const deleted = await krapi.admin.deleteProject('project-id');

// Create API key for project
const apiKey = await krapi.projects.createApiKey('project-id', {
  name: 'Production Key',
  permissions: ['read', 'write']
});
```

### Users Module

```typescript
// List users
const users = await krapi.users.list();

// Create user
const newUser = await krapi.users.create({
  email: 'user@example.com',
  password: 'secure-password',
  name: 'John Doe'
});

// Get user
const user = await krapi.users.get('user-id');

// Update user
const updated = await krapi.users.update('user-id', {
  name: 'Jane Doe'
});

// Delete user
const deleted = await krapi.users.delete('user-id');
```

## Error Handling

All methods return a `KrapiResponse` object with the following structure:

```typescript
interface KrapiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

Example error handling:

```typescript
const result = await krapi.database.createDocument('posts', data);

if (!result.success) {
  console.error('Error creating document:', result.error);
  // Handle error appropriately
} else {
  console.log('Document created:', result.data);
}
```

## Advanced Usage

### Direct API Requests

For operations not covered by the modules, you can use the client directly:

```typescript
const result = await krapi.client.request(
  'custom',        // operation
  'resource',      // resource
  'action',        // action
  { param: 'value' } // params
);
```

### Updating Configuration

```typescript
// Update API endpoint or credentials at runtime
krapi.client.updateConfig({
  endpoint: 'https://new-endpoint.com/krapi/v1',
  apiKey: 'new-api-key'
});
```

### Access Axios Instance

For advanced HTTP operations:

```typescript
const axios = krapi.client.getAxiosInstance();
// Use axios directly for custom requests
```

## Environment Variables

The library uses the following environment variables when available:

- `NEXT_PUBLIC_API_URL`: Base API URL (default: http://localhost:3470)
- `NEXT_PUBLIC_API_VERSION`: API version (default: v1)

## Type Safety

The library is fully typed with TypeScript. Import types as needed:

```typescript
import type { 
  KrapiConfig, 
  KrapiResponse,
  Collection,
  Document,
  Project,
  User 
} from '@/lib/krapi';
```

## Best Practices

1. **Singleton Pattern**: Create a single Krapi instance and reuse it throughout your application
2. **Error Handling**: Always check the `success` property before accessing `data`
3. **Authentication**: Let the library handle token storage and refresh automatically
4. **Project Context**: Use separate Krapi instances for admin operations vs project-specific operations

## Example: Complete Flow

```typescript
import { createDefaultKrapi } from '@/lib/krapi';

async function example() {
  const krapi = createDefaultKrapi();
  
  // 1. Login as admin (uses username, not email)
  const loginResult = await krapi.auth.login('admin', 'admin123');
  if (!loginResult.success) {
    console.error('Login failed:', loginResult.error);
    return;
  }
  
  // 2. Create a project (using admin module)
  const projectResult = await krapi.admin.createProject({
    name: 'My Blog',
    description: 'A simple blog CMS'
  });
  
  if (!projectResult.success) {
    console.error('Project creation failed:', projectResult.error);
    return;
  }
  
  const project = projectResult.data;
  
  // 3. Create an API key for the project
  const apiKeyResult = await krapi.projects.createApiKey(project.id, {
    name: 'Frontend Key',
    permissions: ['read', 'write']
  });
  
  if (!apiKeyResult.success) {
    console.error('API key creation failed:', apiKeyResult.error);
    return;
  }
  
  // 4. Create a new client with the project API key
  const projectKrapi = createKrapi({
    endpoint: 'http://localhost:3470/krapi/v1',
    apiKey: apiKeyResult.data.key
  });
  
  // 5. Create a collection in the project
  const collectionResult = await projectKrapi.database.createCollection({
    name: 'posts',
    schema: {
      title: { type: 'string', required: true },
      content: { type: 'string' },
      author: { type: 'string' },
      publishedAt: { type: 'datetime' }
    }
  });
  
  if (!collectionResult.success) {
    console.error('Collection creation failed:', collectionResult.error);
    return;
  }
  
  // 6. Create a document
  const docResult = await projectKrapi.database.createDocument('posts', {
    title: 'Welcome to My Blog',
    content: 'This is the first post on my new blog!',
    author: 'Admin',
    publishedAt: new Date().toISOString()
  });
  
  if (!docResult.success) {
    console.error('Document creation failed:', docResult.error);
    return;
  }
  
  console.log('Setup complete! Created:', {
    project: project.name,
    apiKey: apiKeyResult.data.name,
    collection: collectionResult.data.name,
    document: docResult.data.id
  });
}
```
