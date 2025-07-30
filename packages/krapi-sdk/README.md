# KRAPI SDK

A TypeScript SDK for interacting with the KRAPI backend. This SDK is shared between the backend and frontend to ensure consistency and prevent code duplication.

## Installation

This package is part of the monorepo and is installed automatically when you run `pnpm install` from the root directory.

## Usage

### Basic Setup

```typescript
import { KrapiClient } from "@krapi/sdk";

const client = new KrapiClient({
  baseURL: "http://localhost:3470",
  authToken: "your-auth-token", // Optional
});
```

### Authentication

```typescript
// Admin login
const response = await client.auth.adminLogin("email@example.com", "password");

// Get current user
const user = await client.auth.getCurrentUser();

// Logout
await client.auth.logout();

// Change password
await client.auth.changePassword("currentPassword", "newPassword");
```

### Projects

```typescript
// Get all projects
const projects = await client.projects.getAll();

// Get project by ID
const project = await client.projects.getById("project-id");

// Create project
const newProject = await client.projects.create({
  name: "My Project",
  description: "Project description",
});

// Update project
await client.projects.update("project-id", { name: "Updated Name" });

// Delete project
await client.projects.delete("project-id");
```

### Database Operations

```typescript
// Get table schemas
const schemas = await client.database.getSchemas("project-id");

// Create table schema
const schema = await client.database.createSchema("project-id", {
  name: "users",
  fields: [
    { name: "id", type: "string", required: true, unique: true },
    { name: "email", type: "string", required: true },
    { name: "created_at", type: "datetime", default: "now()" },
  ],
});

// Get documents
const documents = await client.database.getDocuments(
  "project-id",
  "table-name"
);

// Create document
const doc = await client.database.createDocument("project-id", "table-name", {
  email: "user@example.com",
});
```

### Storage Operations

```typescript
// Get files
const files = await client.storage.getFiles("project-id");

// Upload file (browser)
const file = fileInput.files[0];
await client.storage.uploadFile("project-id", file);

// Download file
const fileData = await client.storage.downloadFile("project-id", "file-id");

// Delete file
await client.storage.deleteFile("project-id", "file-id");

// Get storage stats
const stats = await client.storage.getStats("project-id");
```

### Admin Operations

```typescript
// Get admin users
const users = await client.admin.getUsers();

// Create admin user
const newUser = await client.admin.createUser({
  email: "admin@example.com",
  username: "admin",
  password: "password123",
  role: "admin",
  access_level: "admin",
});

// Update admin user
await client.admin.updateUser("user-id", { is_active: false });

// Delete admin user
await client.admin.deleteUser("user-id");
```

## Frontend Usage with React

The SDK can be used with React hooks for better integration:

```typescript
import { useKrapi } from "@/lib/hooks/useKrapi";

function MyComponent() {
  const krapi = useKrapi();

  const fetchProjects = async () => {
    const response = await krapi.projects.getAll();
    if (response.success) {
      console.log(response.data);
    }
  };
}
```

## Development

To build the SDK:

```bash
cd packages/krapi-sdk
pnpm build
```

To watch for changes during development:

```bash
cd packages/krapi-sdk
pnpm dev
```

## Type Safety

All methods return typed responses using TypeScript generics. The SDK exports all necessary types:

```typescript
import type {
  Project,
  AdminUser,
  TableSchema,
  Document,
  ApiResponse,
  PaginatedResponse,
} from "@krapi/sdk";
```
