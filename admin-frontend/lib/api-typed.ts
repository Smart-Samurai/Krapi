/**
 * Type-safe API client wrapper
 */

import { api } from './api-client';
import type {
  ApiResponse,
  User,
  CreateUserData,
  UpdateUserData,
  ChangePasswordData,
  ContentItem,
  CreateContentData,
  UpdateContentData,
  Route,
  CreateRouteData,
  UpdateRouteData,
  Schema,
  CreateSchemaData,
  UpdateSchemaData,
  FileItem,
  EmailConfig,
  EmailTemplate,
  CreateEmailTemplateData,
  UpdateEmailTemplateData,
  SendEmailData,
  ApiKey,
  CreateApiKeyData,
  UpdateApiKeyData,
  ApiEndpoint,
  UpdateApiEndpointData,
  RateLimit,
  UpdateRateLimitData,
  ApiAnalytics,
  HealthStatus,
  McpInfo,
  McpTool,
  OllamaModel,
  ChatMessage,
  ChatOptions,
  DatabaseStats,
  BackupInfo,
  SecuritySettings,
  Session
} from '../types/api';
import { safeAsync } from './type-guards';

/**
 * Type-safe API method wrapper
 */
async function apiCall<T>(
  method: () => Promise<{ data: unknown }>,
  validator?: (data: unknown) => data is ApiResponse<T>
): Promise<T> {
  const [response, error] = await safeAsync(method());
  
  if (error) {
    throw new Error(`API call failed: ${error.message}`);
  }
  
  if (!response?.data) {
    throw new Error('No data received from API');
  }
  
  if (validator && !validator(response.data)) {
    throw new Error('Invalid response format from API');
  }
  
  const apiResponse = response.data as ApiResponse<T>;
  
  if (!apiResponse.success) {
    throw new Error(apiResponse.error || 'API request failed');
  }
  
  if (apiResponse.data === undefined) {
    throw new Error('No data in successful response');
  }
  
  return apiResponse.data;
}

/**
 * Authentication API
 */
export const authAPI = {
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    return apiCall(() => api.post('/auth/login', { username, password }));
  },
  
  verify: async (): Promise<User> => {
    return apiCall(() => api.get('/auth/verify'));
  },
  
  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    return apiCall(() => api.post('/auth/change-password', data));
  },
};

/**
 * User Management API
 */
export const usersAPI = {
  getAllUsers: async (filters?: { role?: string; active?: boolean }): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    return apiCall(() => api.get(`/admin/users?${params.toString()}`));
  },
  
  createUser: async (userData: CreateUserData): Promise<User> => {
    return apiCall(() => api.post('/admin/users', userData));
  },
  
  updateUser: async (id: number, userData: UpdateUserData): Promise<User> => {
    return apiCall(() => api.put(`/admin/users/${id}`, userData));
  },
  
  deleteUser: async (id: number): Promise<{ message: string }> => {
    return apiCall(() => api.delete(`/admin/users/${id}`));
  },
  
  toggleUserStatus: async (id: number): Promise<User> => {
    return apiCall(() => api.patch(`/admin/users/${id}/toggle`));
  },
};

/**
 * Content Management API
 */
export const contentAPI = {
  getAllContent: async (filters?: { route_path?: string; content_type?: string }): Promise<ContentItem[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    return apiCall(() => api.get(`/admin/content?${params.toString()}`));
  },
  
  getContentByKey: async (key: string): Promise<ContentItem> => {
    return apiCall(() => api.get(`/admin/content/${key}`));
  },
  
  createContent: async (data: CreateContentData): Promise<ContentItem> => {
    return apiCall(() => api.post('/admin/content', data));
  },
  
  updateContent: async (key: string, data: UpdateContentData): Promise<ContentItem> => {
    return apiCall(() => api.put(`/admin/content/${key}`, data));
  },
  
  deleteContent: async (key: string): Promise<{ message: string }> => {
    return apiCall(() => api.delete(`/admin/content/${key}`));
  },
};

