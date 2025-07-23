import axios from "axios";
import {
  ContentItem,
  CreateUserData,
  UpdateUserData,
  ChangePasswordData,
  ContentFilters,
  RouteFilters,
  FileFilters,
  UserFilters,
  ContentSchema,
} from "../types";
import type {
  EmailConfig,
  CreateEmailTemplateData,
  UpdateEmailTemplateData,
  SendEmailData,
  CreateApiKeyData,
  UpdateApiKeyData,
  UpdateApiEndpointData,
  UpdateRateLimitData,
  SecuritySettings,
} from "../types/api";
import { config } from "./config";

// Use centralized configuration
const API_BASE_URL = config.api.baseUrl;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: config.api.timeout, // Configurable timeout
  withCredentials: false, // Don't send cookies
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  // Only add token if we're in a browser environment
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    console.log(
      "API Request:",
      config.url,
      "Token:",
      token ? "present" : "missing"
    );
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors immediately
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }

    // Let the error propagate to be handled by the new error system
    return Promise.reject(error);
  }
);

// Transform backend content item to frontend format
const transformContentItem = (item: Record<string, unknown>): ContentItem => {
  const transformed = {
    ...item,
    value: item.data, // Transform 'data' to 'value'
    type: item.content_type, // Transform 'content_type' to 'type'
    route_id: item.parent_route_id || 1, // Default route_id if not available
  };
  return transformed as ContentItem;
};

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post("/auth/login", { username, password });
    return response.data;
  },
  verify: async () => {
    const response = await api.get("/auth/verify");
    return response.data;
  },
  changePassword: async (data: ChangePasswordData) => {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  },
};

// MCP API (Model Context Protocol with Ollama)
export const mcpAPI = {
  // Get MCP server information
  getInfo: async () => {
    const response = await api.get("/mcp/info");
    return response.data;
  },

  // Health check for MCP and Ollama
  healthCheck: async () => {
    const response = await api.get("/mcp/health");
    return response.data;
  },

  // List available MCP tools
  listTools: async () => {
    const response = await api.get("/mcp/tools");
    return response.data;
  },

  // Call an MCP tool
  callTool: async (name: string, args: Record<string, unknown> = {}) => {
    const response = await api.post("/mcp/tools/call", {
      name,
      arguments: args,
    });
    return response.data;
  },

  // Get current application state
  getAppState: async () => {
    const response = await api.get("/mcp/app-state");
    return response.data;
  },
};

