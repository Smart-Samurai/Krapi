/**
 * KRAPI TypeScript SDK
 * 
 * A type-safe client SDK for interacting with the KRAPI backend
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Re-export types
export * from './types';
import {
  ApiResponse,
  PaginatedResponse,
  AdminUser,
  AdminPermission,
  Project,
  ProjectSettings,
  ProjectStats,
  TableSchema,
  TableField,
  TableIndex,
  Document,
  FileInfo,
  StorageStats,
  ProjectUser,
  QueryOptions
} from './types';

export class KrapiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private authToken?: string;
  private sessionToken?: string;

  constructor(config: {
    baseURL: string;
    apiKey?: string;
    authToken?: string;
  }) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.authToken = config.authToken;

    this.client = axios.create({
      baseURL: `${this.baseURL}/krapi/k1`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      if (this.sessionToken) {
        config.headers['X-Session-Token'] = this.sessionToken;
      }
      return config;
    });

    // Add response interceptor to capture auth token
    this.client.interceptors.response.use((response) => {
      const authToken = response.headers['x-auth-token'];
      if (authToken) {
        this.authToken = authToken;
      }
      return response;
    });
  }

  // Set auth token
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  // Set session token
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  // Auth Methods
  auth = {
    // Admin login
    adminLogin: async (email: string, password: string): Promise<ApiResponse<{
      user: Omit<AdminUser, 'password_hash'>;
      token: string;
      session_token: string;
      expires_at: string;
    }>> => {
      const response = await this.client.post('/auth/admin/login', { email, password });
      if (response.data.success && response.data.data.token) {
        this.authToken = response.data.data.token;
      }
      return response.data;
    },

    // Create admin session
    createAdminSession: async (apiKey: string): Promise<ApiResponse<{
      session_token: string;
      expires_at: string;
    }>> => {
      const response = await this.client.post('/auth/admin/session', { api_key: apiKey });
      if (response.data.success && response.data.data.session_token) {
        this.sessionToken = response.data.data.session_token;
      }
      return response.data;
    },

    // Create project session
    createProjectSession: async (projectId: string, apiKey: string): Promise<ApiResponse<{
      session_token: string;
      expires_at: string;
    }>> => {
      const response = await this.client.post(`/auth/project/${projectId}/session`, { api_key: apiKey });
      if (response.data.success && response.data.data.session_token) {
        this.sessionToken = response.data.data.session_token;
      }
      return response.data;
    },

    // Get current user
    getCurrentUser: async (): Promise<ApiResponse<Omit<AdminUser, 'password_hash'>>> => {
      const response = await this.client.get('/auth/me');
      return response.data;
    },

    // Logout
    logout: async (): Promise<ApiResponse> => {
      const response = await this.client.post('/auth/logout');
      this.authToken = undefined;
      this.sessionToken = undefined;
      return response.data;
    }
  };

  // Admin Methods
  admin = {
    // Get all admin users
    getUsers: async (options?: QueryOptions): Promise<PaginatedResponse<Omit<AdminUser, 'password_hash'>>> => {
      const response = await this.client.get('/admin/users', { params: options });
      return response.data;
    },

    // Get admin user by ID
    getUserById: async (id: string): Promise<ApiResponse<Omit<AdminUser, 'password_hash'>>> => {
      const response = await this.client.get(`/admin/users/${id}`);
      return response.data;
    },

    // Create admin user
    createUser: async (userData: {
      email: string;
      username: string;
      password: string;
      role: string;
      access_level: string;
      permissions?: AdminPermission[];
    }): Promise<ApiResponse<Omit<AdminUser, 'password_hash'>>> => {
      const response = await this.client.post('/admin/users', userData);
      return response.data;
    },

    // Update admin user
    updateUser: async (id: string, updates: Partial<AdminUser>): Promise<ApiResponse<Omit<AdminUser, 'password_hash'>>> => {
      const response = await this.client.put(`/admin/users/${id}`, updates);
      return response.data;
    },

    // Delete admin user
    deleteUser: async (id: string): Promise<ApiResponse> => {
      const response = await this.client.delete(`/admin/users/${id}`);
      return response.data;
    }
  };

  // Project Methods
  projects = {
    // Get all projects
    getAll: async (options?: QueryOptions): Promise<PaginatedResponse<Project>> => {
      const response = await this.client.get('/projects', { params: options });
      return response.data;
    },

    // Get project by ID
    getById: async (id: string): Promise<ApiResponse<Project>> => {
      const response = await this.client.get(`/projects/${id}`);
      return response.data;
    },

    // Create project
    create: async (projectData: {
      name: string;
      description?: string;
      settings?: ProjectSettings;
    }): Promise<ApiResponse<Project>> => {
      const response = await this.client.post('/projects', projectData);
      return response.data;
    },

    // Update project
    update: async (id: string, updates: Partial<Project>): Promise<ApiResponse<Project>> => {
      const response = await this.client.put(`/projects/${id}`, updates);
      return response.data;
    },

    // Delete project
    delete: async (id: string): Promise<ApiResponse> => {
      const response = await this.client.delete(`/projects/${id}`);
      return response.data;
    },

    // Get project stats
    getStats: async (id: string): Promise<ApiResponse<ProjectStats>> => {
      const response = await this.client.get(`/projects/${id}/stats`);
      return response.data;
    },

    // Regenerate API key
    regenerateApiKey: async (id: string): Promise<ApiResponse<{ api_key: string }>> => {
      const response = await this.client.post(`/projects/${id}/regenerate-api-key`);
      return response.data;
    }
  };

  // Database Methods
  database = {
    // Get table schemas
    getSchemas: async (projectId: string): Promise<ApiResponse<TableSchema[]>> => {
      const response = await this.client.get(`/database/${projectId}/schemas`);
      return response.data;
    },

    // Get table schema by name
    getSchema: async (projectId: string, tableName: string): Promise<ApiResponse<TableSchema>> => {
      const response = await this.client.get(`/database/${projectId}/schemas/${tableName}`);
      return response.data;
    },

    // Create table schema
    createSchema: async (projectId: string, schema: {
      name: string;
      description?: string;
      fields: TableField[];
      indexes?: TableIndex[];
    }): Promise<ApiResponse<TableSchema>> => {
      const response = await this.client.post(`/database/${projectId}/schemas`, schema);
      return response.data;
    },

    // Update table schema
    updateSchema: async (projectId: string, tableName: string, updates: Partial<TableSchema>): Promise<ApiResponse<TableSchema>> => {
      const response = await this.client.put(`/database/${projectId}/schemas/${tableName}`, updates);
      return response.data;
    },

    // Delete table schema
    deleteSchema: async (projectId: string, tableName: string): Promise<ApiResponse> => {
      const response = await this.client.delete(`/database/${projectId}/schemas/${tableName}`);
      return response.data;
    },

    // Get documents
    getDocuments: async (projectId: string, tableName: string, options?: QueryOptions): Promise<PaginatedResponse<Document>> => {
      const response = await this.client.get(`/database/${projectId}/${tableName}/documents`, { params: options });
      return response.data;
    },

    // Get document by ID
    getDocument: async (projectId: string, tableName: string, documentId: string): Promise<ApiResponse<Document>> => {
      const response = await this.client.get(`/database/${projectId}/${tableName}/documents/${documentId}`);
      return response.data;
    },

    // Create document
    createDocument: async (projectId: string, tableName: string, data: Record<string, unknown>): Promise<ApiResponse<Document>> => {
      const response = await this.client.post(`/database/${projectId}/${tableName}/documents`, { data });
      return response.data;
    },

    // Update document
    updateDocument: async (projectId: string, tableName: string, documentId: string, data: Record<string, unknown>): Promise<ApiResponse<Document>> => {
      const response = await this.client.put(`/database/${projectId}/${tableName}/documents/${documentId}`, { data });
      return response.data;
    },

    // Delete document
    deleteDocument: async (projectId: string, tableName: string, documentId: string): Promise<ApiResponse> => {
      const response = await this.client.delete(`/database/${projectId}/${tableName}/documents/${documentId}`);
      return response.data;
    }
  };

  // Storage Methods
  storage = {
    // Get files
    getFiles: async (projectId: string): Promise<ApiResponse<FileInfo[]>> => {
      const response = await this.client.get(`/storage/${projectId}/files`);
      return response.data;
    },

    // Get file info
    getFileInfo: async (projectId: string, fileId: string): Promise<ApiResponse<FileInfo>> => {
      const response = await this.client.get(`/storage/${projectId}/files/${fileId}`);
      return response.data;
    },

    // Upload file
    uploadFile: async (projectId: string, file: Blob | Buffer | { buffer: Buffer; originalname: string; mimetype: string }, onProgress?: (progress: number) => void): Promise<ApiResponse<FileInfo>> => {
      // Handle both browser and Node.js environments
      let formData: FormData | Buffer | { buffer: Buffer; originalname: string; mimetype: string };
      if (typeof FormData !== 'undefined') {
        formData = new FormData();
        (formData as FormData).append('file', file as Blob);
      } else {
        // In Node.js, the user should pass a proper form-data instance
        formData = file as Buffer | { buffer: Buffer; originalname: string; mimetype: string };
      }

      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          onProgress(progress);
        };
      }

      const response = await this.client.post(`/storage/${projectId}/files`, formData, config);
      return response.data;
    },

    // Download file
    downloadFile: async (projectId: string, fileId: string): Promise<Blob | Buffer> => {
      const response = await this.client.get(`/storage/${projectId}/files/${fileId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    },

    // Delete file
    deleteFile: async (projectId: string, fileId: string): Promise<ApiResponse> => {
      const response = await this.client.delete(`/storage/${projectId}/files/${fileId}`);
      return response.data;
    },

    // Get storage stats
    getStats: async (projectId: string): Promise<ApiResponse<StorageStats>> => {
      const response = await this.client.get(`/storage/${projectId}/stats`);
      return response.data;
    }
  };

  // Project Users Methods (for project-specific users)
  users = {
    // Get users in a project
    getUsers: async (projectId: string, options?: QueryOptions): Promise<PaginatedResponse<ProjectUser>> => {
      const response = await this.client.get(`/database/${projectId}/users/documents`, { params: options });
      return response.data;
    },

    // Create user in project
    createUser: async (projectId: string, userData: {
      email: string;
      name?: string;
      phone?: string;
      password?: string;
      metadata?: Record<string, unknown>;
    }): Promise<ApiResponse<Document>> => {
      const response = await this.client.post(`/database/${projectId}/users/documents`, { data: userData });
      return response.data;
    },

    // Update user in project
    updateUser: async (projectId: string, userId: string, updates: Record<string, unknown>): Promise<ApiResponse<Document>> => {
      const response = await this.client.put(`/database/${projectId}/users/documents/${userId}`, { data: updates });
      return response.data;
    },

    // Delete user from project
    deleteUser: async (projectId: string, userId: string): Promise<ApiResponse> => {
      const response = await this.client.delete(`/database/${projectId}/users/documents/${userId}`);
      return response.data;
    }
  };
}

// Export a factory function
export function createKrapiClient(config: {
  baseURL: string;
  apiKey?: string;
  authToken?: string;
}): KrapiClient {
  return new KrapiClient(config);
}