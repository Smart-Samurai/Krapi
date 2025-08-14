# KRAPI Plug and Socket Design

## Perfect Client/Server Parity

KRAPI SDK implements a **perfect plug and socket design** where:

- **Client** = The Plug (frontend applications)
- **Server** = The Socket (backend applications)
- **They fit together PERFECTLY** - every method works identically

## Core Principle

```typescript
// CLIENT (The Plug)
await krapi.connect({ endpoint: "https://api.example.com", apiKey: "key" });
const project = await krapi.projects.create({ name: "My Project" });

// SERVER (The Socket)
await krapi.connect({ database: dbConnection });
const project = await krapi.projects.create({ name: "My Project" }); // SAME METHOD!
```

## Complete Method Parity

Every method available in one environment is available in the other:

### Authentication

- ✅ `krapi.auth.createSession(apiKey)`
- ✅ `krapi.auth.login(username, password)`
- ✅ `krapi.auth.logout()`
- ✅ `krapi.auth.getCurrentUser()`
- ✅ `krapi.auth.refreshSession()`

### Projects

- ✅ `krapi.projects.create(data)`
- ✅ `krapi.projects.get(id)`
- ✅ `krapi.projects.update(id, data)`
- ✅ `krapi.projects.delete(id)`
- ✅ `krapi.projects.getAll(options)`
- ✅ `krapi.projects.getStatistics(id)`

### Collections

- ✅ `krapi.collections.create(projectId, data)`
- ✅ `krapi.collections.get(projectId, name)`
- ✅ `krapi.collections.update(projectId, name, data)`
- ✅ `krapi.collections.delete(projectId, name)`
- ✅ `krapi.collections.getAll(projectId)`

### Documents

- ✅ `krapi.documents.create(projectId, collection, data)`
- ✅ `krapi.documents.get(projectId, collection, id)`
- ✅ `krapi.documents.update(projectId, collection, id, data)`
- ✅ `krapi.documents.delete(projectId, collection, id)`
- ✅ `krapi.documents.getAll(projectId, collection, options)`
- ✅ `krapi.documents.search(projectId, collection, query)`

### Users, Storage, Email, API Keys...

- ✅ **Every single method** works in both environments

## Shared Business Logic

Because of perfect parity, you can write business logic once and use it everywhere:

```typescript
class TaskManager {
  async createTask(data) {
    // This works in both client AND server!
    return krapi.documents.create(this.projectId, "tasks", { data });
  }

  async getTasks(filter) {
    // This works in both client AND server!
    return krapi.documents.getAll(this.projectId, "tasks", { filter });
  }
}

// Use in client app
const taskManager = new TaskManager(projectId);
await taskManager.createTask({ title: "Frontend Task" });

// Use in server app with EXACT SAME CODE
const taskManager = new TaskManager(projectId);
await taskManager.createTask({ title: "Backend Task" });
```

## Implementation Details

### Client Mode (The Plug)

- Uses HTTP clients for API communication
- Connects to KRAPI backend endpoints
- Handles authentication tokens automatically
- Perfect for web apps, mobile apps, desktop apps

### Server Mode (The Socket)

- Uses direct database connections
- Bypasses HTTP for maximum performance
- Perfect for backend services, microservices, scripts

### Automatic Mode Detection

```typescript
// Automatically detects mode based on configuration
if (config.endpoint) {
  // Client mode - HTTP communication
} else if (config.database) {
  // Server mode - Direct database
}
```

## Type Safety

Both modes share identical TypeScript interfaces:

```typescript
interface KrapiSocketInterface {
  auth: {
    createSession(apiKey: string): Promise<Session>;
    login(username: string, password: string): Promise<LoginResult>;
    // ... all methods have identical signatures
  };
  projects: {
    create(data: ProjectData): Promise<Project>;
    // ... identical across client and server
  };
}
```

## Benefits

1. **Code Reuse**: Write business logic once, use everywhere
2. **Type Safety**: Full TypeScript support in both environments
3. **Consistency**: No learning curve when switching between client/server
4. **Testing**: Test business logic in both environments easily
5. **Migration**: Move logic between frontend/backend without changes

## Example: Perfect Fit

```typescript
// This class works IDENTICALLY in both environments
class BlogManager {
  async createPost(title: string, content: string) {
    const post = await krapi.documents.create(this.projectId, "posts", {
      data: { title, content, created_at: new Date() },
    });

    await krapi.documents.create(this.projectId, "activity", {
      data: { action: "post_created", post_id: post.id },
    });

    return post;
  }
}

// Frontend usage
await krapi.connect({ endpoint: "https://api.blog.com", apiKey: "key" });
const blogManager = new BlogManager();
await blogManager.createPost("Hello", "World");

// Backend usage
await krapi.connect({ database: db });
const blogManager = new BlogManager(); // SAME CLASS!
await blogManager.createPost("Hello", "World"); // SAME METHOD!
```

## Socket Interface Guarantee

Every method in `KrapiSocketInterface` is guaranteed to:

- Work identically in client and server modes
- Have the same parameters and return types
- Provide the same functionality
- Maintain the same error handling

This creates a **perfect plug and socket fit** where any client code can be moved to server and vice versa without modification.
