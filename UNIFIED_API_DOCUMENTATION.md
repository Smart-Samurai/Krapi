# Krapi Unified API Documentation

## Overview

Krapi now uses a **unified API endpoint** similar to Appwrite, where all operations go through a single endpoint. This provides a cleaner, more consistent API experience.

## Base URL

- **Development**: `http://localhost:3470/krapi/v1`
- **Production**: Configure via environment variables

**Note**: The previous version used `/krapi/k1` but the current version uses `/krapi/v1`

## Authentication

- **Admin Authentication**: Bearer token via `Authorization: Bearer <token>` header
- **Project API Authentication**: API key via `X-API-Key: <key>` header
- **Default Admin Credentials**: Username: `admin`, Password: `admin123`

---

## 🏥 Health Check

### GET `/krapi/v1/health`

- **Purpose**: Check API health
- **Response**:

```json
{
  "success": true,
  "message": "Krapi Unified API is healthy",
  "timestamp": "2025-07-22T10:00:00.000Z",
  "version": "1.0.0",
  "endpoint": "/krapi/v1"
}
```

---

## 🔐 Authentication

### POST `/krapi/v1/auth`

- **Purpose**: Authenticate user or verify API key
- **Request Body**:

```json
{
  "method": "login" | "verify",
  // For login
  "username": "admin",
  "password": "admin123"
  // For verify - token is passed via Authorization header
}
```

- **Response**:

```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    /* user data */
  }
}
```

---

## 🚀 Unified API Endpoint

### ALL `/krapi/v1/api`

- **Purpose**: Single endpoint for all operations
- **Method**: GET, POST, PUT, DELETE, PATCH
- **Headers**:
  - `Authorization: Bearer <token>` (for admin operations)
  - `X-API-Key: <key>` (for project operations)
  - `Content-Type: application/json`

### Request Format

```json
{
  "operation": "database" | "auth" | "storage" | "users" | "teams" | "functions" | "messaging" | "ai" | "admin",
  "resource": "collections" | "documents" | "files" | "users" | "projects" | "keys" | "chat" | "models" | "generate",
  "action": "list" | "create" | "get" | "update" | "delete" | "download",
  "params": {
    // Operation-specific parameters
  }
}
```

---

## 📊 Database Operations

### Collections

#### List Collections

```json
{
  "operation": "database",
  "resource": "collections",
  "action": "list",
  "params": {
    "limit": 10,
    "offset": 0
  }
}
```

#### Create Collection

```json
{
  "operation": "database",
  "resource": "collections",
  "action": "create",
  "params": {
    "name": "users",
    "description": "User collection",
    "schema": {
      "name": "string",
      "email": "string",
      "age": "number"
    }
  }
}
```

#### Get Collection

```json
{
  "operation": "database",
  "resource": "collections",
  "action": "get",
  "params": {
    "collectionId": "collection-id"
  }
}
```

#### Update Collection

```json
{
  "operation": "database",
  "resource": "collections",
  "action": "update",
  "params": {
    "collectionId": "collection-id",
    "name": "updated-name",
    "description": "Updated description"
  }
}
```

#### Delete Collection

```json
{
  "operation": "database",
  "resource": "collections",
  "action": "delete",
  "params": {
    "collectionId": "collection-id"
  }
}
```

### Documents

#### List Documents

```json
{
  "operation": "database",
  "resource": "documents",
  "action": "list",
  "params": {
    "collectionId": "collection-id",
    "limit": 10,
    "offset": 0,
    "filters": ["name", "=", "John"]
  }
}
```

#### Create Document

```json
{
  "operation": "database",
  "resource": "documents",
  "action": "create",
  "params": {
    "collectionId": "collection-id",
    "data": {
      "name": "John Doe",
      "email": "john@example.com",
      "age": 30
    }
  }
}
```

#### Get Document

```json
{
  "operation": "database",
  "resource": "documents",
  "action": "get",
  "params": {
    "collectionId": "collection-id",
    "documentId": "document-id"
  }
}
```

#### Update Document

```json
{
  "operation": "database",
  "resource": "documents",
  "action": "update",
  "params": {
    "collectionId": "collection-id",
    "documentId": "document-id",
    "data": {
      "name": "John Smith",
      "age": 31
    }
  }
}
```

