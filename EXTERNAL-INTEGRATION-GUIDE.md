# 🌐 External Application Integration Guide

> **How to integrate any application with KRAPI using the Frontend Proxy**

## 🎯 Overview

KRAPI now supports **frontend proxy functionality**, allowing external applications to use your KRAPI frontend URL to access the backend API. This provides a unified endpoint for all your applications.

## 🔌 How It Works

```
External App → Frontend Proxy → Backend API
     ↓              ↓              ↓
Your App        your-site.com   your-backend.com
```

### URLs

| Method             | URL Pattern                             | Example                                   |
| ------------------ | --------------------------------------- | ----------------------------------------- |
| **Direct Backend** | `https://backend.com/krapi/k1/...`      | `https://api.myapp.com/krapi/k1/projects` |
| **Frontend Proxy** | `https://frontend.com/api/krapi/k1/...` | `https://myapp.com/api/krapi/k1/projects` |

## 🚀 Quick Integration

### 1. Frontend Proxy Setup

Your KRAPI frontend automatically includes proxy functionality. Just configure the backend URL:

```env
# In your KRAPI frontend environment
KRAPI_BACKEND_URL=https://your-backend.com
```

### 2. External App Integration

```typescript
// In your external application
import { krapi } from "@krapi/sdk";

// Connect using the frontend proxy URL
await krapi.connect({
  endpoint: "https://your-krapi-frontend.com/api/krapi/k1",
  apiKey: "your-api-key",
});

// Use all methods normally
const project = await krapi.projects.create({
  name: "External App Project",
});
```

## 📱 Framework Integration Examples

### React/Next.js Application

```typescript
// lib/krapi.ts
import { krapi } from "@krapi/sdk";

export async function initializeKrapi() {
  await krapi.connect({
    endpoint: process.env.NEXT_PUBLIC_KRAPI_ENDPOINT!,
    apiKey: process.env.NEXT_PUBLIC_KRAPI_API_KEY!,
  });
  return krapi;
}

// components/TaskList.tsx
import { useEffect, useState } from "react";
import { initializeKrapi } from "../lib/krapi";

export function TaskList() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      const krapi = await initializeKrapi();
      const result = await krapi.documents.getAll("project-id", "tasks");
      setTasks(result.data);
    };

    fetchTasks();
  }, []);

  return (
    <div>
      {tasks.map((task) => (
        <div key={task.id}>{task.data.title}</div>
      ))}
    </div>
  );
}
```

### Vue.js Application

```typescript
// composables/useKrapi.ts
import { krapi } from "@krapi/sdk";
import { ref, onMounted } from "vue";

export function useKrapi() {
  const isConnected = ref(false);

  onMounted(async () => {
    await krapi.connect({
      endpoint: import.meta.env.VITE_KRAPI_ENDPOINT,
      apiKey: import.meta.env.VITE_KRAPI_API_KEY
    });
    isConnected.value = true;
  });

  return { krapi, isConnected };
}

// components/TaskManager.vue
<template>
  <div v-if="isConnected">
    <button @click="createTask">Create Task</button>
    <ul>
      <li v-for="task in tasks" :key="task.id">
        {{ task.data.title }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useKrapi } from "../composables/useKrapi";

const { krapi, isConnected } = useKrapi();
const tasks = ref([]);

const createTask = async () => {
  const task = await krapi.documents.create("project-id", "tasks", {
    data: { title: "New Task" }
  });
  tasks.value.push(task);
};

watch(isConnected, async (connected) => {
  if (connected) {
    const result = await krapi.documents.getAll("project-id", "tasks");
    tasks.value = result.data;
  }
});
</script>
```

### Angular Application

```typescript
// services/krapi.service.ts
import { Injectable } from "@angular/core";
import { krapi } from "@krapi/sdk";
import { environment } from "../environments/environment";

@Injectable({
  providedIn: "root",
})
export class KrapiService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    await krapi.connect({
      endpoint: environment.krapiEndpoint,
      apiKey: environment.krapiApiKey,
    });

    this.initialized = true;
  }

  async getTasks(projectId: string) {
    await this.initialize();
    return krapi.documents.getAll(projectId, "tasks");
  }

  async createTask(projectId: string, taskData: any) {
    await this.initialize();
    return krapi.documents.create(projectId, "tasks", { data: taskData });
  }
}

// components/task-list.component.ts
import { Component, OnInit } from "@angular/core";
import { KrapiService } from "../services/krapi.service";

@Component({
  selector: "app-task-list",
  template: `
    <div *ngFor="let task of tasks">
      {{ task.data.title }}
    </div>
  `,
})
export class TaskListComponent implements OnInit {
  tasks: any[] = [];

  constructor(private krapiService: KrapiService) {}

  async ngOnInit() {
    const result = await this.krapiService.getTasks("project-id");
    this.tasks = result.data;
  }
}
```

