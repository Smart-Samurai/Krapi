# KRAPI SDK

**Easy-to-use TypeScript SDK for connecting to self-hosted KRAPI servers - just like Appwrite!**

Connect your React, Vue, Angular, or any frontend/backend app to your self-hosted KRAPI instance with just a few lines of code.

## Installation

```bash
npm install @krapi/sdk
# or
pnpm add @krapi/sdk
# or
yarn add @krapi/sdk
```

## Quick Start

### Connect to Your Self-Hosted KRAPI Server

```typescript
// Easy import - just like Appwrite!
// Option 1: Import from client subpath (recommended)
import { KrapiClient } from '@krapi/sdk/client';
// Option 2: Import from main package (also works)
// import { KrapiClient } from '@krapi/sdk';

// Initialize client with your self-hosted KRAPI server
const krapi = new KrapiClient({
  endpoint: 'https://your-krapi-server.com/krapi/k1', // Your self-hosted KRAPI endpoint
  apiKey: 'your-api-key', // Optional: API key for authentication
  projectId: 'your-project-id' // Optional: Default project ID
});

// Authenticate (if needed)
const loginResponse = await krapi.auth.adminLogin({
  username: 'admin',
  password: 'password'
});

// Start using your KRAPI server!
const projects = await krapi.projects.list();
const documents = await krapi.collections.documents.list('project-id', 'collection-name');
```

### Self-Hosted Setup

1. **Deploy KRAPI Server**: Deploy KRAPI to your server (Docker, VPS, etc.)
2. **Install SDK**: Install this package in your client project
3. **Connect**: Point the SDK to your KRAPI server endpoint
4. **Use**: Access all your data and collections from your app!

**It's that simple!** ??

### Server-Side Usage (Node.js)

```typescript
import { BackendSDK } from '@krapi/sdk';
import { DatabaseService } from './your-database-service';

// Initialize backend SDK with direct database access
const dbService = DatabaseService.getInstance();
await dbService.connect();

const backendSDK = new BackendSDK({
  databaseConnection: dbService,
  logger: console
});

// Use services with direct database access
const projects = await backendSDK.projects.list();
const documents = await backendSDK.collections.service.getDocuments('project-id', 'collection-id');
```

## Client SDK API

### Initialization

```typescript
const krapi = new KrapiClient({
  endpoint: 'http://localhost:3470',  // Required: KRAPI backend URL
  apiKey: 'your-api-key',              // Optional: For API key auth
  sessionToken: 'token',               // Optional: For session auth
  projectId: 'project-id',             // Optional: Default project ID
  timeout: 30000,                      // Optional: Request timeout (ms)
  headers: {}                          // Optional: Additional headers
});
```

### Authentication

```typescript
// Admin login
const response = await krapi.auth.adminLogin({
  username: 'admin',
  password: 'password'
});

// Auto-sets session token
krapi.setSessionToken(response.data.token);

// Project user login
await krapi.auth.projectLogin('project-id', {
  email: 'user@example.com',
  password: 'password'
});

// API key authentication
await krapi.setApiKey('your-api-key');
```

### Projects

```typescript
// List all projects
const projects = await krapi.projects.list();

// Get project
const project = await krapi.projects.get('project-id');

// Create project
const newProject = await krapi.projects.create({
  name: 'My Project',
  description: 'Project description'
});

// Update project
await krapi.projects.update('project-id', {
  name: 'Updated Name'
});

// Delete project
await krapi.projects.delete('project-id');
```

### Collections

```typescript
// List collections
const collections = await krapi.collections.list('project-id');

// Get collection
const collection = await krapi.collections.get('project-id', 'collection-name');

// Create collection
await krapi.collections.create('project-id', {
  name: 'users',
  description: 'User collection',
  fields: [
    { name: 'email', type: 'string', required: true },
    { name: 'age', type: 'number', required: false }
  ],
  indexes: [
    { fields: ['email'], unique: true }
  ]
});

// Update collection
await krapi.collections.update('project-id', 'collection-name', {
  description: 'Updated description'
});

// Delete collection
await krapi.collections.delete('project-id', 'collection-name');
```

### Documents