#### Delete Document

```json
{
  "operation": "database",
  "resource": "documents",
  "action": "delete",
  "params": {
    "collectionId": "collection-id",
    "documentId": "document-id"
  }
}
```

---

## 🔐 Authentication Operations

### Users

#### List Users

```json
{
  "operation": "auth",
  "resource": "users",
  "action": "list",
  "params": {
    "limit": 10,
    "offset": 0
  }
}
```

#### Create User

```json
{
  "operation": "auth",
  "resource": "users",
  "action": "create",
  "params": {
    "email": "user@example.com",
    "password": "password",
    "name": "User Name"
  }
}
```

#### Get User

```json
{
  "operation": "auth",
  "resource": "users",
  "action": "get",
  "params": {
    "userId": "user-id"
  }
}
```

#### Update User

```json
{
  "operation": "auth",
  "resource": "users",
  "action": "update",
  "params": {
    "userId": "user-id",
    "name": "Updated Name",
    "email": "updated@example.com"
  }
}
```

#### Delete User

```json
{
  "operation": "auth",
  "resource": "users",
  "action": "delete",
  "params": {
    "userId": "user-id"
  }
}
```

---

## 📁 Storage Operations

### Files

#### List Files

```json
{
  "operation": "storage",
  "resource": "files",
  "action": "list",
  "params": {
    "limit": 10,
    "offset": 0
  }
}
```

#### Upload File

```json
{
  "operation": "storage",
  "resource": "files",
  "action": "create",
  "params": {
    "file": "file-data",
    "name": "document.pdf",
    "description": "Important document"
  }
}
```

#### Get File

```json
{
  "operation": "storage",
  "resource": "files",
  "action": "get",
  "params": {
    "fileId": "file-id"
  }
}
```

#### Update File

```json
{
  "operation": "storage",
  "resource": "files",
  "action": "update",
  "params": {
    "fileId": "file-id",
    "name": "updated-name.pdf",
    "description": "Updated description"
  }
}
```

#### Delete File

```json
{
  "operation": "storage",
  "resource": "files",
  "action": "delete",
  "params": {
    "fileId": "file-id"
  }
}
```

#### Download File

```json
{
  "operation": "storage",
  "resource": "files",
  "action": "download",
  "params": {
    "fileId": "file-id"
  }
}
```

---

## 🤖 AI Operations

### Chat

#### Create Chat

```json
{
  "operation": "ai",
  "resource": "chat",
  "action": "create",
  "params": {
    "model": "llama2",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }
}
```

### Models

#### List Models

```json
{
  "operation": "ai",
  "resource": "models",
  "action": "list",
  "params": {}
}
```

#### Pull Model

```json
{
  "operation": "ai",
  "resource": "models",
  "action": "create",
  "params": {
    "model": "llama2:7b"
  }
}
```

### Generate

#### Generate Text

```json
{
  "operation": "ai",
  "resource": "generate",
  "action": "create",
  "params": {
    "model": "llama2",
    "prompt": "Write a short story about a robot",
    "options": {
      "max_tokens": 100
    }
  }
}
```

---

## 👑 Admin Operations

_Requires admin authentication_

### Projects

#### List Projects

```json
{
  "operation": "admin",
  "resource": "projects",
  "action": "list",
  "params": {}
}
```

#### Create Project

```json
{
  "operation": "admin",
  "resource": "projects",
  "action": "create",
  "params": {
    "name": "My Project",
    "description": "Project description",
    "domain": "example.com"
  }
}
```

#### Get Project

```json
{
  "operation": "admin",
  "resource": "projects",
  "action": "get",
  "params": {
    "projectId": "project-id"
  }
}
```

### API Keys

#### List API Keys

```json
{
  "operation": "admin",
  "resource": "keys",
  "action": "list",
  "params": {
    "projectId": "project-id"
  }
}
```

#### Create API Key

```json
{
  "operation": "admin",
  "resource": "keys",
  "action": "create",
  "params": {
    "projectId": "project-id",
    "name": "My API Key",
    "permissions": ["*"]
  }
}
```

#### Delete API Key

```json
{
  "operation": "admin",
  "resource": "keys",
  "action": "delete",
  "params": {
    "projectId": "project-id",
    "keyId": "key-id"
  }
}
```