### Vanilla JavaScript Application

```html
<!DOCTYPE html>
<html>
  <head>
    <title>KRAPI Integration</title>
  </head>
  <body>
    <div id="tasks"></div>
    <button onclick="createTask()">Create Task</button>

    <script type="module">
      import { krapi } from "https://unpkg.com/@krapi/sdk@latest/dist/index.mjs";

      // Initialize KRAPI
      await krapi.connect({
        endpoint: "https://your-krapi-frontend.com/api/krapi/k1",
        apiKey: "your-api-key",
      });

      // Load tasks
      async function loadTasks() {
        const result = await krapi.documents.getAll("project-id", "tasks");
        const tasksDiv = document.getElementById("tasks");

        tasksDiv.innerHTML = result.data
          .map((task) => `<div>${task.data.title}</div>`)
          .join("");
      }

      // Create task
      window.createTask = async function () {
        await krapi.documents.create("project-id", "tasks", {
          data: { title: "New Task" },
        });
        await loadTasks();
      };

      // Initial load
      loadTasks();
    </script>
  </body>
</html>
```

## 🔧 Advanced Configuration

### Environment Variables

#### Frontend (KRAPI Manager)

```env
# Required: Backend URL for proxy
KRAPI_BACKEND_URL=https://your-backend.com

# Optional: Custom proxy path (default: /api/krapi)
KRAPI_PROXY_PATH=/api/krapi

# Optional: Enable proxy logging
KRAPI_PROXY_DEBUG=true
```

#### External Application

```env
# Use the frontend proxy endpoint
NEXT_PUBLIC_KRAPI_ENDPOINT=https://your-frontend.com/api/krapi/k1
NEXT_PUBLIC_KRAPI_API_KEY=your-api-key

# Or use direct backend (for server-side)
KRAPI_BACKEND_ENDPOINT=https://your-backend.com/krapi/k1
KRAPI_ADMIN_API_KEY=your-admin-key
```

### Custom Proxy Configuration

You can customize the proxy behavior by modifying the frontend proxy route:

```typescript
// frontend-manager/app/api/[...krapi]/route.ts

// Add custom headers
headers.set("X-App-Version", "1.0.0");
headers.set("X-Client-Type", "proxy");

// Add request logging
console.log(`Proxying ${method} ${fullBackendUrl}`);

// Add rate limiting
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// Add authentication validation
if (!headers.get("x-api-key") && !headers.get("authorization")) {
  return NextResponse.json(
    { error: "Authentication required" },
    { status: 401 }
  );
}
```

## 📊 Monitoring & Analytics

### Request Logging

```typescript
// Add to proxy route for monitoring
const startTime = Date.now();

// ... proxy logic ...

const endTime = Date.now();
const duration = endTime - startTime;

console.log({
  method,
  path: pathSegments.join("/"),
  status: response.status,
  duration,
  ip: request.ip,
  userAgent: request.headers.get("user-agent"),
});
```

### Usage Analytics

```typescript
// Track API usage
await krapi.documents.create("analytics", "api_calls", {
  data: {
    endpoint: pathSegments.join("/"),
    method,
    status: response.status,
    duration,
    ip: request.ip,
    timestamp: new Date().toISOString(),
  },
});
```

## 🔒 Security Considerations

### Rate Limiting

```typescript
// Implement rate limiting in proxy
const rateLimitKey = `rate_limit:${request.ip}`;
const requests = await redis.incr(rateLimitKey);
await redis.expire(rateLimitKey, 3600); // 1 hour window

if (requests > 1000) {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

### API Key Validation

```typescript
// Validate API keys before proxying
const apiKey = request.headers.get("x-api-key");
if (!apiKey) {
  return NextResponse.json({ error: "API key required" }, { status: 401 });
}

