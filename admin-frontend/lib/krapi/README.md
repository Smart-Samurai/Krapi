# Krapi Package

A unified package for connecting to the Krapi backend API. This package provides a clean, modular interface for all API operations.

## Installation

```bash
# For now, this is a local package
# In the future, it will be available as an npm package
npm install krapi
```

## Quick Start

```typescript
import { createKrapi, createDefaultKrapi } from "@/lib/krapi";

// Create with default configuration (localhost:3470/krapi/k1)
const krapi = createDefaultKrapi();

// Or create with custom configuration
const krapi = createKrapi({
  endpoint: "https://your-domain.com/krapi/k1",
  apiKey: "your-api-key",
  secret: "your-secret",
  timeout: 30000,
});
```

## Usage Examples

### Authentication

```typescript
import { createDefaultKrapi } from "@/lib/krapi";

const krapi = createDefaultKrapi();

// Login
const loginResult = await krapi.auth.login("admin", "password");
if (loginResult.success) {
  console.log("Logged in as:", loginResult.user);
}

// Check if authenticated
if (krapi.auth.isAuthenticated()) {
  console.log("User is authenticated");
}

// Get current user
const user = krapi.auth.getCurrentUser();

// Logout
krapi.auth.logout();
```

### Admin Operations

```typescript
// List all projects
const projects = await krapi.admin.listProjects();

// Create a new project
const newProject = await krapi.admin.createProject({
  name: "My Project",
  description: "A new project",
  domain: "myproject.com",
});

// Get project details
const project = await krapi.admin.getProject("project-id");

// Get database stats
const stats = await krapi.admin.getDatabaseStats();

// Health check
const health = await krapi.admin.health();
```

### Database Operations

```typescript
// List collections
const collections = await krapi.database.listCollections();

// Create a collection
const collection = await krapi.database.createCollection({
  name: "users",
  description: "User collection",
  schema: {
    name: { type: "string", required: true },
    email: { type: "string", required: true },
    age: { type: "number" },
  },
});

// List documents
const documents = await krapi.database.listDocuments("collection-id");

// Create a document
const document = await krapi.database.createDocument({
  collectionId: "collection-id",
  data: {
    name: "John Doe",
    email: "john@example.com",
    age: 30,
  },
});
```

### Storage Operations

```typescript
// List files
const files = await krapi.storage.listFiles();

// Upload a file
const fileInput = document.getElementById("file") as HTMLInputElement;
const file = fileInput.files[0];
const uploadResult = await krapi.storage.uploadFile(file, {
  category: "images",
});

// Download a file
const blob = await krapi.storage.downloadFile("file-id");

// Get file URL
const fileUrl = krapi.storage.getFileUrl("file-id");
```

### Project Operations

```typescript
// Get project stats
const stats = await krapi.projects.getStats("project-id");

// Get project API keys
const apiKeys = await krapi.projects.getApiKeys("project-id");

// Create API key
const apiKey = await krapi.projects.createApiKey("project-id", {
  name: "My API Key",
  permissions: ["read", "write"],
});
```

### User Management

```typescript
// List project users
const users = await krapi.users.listUsers("project-id");

// Create a user
const user = await krapi.users.createUser({
  projectId: "project-id",
  email: "user@example.com",
  username: "newuser",
  role: "editor",
  permissions: ["read", "write"],
});
```

## Configuration

The package supports various configuration options:

```typescript
interface KrapiConfig {
  endpoint: string; // API endpoint URL
  apiKey?: string; // API key for authentication
  secret?: string; // Secret for enhanced security
  timeout?: number; // Request timeout in milliseconds
  headers?: Record<string, string>; // Custom headers
}
```

## Error Handling

All methods return a consistent response format:

```typescript
interface KrapiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

Example error handling:

```typescript
const result = await krapi.admin.listProjects();
if (result.success) {
  console.log("Projects:", result.data);
} else {
  console.error("Error:", result.error);
}
```

## Future NPM Package

This package is designed to be easily converted to an npm package. The structure follows npm package conventions:

- Clean separation of concerns
- Modular architecture
- TypeScript support
- Comprehensive documentation
- Consistent API design

To publish as an npm package, you would:

1. Add `package.json` with proper metadata
2. Configure build process (TypeScript compilation)
3. Add tests
4. Set up CI/CD pipeline
5. Publish to npm registry

## API Endpoint

The package connects to the unified API endpoint:

- **Development**: `http://localhost:3470/krapi/k1`
- **Production**: `https://your-domain.com/krapi/k1`

All operations go through the unified `/api` endpoint with operation, resource, and action parameters.
