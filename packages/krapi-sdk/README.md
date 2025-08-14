# 🚀 KRAPI SDK - Revolutionary Plug & Socket Architecture

[![npm version](https://badge.fury.io/js/@krapi/sdk.svg)](https://badge.fury.io/js/@krapi/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**The world's first truly universal backend SDK with perfect plug and socket compatibility between frontend and backend environments.**

## 🌟 What Makes KRAPI Revolutionary?

KRAPI introduces a **revolutionary "plug and socket" architecture** where your frontend (plug) and backend (socket) fit together perfectly. Write your business logic once, use it everywhere.

```typescript
// FRONTEND (The Plug) 🔌
import { krapi } from "@krapi/sdk";
await krapi.connect({ endpoint: "https://api.myapp.com", apiKey: "your-key" });
const project = await krapi.projects.create({ name: "My Project" });

// BACKEND (The Socket) ⚡
import { krapi } from "@krapi/sdk";
await krapi.connect({ database: dbConnection });
const project = await krapi.projects.create({ name: "My Project" }); // IDENTICAL!
```

**Same methods. Same signatures. Same results. Perfect compatibility.**

## 📦 Installation

```bash
npm install @krapi/sdk
# or
yarn add @krapi/sdk
# or
pnpm add @krapi/sdk
```

## 🎯 Quick Start

### Frontend Integration (React, Vue, Angular, etc.)

```typescript
import { krapi } from "@krapi/sdk";

// Connect to your KRAPI backend
await krapi.connect({
  endpoint: "https://your-api.com/krapi/v1",
  apiKey: "your-api-key",
});

// Now use any method - they work identically everywhere!
const projects = await krapi.projects.getAll();
```

### Backend Integration (Node.js, Express, Fastify, etc.)

```typescript
import { krapi } from "@krapi/sdk";
import { Pool } from "pg";

// Connect with database for maximum performance
const db = new Pool({ connectionString: process.env.DATABASE_URL });
await krapi.connect({ database: db });

// Same methods work with direct database access
const projects = await krapi.projects.getAll(); // Blazing fast!
```

## 🏗️ Architecture Overview

KRAPI's revolutionary architecture enables:

- **🔌 Perfect Compatibility**: Frontend and backend use identical methods
- **⚡ Dual Mode Operation**: HTTP for frontend, direct database for backend
- **🎯 Type Safety**: Full TypeScript support throughout
- **🚀 Maximum Performance**: No overhead in backend mode
- **🔒 Enterprise Security**: Built-in authentication and authorization
- **📈 Auto-scaling**: Optimized for high-performance applications

## 📚 Complete API Reference

### 🔐 Authentication

```typescript
// Create session with API key
const session = await krapi.auth.createSession("your-api-key");

// Login with credentials
const result = await krapi.auth.login({
  username: "admin",
  password: "secure-password",
  remember_me: true,
});

// Get current user
const user = await krapi.auth.getCurrentUser();

// Logout
await krapi.auth.logout();

// Change password
await krapi.auth.changePassword({
  current_password: "old-pass",
  new_password: "new-pass",
});

// Refresh session
await krapi.auth.refreshSession();

// Validate session
const isValid = await krapi.auth.validateSession("session-token");

// Revoke session
await krapi.auth.revokeSession("session-id");
```

### 🎯 Projects Management

```typescript
// Create project
const project = await krapi.projects.create({
  name: "My Application",
  description: "A powerful application built with KRAPI",
  settings: {
    timezone: "UTC",
    environment: "production",
  },
});

// Get all projects
const projects = await krapi.projects.getAll({
  limit: 10,
  offset: 0,
  orderBy: "created_at",
  order: "desc",
});

// Get project by ID
const project = await krapi.projects.get("project-id");

// Update project
const updated = await krapi.projects.update("project-id", {
  name: "Updated Name",
  description: "New description",
});

// Delete project
await krapi.projects.delete("project-id");

// Get project statistics
const stats = await krapi.projects.getStatistics("project-id");

// Get project settings
const settings = await krapi.projects.getSettings("project-id");

// Update project settings
await krapi.projects.updateSettings("project-id", {
  timezone: "America/New_York",
  auto_backup: true,
});

// Get project activity
const activity = await krapi.projects.getActivity("project-id", {
  limit: 50,
  days: 30,
});
```

### 🗂️ Collections (Dynamic Schemas)

```typescript
// Create collection with custom schema
const collection = await krapi.collections.create("project-id", {
  name: "users",
  description: "User management collection",
  fields: [
    { name: "email", type: "string", required: true, unique: true },
    { name: "name", type: "string", required: true },
    { name: "age", type: "integer" },
    { name: "is_active", type: "boolean", default: true },
    { name: "metadata", type: "json", default: {} },
    { name: "created_at", type: "timestamp", default: "NOW()" },
  ],
  indexes: [
    { name: "email_idx", fields: ["email"], unique: true },
    { name: "name_idx", fields: ["name"] },
  ],
});

// Get collection
const collection = await krapi.collections.get("project-id", "users");

// Update collection schema
await krapi.collections.update("project-id", "users", {
  description: "Updated description",
  fields: [
    { name: "phone", type: "string" }, // Add new field
  ],
});

// Delete collection
await krapi.collections.delete("project-id", "users");

// Get all collections
const collections = await krapi.collections.getAll("project-id");

// Validate collection schema
const validation = await krapi.collections.validateSchema(
  "project-id",
  "users"
);

// Get collection statistics
const stats = await krapi.collections.getStatistics("project-id", "users");
```

### 📄 Documents (Data Management)

```typescript
// Create document
const user = await krapi.documents.create("project-id", "users", {
  data: {
    email: "john@example.com",
    name: "John Doe",
    age: 30,
    is_active: true,
    metadata: { role: "admin" },
  },
  created_by: "admin-user-id",
});

// Get document by ID
const user = await krapi.documents.get("project-id", "users", "doc-id");

// Update document
const updated = await krapi.documents.update("project-id", "users", "doc-id", {
  data: {
    age: 31,
    metadata: { role: "super-admin" },
  },
  updated_by: "admin-user-id",
});

// Delete document
await krapi.documents.delete("project-id", "users", "doc-id", {
  deleted_by: "admin-user-id",
});

// Get all documents with filtering
const users = await krapi.documents.getAll("project-id", "users", {
  filter: { is_active: true },
  limit: 10,
  offset: 0,
  orderBy: "created_at",
  order: "desc",
});

// Bulk operations
const bulkResult = await krapi.documents.bulkCreate("project-id", "users", [
  { data: { email: "user1@example.com", name: "User 1" } },
  { data: { email: "user2@example.com", name: "User 2" } },
]);

await krapi.documents.bulkUpdate("project-id", "users", [
  { id: "doc-1", data: { age: 25 } },
  { id: "doc-2", data: { age: 30 } },
]);

await krapi.documents.bulkDelete("project-id", "users", ["doc-1", "doc-2"]);

// Count documents
const count = await krapi.documents.count("project-id", "users", {
  is_active: true,
});

// Aggregate data
const aggregation = await krapi.documents.aggregate("project-id", "users", {
  group_by: ["is_active"],
  aggregations: {
    total_count: { type: "count" },
    average_age: { type: "avg", field: "age" },
  },
});
```

### 👥 Users Management

```typescript
// Get all users
const users = await krapi.users.getAll("project-id", {
  limit: 10,
  offset: 0,
});

// Create user
const user = await krapi.users.create("project-id", {
  email: "new-user@example.com",
  name: "New User",
  role: "member",
  permissions: ["read", "write"],
});

// Get user by ID
const user = await krapi.users.get("project-id", "user-id");

// Update user
await krapi.users.update("project-id", "user-id", {
  name: "Updated Name",
  role: "admin",
});

// Delete user
await krapi.users.delete("project-id", "user-id");

// Update user role
await krapi.users.updateRole("project-id", "user-id", "admin");

// Update user permissions
await krapi.users.updatePermissions("project-id", "user-id", [
  "read",
  "write",
  "admin",
]);

// Get user activity
const activity = await krapi.users.getActivity("project-id", "user-id", {
  limit: 50,
  days: 30,
});

// Get user statistics
const stats = await krapi.users.getStatistics("project-id");
```

### 💾 Storage Management

```typescript
// Upload file
const file = await krapi.storage.uploadFile("project-id", {
  file: fileBuffer,
  filename: "document.pdf",
  mimetype: "application/pdf",
  folder: "documents",
});

// Download file
const fileData = await krapi.storage.downloadFile("project-id", "file-id");

// Get file info
const fileInfo = await krapi.storage.getFile("project-id", "file-id");

// Delete file
await krapi.storage.deleteFile("project-id", "file-id");

// Get all files
const files = await krapi.storage.getFiles("project-id", {
  folder: "documents",
  limit: 10,
});

// Create folder
await krapi.storage.createFolder("project-id", {
  name: "new-folder",
  parent_folder: "parent-id",
});

// Get file URL
const url = await krapi.storage.getFileUrl("project-id", "file-id");
```

## 🔧 Framework Integration Examples

### React.js Integration

```typescript
// hooks/useKrapi.ts
import { krapi } from "@krapi/sdk";
import { useEffect, useState } from "react";

export function useKrapi() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connect = async () => {
      await krapi.connect({
        endpoint: process.env.REACT_APP_KRAPI_ENDPOINT!,
        apiKey: process.env.REACT_APP_KRAPI_API_KEY!,
      });
      setIsConnected(true);
    };

    connect();
  }, []);

  return { krapi, isConnected };
}

// components/ProjectList.tsx
import React, { useEffect, useState } from "react";
import { useKrapi } from "../hooks/useKrapi";

export function ProjectList() {
  const { krapi, isConnected } = useKrapi();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!isConnected) return;

    const fetchProjects = async () => {
      const result = await krapi.projects.getAll();
      setProjects(result);
    };

    fetchProjects();
  }, [krapi, isConnected]);

  return (
    <div>
      {projects.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

### Next.js Integration

```typescript
// lib/krapi.ts
import { krapi } from "@krapi/sdk";

// Client-side (frontend)
export async function initializeClientKrapi() {
  await krapi.connect({
    endpoint: process.env.NEXT_PUBLIC_KRAPI_ENDPOINT!,
    apiKey: process.env.NEXT_PUBLIC_KRAPI_API_KEY!,
  });
  return krapi;
}

// Server-side (API routes)
import { Pool } from "pg";

export async function initializeServerKrapi() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  await krapi.connect({ database: db });
  return krapi;
}

// pages/api/projects.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { initializeServerKrapi } from "../../lib/krapi";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const krapi = await initializeServerKrapi();

  if (req.method === "GET") {
    const projects = await krapi.projects.getAll();
    res.json(projects);
  } else if (req.method === "POST") {
    const project = await krapi.projects.create(req.body);
    res.json(project);
  }
}

