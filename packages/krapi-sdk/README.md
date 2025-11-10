# @smartsamurai/krapi-sdk

**Easy-to-use TypeScript SDK for connecting to self-hosted KRAPI servers - just like Appwrite!**

[![npm version](https://img.shields.io/npm/v/@smartsamurai/krapi-sdk.svg)](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

Connect your React, Vue, Angular, or any frontend/backend app to your self-hosted KRAPI instance with just a few lines of code.

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Publishing to NPM](#publishing-to-npm)
- [Code Ownership](#code-ownership)
- [License](#license)

## 📦 Installation

```bash
npm install @smartsamurai/krapi-sdk
# or
pnpm add @smartsamurai/krapi-sdk
# or
yarn add @smartsamurai/krapi-sdk
```

## 🚀 Quick Start

### Connect to Your Self-Hosted KRAPI Server

```typescript
// Easy import - just like Appwrite!
// Option 1: Import from client subpath (recommended)
import { KrapiClient } from '@smartsamurai/krapi-sdk/client';
// Option 2: Import from main package (also works)
// import { KrapiClient } from '@smartsamurai/krapi-sdk';

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

**It's that simple!** 🎉

## 📚 API Reference

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

// Search documents
const results = await krapi.collections.documents.search(
  'project-id',
  'collection-name',
  'search term',
  { fields: ['name', 'description'], limit: 10 }
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

// Restore project backup
await krapi.backup.restoreProject(
  'project-id',
  'backup-id',
  'secure-password',
  { overwrite: false }
);

// List backups
const backups = await krapi.backup.list('project-id', 'project');
```

## 💻 Examples

### React Example

```tsx
import { useEffect, useState } from 'react';
import { KrapiClient } from '@smartsamurai/krapi-sdk/client';

function App() {
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

### Next.js Example

```tsx
// app/page.tsx
'use client';

import { KrapiClient } from '@smartsamurai/krapi-sdk/client';
import { useEffect, useState } from 'react';

export default function Home() {
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

### Vue Example

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { KrapiClient } from '@smartsamurai/krapi-sdk/client';

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

### Server-Side Usage (Node.js)

```typescript
import { BackendSDK } from '@smartsamurai/krapi-sdk';
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

## 🔧 Configuration

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

## 📦 Publishing to NPM

For KRAPI maintainers - instructions for publishing this package to npm for external developers.

### Prerequisites

1. **npm Account**: Create an account at [https://www.npmjs.com/signup](https://www.npmjs.com/signup)
2. **npm Organization**: Create organization `smartsamurai` at [https://www.npmjs.com/org/create](https://www.npmjs.com/org/create)
3. **Login**: `npm login` in your terminal

### Pre-Publishing Checklist

**⚠️ IMPORTANT**: Before publishing, always:

1. ✅ **Update version** in `package.json`
2. ✅ **Update repository URL** in `package.json` (if changed)
3. ✅ **Run security check**: `npm run security-check` (must show 0 vulnerabilities)
4. ✅ **Run linting**: `npm run lint` (must pass)
5. ✅ **Run type check**: `npm run type-check` (must pass)
6. ✅ **Build package**: `npm run build` (auto-runs before publish)
7. ✅ **Test installation**: Test in a new project after publishing

### Publishing Steps

1. **Navigate to SDK directory**:
   ```bash
   cd packages/krapi-sdk
   ```

2. **Update version** (if needed):
   ```bash
   # Patch version (1.0.0 -> 1.0.1)
   npm version patch
   
   # Minor version (1.0.0 -> 1.1.0)
   npm version minor
   
   # Major version (1.0.0 -> 2.0.0)
   npm version major
   ```

3. **Run security check**:
   ```bash
   npm run security-check
   ```
   **Must show 0 vulnerabilities!** If vulnerabilities are found, update dependencies and test thoroughly.

4. **Verify package contents**:
   ```bash
   npm pack --dry-run
   ```
   This shows what will be published without actually publishing.

5. **Publish to npm**:
   ```bash
   npm publish --access public
   ```

6. **Verify publication**:
   - Visit [https://www.npmjs.com/package/@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
   - Test installation: `npm install @smartsamurai/krapi-sdk` in a new project

### Updating the Package

When making updates:

```bash
cd packages/krapi-sdk

# 1. Make your changes
# 2. Update version
npm version patch  # or minor/major

# 3. Security check (CRITICAL!)
npm run security-check

# 4. Publish
npm publish --access public
```

### Important Notes

- 🔒 **Security**: Always run `npm run security-check` before publishing
- 🏗️ **Build**: Package auto-builds before publish (via `prepublishOnly` script)
- 📝 **Types**: Package includes TypeScript definitions
- 📦 **Scoped Package**: `@smartsamurai/krapi-sdk` requires npm organization `smartsamurai`
- 🔄 **Alternative**: Use `krapi-sdk` (unscoped) if you don't want an organization

### Package Configuration

The package is configured in `package.json`:

```json
{
  "name": "@smartsamurai/krapi-sdk",
  "version": "2.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/GenorTG/Krapi.git",
    "directory": "packages/krapi-sdk"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**Note**: The SDK stays in the main KRAPI monorepo. The `directory` field tells npm where it is. No separate repository needed!

### After Publishing

External developers can install:

```bash
npm install @smartsamurai/krapi-sdk
```

Then use it in their projects:

```typescript
import { KrapiClient } from '@smartsamurai/krapi-sdk/client';

const krapi = new KrapiClient({
  endpoint: 'https://their-krapi-server.com/krapi/k1',
  apiKey: 'their-api-key'
});
```

## 👤 Code Ownership

### Repository

- **GitHub Repository**: [https://github.com/GenorTG/Krapi](https://github.com/GenorTG/Krapi)
- **Package Location**: `packages/krapi-sdk/` in the main repository
- **Owner**: GenorTG
- **License**: MIT

### Code Ownership Rights

All code in this package is owned by **GenorTG** and contributors as specified in the LICENSE file.

### Contributing

When contributing to this package:
- You retain copyright of your contributions
- You grant GenorTG and the project maintainers a license to use your contributions
- All contributions must comply with the MIT License

### Attribution

If you use this package, please:
- Maintain attribution to the original authors
- Include the LICENSE file
- Credit the project in your documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🆘 Support

For issues, questions, or feature requests:

- **GitHub Issues**: [https://github.com/GenorTG/Krapi/issues](https://github.com/GenorTG/Krapi/issues)
- **Main Repository**: [https://github.com/GenorTG/Krapi](https://github.com/GenorTG/Krapi)

## 🔗 Links

- **Main Project**: [https://github.com/GenorTG/Krapi](https://github.com/GenorTG/Krapi)
- **NPM Package**: [https://www.npmjs.com/package/@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- **Documentation**: See main project README for full documentation

---

**Repository**: [https://github.com/GenorTG/Krapi](https://github.com/GenorTG/Krapi)  
**Owner**: GenorTG  
**License**: MIT