/**
 * Routes API
 */
export const routesAPI = {
  getAllRoutes: async (): Promise<Route[]> => {
    return apiCall(() => api.get('/admin/routes'));
  },
  
  createRoute: async (data: CreateRouteData): Promise<Route> => {
    return apiCall(() => api.post('/admin/routes', data));
  },
  
  updateRoute: async (id: number, data: UpdateRouteData): Promise<Route> => {
    return apiCall(() => api.put(`/admin/routes/${id}`, data));
  },
  
  deleteRoute: async (id: number): Promise<{ message: string }> => {
    return apiCall(() => api.delete(`/admin/routes/${id}`));
  },
};

/**
 * Schema API
 */
export const schemasAPI = {
  getAllSchemas: async (): Promise<Schema[]> => {
    return apiCall(() => api.get('/admin/schemas'));
  },
  
  getSchemaById: async (id: number): Promise<Schema> => {
    return apiCall(() => api.get(`/admin/schemas/${id}`));
  },
  
  createSchema: async (data: CreateSchemaData): Promise<Schema> => {
    return apiCall(() => api.post('/admin/schemas', data));
  },
  
  updateSchema: async (id: number, data: UpdateSchemaData): Promise<Schema> => {
    return apiCall(() => api.put(`/admin/schemas/${id}`, data));
  },
  
  deleteSchema: async (id: number): Promise<{ message: string }> => {
    return apiCall(() => api.delete(`/admin/schemas/${id}`));
  },
  
  validateContent: async (schemaId: number, content: unknown): Promise<{ valid: boolean; errors?: string[] }> => {
    return apiCall(() => api.post(`/admin/schemas/${schemaId}/validate`, { content }));
  },
};

/**
 * Files API
 */
export const filesAPI = {
  getAllFiles: async (filters?: { mime_type?: string; uploaded_by?: number }): Promise<FileItem[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    return apiCall(() => api.get(`/admin/files?${params.toString()}`));
  },
  
  uploadFile: async (file: File): Promise<FileItem> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiCall(() => api.post('/admin/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }));
  },
  
  deleteFile: async (id: number): Promise<{ message: string }> => {
    return apiCall(() => api.delete(`/admin/files/${id}`));
  },
};

/**
 * Email API
 */
export const emailAPI = {
  getConfiguration: async (): Promise<EmailConfig> => {
    return apiCall(() => api.get('/admin/email/config'));
  },
  
  updateConfiguration: async (config: EmailConfig): Promise<EmailConfig> => {
    return apiCall(() => api.put('/admin/email/config', config));
  },
  
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    return apiCall(() => api.post('/admin/email/test'));
  },
  
  sendEmail: async (data: SendEmailData): Promise<{ success: boolean; messageId: string }> => {
    return apiCall(() => api.post('/admin/email/send', data));
  },
  
  getAllTemplates: async (): Promise<EmailTemplate[]> => {
    return apiCall(() => api.get('/admin/email/templates'));
  },
  
  createTemplate: async (template: CreateEmailTemplateData): Promise<EmailTemplate> => {
    return apiCall(() => api.post('/admin/email/templates', template));
  },
  
  updateTemplate: async (id: number, template: UpdateEmailTemplateData): Promise<EmailTemplate> => {
    return apiCall(() => api.put(`/admin/email/templates/${id}`, template));
  },
  
  deleteTemplate: async (id: number): Promise<{ message: string }> => {
    return apiCall(() => api.delete(`/admin/email/templates/${id}`));
  },
};

/**
 * API Management API
 */