```typescript
// List documents
const documents = await krapi.collections.documents.list(
  'project-id',
  'collection-name',
  {
    limit: 50,
    offset: 0,
    filter: { age: { $gt: 18 } },
    sort: { created_at: 'desc' }
  }
);

// Get document
const document = await krapi.collections.documents.get(
  'project-id',
  'collection-name',
  'document-id'
);

// Create document
const newDoc = await krapi.collections.documents.create(
  'project-id',
  'collection-name',
  {
    email: 'user@example.com',
    age: 30,
    name: 'John Doe'
  }
);

// Update document
await krapi.collections.documents.update(
  'project-id',
  'collection-name',
  'document-id',
  { age: 31 }
);

// Delete document
await krapi.collections.documents.delete(
  'project-id',
  'collection-name',
  'document-id'
);

// Bulk operations
await krapi.collections.documents.bulkCreate(
  'project-id',
  'collection-name',
  [{ email: 'user1@example.com' }, { email: 'user2@example.com' }]
);

await krapi.collections.documents.bulkUpdate(
  'project-id',
  'collection-name',
  { status: 'active' },
  { status: 'inactive' }
);

await krapi.collections.documents.bulkDelete(
  'project-id',
  'collection-name',
  { status: 'deleted' }
);

// Search documents
const results = await krapi.collections.documents.search(
  'project-id',
  'collection-name',
  'search term',
  { fields: ['name', 'description'], limit: 10 }
);

// Aggregate documents
const stats = await krapi.collections.documents.aggregate(
  'project-id',
  'collection-name',
  {
    groupBy: 'category',
    operations: [
      { field: 'price', operation: 'sum' },
      { field: 'quantity', operation: 'avg' }
    ]
  }
);
```

### Files

```typescript
// List files
const files = await krapi.storage.list('project-id', {
  folder_id: 'folder-id',
  limit: 50
});

// Upload file
const file = await krapi.storage.upload('project-id', fileBlob, {
  folder_id: 'folder-id',
  metadata: { title: 'My File' }
});

// Get file
const fileInfo = await krapi.storage.get('project-id', 'file-id');

// Download file
const fileBlob = await krapi.storage.download('project-id', 'file-id');

// Update file metadata
await krapi.storage.update('project-id', 'file-id', {
  metadata: { title: 'Updated Title' }
});

// Delete file
await krapi.storage.delete('project-id', 'file-id');
```

### Backups

```typescript
// Create project backup
const backup = await krapi.backup.createProject('project-id', {
  description: 'Monthly backup',
  password: 'secure-password'
});
// Save backup.password securely!

// Restore project backup
await krapi.backup.restoreProject(
  'project-id',
  'backup-id',
  'secure-password',
  { overwrite: false }
);

// List backups
const backups = await krapi.backup.list('project-id', 'project');

// Delete backup
await krapi.backup.delete('backup-id');

// Create system backup
const systemBackup = await krapi.backup.createSystem({
  description: 'Full system backup',
  password: 'secure-password'
});
```

### Admin

```typescript
// List admin users
const users = await krapi.admin.getUsers({ limit: 50 });

// Get user
const user = await krapi.admin.getUser('user-id');

// Create user
const newUser = await krapi.admin.createUser({
  username: 'newuser',
  email: 'user@example.com',
  password: 'secure-password',
  role: 'admin'
});

// Update user
await krapi.admin.updateUser('user-id', {
  email: 'newemail@example.com'
});

// Delete user
await krapi.admin.deleteUser('user-id');
```

### Email

```typescript
// List email templates
const templates = await krapi.email.listTemplates('project-id');

// Create email template
await krapi.email.createTemplate('project-id', {
  name: 'Welcome Email',
  subject: 'Welcome to {{company_name}}!',
  body: 'Hello {{user_name}}, welcome!',
  variables: ['company_name', 'user_name']
});

// Send test email
await krapi.email.sendTest({
  to: 'test@example.com',
  subject: 'Test Email',
  body: 'This is a test'
});
```

### Health

```typescript
// Check health
const health = await krapi.health.check();
console.log(health.status); // 'healthy' | 'unhealthy'
```

## React Example

```tsx
import { useEffect, useState } from 'react';
import { KrapiClient } from '@krapi/sdk/client';

function App() {
  // Initialize once - connect to your self-hosted KRAPI server
  const [krapi] = useState(() => new KrapiClient({
    endpoint: process.env.REACT_APP_KRAPI_ENDPOINT || 'http://localhost:3470/krapi/k1',
    apiKey: process.env.REACT_APP_KRAPI_API_KEY
  }));

  const [projects, setProjects] = useState([]);

  useEffect(() => {
    krapi.projects.list().then(response => {
      if (response.success) {
        setProjects(response.data || []);
      }
    });
  }, [krapi]);

  return (
    <div>
      <h1>My Projects</h1>
      {projects.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

## Next.js Example

```tsx
// app/page.tsx
'use client';

