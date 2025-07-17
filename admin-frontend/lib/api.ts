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

// Use explicit URL to the API server
const API_BASE_URL = "http://localhost:3001/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
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
    console.error("API Error:", error.message);
    if (error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK") {
      console.error(
        "Cannot connect to API server. Make sure the application is properly configured and running."
      );
    }
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }
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
  getContentById: async (id: number) => {
    const response = await api.get(`/admin/content/get/${id}`);
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
    const response = await api.post("/admin/content/create", {
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
    id: number,
    data: {
      key?: string;
      data?: unknown;
      content_type?: string;
      description?: string;
      schema?: ContentSchema;
    }
  ) => {
    const response = await api.put(`/admin/content/modify/id/${id}`, {
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
  deleteContent: async (id: number) => {
    const response = await api.delete(`/admin/content/delete/id/${id}`);
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
    schema: Record<string, unknown>;
    version?: string;
  }) => {
    const response = await api.post("/admin/schemas", schema);
    return response.data;
  },
  updateSchema: async (
    id: number,
    updates: {
      name?: string;
      description?: string;
      schema?: Record<string, unknown>;
      version?: string;
    }
  ) => {
    const response = await api.put(`/admin/schemas/${id}`, updates);
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
  createRoute: async (data: {
    path: string;
    name: string;
    description?: string;
    schema?: ContentSchema;
    access_level?: "public" | "protected" | "private";
    parent_id?: number;
  }) => {
    const response = await api.post("/admin/routes", data);
    return response.data;
  },
  updateRoute: async (
    path: string,
    data: {
      path?: string;
      name?: string;
      description?: string;
      schema?: ContentSchema;
      access_level?: "public" | "protected" | "private";
      parent_id?: number;
    }
  ) => {
    const response = await api.put(
      `/admin/routes/${encodeURIComponent(path)}`,
      data
    );
    return response.data;
  },
  deleteRoute: async (path: string) => {
    const response = await api.delete(
      `/admin/routes/${encodeURIComponent(path)}`
    );
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
  createUser: async (data: CreateUserData) => {
    const response = await api.post("/admin/users", data);
    return response.data;
  },
  updateUser: async (id: number, data: UpdateUserData) => {
    const response = await api.put(`/admin/users/${id}`, data);
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
    access_level?: "public" | "protected" | "private",
    description?: string
  ) => {
    console.log("API uploadFile called with:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      accessLevel: access_level,
      description: description,
    });

    const formData = new FormData();
    formData.append("file", file);
    if (access_level) formData.append("access_level", access_level);
    if (description) formData.append("description", description);

    console.log("FormData entries:");
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
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
    data: {
      access_level?: "public" | "protected" | "private";
      description?: string;
    }
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
  // Public routes
  getPublicFile: async (filename: string) => {
    const response = await api.get(`/files/${filename}`, {
      responseType: "blob",
    });
    return response;
  },
};

// Email API
export const emailAPI = {
  // Email configuration
  getConfiguration: async () => {
    const response = await api.get("/admin/email/config");
    return response.data;
  },
  updateConfiguration: async (config: {
    smtp_host: string;
    smtp_port: number;
    smtp_secure: boolean;
    smtp_user: string;
    smtp_pass: string;
    smtp_from: string;
    smtp_reply_to?: string;
  }) => {
    const response = await api.put("/admin/email/config", config);
    return response.data;
  },
  testConnection: async () => {
    const response = await api.post("/admin/email/test");
    return response.data;
  },

  // Send email
  sendEmail: async (data: {
    template_name?: string;
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    html?: string;
    text?: string;
    variables?: Record<string, unknown>;
    from?: string;
    reply_to?: string;
  }) => {
    const response = await api.post("/admin/email/send", data);
    return response.data;
  },

  // Email templates
  getAllTemplates: async () => {
    const response = await api.get("/admin/email/templates");
    return response.data;
  },
  getTemplateById: async (id: number) => {
    const response = await api.get(`/admin/email/templates/${id}`);
    return response.data;
  },
  createTemplate: async (template: {
    name: string;
    subject: string;
    template_html: string;
    template_text?: string;
    variables?: string[];
    description?: string;
    active?: boolean;
  }) => {
    const response = await api.post("/admin/email/templates", template);
    return response.data;
  },
  updateTemplate: async (
    id: number,
    updates: {
      name?: string;
      subject?: string;
      template_html?: string;
      template_text?: string;
      variables?: string[];
      description?: string;
      active?: boolean;
    }
  ) => {
    const response = await api.put(`/admin/email/templates/${id}`, updates);
    return response.data;
  },
  deleteTemplate: async (id: number) => {
    const response = await api.delete(`/admin/email/templates/${id}`);
    return response.data;
  },

  // Email logs and analytics
  getLogs: async (page = 1, limit = 50, status?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) {
      params.append("status", status);
    }
    const response = await api.get(`/admin/email/logs?${params.toString()}`);
    return response.data;
  },
  getStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const response = await api.get(`/admin/email/stats?${params.toString()}`);
    return response.data;
  },

  // Notification preferences
  getPreferences: async () => {
    const response = await api.get("/admin/email/preferences");
    return response.data;
  },
  updatePreferences: async (preferences: {
    email_notifications?: boolean;
    content_updates?: boolean;
    user_management?: boolean;
    system_alerts?: boolean;
    marketing_emails?: boolean;
  }) => {
    const response = await api.put("/admin/email/preferences", preferences);
    return response.data;
  },
};

// Notification API
export const notificationAPI = {
  getUserNotifications: async (limit = 10) => {
    const response = await api.get(`/notifications?limit=${limit}`);
    return response.data;
  },
  markNotificationAsRead: async (notificationId: number) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllNotificationsAsRead: async () => {
    const response = await api.patch("/notifications/mark-all-read");
    return response.data;
  },
  deleteNotification: async (notificationId: number) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get("/notifications/unread-count");
    return response.data;
  },
};

// Search API
export const searchAPI = {
  search: async (query: string) => {
    const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await api.get("/health");
    return response.data;
  },
};

// Database API (extend existing functionality)
export const databaseAPI = {
  getTables: async () => {
    const response = await api.get("/admin/content/tables");
    return response.data;
  },
  createTable: async (data: {
    name: string;
    schema: Record<string, unknown>;
    collection_name?: string;
  }) => {
    const response = await api.post("/admin/content/tables", data);
    return response.data;
  },
  getDocuments: async (tableId: string, page = 1, limit = 50) => {
    const response = await api.get(
      `/admin/content/get?route_id=${tableId}&page=${page}&limit=${limit}`
    );
    return response.data;
  },
  createDocument: async (tableId: string, data: Record<string, unknown>) => {
    const response = await api.post("/admin/content/create", {
      ...data,
      route_id: tableId,
    });
    return response.data;
  },
  updateDocument: async (id: number, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/content/modify/id/${id}`, data);
    return response.data;
  },
  deleteDocument: async (id: number) => {
    const response = await api.delete(`/admin/content/delete/id/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get("/admin/database/stats");
    return response.data;
  },
  getDatabaseInfo: async () => {
    const response = await api.get("/admin/database/info");
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
    const response = await api.get("/admin/database/export", {
      responseType: "blob",
    });
    return response;
  },
  resetDatabase: async () => {
    const response = await api.post("/admin/database/reset");
    return response.data;
  },
};

// Auth Management API (for managing authentication settings)
export const authManagementAPI = {
  getUsers: async (page = 1, limit = 50, search?: string, role?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append("search", search);
    if (role) params.append("role", role);
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
  updateSecuritySettings: async (settings: Record<string, unknown>) => {
    const response = await api.put("/admin/auth/security-settings", settings);
    return response.data;
  },
  getLoginLogs: async (page = 1, limit = 50) => {
    const response = await api.get(
      `/admin/auth/login-logs?page=${page}&limit=${limit}`
    );
    return response.data;
  },
  getActiveSessions: async () => {
    const response = await api.get("/admin/auth/sessions");
    return response.data;
  },
  terminateSession: async (sessionId: string) => {
    const response = await api.delete(`/admin/auth/sessions/${sessionId}`);
    return response.data;
  },
  createUser: async (data: Record<string, unknown>) => {
    const response = await api.post("/admin/users", data);
    return response.data;
  },
  updateUser: async (id: number, data: Record<string, unknown>) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },
  deleteUser: async (id: number) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
  getSessions: async (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const response = await api.get(
      `/admin/auth/sessions?${queryParams.toString()}`
    );
    return response.data;
  },
};

// API Management API
export const apiManagementAPI = {
  getApiKeys: async () => {
    const response = await api.get("/admin/api/keys");
    return response.data;
  },
  createApiKey: async (data: {
    name: string;
    permissions: string[];
    expires_at?: string;
    rate_limit?: number;
  }) => {
    const response = await api.post("/admin/api/keys", data);
    return response.data;
  },
  updateApiKey: async (
    id: string,
    data: {
      name?: string;
      permissions?: string[];
      expires_at?: string;
      rate_limit?: number;
      active?: boolean;
    }
  ) => {
    const response = await api.put(`/admin/api/keys/${id}`, data);
    return response.data;
  },
  deleteApiKey: async (id: string) => {
    const response = await api.delete(`/admin/api/keys/${id}`);
    return response.data;
  },
  getEndpoints: async () => {
    const response = await api.get("/admin/api/endpoints");
    return response.data;
  },
  updateEndpoint: async (
    path: string,
    data: {
      rate_limit?: number;
      auth_required?: boolean;
      permissions?: string[];
      enabled?: boolean;
    }
  ) => {
    const response = await api.put(`/admin/api/endpoints${path}`, data);
    return response.data;
  },
  getApiStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const response = await api.get(`/admin/api/stats?${params.toString()}`);
    return response.data;
  },
  getRateLimits: async () => {
    const response = await api.get("/admin/api/rate-limits");
    return response.data;
  },
  updateRateLimit: async (
    id: string,
    data: {
      requests_per_minute?: number;
      requests_per_hour?: number;
      requests_per_day?: number;
    }
  ) => {
    const response = await api.put(`/admin/api/rate-limits/${id}`, data);
    return response.data;
  },
};

export default api;