### Database

#### Get Database Stats

```json
{
  "operation": "admin",
  "resource": "database",
  "action": "stats",
  "params": {}
}
```

#### Get Database Info

```json
{
  "operation": "admin",
  "resource": "database",
  "action": "info",
  "params": {}
}
```

#### Reset Database

```json
{
  "operation": "admin",
  "resource": "database",
  "action": "reset",
  "params": {}
}
```

### Email

#### Get Email Config

```json
{
  "operation": "admin",
  "resource": "email",
  "action": "config",
  "params": {}
}
```

#### Send Email

```json
{
  "operation": "admin",
  "resource": "email",
  "action": "send",
  "params": {
    "to": "user@example.com",
    "subject": "Test Email",
    "body": "This is a test email"
  }
}
```

---

## 📊 Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "error": null,
  "message": "Operation completed successfully"
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": "Error message",
  "message": null
}
```

---

## 🔒 Authentication Headers

### Admin Authentication

```http
Authorization: Bearer <admin_token>
```

### Project API Authentication

```http
X-API-Key: <project_api_key>
```

---

## 🚀 Usage Examples

### Using cURL

#### Admin Login

```bash
curl -X POST http://localhost:3470/krapi/v1/auth \
  -H "Content-Type: application/json" \
  -d '{
    "method": "login",
    "username": "admin",
    "password": "admin123"
  }'
```

#### Create Collection (with admin token)

```bash
curl -X POST http://localhost:3470/krapi/v1/api \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "database",
    "resource": "collections",
    "action": "create",
    "params": {
      "projectId": "project-id-here",  // Required when using admin auth
      "name": "users",
      "description": "User collection"
    }
  }'
```

#### Create Document (with API key)

```bash
curl -X POST http://localhost:3470/krapi/v1/api \
  -H "X-API-Key: <project_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "database",
    "resource": "documents",
    "action": "create",
    "params": {
      "collectionId": "collection-id",
      "data": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  }'
```

### Using JavaScript/TypeScript

```typescript
class KrapiClient {
  private baseUrl: string;
  private apiKey?: string;
  private token?: string;

  constructor(baseUrl: string, apiKey?: string, token?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.token = token;
  }

  async request(
    operation: string,
    resource: string,
    action: string,
    params: any = {}
  ) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    } else if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}/api`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        operation,
        resource,
        action,
        params,
      }),
    });

    return response.json();
  }

  // Database operations
  async listCollections(limit = 10, offset = 0) {
    return this.request("database", "collections", "list", { limit, offset });
  }

  async createCollection(name: string, description?: string) {
    return this.request("database", "collections", "create", {
      name,
      description,
    });
  }

  async listDocuments(collectionId: string, limit = 10, offset = 0) {
    return this.request("database", "documents", "list", {
      collectionId,
      limit,
      offset,
    });
  }

  async createDocument(collectionId: string, data: any) {
    return this.request("database", "documents", "create", {
      collectionId,
      data,
    });
  }

  // AI operations
  async chat(model: string, messages: any[]) {
    return this.request("ai", "chat", "create", { model, messages });
  }

  async generateText(model: string, prompt: string, options?: any) {
    return this.request("ai", "generate", "create", { model, prompt, options });
  }
}

// Usage
const client = new KrapiClient(
  "http://localhost:3470/krapi/v1",
  "your-api-key"
);

// Create a collection
const collection = await client.createCollection("users", "User collection");

// Create a document
const document = await client.createDocument("collection-id", {
  name: "John Doe",
  email: "john@example.com",
});

// Chat with AI
const response = await client.chat("llama2", [
  { role: "user", content: "Hello!" },
]);
```

---

## 📋 Summary

This unified API provides:

- **Single Endpoint**: All operations go through `/krapi/v1/api`
- **Consistent Format**: All requests follow the same structure
- **Appwrite-style**: Similar to modern BaaS platforms
- **Authentication**: Flexible auth with tokens and API keys
- **Database**: Collections and documents management
- **Storage**: File upload and management
- **AI Integration**: Chat and text generation
- **Admin Operations**: Project and system management

**Total Operations**: **50+** across all categories, but all through **1 endpoint**!
