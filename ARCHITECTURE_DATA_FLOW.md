# Krapi Server - Architecture & Data Flow

## Overview

Krapi Server follows a **"Plug and Socket"** architecture where:

- **Frontend (Plug) 🔌**: Uses the Krapi SDK to connect to the backend
- **Backend (Socket) ⚡**: Receives requests and routes them through the SDK
- **SDK (Interface)**: Provides identical methods for both client and server environments

## Data Flow for External Clients

### 1. Initialization

**External Client Application:**

```typescript
import { krapi } from "@smartsamurai/krapi-sdk";

// Initialize SDK with API key
await krapi.connect({
  endpoint: "https://your-krapi-instance.com", // Your Krapi Server URL
  apiKey: "krapi_xxxxxxxxxxxxxxxxxxxx", // API key from Krapi Server
});
```

**What Happens:**

1. SDK stores the endpoint and API key
2. SDK is ready to make authenticated requests
3. All subsequent calls use this configuration

### 2. Making API Calls

**Example: List Projects**

```typescript
// Client code
const projects = await krapi.projects.list();
```

**Data Flow:**

```
┌─────────────────┐
│  Client App     │
│  (Your App)     │
└────────┬────────┘
         │
         │ krapi.projects.list()
         ▼
┌─────────────────┐
│  Krapi SDK      │
│  (@smartsamurai │
│   /krapi-sdk)   │
└────────┬────────┘
         │
         │ HTTP POST/GET with:
         │ - Authorization: Bearer <api-key>
         │ - Endpoint: https://your-krapi-instance.com/krapi/k1/projects
         ▼
┌─────────────────┐
│  Krapi Frontend │
│  (Next.js)      │
│  Port: 3498     │
└────────┬────────┘
         │
         │ Proxies request to backend
         │ /api/krapi/k1/projects → Backend
         ▼
┌─────────────────┐
│  Krapi Backend  │
│  (Express)      │
│  Port: 3470     │
└────────┬────────┘
         │
         │ Authenticates API key
         │ Checks scopes/permissions
         │ Routes to controller
         ▼
┌─────────────────┐
│  BackendSDK     │
│  (Server Mode)  │
└────────┬────────┘
         │
         │ Direct database access
         │ (No HTTP calls)
         ▼
┌─────────────────┐
│  SQLite DB      │
│  (Database)     │
└─────────────────┘
```

### 3. Complete Request Flow

**Step-by-Step:**

1. **Client calls SDK method:**

   ```typescript
   const project = await krapi.projects.create({
     name: "My Project",
     description: "Project description",
   });
   ```

2. **SDK makes HTTP request:**

   ```http
   POST https://your-krapi-instance.com/krapi/k1/projects
   Authorization: Bearer krapi_xxxxxxxxxxxxxxxxxxxx
   Content-Type: application/json

   {
     "name": "My Project",
     "description": "Project description"
   }
   ```

3. **Frontend receives request:**

   - Next.js route handler at `/api/krapi/k1/projects`
   - Proxies to backend: `http://localhost:3470/krapi/k1/projects`

4. **Backend processes request:**

   - Middleware authenticates API key
   - Checks required scopes (`projects:write`)
   - Routes to `ProjectController.createProject()`
   - Controller calls `backendSDK.projects.create()`

5. **BackendSDK executes:**

   - Uses direct database connection (no HTTP)
   - Performs database operations
   - Returns result

6. **Response flows back:**
   ```
   Database → BackendSDK → Controller → Backend → Frontend → SDK → Client
   ```

## API Key Types & Permissions

### 1. Admin API Keys

- **Scope**: Full admin access or custom scopes
- **Can Access**: All projects, admin functions
- **Use Case**: Managing multiple projects, system administration

**Example:**

```typescript
// Admin API key with full access
await krapi.connect({
  endpoint: "https://your-krapi-instance.com",
  apiKey: "ak_xxxxxxxxxxxxxxxxxxxx", // Admin API key
});

// Can access all projects
const allProjects = await krapi.projects.list();
```

### 2. Project API Keys

- **Scope**: Limited to specific project
- **Can Access**: Only the assigned project
- **Use Case**: Single application using one project

**Example:**

```typescript
// Project API key (automatically scoped to one project)
await krapi.connect({
  endpoint: "https://your-krapi-instance.com",
  apiKey: "pk_xxxxxxxxxxxxxxxxxxxx", // Project API key
});

// Can only access the assigned project
const project = await krapi.projects.get("project-id");
const collections = await krapi.collections.list("project-id");
```

### 3. Master API Key

- **Scope**: Full unrestricted access
- **Can Access**: Everything (all projects, admin functions)
- **Use Case**: Initial setup, system administration

## SDK Method Parity

### Frontend vs External Client

**The frontend uses the EXACT SAME SDK methods as external clients!**

**Frontend Code:**

```typescript
// In frontend-manager/app/(sidebar)/projects/page.tsx
const krapi = useKrapi();
const projects = await krapi.projects.list();
const newProject = await krapi.projects.create({ name: "My Project" });
```

**External Client Code:**