// pages/projects.tsx
import { GetServerSideProps } from "next";
import { initializeServerKrapi } from "../lib/krapi";

export default function ProjectsPage({ projects }) {
  return (
    <div>
      {projects.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const krapi = await initializeServerKrapi();
  const projects = await krapi.projects.getAll();

  return {
    props: { projects },
  };
};
```

### Express.js Backend Integration

```typescript
// server.ts
import express from "express";
import { krapi } from "@krapi/sdk";
import { Pool } from "pg";

const app = express();

// Initialize KRAPI with database
async function initializeKrapi() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  await krapi.connect({ database: db });
  return krapi;
}

// Projects routes
app.get("/api/projects", async (req, res) => {
  const projects = await krapi.projects.getAll();
  res.json(projects);
});

app.post("/api/projects", async (req, res) => {
  const project = await krapi.projects.create(req.body);
  res.json(project);
});

// Documents routes
app.get(
  "/api/projects/:projectId/collections/:collection/documents",
  async (req, res) => {
    const documents = await krapi.documents.getAll(
      req.params.projectId,
      req.params.collection,
      req.query
    );
    res.json(documents);
  }
);

app.post(
  "/api/projects/:projectId/collections/:collection/documents",
  async (req, res) => {
    const document = await krapi.documents.create(
      req.params.projectId,
      req.params.collection,
      req.body
    );
    res.json(document);
  }
);

// Start server
(async () => {
  await initializeKrapi();
  app.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
    console.log("✅ KRAPI SDK initialized");
  });
})();
```

### Fastify Backend Integration

```typescript
// server.ts
import Fastify from "fastify";
import { krapi } from "@krapi/sdk";
import { Pool } from "pg";

