# Connections between Frontend and Backend

This document provides a comprehensive mapping of all connections between the frontend (`admin-frontend`) and backend (`api-server`) components of the KRAPI CMS system.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [User Management](#user-management)
3. [Content Management](#content-management)
4. [Schema Management](#schema-management)
5. [Route Management](#route-management)
6. [File Management](#file-management)

7. [API Management](#api-management)
8. [Database Management](#database-management)
9. [Search Functionality](#search-functionality)
10. [Notifications](#notifications)
11. [MCP & AI Integration](#mcp--ai-integration)
12. [Health & Monitoring](#health--monitoring)

## Authentication & Authorization

### Login

- **Endpoint**: `POST /api/auth/login`
- **Frontend**: `admin-frontend/lib/api.ts` - `authAPI.login()`
- **Backend**: `api-server/src/controllers/auth.ts` - `AuthController.login()`

**Request Body**:

```typescript
{
  username: string;
  password: string;
}
```

**Response**:

```typescript
{
  success: boolean;
  data?: {
    token: string;
    user: {
      id: number;
      username: string;
      email: string;
      role: string;
      active: boolean;
      created_at: string;
      updated_at: string;
      last_login?: string;
      permissions?: string[];
    };
  };
  error?: string;
}
```

### Verify Token

- **Endpoint**: `GET /api/auth/verify`
- **Frontend**: `admin-frontend/lib/api.ts` - `authAPI.verify()`
- **Backend**: `api-server/src/controllers/auth.ts` - `AuthController.verify()`

**Headers**: `Authorization: Bearer <token>`

**Response**:

```typescript
{
  success: boolean;
  data?: {
    user: User;
  };
  error?: string;
}
```

### Get Profile

- **Endpoint**: `GET /api/auth/profile`
- **Frontend**: `admin-frontend/lib/api.ts` - `authAPI.getProfile()`
- **Backend**: `api-server/src/controllers/auth.ts` - `AuthController.getProfile()`

**Response**:

```typescript
{
  success: boolean;
  data?: User;
  error?: string;
}
```

### Update Profile

- **Endpoint**: `PUT /api/auth/profile`
- **Frontend**: `admin-frontend/lib/api.ts` - `authAPI.updateProfile()`
- **Backend**: `api-server/src/controllers/auth.ts` - `AuthController.updateProfile()`

**Request Body**:

```typescript
{
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}
```

### Change Password

- **Endpoint**: `POST /api/auth/change-password`
- **Frontend**: `admin-frontend/lib/api.ts` - `authAPI.changePassword()`
- **Backend**: `api-server/src/controllers/auth.ts` - `AuthController.changePassword()`

**Request Body**:

```typescript
{
  currentPassword: string;
  newPassword: string;
}
```

## User Management

### Get All Users

- **Endpoint**: `GET /api/admin/users`
- **Frontend**: `admin-frontend/lib/api.ts` - `userAPI.getAllUsers()`
- **Backend**: `api-server/src/controllers/users.ts` - `UserController.getAllUsers()`

**Query Parameters**:

```typescript
{
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  active?: boolean;
}
```

**Response**:

```typescript
{
  success: boolean;
  data?: User[];
  total: number;
  page: number;
  limit: number;
  error?: string;
}
```

### Create User

- **Endpoint**: `POST /api/admin/users`
- **Frontend**: `admin-frontend/lib/api.ts` - `userAPI.createUser()`
- **Backend**: `api-server/src/controllers/users.ts` - `UserController.createUser()`

**Request Body**:

```typescript
{
  username: string;
  email: string;
  password: string;
  role: string;
  permissions?: string[];
}
```

### Get User by ID

- **Endpoint**: `GET /api/admin/users/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `userAPI.getUserById()`
- **Backend**: `api-server/src/controllers/users.ts` - `UserController.getUserById()`

### Update User

- **Endpoint**: `PUT /api/admin/users/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `userAPI.updateUser()`
- **Backend**: `api-server/src/controllers/users.ts` - `UserController.updateUser()`

**Request Body**:

```typescript
{
  email?: string;
  role?: string;
  active?: boolean;
  permissions?: string[];
}
```

### Delete User

- **Endpoint**: `DELETE /api/admin/users/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `userAPI.deleteUser()`
- **Backend**: `api-server/src/controllers/users.ts` - `UserController.deleteUser()`

### Toggle User Status

- **Endpoint**: `PATCH /api/admin/users/:id/toggle-status`
- **Frontend**: `admin-frontend/lib/api.ts` - `userAPI.toggleUserStatus()`
- **Backend**: `api-server/src/controllers/users.ts` - `UserController.toggleUserStatus()`

### Get User Stats

- **Endpoint**: `GET /api/admin/users/stats`
- **Frontend**: `admin-frontend/lib/api.ts` - `userAPI.getUserStats()`
- **Backend**: `api-server/src/controllers/users.ts` - `UserController.getUserStats()`

**Response**:

```typescript
{
  success: boolean;
  data?: {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  };
  error?: string;
}
```

## Content Management

### Get All Content

- **Endpoint**: `GET /api/admin/content/get`
- **Frontend**: `admin-frontend/lib/api.ts` - `contentAPI.getAllContent()`
- **Backend**: `api-server/src/controllers/content.ts` - `ContentController.getAllContent()`

**Query Parameters**:

```typescript
{
  page?: number;
  limit?: number;
  search?: string;
  content_type?: string;
  route_path?: string;
  schema_id?: number;
}
```

**Response**:

```typescript
{
  success: boolean;
  data?: ContentItem[];
  total: number;
  page: number;
  limit: number;
  error?: string;
}
```

### Get Content by ID

- **Endpoint**: `GET /api/admin/content/get/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `contentAPI.getContentById()`
- **Backend**: `api-server/src/controllers/content.ts` - `ContentController.getContentById()`

### Create Content

- **Endpoint**: `POST /api/admin/content/create`
- **Frontend**: `admin-frontend/lib/api.ts` - `contentAPI.createContent()`
- **Backend**: `api-server/src/controllers/content.ts` - `ContentController.createContent()`

**Request Body**:

```typescript
{
  key: string;
  data: unknown;
  content_type: string;
  route_path?: string;
  schema_id?: number;
  description?: string;
}
```

### Update Content

- **Endpoint**: `PUT /api/admin/content/modify/id/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `contentAPI.updateContent()`
- **Backend**: `api-server/src/controllers/content.ts` - `ContentController.updateContentById()`

**Request Body**:

```typescript
{
  key?: string;
  data?: unknown;
  content_type?: string;
  route_path?: string;
  schema_id?: number;
  description?: string;
}
```

### Delete Content

- **Endpoint**: `DELETE /api/admin/content/delete/id/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `contentAPI.deleteContent()`
- **Backend**: `api-server/src/controllers/content.ts` - `ContentController.deleteContentById()`

### Get Public Content

- **Endpoint**: `GET /api/content/:routePath/:key`
- **Frontend**: `admin-frontend/lib/api.ts` - `contentAPI.getPublicContent()`
- **Backend**: `api-server/src/controllers/content.ts` - `ContentController.getPublicContent()`

### Get Public Content by Route

- **Endpoint**: `GET /api/content/:routePath`
- **Frontend**: `admin-frontend/lib/api.ts` - `contentAPI.getPublicContentByRoute()`
- **Backend**: `api-server/src/controllers/content.ts` - `ContentController.getPublicContentByRoute()`

## Schema Management

### Get All Schemas

- **Endpoint**: `GET /api/admin/schemas`
- **Frontend**: `admin-frontend/lib/api.ts` - `schemasAPI.getAllSchemas()`
- **Backend**: `api-server/src/controllers/schemas.ts` - `SchemasController.getAllSchemas()`

### Get Schema by ID

- **Endpoint**: `GET /api/admin/schemas/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `schemasAPI.getSchemaById()`
- **Backend**: `api-server/src/controllers/schemas.ts` - `SchemasController.getSchemaById()`

### Get Schema by Name

- **Endpoint**: `GET /api/schema/:name`
- **Frontend**: `admin-frontend/lib/api.ts` - `schemasAPI.getSchemaByName()`
- **Backend**: `api-server/src/controllers/schemas.ts` - `SchemasController.getSchemaByName()`

### Create Schema

- **Endpoint**: `POST /api/admin/schemas`
- **Frontend**: `admin-frontend/lib/api.ts` - `schemasAPI.createSchema()`
- **Backend**: `api-server/src/controllers/schemas.ts` - `SchemasController.createSchema()`

**Request Body**:

```typescript
{
  name: string;
  description?: string;
  definition: Record<string, unknown>;
}
```

### Update Schema

- **Endpoint**: `PUT /api/admin/schemas/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `schemasAPI.updateSchema()`
- **Backend**: `api-server/src/controllers/schemas.ts` - `SchemasController.updateSchema()`

**Request Body**:

```typescript
{
  name?: string;
  description?: string;
  definition?: Record<string, unknown>;
}
```

### Delete Schema

- **Endpoint**: `DELETE /api/admin/schemas/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `schemasAPI.deleteSchema()`
- **Backend**: `api-server/src/controllers/schemas.ts` - `SchemasController.deleteSchema()`

## Route Management

### Get All Routes

- **Endpoint**: `GET /api/admin/routes`
- **Frontend**: `admin-frontend/lib/api.ts` - `routesAPI.getAllRoutes()`
- **Backend**: `api-server/src/controllers/routes.ts` - `RoutesController.getAllRoutes()`

### Get Route by ID

- **Endpoint**: `GET /api/admin/routes/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `routesAPI.getRouteById()`
- **Backend**: `api-server/src/controllers/routes.ts` - `RoutesController.getRouteById()`

### Create Route

- **Endpoint**: `POST /api/admin/routes`
- **Frontend**: `admin-frontend/lib/api.ts` - `routesAPI.createRoute()`
- **Backend**: `api-server/src/controllers/routes.ts` - `RoutesController.createRoute()`

**Request Body**:

```typescript
{
  path: string;
  name: string;
  description?: string;
  parent_id?: number;
}
```

### Update Route

- **Endpoint**: `PUT /api/admin/routes/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `routesAPI.updateRoute()`
- **Backend**: `api-server/src/controllers/routes.ts` - `RoutesController.updateRoute()`

**Request Body**:

```typescript
{
  path?: string;
  name?: string;
  description?: string;
  parent_id?: number;
}
```

### Delete Route

- **Endpoint**: `DELETE /api/admin/routes/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `routesAPI.deleteRoute()`
- **Backend**: `api-server/src/controllers/routes.ts` - `RoutesController.deleteRoute()`

### Get Route Tree

- **Endpoint**: `GET /api/admin/routes/tree`
- **Frontend**: `admin-frontend/lib/api.ts` - `routesAPI.getRouteTree()`
- **Backend**: `api-server/src/controllers/routes.ts` - `RoutesController.getRouteTree()`

## File Management

### Upload File

- **Endpoint**: `POST /api/admin/files/upload`
- **Frontend**: `admin-frontend/lib/api.ts` - `filesAPI.uploadFile()`
- **Backend**: `api-server/src/controllers/files.ts` - `FilesController.uploadFile()`

**Request**: `multipart/form-data` with `file` field

### Get All Files

- **Endpoint**: `GET /api/admin/files`
- **Frontend**: `admin-frontend/lib/api.ts` - `filesAPI.getAllFiles()`
- **Backend**: `api-server/src/controllers/files.ts` - `FilesController.getAllFiles()`

### Get File by ID

- **Endpoint**: `GET /api/admin/files/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `filesAPI.getFileById()`
- **Backend**: `api-server/src/controllers/files.ts` - `FilesController.getFileById()`

### Update File

- **Endpoint**: `PUT /api/admin/files/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `filesAPI.updateFile()`
- **Backend**: `api-server/src/controllers/files.ts` - `FilesController.updateFile()`

### Delete File

- **Endpoint**: `DELETE /api/admin/files/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `filesAPI.deleteFile()`
- **Backend**: `api-server/src/controllers/files.ts` - `FilesController.deleteFile()`

### Download File

- **Endpoint**: `GET /api/admin/files/:id/download`
- **Frontend**: `admin-frontend/lib/api.ts` - `filesAPI.downloadFile()`
- **Backend**: `api-server/src/controllers/files.ts` - `FilesController.downloadFile()`

### Get Public File

- **Endpoint**: `GET /api/files/:filename`
- **Frontend**: `admin-frontend/lib/api.ts` - `filesAPI.getPublicFile()`
- **Backend**: `api-server/src/controllers/files.ts` - `FilesController.getPublicFile()`

## API Management

### Get API Stats

- **Endpoint**: `GET /api/admin/api/stats`
- **Frontend**: `admin-frontend/lib/api.ts` - `apiManagementAPI.getApiStats()`
- **Backend**: `api-server/src/controllers/api-management.ts` - `ApiManagementController.getApiStats()`

### Get API Keys

- **Endpoint**: `GET /api/admin/api/keys`
- **Frontend**: `admin-frontend/lib/api.ts` - `apiManagementAPI.getApiKeys()`
- **Backend**: `api-server/src/controllers/api-management.ts` - `ApiManagementController.getApiKeys()`

### Create API Key

- **Endpoint**: `POST /api/admin/api/keys`
- **Frontend**: `admin-frontend/lib/api.ts` - `apiManagementAPI.createApiKey()`
- **Backend**: `api-server/src/controllers/api-management.ts` - `ApiManagementController.createApiKey()`

**Request Body**:

```typescript
{
  name: string;
  permissions: string[];
  rate_limit: number;
  expires_at?: string;
}
```

### Update API Key

- **Endpoint**: `PUT /api/admin/api/keys/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `apiManagementAPI.updateApiKey()`
- **Backend**: `api-server/src/controllers/api-management.ts` - `ApiManagementController.updateApiKey()`

### Delete API Key

- **Endpoint**: `DELETE /api/admin/api/keys/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `apiManagementAPI.deleteApiKey()`
- **Backend**: `api-server/src/controllers/api-management.ts` - `ApiManagementController.deleteApiKey()`

### Toggle API Key

- **Endpoint**: `PATCH /api/admin/api/keys/:id/toggle`
- **Frontend**: `admin-frontend/lib/api.ts` - `apiManagementAPI.toggleApiKey()`
- **Backend**: `api-server/src/controllers/api-management.ts` - `ApiManagementController.toggleApiKey()`

### Get API Endpoints

- **Endpoint**: `GET /api/admin/api/endpoints`
- **Frontend**: `admin-frontend/lib/api.ts` - `apiManagementAPI.getEndpoints()`
- **Backend**: `api-server/src/controllers/api-management.ts` - `ApiManagementController.getApiEndpoints()`

### Update API Endpoint

- **Endpoint**: `PUT /api/admin/api/endpoints/:endpoint`
- **Frontend**: `admin-frontend/lib/api.ts` - `apiManagementAPI.updateEndpoint()`
- **Backend**: `api-server/src/controllers/api-management.ts` - `ApiManagementController.updateEndpoint()`

### Get Rate Limits

- **Endpoint**: `GET /api/admin/api/rate-limits`
- **Frontend**: `admin-frontend/lib/api.ts` - `apiManagementAPI.getRateLimits()`
- **Backend**: `api-server/src/controllers/api-management.ts` - `ApiManagementController.getRateLimits()`

### Update Rate Limit

- **Endpoint**: `PUT /api/admin/api/rate-limits/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `apiManagementAPI.updateRateLimit()`
- **Backend**: `api-server/src/controllers/api-management.ts` - `ApiManagementController.updateRateLimit()`

## Database Management

### Get Database Stats

- **Endpoint**: `GET /api/admin/database/stats`
- **Frontend**: `admin-frontend/lib/api.ts` - `databaseAPI.getStats()`
- **Backend**: `api-server/src/controllers/database.ts` - `DatabaseController.getStats()`

### Get Database Info

- **Endpoint**: `GET /api/admin/database/info`
- **Frontend**: `admin-frontend/lib/api.ts` - `databaseAPI.getDatabaseInfo()`
- **Backend**: `api-server/src/controllers/database.ts` - `DatabaseController.getDatabaseInfo()`

### Get Tables

- **Endpoint**: `GET /api/admin/content/tables`
- **Frontend**: `admin-frontend/lib/api.ts` - `databaseAPI.getTables()`
- **Backend**: `api-server/src/controllers/database.ts` - `DatabaseController.getTables()`

### Create Table

- **Endpoint**: `POST /api/admin/content/tables`
- **Frontend**: `admin-frontend/lib/api.ts` - `databaseAPI.createTable()`
- **Backend**: `api-server/src/controllers/database.ts` - `DatabaseController.createTable()`

### Get Table Data

- **Endpoint**: `GET /api/admin/database/table/:tableName`
- **Frontend**: `admin-frontend/lib/api.ts` - `databaseAPI.getTableData()`
- **Backend**: `api-server/src/controllers/database.ts` - `DatabaseController.getTableData()`

**Note**: Fixed parameter name from `req.params.name` to `req.params.tableName` to match route definition.

### Execute Query

- **Endpoint**: `POST /api/admin/database/query`
- **Frontend**: `admin-frontend/lib/api.ts` - `databaseAPI.executeQuery()`
- **Backend**: `api-server/src/controllers/database.ts` - `DatabaseController.executeQuery()`

### Export Database

- **Endpoint**: `GET /api/admin/database/export`
- **Frontend**: `admin-frontend/lib/api.ts` - `databaseAPI.exportDatabase()`
- **Backend**: `api-server/src/controllers/database.ts` - `DatabaseController.exportDatabase()`

### Reset Database

- **Endpoint**: `POST /api/admin/database/reset`
- **Frontend**: `admin-frontend/lib/api.ts` - `databaseAPI.resetDatabase()`
- **Backend**: `api-server/src/controllers/database.ts` - `DatabaseController.resetDatabase()`

## Search Functionality

### Search All

- **Endpoint**: `GET /api/search`
- **Frontend**: `admin-frontend/lib/api.ts` - `searchAPI.searchAll()`
- **Backend**: `api-server/src/controllers/search.ts` - `SearchController.searchAll()`

**Query Parameters**:

```typescript
{
  q: string;
  type?: 'content' | 'users' | 'files' | 'all';
  page?: number;
  limit?: number;
}
```

**Response**:

```typescript
{
  success: boolean;
  data?: {
    content: ContentItem[];
    users: User[];
    files: FileItem[];
    total: number;
  };
  error?: string;
}
```

## Notifications

### Get User Notifications

- **Endpoint**: `GET /api/notifications`
- **Frontend**: `admin-frontend/lib/api.ts` - `notificationsAPI.getUserNotifications()`
- **Backend**: `api-server/src/controllers/notifications.ts` - `NotificationsController.getUserNotifications()`

### Mark Notification as Read

- **Endpoint**: `PATCH /api/notifications/:id/read`
- **Frontend**: `admin-frontend/lib/api.ts` - `notificationsAPI.markAsRead()`
- **Backend**: `api-server/src/controllers/notifications.ts` - `NotificationsController.markAsRead()`

### Mark All Notifications as Read

- **Endpoint**: `PATCH /api/notifications/mark-all-read`
- **Frontend**: `admin-frontend/lib/api.ts` - `notificationsAPI.markAllAsRead()`
- **Backend**: `api-server/src/controllers/notifications.ts` - `NotificationsController.markAllAsRead()`

### Delete Notification

- **Endpoint**: `DELETE /api/notifications/:id`
- **Frontend**: `admin-frontend/lib/api.ts` - `notificationsAPI.deleteNotification()`
- **Backend**: `api-server/src/controllers/notifications.ts` - `NotificationsController.deleteNotification()`

### Get Notification Preferences

- **Endpoint**: `GET /api/notifications/preferences`
- **Frontend**: `admin-frontend/lib/api.ts` - `notificationsAPI.getNotificationPreferences()`
- **Backend**: `api-server/src/controllers/notifications.ts` - `NotificationsController.getNotificationPreferences()`

### Update Notification Preferences

- **Endpoint**: `PUT /api/notifications/preferences`
- **Frontend**: `admin-frontend/lib/api.ts` - `notificationsAPI.updateNotificationPreferences()`
- **Backend**: `api-server/src/controllers/notifications.ts` - `NotificationsController.updateNotificationPreferences()`

### Get Unread Count

- **Endpoint**: `GET /api/notifications/unread-count`
- **Frontend**: `admin-frontend/lib/api.ts` - `notificationsAPI.getUnreadCount()`
- **Backend**: `api-server/src/controllers/notifications.ts` - `NotificationsController.getUnreadCount()`

## MCP & AI Integration

### Get MCP Server Info

- **Endpoint**: `GET /api/mcp/info`
- **Frontend**: `admin-frontend/lib/api.ts` - `mcpAPI.getInfo()`
- **Backend**: `api-server/src/controllers/mcp.ts` - `McpController.getServerInfo()`

**Response**:

```typescript
{
  success: boolean;
  data?: {
    server: {
      name: string;
      description: string;
      version: string;
    };
    enabled: boolean;
    ollama: {
      baseUrl: string;
      defaultModel: string;
      healthy: boolean;
    };
  };
  error?: string;
}
```

### MCP Health Check

- **Endpoint**: `GET /api/mcp/health`
- **Frontend**: `admin-frontend/lib/api.ts` - `mcpAPI.healthCheck()`
- **Backend**: `api-server/src/controllers/mcp.ts` - `McpController.healthCheck()`

### List MCP Tools

- **Endpoint**: `GET /api/mcp/tools`
- **Frontend**: `admin-frontend/lib/api.ts` - `mcpAPI.listTools()`
- **Backend**: `api-server/src/controllers/mcp.ts` - `McpController.listTools()`

### Call MCP Tool

- **Endpoint**: `POST /api/mcp/tools/call`
- **Frontend**: `admin-frontend/lib/api.ts` - `mcpAPI.callTool()`
- **Backend**: `api-server/src/controllers/mcp.ts` - `McpController.callTool()`

**Request Body**:

```typescript
{
  name: string;
  arguments: Record<string, unknown>;
}
```

### Get App State

- **Endpoint**: `GET /api/mcp/app-state`
- **Frontend**: `admin-frontend/lib/api.ts` - `mcpAPI.getAppState()`
- **Backend**: `api-server/src/controllers/mcp.ts` - `McpController.getAppState()`

### List Ollama Models

- **Endpoint**: `GET /api/ollama/models`
- **Frontend**: `admin-frontend/lib/api.ts` - `ollamaAPI.listModels()`
- **Backend**: `api-server/src/controllers/mcp.ts` - `McpController.listModels()`

**Response**:

```typescript
{
  success: boolean;
  data?: {
    models: string[];
    defaultModel: string;
    baseUrl: string;
  };
  error?: string;
}
```

**Note**: Fixed response format to include `models` array property to match frontend expectations.

### Pull Ollama Model

- **Endpoint**: `POST /api/ollama/models/pull`
- **Frontend**: `admin-frontend/lib/api.ts` - `ollamaAPI.pullModel()`
- **Backend**: `api-server/src/controllers/mcp.ts` - `McpController.pullModel()`

**Request Body**:

```typescript
{
  model: string;
}
```

### Ollama Chat

- **Endpoint**: `POST /api/ollama/chat`
- **Frontend**: `admin-frontend/lib/api.ts` - `ollamaAPI.chat()`
- **Backend**: `api-server/src/controllers/mcp.ts` - `McpController.ollamaChat()`

**Request Body**:

```typescript
{
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  model?: string;
  tools?: boolean;
  temperature?: number;
  max_tokens?: number;
}
```

**Response**:

```typescript
{
  success: boolean;
  data?: {
    message: {
      role: "assistant";
      content: string;
      tool_calls?: Array<{
        function: {
          name: string;
          arguments: Record<string, unknown>;
        };
      }>;
    };
  };
  error?: string;
}
```

### Ollama Generate

- **Endpoint**: `POST /api/ollama/generate`
- **Frontend**: `admin-frontend/lib/api.ts` - `ollamaAPI.generate()`
- **Backend**: `api-server/src/controllers/mcp.ts` - `McpController.generate()`

**Request Body**:

```typescript
{
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}
```

## Health & Monitoring

### Health Check

- **Endpoint**: `GET /api/health`
- **Frontend**: `admin-frontend/lib/api.ts` - `healthAPI.check()`
- **Backend**: `api-server/src/routes/api.ts` - Health check handler

**Response**:

```typescript
{
  success: true;
  status: "OK";
  message: "API Server is healthy";
  timestamp: string;
  uptime: number;
  version: string;
}
```

## Common Data Types

### User

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  permissions?: string[];
}
```

### ContentItem

```typescript
interface ContentItem {
  id: number;
  key: string;
  data: unknown;
  content_type: string;
  route_path?: string;
  schema_id?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

### FileItem

```typescript
interface FileItem {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}
```

### Route

```typescript
interface Route {
  id: number;
  path: string;
  name: string;
  description?: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}
```

### Schema

```typescript
interface Schema {
  id: number;
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

### ApiKey

```typescript
interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  rate_limit: number;
  created_at: string;
  last_used: string | null;
  usage_count: number;
  active: boolean;
  expires_at?: string;
}
```

## Authentication Middleware

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

The token is validated by the `authenticateToken` middleware in `api-server/src/middleware/auth.ts`.

## Error Handling

All API responses follow a consistent error format:

```typescript
{
  success: false;
  error: string;
  code?: number;
  data?: unknown;
}
```

Common HTTP status codes:

- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API endpoints may be subject to rate limiting based on:

- User authentication status
- API key usage
- Endpoint-specific limits

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## WebSocket Connections

The system also supports WebSocket connections for real-time features:

- **WebSocket URL**: `ws://localhost:3470/ws`
- **Frontend**: `admin-frontend/lib/config.ts` - WebSocket configuration
- **Backend**: `api-server/src/services/websocket.ts` - WebSocket service

WebSocket events include:

- Real-time notifications
- Live updates for collaborative features
- System status monitoring

## Recent Fixes and Updates

### Database Management Page Fixes (Latest)

**Date**: Current
**Issues Fixed**:

1. **Database Table Data 400 Error**:

   - **Problem**: `req.params.name` was used instead of `req.params.tableName` in `DatabaseController.getTableData()`
   - **Fix**: Changed parameter access from `req.params.name` to `req.params.tableName` to match route definition
   - **Files Modified**: `api-server/src/controllers/database.ts`

2. **AI Page Models Error**:

   - **Problem**: `models?.models.length` error when `models` is undefined
   - **Fix**: Updated `McpController.listModels()` to return proper object structure with `models` array property
   - **Files Modified**: `api-server/src/controllers/mcp.ts`

3. **Database Page Layout Improvements**:
   - **Problem**: Duplicate table listings and narrow side-by-side layout
   - **Fix**:
     - Separated database statistics and tables into distinct sections
     - Changed grid layout from 3 columns to 4 columns for better spacing
     - Removed redundant table listing from statistics section
   - **Files Modified**: `admin-frontend/app/dashboard/database/page.tsx`

**Frontend-Backend Connection Updates**:

- Database table data endpoint now correctly handles parameter names
- MCP models endpoint now returns consistent object structure
- Database page UI improved for better user experience