// Check if API key is valid (implement your logic)
const isValid = await validateApiKey(apiKey);
if (!isValid) {
  return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
}
```

### CORS Configuration

```typescript
// Custom CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};
```

## 🚀 Deployment Strategies

### Option 1: Same Domain Deployment

Deploy both frontend and backend on the same domain:

```
https://myapp.com/          → Frontend
https://myapp.com/api/      → Backend API
https://myapp.com/api/krapi/→ KRAPI Proxy
```

### Option 2: Subdomain Deployment

Use subdomains for organization:

```
https://app.myapp.com/        → Frontend
https://api.myapp.com/        → Backend API
https://app.myapp.com/api/krapi/ → KRAPI Proxy
```

### Option 3: CDN with Edge Functions

Use Vercel/Netlify edge functions for global distribution:

```typescript
// vercel/api/krapi/[...slug].ts
export default async function handler(req, res) {
  const backendUrl = `${
    process.env.KRAPI_BACKEND_URL
  }/krapi/${req.query.slug.join("/")}`;

  const response = await fetch(backendUrl, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
```

## 📈 Performance Optimization

### Caching Strategy

```typescript
// Add caching to proxy
const cacheKey = `cache:${method}:${pathSegments.join("/")}:${searchParams}`;

// For GET requests, try cache first
if (method === "GET") {
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }
}

// ... make request ...

// Cache successful GET responses
if (method === "GET" && response.ok) {
  await redis.setex(cacheKey, 300, JSON.stringify(responseData)); // 5 min cache
}
```

### Connection Pooling

```typescript
// Reuse HTTP connections
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
});

const response = await fetch(fullBackendUrl, {
  method,
  headers,
  body,
  agent: httpsAgent,
});
```

## 🧪 Testing Integration

### Unit Tests

```typescript
// test/krapi-integration.test.ts
import { krapi } from "@krapi/sdk";

describe("KRAPI Integration", () => {
  beforeAll(async () => {
    await krapi.connect({
      endpoint: "https://test-frontend.com/api/krapi/k1",
      apiKey: "test-api-key",
    });
  });

  test("should create project", async () => {
    const project = await krapi.projects.create({
      name: "Test Project",
    });

    expect(project.name).toBe("Test Project");
    expect(project.id).toBeDefined();
  });

  test("should create and fetch documents", async () => {
    const doc = await krapi.documents.create("project-id", "collection", {
      data: { title: "Test Document" },
    });

    const fetched = await krapi.documents.get(
      "project-id",
      "collection",
      doc.id
    );
    expect(fetched.data.title).toBe("Test Document");
  });
});
```

### End-to-End Tests

```typescript
// e2e/krapi-flow.test.ts
import { test, expect } from "@playwright/test";

test("complete KRAPI workflow", async ({ page }) => {
  // Navigate to your app
  await page.goto("https://your-app.com");

  // Test creating a task through your UI
  await page.click('[data-testid="create-task"]');
  await page.fill('[data-testid="task-title"]', "E2E Test Task");
  await page.click('[data-testid="save-task"]');

  // Verify task appears in list
  await expect(page.locator('[data-testid="task-list"]')).toContainText(
    "E2E Test Task"
  );

  // Verify via direct API call
  const apiResponse = await page.request.get(
    "https://your-frontend.com/api/krapi/k1/documents",
    {
      headers: {
        "X-API-Key": "test-key",
      },
    }
  );

  const data = await apiResponse.json();
  expect(data.data.some((task) => task.data.title === "E2E Test Task")).toBe(
    true
  );
});
```

## 🎯 Best Practices

### 1. Error Handling

```typescript
// Robust error handling in your app
async function safeKrapiCall<T>(
  operation: () => Promise<T>
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error("KRAPI operation failed:", error);

    if (error.status === 401) {
      // Handle authentication error
      redirectToLogin();
    } else if (error.status === 429) {
      // Handle rate limiting
      showRateLimitMessage();
    }

    return null;
  }
}

// Usage
const project = await safeKrapiCall(() =>
  krapi.projects.create({ name: "My Project" })
);
```

### 2. Connection Management

```typescript
// Singleton pattern for KRAPI connection
class KrapiManager {
  private static instance: KrapiManager;
  private connected = false;

  static getInstance(): KrapiManager {
    if (!KrapiManager.instance) {
      KrapiManager.instance = new KrapiManager();
    }
    return KrapiManager.instance;
  }

  async ensureConnected() {
    if (!this.connected) {
      await krapi.connect({
        endpoint: process.env.KRAPI_ENDPOINT!,
        apiKey: process.env.KRAPI_API_KEY!,
      });
      this.connected = true;
    }
  }