```typescript
// In your application
import { krapi } from "@smartsamurai/krapi-sdk";
await krapi.connect({ endpoint: "...", apiKey: "..." });
const projects = await krapi.projects.list();
const newProject = await krapi.projects.create({ name: "My Project" });
```

**They're identical!** The frontend is just a web UI wrapper around the same SDK.

## Available SDK Methods

### Projects

```typescript
krapi.projects.list(); // GET /krapi/k1/projects
krapi.projects.get(projectId); // GET /krapi/k1/projects/:id
krapi.projects.create(data); // POST /krapi/k1/projects
krapi.projects.update(id, data); // PUT /krapi/k1/projects/:id
krapi.projects.delete(id); // DELETE /krapi/k1/projects/:id
```

### Collections

```typescript
krapi.collections.list(projectId); // GET /krapi/k1/projects/:id/collections
krapi.collections.get(projectId, name); // GET /krapi/k1/projects/:id/collections/:name
krapi.collections.create(projectId, data); // POST /krapi/k1/projects/:id/collections
krapi.collections.update(projectId, name, data); // PUT /krapi/k1/projects/:id/collections/:name
krapi.collections.delete(projectId, name); // DELETE /krapi/k1/projects/:id/collections/:name
```

### Documents

```typescript
krapi.collections.documents.list(projectId, collectionName); // GET /krapi/k1/projects/:id/collections/:name/documents
krapi.collections.documents.get(projectId, collectionName, id); // GET /krapi/k1/projects/:id/collections/:name/documents/:id
krapi.collections.documents.create(projectId, collectionName, data); // POST /krapi/k1/projects/:id/collections/:name/documents
krapi.collections.documents.update(projectId, collectionName, id, data); // PUT /krapi/k1/projects/:id/collections/:name/documents/:id
krapi.collections.documents.delete(projectId, collectionName, id); // DELETE /krapi/k1/projects/:id/collections/:name/documents/:id
```

### Storage (Files)

```typescript
krapi.storage.list(projectId); // GET /krapi/k1/projects/:id/storage
krapi.storage.upload(projectId, file); // POST /krapi/k1/projects/:id/storage
krapi.storage.download(projectId, fileId); // GET /krapi/k1/projects/:id/storage/:id
krapi.storage.delete(projectId, fileId); // DELETE /krapi/k1/projects/:id/storage/:id
```

## Authentication Flow

### Using API Keys

1. **Create API Key in Krapi Server:**

   - Log into web UI
   - Go to Settings → API Keys
   - Create new key (admin or project-specific)
   - Copy the key (shown only once!)

2. **Use in Your Application:**

   ```typescript
   await krapi.connect({
     endpoint: "https://your-krapi-instance.com",
     apiKey: "krapi_xxxxxxxxxxxxxxxxxxxx",
   });
   ```

3. **All subsequent calls are authenticated:**
   - SDK automatically adds `Authorization: Bearer <api-key>` header
   - Backend validates the key
   - Checks scopes/permissions
   - Executes the request

## Frontend as a Web UI

The Krapi Server frontend is essentially a **visual wrapper** around the SDK:

**What the Frontend Does:**

1. Uses the same SDK methods as external clients
2. Provides a web UI to call these methods
3. Displays results in a user-friendly interface
4. Handles authentication via login (session tokens)

**Example:**

- **Frontend UI**: Click "Create Project" button → Calls `krapi.projects.create()`
- **External Client**: Call `krapi.projects.create()` directly in code

**Both use the same SDK, same methods, same backend!**

## Key Points

1. **Single SDK**: One SDK works for both frontend and external clients
2. **Method Parity**: Frontend functions = External client functions
3. **API Key Based**: External clients use API keys for authentication
4. **Scope-Based Access**: API keys have specific permissions
5. **Frontend Proxies**: Frontend proxies requests to backend
6. **Backend Uses SDK**: Backend uses BackendSDK (server mode) for database operations

## Benefits

✅ **Consistency**: Same methods everywhere  
✅ **Type Safety**: TypeScript types match across all environments  
✅ **Easy Integration**: External clients use the same SDK as the frontend  
✅ **Web UI**: Visual interface for non-developers  
✅ **API Access**: Programmatic access for developers

## Example: Complete Integration

```typescript
// 1. Install SDK
npm install @smartsamurai/krapi-sdk

// 2. Initialize
import { krapi } from '@smartsamurai/krapi-sdk';

await krapi.connect({
  endpoint: 'https://your-krapi-instance.com',
  apiKey: 'your-api-key-here'
});

// 3. Use it (same methods as frontend!)
const projects = await krapi.projects.list();
const project = await krapi.projects.create({
  name: 'My App',
  description: 'My application backend'
});

// Create a collection
await krapi.collections.create(project.id, {
  name: 'users',
  schema: {
    name: { type: 'string', required: true },
    email: { type: 'string', required: true }
  }
});

// Add documents
await krapi.collections.documents.create(project.id, 'users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Query documents
const users = await krapi.collections.documents.list(project.id, 'users');
```

This is exactly how the frontend uses the SDK - you're using the same interface!