const fastify = Fastify({ logger: true });

// Initialize KRAPI
async function initializeKrapi() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  await krapi.connect({ database: db });
}

// Routes
fastify.get("/api/projects", async (request, reply) => {
  const projects = await krapi.projects.getAll();
  return projects;
});

fastify.post("/api/projects", async (request, reply) => {
  const project = await krapi.projects.create(request.body);
  return project;
});

// Start server
const start = async () => {
  try {
    await initializeKrapi();
    await fastify.listen({ port: 3000 });
    console.log("🚀 Server running on port 3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

### Vue.js Integration

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

// components/ProjectList.vue
<template>
  <div>
    <div v-for="project in projects" :key="project.id">
      {{ project.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useKrapi } from "../composables/useKrapi";

const { krapi, isConnected } = useKrapi();
const projects = ref([]);

watch(isConnected, async (connected) => {
  if (connected) {
    projects.value = await krapi.projects.getAll();
  }
});
</script>
```

### Angular Integration

```typescript
// services/krapi.service.ts
import { Injectable } from "@angular/core";
import { krapi } from "@krapi/sdk";

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

  async getProjects() {
    await this.initialize();
    return krapi.projects.getAll();
  }

  async createProject(data: any) {
    await this.initialize();
    return krapi.projects.create(data);
  }
}

// components/project-list.component.ts
import { Component, OnInit } from "@angular/core";
import { KrapiService } from "../services/krapi.service";

@Component({
  selector: "app-project-list",
  template: `
    <div *ngFor="let project of projects">
      {{ project.name }}
    </div>
  `,
})
export class ProjectListComponent implements OnInit {
  projects: any[] = [];

  constructor(private krapiService: KrapiService) {}

  async ngOnInit() {
    this.projects = await this.krapiService.getProjects();
  }
}
```

## 🌐 Complete HTTP API Endpoints

When using KRAPI in HTTP mode, these are the endpoints that get called:

### Authentication Endpoints

- `POST /auth/login` - Admin login
- `POST /auth/sessions` - Create session with API key
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout
- `POST /auth/change-password` - Change password
- `POST /auth/refresh` - Refresh session
- `POST /auth/validate` - Validate session
- `DELETE /auth/sessions/:sessionId` - Revoke session

### Projects Endpoints

- `GET /projects` - Get all projects
- `POST /projects` - Create project
- `GET /projects/:id` - Get project by ID
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `GET /projects/:id/statistics` - Get project statistics
- `GET /projects/:id/settings` - Get project settings
- `PUT /projects/:id/settings` - Update project settings
- `GET /projects/:id/activity` - Get project activity

### Collections Endpoints

- `GET /projects/:projectId/collections` - Get all collections
- `POST /projects/:projectId/collections` - Create collection
- `GET /projects/:projectId/collections/:name` - Get collection
- `PUT /projects/:projectId/collections/:name` - Update collection
- `DELETE /projects/:projectId/collections/:name` - Delete collection
- `POST /projects/:projectId/collections/:name/validate-schema` - Validate schema
- `GET /projects/:projectId/collections/:name/statistics` - Get statistics

### Documents Endpoints

- `GET /projects/:projectId/collections/:collection/documents` - Get all documents
- `POST /projects/:projectId/collections/:collection/documents` - Create document
- `GET /projects/:projectId/collections/:collection/documents/:id` - Get document
- `PUT /projects/:projectId/collections/:collection/documents/:id` - Update document
- `DELETE /projects/:projectId/collections/:collection/documents/:id` - Delete document
- `POST /projects/:projectId/collections/:collection/documents/bulk` - Bulk create
- `PUT /projects/:projectId/collections/:collection/documents/bulk` - Bulk update
- `POST /projects/:projectId/collections/:collection/documents/bulk-delete` - Bulk delete
- `POST /projects/:projectId/collections/:collection/aggregate` - Aggregate data

### Users Endpoints

- `GET /projects/:projectId/users` - Get all users
- `POST /projects/:projectId/users` - Create user
- `GET /projects/:projectId/users/:id` - Get user
- `PUT /projects/:projectId/users/:id` - Update user
- `DELETE /projects/:projectId/users/:id` - Delete user

### Storage Endpoints

- `POST /projects/:projectId/files` - Upload file
- `GET /projects/:projectId/files/:id` - Download file
- `GET /projects/:projectId/files/:id/info` - Get file info
- `DELETE /projects/:projectId/files/:id` - Delete file
- `GET /projects/:projectId/files` - List files
- `POST /projects/:projectId/folders` - Create folder

## 🔒 Security & Authentication

KRAPI provides enterprise-grade security:

```typescript
// API Key Authentication
await krapi.connect({
  endpoint: "https://api.myapp.com",
  apiKey: "pk_live_...", // Project API key
});

// Session-based Authentication
const session = await krapi.auth.login({
  username: "admin",
  password: "secure-password",
});

// The SDK automatically manages session tokens
// All subsequent requests are authenticated
```

### Permission Scopes

KRAPI supports fine-grained permissions:

- `admin:read`, `admin:write` - Admin operations
- `projects:read`, `projects:write` - Project management
- `collections:read`, `collections:write` - Schema management
- `documents:read`, `documents:write` - Data operations
- `storage:upload`, `storage:download` - File operations

## 🚀 Performance Optimization

### Backend Mode (Maximum Performance)

```typescript
// Direct database access - blazing fast!
await krapi.connect({ database: pgPool });
const results = await krapi.documents.getAll("project", "collection");
// No HTTP overhead, direct SQL queries
```

### Frontend Mode (Optimized HTTP)

```typescript
// Optimized HTTP with automatic retry and caching
await krapi.connect({
  endpoint: "https://api.myapp.com",
  apiKey: "your-key",
});
const results = await krapi.documents.getAll("project", "collection");
// Smart HTTP client with built-in optimizations
```

## 🔧 Environment Configuration

### Development Setup

```env
# Frontend (.env.local)
NEXT_PUBLIC_KRAPI_ENDPOINT=http://localhost:3001/api
NEXT_PUBLIC_KRAPI_API_KEY=pk_dev_your_key

# Backend (.env)
DATABASE_URL=postgresql://user:password@localhost:5432/krapi_dev
KRAPI_SECRET_KEY=your-secret-key
KRAPI_ENV=development
```

### Production Setup

```env
# Frontend
NEXT_PUBLIC_KRAPI_ENDPOINT=https://api.myapp.com/krapi/v1
NEXT_PUBLIC_KRAPI_API_KEY=pk_live_your_key

# Backend
DATABASE_URL=postgresql://user:password@prod-db:5432/krapi_prod
KRAPI_SECRET_KEY=your-production-secret
KRAPI_ENV=production
```

## 📊 Real-World Examples

### Task Management Application (Like ClickUp)

```typescript
// Create project structure
const project = await krapi.projects.create({
  name: "Team Workspace",
  description: "Main team collaboration space",
});

// Create collections for different data types
const tasksCollection = await krapi.collections.create(project.id, {
  name: "tasks",
  fields: [
    { name: "title", type: "string", required: true },
    { name: "description", type: "text" },
    { name: "status", type: "string", default: "todo" },
    { name: "priority", type: "string", default: "medium" },
    { name: "assignee_id", type: "uuid" },
    { name: "due_date", type: "date" },
    { name: "labels", type: "json", default: [] },
  ],
});

const usersCollection = await krapi.collections.create(project.id, {
  name: "team_members",
  fields: [
    { name: "name", type: "string", required: true },
    { name: "email", type: "string", required: true, unique: true },
    { name: "role", type: "string", default: "member" },
    { name: "avatar", type: "string" },
  ],
});

// Create tasks
const task = await krapi.documents.create(project.id, "tasks", {
  data: {
    title: "Implement user authentication",
    description: "Add login/logout functionality",
    status: "in_progress",
    priority: "high",
    assignee_id: "user-123",
    due_date: "2024-02-15",
    labels: ["backend", "security"],
  },
});

// Query tasks by status
const inProgressTasks = await krapi.documents.getAll(project.id, "tasks", {
  filter: { status: "in_progress" },
  orderBy: "due_date",
  order: "asc",
});

// Get task statistics
const stats = await krapi.documents.aggregate(project.id, "tasks", {
  group_by: ["status"],
  aggregations: {
    count: { type: "count" },
    avg_priority: { type: "avg", field: "priority" },
  },
});
```

### E-commerce Platform

```typescript
// Create product catalog
const productsCollection = await krapi.collections.create(project.id, {
  name: "products",
  fields: [
    { name: "name", type: "string", required: true },
    { name: "description", type: "text" },
    { name: "price", type: "decimal", required: true },
    { name: "category_id", type: "uuid" },
    { name: "sku", type: "string", unique: true },
    { name: "inventory_count", type: "integer", default: 0 },
    { name: "images", type: "json", default: [] },
    { name: "is_active", type: "boolean", default: true },
  ],
});

// Create orders collection
const ordersCollection = await krapi.collections.create(project.id, {
  name: "orders",
  fields: [
    { name: "customer_id", type: "uuid", required: true },
    { name: "items", type: "json", required: true },
    { name: "total_amount", type: "decimal", required: true },
    { name: "status", type: "string", default: "pending" },
    { name: "shipping_address", type: "json" },
    { name: "payment_method", type: "string" },
  ],
});

// Add products
await krapi.documents.bulkCreate(project.id, "products", [
  {
    data: {
      name: "Premium Laptop",
      description: "High-performance laptop for professionals",
      price: 1299.99,
      sku: "LAPTOP-001",
      inventory_count: 50,
    },
  },
  {
    data: {
      name: "Wireless Mouse",
      description: "Ergonomic wireless mouse",
      price: 29.99,
      sku: "MOUSE-001",
      inventory_count: 200,
    },
  },
]);

// Create order
const order = await krapi.documents.create(project.id, "orders", {
  data: {
    customer_id: "customer-123",
    items: [
      { product_id: "product-1", quantity: 1, price: 1299.99 },
      { product_id: "product-2", quantity: 2, price: 29.99 },
    ],
    total_amount: 1359.97,
    status: "confirmed",
    shipping_address: {
      street: "123 Main St",
      city: "New York",
      zip: "10001",
    },
  },
});
```

## 🛠️ Advanced Features

### Custom Field Types

```typescript
// Rich field type support
const contentCollection = await krapi.collections.create(project.id, {
  name: "blog_posts",
  fields: [
    { name: "title", type: "string", required: true },
    { name: "slug", type: "string", unique: true },
    { name: "content", type: "text" },
    { name: "published_at", type: "timestamp" },
    { name: "metadata", type: "json" },
    { name: "view_count", type: "integer", default: 0 },
    { name: "is_featured", type: "boolean", default: false },
    { name: "tags", type: "json", default: [] },
  ],
});
```

### Complex Queries

```typescript
// Advanced filtering and aggregation
const results = await krapi.documents.getAll(project.id, "blog_posts", {
  filter: {
    is_featured: true,
    published_at: { $gte: "2024-01-01" },
  },
  orderBy: "view_count",
  order: "desc",
  limit: 10,
});

// Aggregation example
const analytics = await krapi.documents.aggregate(project.id, "blog_posts", {
  group_by: ["is_featured"],
  aggregations: {
    total_posts: { type: "count" },
    avg_views: { type: "avg", field: "view_count" },
    total_views: { type: "sum", field: "view_count" },
  },
});
```

## 🔄 Migration & Deployment

### Database Migrations

```typescript
// Built-in migration support
await krapi.database.migrate(); // Run pending migrations
await krapi.database.healthCheck(); // Verify database health
await krapi.database.autoFix(); // Auto-repair common issues
```

### Production Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Monitoring & Analytics

```typescript
// Built-in analytics
const projectStats = await krapi.projects.getStatistics(project.id);
const collectionStats = await krapi.collections.getStatistics(
  project.id,
  "users"
);
const userActivity = await krapi.users.getActivity(project.id, user.id);
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@krapi.dev
- 💬 Discord: [Join our community](https://discord.gg/krapi)
- 📚 Documentation: [docs.krapi.dev](https://docs.krapi.dev)
- 🐛 Issues: [GitHub Issues](https://github.com/krapi-dev/sdk/issues)

## 🌟 Why Choose KRAPI?

✅ **Universal Compatibility** - Same code works everywhere  
✅ **Maximum Performance** - Direct database access in backend  
✅ **Type Safety** - Full TypeScript support  
✅ **Enterprise Ready** - Built for scale and security  
✅ **Developer Experience** - Intuitive API design  
✅ **Future Proof** - Constantly evolving architecture

---

**Built with ❤️ by the KRAPI Team**

_Start building your next amazing application today!_ 🚀