  async projects() {
    await this.ensureConnected();
    return krapi.projects;
  }
}

// Usage
const krapiManager = KrapiManager.getInstance();
const projects = await krapiManager.projects();
```

### 3. Type Safety

```typescript
// Define your data models
interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  assignee_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

interface TaskCollection {
  name: "tasks";
  data: Task;
}

// Type-safe wrapper
class TypedKrapi {
  constructor(private projectId: string) {}

  async createTask(
    data: Omit<Task, "id" | "created_at" | "updated_at">
  ): Promise<Task> {
    const result = await krapi.documents.create(this.projectId, "tasks", {
      data,
    });
    return {
      id: result.id,
      ...data,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  async getTasks(filter?: Partial<Task>): Promise<Task[]> {
    const result = await krapi.documents.getAll(this.projectId, "tasks", {
      filter,
    });
    return result.data.map((doc) => ({ id: doc.id, ...doc.data })) as Task[];
  }
}
```

## 🔗 Integration Examples

### E-commerce Integration

```typescript
// E-commerce with KRAPI backend
class EcommerceStore {
  constructor(private projectId: string) {}

  async initializeStore() {
    // Create product catalog
    await krapi.collections.create(this.projectId, {
      name: "products",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "description", type: "text" },
        { name: "price", type: "decimal", required: true },
        { name: "category", type: "string" },
        { name: "sku", type: "string", unique: true },
        { name: "inventory", type: "integer", default: 0 },
        { name: "images", type: "json", default: [] },
        { name: "active", type: "boolean", default: true },
      ],
    });

    // Create orders collection
    await krapi.collections.create(this.projectId, {
      name: "orders",
      fields: [
        { name: "customer_email", type: "string", required: true },
        { name: "items", type: "json", required: true },
        { name: "total", type: "decimal", required: true },
        { name: "status", type: "string", default: "pending" },
        { name: "shipping_address", type: "json" },
      ],
    });
  }

  async addProduct(product: ProductData) {
    return krapi.documents.create(this.projectId, "products", {
      data: product,
    });
  }

  async createOrder(order: OrderData) {
    return krapi.documents.create(this.projectId, "orders", { data: order });
  }

  async getProducts(category?: string) {
    return krapi.documents.getAll(this.projectId, "products", {
      filter: category ? { category, active: true } : { active: true },
    });
  }
}
```

### Blog/CMS Integration

```typescript
// Blog/CMS with KRAPI
class BlogCMS {
  constructor(private projectId: string) {}

  async setup() {
    await krapi.collections.create(this.projectId, {
      name: "posts",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "slug", type: "string", unique: true },
        { name: "content", type: "text", required: true },
        { name: "excerpt", type: "text" },
        { name: "author", type: "string" },
        { name: "status", type: "string", default: "draft" },
        { name: "published_at", type: "timestamp" },
        { name: "tags", type: "json", default: [] },
        { name: "featured_image", type: "string" },
      ],
    });
  }

  async publishPost(post: PostData) {
    const result = await krapi.documents.create(this.projectId, "posts", {
      data: {
        ...post,
        status: "published",
        published_at: new Date().toISOString(),
      },
    });

    // Send notification
    await krapi.email.send(this.projectId, {
      to: "subscribers@myblog.com",
      subject: `New Post: ${post.title}`,
      template_id: "new-post",
      template_variables: { post: result },
    });

    return result;
  }

  async getPublishedPosts() {
    return krapi.documents.getAll(this.projectId, "posts", {
      filter: { status: "published" },
      orderBy: "published_at",
      order: "desc",
    });
  }
}
```

## 🎉 Conclusion

The KRAPI frontend proxy enables seamless integration with any external application:

✅ **Unified Endpoint** - Single URL for all API access  
✅ **Automatic CORS** - Cross-origin requests handled  
✅ **Perfect Compatibility** - All SDK methods work through proxy  
✅ **Production Ready** - Built for scale and reliability  
✅ **Framework Agnostic** - Works with any JavaScript framework

### Quick Start for External Apps

```bash
npm install @krapi/sdk
```

```typescript
import { krapi } from "@krapi/sdk";

await krapi.connect({
  endpoint: "https://your-krapi-frontend.com/api/krapi/k1",
  apiKey: "your-api-key",
});

// Now use any KRAPI method!
const projects = await krapi.projects.getAll();
```

**Your external applications can now leverage the full power of KRAPI!** 🚀