import { KrapiClient } from '@krapi/sdk/client';
import { useEffect, useState } from 'react';

export default function Home() {
  // Connect to your self-hosted KRAPI server
  const [krapi] = useState(() => new KrapiClient({
    endpoint: process.env.NEXT_PUBLIC_KRAPI_ENDPOINT || 'http://localhost:3470/krapi/k1',
    apiKey: process.env.NEXT_PUBLIC_KRAPI_API_KEY
  }));

  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    krapi.collections.documents.list('project-id', 'collection-name')
      .then(response => {
        if (response.success) {
          setDocuments(response.data || []);
        }
      });
  }, [krapi]);

  return (
    <main>
      <h1>Documents</h1>
      {documents.map(doc => (
        <div key={doc.id}>{JSON.stringify(doc)}</div>
      ))}
    </main>
  );
}
```

## Vue Example

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { KrapiClient } from '@krapi/sdk/client';

// Connect to your self-hosted KRAPI server
const krapi = new KrapiClient({
  endpoint: import.meta.env.VITE_KRAPI_ENDPOINT || 'http://localhost:3470/krapi/k1',
  apiKey: import.meta.env.VITE_KRAPI_API_KEY
});

const projects = ref([]);

onMounted(async () => {
  const response = await krapi.projects.list();
  if (response.success) {
    projects.value = response.data || [];
  }
});
</script>

<template>
  <div>
    <h1>Projects</h1>
    <div v-for="project in projects" :key="project.id">
      {{ project.name }}
    </div>
  </div>
</template>
```

## TypeScript Support

Full TypeScript support with type definitions included. All methods are fully typed.

## Error Handling

```typescript
try {
  const response = await krapi.collections.documents.create(
    'project-id',
    'collection-name',
    { email: 'user@example.com' }
  );

  if (!response.success) {
    console.error('Error:', response.error);
    return;
  }

  console.log('Created:', response.data);
} catch (error) {
  console.error('Request failed:', error);
}
```

## Configuration

### Environment Variables

```bash
# .env
# Your self-hosted KRAPI server endpoint
KRAPI_ENDPOINT=http://localhost:3470/krapi/k1
# Or for production:
# KRAPI_ENDPOINT=https://your-krapi-server.com/krapi/k1

# Your API key (optional, can use session auth instead)
KRAPI_API_KEY=your-api-key

# Default project ID (optional)
KRAPI_PROJECT_ID=your-project-id
```

### Dynamic Configuration

```typescript
// Set API key dynamically
krapi.setApiKey('new-api-key');

// Set session token
krapi.setSessionToken('session-token');

// Set project ID
krapi.setProjectId('project-id');
```

## Publishing the Package to NPM

For KRAPI maintainers - to publish this package to npm for external developers:

### Prerequisites

1. **npm account**: Create an account at https://www.npmjs.com/signup
2. **npm organization** (for `@krapi/sdk` scoped package):
   - Create at https://www.npmjs.com/org/create
   - Name it `krapi`
   - OR use unscoped name `krapi-sdk` (change in package.json)
3. **Login**: Run `npm login` in terminal

### Publishing Steps

1. **Build the package**:
   ```bash
   cd packages/krapi-sdk
   npm run build
   ```

2. **Verify contents**:
   ```bash
   npm pack --dry-run
   ```

3. **Publish**:
   ```bash
   npm publish
   ```

4. **Verify on npm**:
   - Visit https://www.npmjs.com/package/@krapi/sdk
   - Package is now available for installation!

### Updating the Package

```bash
# Update version (patch/minor/major)
npm version patch
npm publish
```

### Important Notes

- The package name is `@krapi/sdk` (scoped) - requires npm organization
- Alternative: Change to `krapi-sdk` (unscoped) in package.json
- See `NPM_PUBLISHING.md` for detailed publishing guide

### After Publishing

External developers can install:
```bash
npm install @krapi/sdk
# or if unscoped
npm install krapi-sdk
```

## More Examples

See `/examples` directory for more examples.

## License

MIT