export const apiManagementAPI = {
  getApiStats: async (): Promise<ApiAnalytics> => {
    return apiCall(() => api.get('/admin/api/stats'));
  },
  
  getApiKeys: async (): Promise<ApiKey[]> => {
    return apiCall(() => api.get('/admin/api/keys'));
  },
  
  createApiKey: async (data: CreateApiKeyData): Promise<ApiKey> => {
    return apiCall(() => api.post('/admin/api/keys', data));
  },
  
  updateApiKey: async (id: string, data: UpdateApiKeyData): Promise<ApiKey> => {
    return apiCall(() => api.put(`/admin/api/keys/${id}`, data));
  },
  
  deleteApiKey: async (id: string): Promise<{ message: string }> => {
    return apiCall(() => api.delete(`/admin/api/keys/${id}`));
  },
  
  getEndpoints: async (): Promise<ApiEndpoint[]> => {
    return apiCall(() => api.get('/admin/api/endpoints'));
  },
  
  updateEndpoint: async (path: string, data: UpdateApiEndpointData): Promise<ApiEndpoint> => {
    return apiCall(() => api.put(`/admin/api/endpoints/${encodeURIComponent(path)}`, data));
  },
  
  getRateLimits: async (): Promise<RateLimit[]> => {
    return apiCall(() => api.get('/admin/api/rate-limits'));
  },
  
  updateRateLimit: async (id: string, data: UpdateRateLimitData): Promise<RateLimit> => {
    return apiCall(() => api.put(`/admin/api/rate-limits/${id}`, data));
  },
};

/**
 * Health Check API
 */
export const healthAPI = {
  check: async (): Promise<HealthStatus> => {
    return apiCall(() => api.get('/health'));
  },
};

/**
 * Database API
 */
export const databaseAPI = {
  getStats: async (): Promise<DatabaseStats> => {
    return apiCall(() => api.get('/admin/database/stats'));
  },
  
  backup: async (): Promise<BackupInfo> => {
    return apiCall(() => api.post('/admin/database/backup'));
  },
  
  restore: async (backupFile: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('backup', backupFile);
    return apiCall(() => api.post('/admin/database/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }));
  },
  
  reset: async (): Promise<{ message: string }> => {
    return apiCall(() => api.post('/admin/database/reset'));
  },
};

/**
 * MCP API
 */
export const mcpAPI = {
  getInfo: async (): Promise<McpInfo> => {
    return apiCall(() => api.get('/mcp/info'));
  },
  
  listTools: async (): Promise<McpTool[]> => {
    return apiCall(() => api.get('/mcp/tools'));
  },
  
  callTool: async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    return apiCall(() => api.post('/mcp/tools/call', { name, arguments: args }));
  },
};

/**
 * Ollama API
 */
export const ollamaAPI = {
  listModels: async (): Promise<OllamaModel> => {
    return apiCall(() => api.get('/ollama/models'));
  },
  
  pullModel: async (model: string): Promise<{ success: boolean; message: string }> => {
    return apiCall(() => api.post('/ollama/models/pull', { model }));
  },
  
  chat: async (messages: ChatMessage[], options?: ChatOptions): Promise<{ message: ChatMessage }> => {
    return apiCall(() => api.post('/ollama/chat', { messages, ...options }));
  },
};

/**
 * Session Management API
 */
export const sessionAPI = {
  getSessions: async (filters?: { user_id?: number; active?: boolean }): Promise<Session[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    return apiCall(() => api.get(`/admin/auth/sessions?${params.toString()}`));
  },
  
  revokeSession: async (sessionId: string): Promise<{ message: string }> => {
    return apiCall(() => api.delete(`/admin/auth/sessions/${sessionId}`));
  },
  
  revokeAllSessions: async (userId: number): Promise<{ message: string }> => {
    return apiCall(() => api.post(`/admin/auth/sessions/revoke-all`, { userId }));
  },
};

/**
 * Security Settings API
 */
export const securityAPI = {
  getSettings: async (): Promise<SecuritySettings> => {
    return apiCall(() => api.get('/admin/auth/security-settings'));
  },
  
  updateSettings: async (settings: Partial<SecuritySettings>): Promise<SecuritySettings> => {
    return apiCall(() => api.put('/admin/auth/security-settings', settings));
  },
};