// Ollama API
export const ollamaAPI = {
  // List available models
  listModels: async () => {
    const response = await api.get("/ollama/models");
    return response.data;
  },

  // Pull a model
  pullModel: async (model: string) => {
    const response = await api.post("/ollama/models/pull", { model });
    return response.data;
  },

  // Update Ollama configuration
  updateConfig: async (config: { baseUrl: string; defaultModel?: string }) => {
    const response = await api.put("/ollama/config", config);
    return response.data;
  },

  // Chat with Ollama
  chat: async (
    messages: Array<{ role: string; content: string }>,
    options: {
      model?: string;
      tools?: boolean;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ) => {
    try {
      console.log("🔍 Frontend API Chat Request:", {
        messages: messages.length,
        options,
        timestamp: new Date().toISOString(),
      });

      const response = await api.post("/ollama/chat", {
        messages,
        ...options,
      });

      console.log("✅ Frontend API Chat Response:", {
        success: response.data.success,
        timestamp: new Date().toISOString(),
      });

      return response.data;
    } catch (error) {
      console.error("❌ Frontend API Chat Error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        response: (error as any).response?.data,
        status: (error as any).response?.status,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  },

  // Generate text completion
  generate: async (
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ) => {
    const response = await api.post("/ollama/generate", {
      prompt,
      ...options,
    });
    return response.data;
  },
};

// Content API
export const contentAPI = {
  // Admin routes
  getAllContent: async (filters?: ContentFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/admin/content/get?${params.toString()}`);
    if (response.data.success && response.data.data) {
      response.data.data = response.data.data.map(transformContentItem);
    }
    return response.data;
  },
  getContentByKey: async (key: string) => {
    const response = await api.get(`/admin/content/${key}`);
    if (response.data.success && response.data.data) {
      response.data.data = transformContentItem(response.data.data);
    }
    return response.data;
  },
  getContentById: async (id: number) => {
    const response = await api.get(`/admin/content/id/${id}`);
    if (response.data.success && response.data.data) {
      response.data.data = transformContentItem(response.data.data);
    }
    return response.data;
  },
  createContent: async (data: {
    key: string;
    data: unknown;
    description?: string;
    route_path: string;
    content_type: string;
    schema?: ContentSchema;
  }) => {
    const response = await api.post("/admin/content", {
      key: data.key,
      data: data.data,
      description: data.description,
      route_path: data.route_path,
      content_type: data.content_type,
      schema: data.schema,
    });
    if (response.data.success && response.data.data) {
      response.data.data = transformContentItem(response.data.data);
    }
    return response.data;
  },
  updateContent: async (
    key: string,
    data: {
      key?: string;
      data?: unknown;
      content_type?: string;
      description?: string;
      schema?: ContentSchema;
    }
  ) => {
    const response = await api.put(`/admin/content/${key}`, {
      key: data.key,
      data: data.data,
      description: data.description,
      content_type: data.content_type,
      schema: data.schema,
    });
    if (response.data.success && response.data.data) {
      response.data.data = transformContentItem(response.data.data);
    }
    return response.data;
  },
  updateContentById: async (
    id: number,
    data: {
      key?: string;
      data?: unknown;
      content_type?: string;
      description?: string;
      schema?: ContentSchema;
    }
  ) => {
    const response = await api.put(`/admin/content/id/${id}`, {
      key: data.key,
      data: data.data,
      description: data.description,
      content_type: data.content_type,
      schema: data.schema,
    });
    if (response.data.success && response.data.data) {
      response.data.data = transformContentItem(response.data.data);
    }
    return response.data;
  },
  deleteContent: async (key: string) => {
    const response = await api.delete(`/admin/content/${key}`);
    return response.data;
  },
  deleteContentById: async (id: number) => {
    const response = await api.delete(`/admin/content/id/${id}`);
    return response.data;
  },
  // Get content filtered by route path (admin method)
  getContentByRoute: async (routePath: string) => {
    const filters: ContentFilters = { route_path: routePath };
    return contentAPI.getAllContent(filters);
  },
  // Public routes
  getPublicContent: async (routePath: string, key: string) => {
    const response = await api.get(`/content/${routePath}/${key}`);
    // For public endpoints, data is returned directly, not as a content item object
    return response.data;
  },
  getPublicContentByRoute: async (routePath: string) => {
    const response = await api.get(`/content/${routePath}`);
    if (response.data.success && response.data.data) {
      response.data.data = response.data.data.map(transformContentItem);
    }
    return response.data;
  },
};

// Schemas API
export const schemasAPI = {
  getAllSchemas: async () => {
    const response = await api.get("/admin/schemas");
    return response.data;
  },
  getSchemaById: async (id: number) => {
    const response = await api.get(`/admin/schemas/${id}`);
    return response.data;
  },
  getSchemaByName: async (name: string) => {
    const response = await api.get(`/schema/${name}`);
    return response.data;
  },
  createSchema: async (schema: {
    name: string;
    description?: string;
    definition: Record<string, unknown>;
  }) => {
    const response = await api.post("/admin/schemas", schema);
    return response.data;
  },
  updateSchema: async (
    id: number,
    schema: {
      name?: string;
      description?: string;
      definition?: Record<string, unknown>;
    }
  ) => {
    const response = await api.put(`/admin/schemas/${id}`, schema);
    return response.data;
  },
  deleteSchema: async (id: number) => {
    const response = await api.delete(`/admin/schemas/${id}`);
    return response.data;
  },
};

// Routes API
export const routesAPI = {
  getAllRoutes: async (filters?: RouteFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/admin/routes?${params.toString()}`);
    return response.data;
  },
  getRouteById: async (id: number) => {
    const response = await api.get(`/admin/routes/${id}`);
    return response.data;
  },
  createRoute: async (route: {
    path: string;
    name: string;
    description?: string;
    parent_id?: number;
  }) => {
    const response = await api.post("/admin/routes", route);
    return response.data;
  },
  updateRoute: async (
    id: number,
    route: {
      path?: string;
      name?: string;
      description?: string;
      parent_id?: number;
    }
  ) => {
    const response = await api.put(`/admin/routes/${id}`, route);
    return response.data;
  },
  deleteRoute: async (id: number) => {
    const response = await api.delete(`/admin/routes/${id}`);
    return response.data;
  },
  getRouteTree: async () => {
    const response = await api.get("/admin/routes/tree");
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAllUsers: async (filters?: UserFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/admin/users?${params.toString()}`);
    return response.data;
  },
  getUserById: async (id: number) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  createUser: async (user: CreateUserData) => {
    const response = await api.post("/admin/users", user);
    return response.data;
  },
  updateUser: async (id: number, user: UpdateUserData) => {
    const response = await api.put(`/admin/users/${id}`, user);
    return response.data;
  },
  deleteUser: async (id: number) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
  toggleUserStatus: async (id: number) => {
    const response = await api.patch(`/admin/users/${id}/toggle-status`);
    return response.data;
  },
  getUserStats: async () => {
    const response = await api.get("/admin/users/stats");
    return response.data;
  },
};

// Projects API - Using Unified API
export const projectsAPI = {
  getAllProjects: async () => {
    const response = await api.post("/krapi/v1/api", {
      operation: "admin",
      resource: "projects",
      action: "list",
      params: {},
    });
    return response.data;
  },
  getProjectById: async (projectId: string) => {
    const response = await api.post("/krapi/v1/api", {
      operation: "admin",
      resource: "projects",
      action: "get",
      params: { projectId },
    });
    return response.data;
  },
  createProject: async (project: {
    name: string;
    description?: string;
    domain?: string;
    settings?: any;
  }) => {
    const response = await api.post("/krapi/v1/api", {
      operation: "admin",
      resource: "projects",
      action: "create",
      params: project,
    });
    return response.data;
  },
  updateProject: async (
    projectId: string,
    updates: {
      name?: string;
      description?: string;
      domain?: string;
      settings?: any;
    }
  ) => {
    const response = await api.post("/krapi/v1/api", {
      operation: "admin",
      resource: "projects",
      action: "update",
      params: { projectId, ...updates },
    });
    return response.data;
  },
  deleteProject: async (projectId: string) => {
    const response = await api.post("/krapi/v1/api", {
      operation: "admin",
      resource: "projects",
      action: "delete",
      params: { projectId },
    });
    return response.data;
  },
  getProjectStats: async (projectId: string) => {
    const response = await api.post("/krapi/v1/api", {
      operation: "admin",
      resource: "projects",
      action: "stats",
      params: { projectId },
    });
    return response.data;
  },
  getApiKeys: async (projectId: string) => {
    const response = await api.post("/krapi/v1/api", {
      operation: "admin",
      resource: "keys",
      action: "list",
      params: { projectId },
    });
    return response.data;
  },
  createApiKey: async (
    projectId: string,
    keyData: {
      name: string;
      permissions: string[];
    }
  ) => {
    const response = await api.post("/krapi/v1/api", {
      operation: "admin",
      resource: "keys",
      action: "create",
      params: { projectId, ...keyData },
    });
    return response.data;
  },
  deleteApiKey: async (projectId: string, keyId: string) => {
    const response = await api.post("/krapi/v1/api", {
      operation: "admin",
      resource: "keys",
      action: "delete",
      params: { projectId, keyId },
    });
    return response.data;
  },
};

// Files API
export const filesAPI = {
  getAllFiles: async (filters?: FileFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/admin/files?${params.toString()}`);
    return response.data;
  },
  getFileById: async (id: number) => {
    const response = await api.get(`/admin/files/${id}`);
    return response.data;
  },
  uploadFile: async (
    file: File,
    description?: string,
    access_level?: string
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    if (description) {
      formData.append("description", description);
    }
    if (access_level) {
      formData.append("access_level", access_level);
    }

    const response = await api.post("/admin/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  updateFile: async (
    id: number,
    data: { filename?: string; description?: string }
  ) => {
    const response = await api.put(`/admin/files/${id}`, data);
    return response.data;
  },
  deleteFile: async (id: number) => {
    const response = await api.delete(`/admin/files/${id}`);
    return response.data;
  },
  downloadFile: async (id: number) => {
    const response = await api.get(`/admin/files/${id}/download`, {
      responseType: "blob",
    });
    return response;
  },
  getPublicFile: async (filename: string) => {
    const response = await api.get(`/files/${filename}`, {
      responseType: "blob",
    });
    return response;
  },
};

// Search API
export const searchAPI = {
  searchAll: async (query: string, filters?: { type?: string }) => {
    const params = new URLSearchParams();
    params.append("q", query);
    if (filters?.type) {
      params.append("type", filters.type);
    }
    const response = await api.get(`/search?${params.toString()}`);
    return response.data;
  },
};

// Database API
export const databaseAPI = {
  getStats: async () => {
    const response = await api.get("/admin/database/stats");
    return response.data;
  },
  getDatabaseInfo: async () => {
    const response = await api.get("/admin/database/info");
    return response.data;
  },
  getTables: async () => {
    const response = await api.get("/admin/content/tables");
    return response.data;
  },
  createTable: async (tableName: string, schema: Record<string, unknown>) => {
    const response = await api.post("/admin/content/tables", {
      tableName,
      schema,
    });
    return response.data;
  },
  getTableData: async (tableName: string) => {
    const response = await api.get(`/admin/database/table/${tableName}`);
    return response.data;
  },
  executeQuery: async (query: string) => {
    const response = await api.post("/admin/database/query", { query });
    return response.data;
  },
  exportDatabase: async () => {
    const response = await api.get("/admin/database/export");
    return response.data;
  },
  resetDatabase: async () => {
    const response = await api.post("/admin/database/reset");
    return response.data;
  },
};

// Health API
export const healthAPI = {
  check: async () => {
    const response = await api.get("/health");
    return response.data;
  },
};

// Email API
export const emailAPI = {
  getConfiguration: async () => {
    const response = await api.get("/admin/email/config");
    return response.data;
  },
  updateConfiguration: async (config: EmailConfig) => {
    const response = await api.put("/admin/email/config", config);
    return response.data;
  },
  testConnection: async () => {
    const response = await api.post("/admin/email/test");
    return response.data;
  },
  sendEmail: async (emailData: SendEmailData) => {
    const response = await api.post("/admin/email/send", emailData);
    return response.data;
  },
  getAllTemplates: async () => {
    const response = await api.get("/admin/email/templates");
    return response.data;
  },
  createTemplate: async (template: CreateEmailTemplateData) => {
    const response = await api.post("/admin/email/templates", template);
    return response.data;
  },
  getTemplateById: async (id: number) => {
    const response = await api.get(`/admin/email/templates/${id}`);
    return response.data;
  },
  updateTemplate: async (id: number, template: UpdateEmailTemplateData) => {
    const response = await api.put(`/admin/email/templates/${id}`, template);
    return response.data;
  },
  deleteTemplate: async (id: number) => {
    const response = await api.delete(`/admin/email/templates/${id}`);
    return response.data;
  },
  getLogs: async (page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    const response = await api.get(`/admin/email/logs?${params.toString()}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get("/admin/email/stats");
    return response.data;
  },
  getPreferences: async () => {
    const response = await api.get("/admin/email/preferences");
    return response.data;
  },
  updatePreferences: async (preferences: any) => {
    const response = await api.put("/admin/email/preferences", preferences);
    return response.data;
  },
};

// API Management API
export const apiManagementAPI = {
  getApiStats: async () => {
    const response = await api.get("/admin/api/stats");
    return response.data;
  },
  getApiKeys: async () => {
    const response = await api.get("/admin/api/keys");
    return response.data;
  },
  createApiKey: async (keyData: CreateApiKeyData) => {
    const response = await api.post("/admin/api/keys", keyData);
    return response.data;
  },
  updateApiKey: async (id: number, keyData: UpdateApiKeyData) => {
    const response = await api.put(`/admin/api/keys/${id}`, keyData);
    return response.data;
  },
  deleteApiKey: async (id: number) => {
    const response = await api.delete(`/admin/api/keys/${id}`);
    return response.data;
  },
  toggleApiKey: async (id: number) => {
    const response = await api.patch(`/admin/api/keys/${id}/toggle`);
    return response.data;
  },
  getEndpoints: async () => {
    const response = await api.get("/admin/api/endpoints");
    return response.data;
  },
  updateEndpoint: async (endpoint: string, data: UpdateApiEndpointData) => {
    const response = await api.put(`/admin/api/endpoints/${endpoint}`, data);
    return response.data;
  },
  getRateLimits: async () => {
    const response = await api.get("/admin/api/rate-limits");
    return response.data;
  },
  updateRateLimit: async (id: number, data: UpdateRateLimitData) => {
    const response = await api.put(`/admin/api/rate-limits/${id}`, data);
    return response.data;
  },
};

// Auth Management API
export const authManagementAPI = {
  getUsers: async (page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    const response = await api.get(`/admin/users?${params.toString()}`);
    return response.data;
  },
  getUserStats: async () => {
    const response = await api.get("/admin/users/stats");
    return response.data;
  },
  getSecuritySettings: async () => {
    const response = await api.get("/admin/auth/security-settings");
    return response.data;
  },
  updateSecuritySettings: async (settings: SecuritySettings) => {
    const response = await api.put("/admin/auth/security-settings", settings);
    return response.data;
  },
  getSessions: async (filters?: { user_id?: number; active?: boolean }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/admin/auth/sessions?${params.toString()}`);
    return response.data;
  },
  terminateSession: async (sessionId: string) => {
    const response = await api.delete(`/admin/auth/sessions/${sessionId}`);
    return response.data;
  },
  getLoginLogs: async () => {
    const response = await api.get("/admin/auth/login-logs");
    return response.data;
  },
  createUser: async (userData: any) => {
    const response = await api.post("/admin/users", userData);
    return response.data;
  },
  updateUser: async (id: number, userData: any) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },
  deleteUser: async (id: number) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
};

// Notifications API
export const notificationAPI = {
  getUserNotifications: async (limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data;
  },
  markNotificationAsRead: async (id: number) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },
  markAllNotificationsAsRead: async () => {
    const response = await api.patch("/notifications/mark-all-read");
    return response.data;
  },
  deleteNotification: async (id: number) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
  getNotificationPreferences: async () => {
    const response = await api.get("/notifications/preferences");
    return response.data;
  },
  updateNotificationPreferences: async (preferences: any) => {
    const response = await api.put("/notifications/preferences", preferences);
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get("/notifications/unread-count");
    return response.data;
  },
};

// Export the base API instance for direct use if needed
export default api;
