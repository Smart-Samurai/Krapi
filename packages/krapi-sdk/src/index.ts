/**
 * KRAPI TypeScript SDK
 *
 * A type-safe client SDK for interacting with the KRAPI backend
 */

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

// Re-export types
export * from "./types";
import {
  ApiResponse,
  PaginatedResponse,
  AdminUser,
  AdminPermission,
  Project,
  ProjectSettings,
  ProjectStats,
  Collection,
  CollectionField,
  CollectionIndex,
  Document,
  FileInfo,
  StorageStats,
  ProjectUser,
  QueryOptions,
} from "./types";

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
    this.baseURL = config.baseURL.replace(/\/$/, ""); // Remove trailing slash
    this.authToken = config.authToken;

    this.client = axios.create({
      baseURL: `${this.baseURL}/krapi/k1`,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      if (this.sessionToken) {
        config.headers["X-Session-Token"] = this.sessionToken;
      }
      return config;
    });

    // Add response interceptor to capture auth token
    this.client.interceptors.response.use((response) => {
      const authToken = response.headers["x-auth-token"];
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
    adminLogin: async (
      email: string,
      password: string
    ): Promise<
      ApiResponse<{
        user: Omit<AdminUser, "password_hash">;
        token: string;
        session_token: string;
        expires_at: string;
      }>
    > => {
      const response = await this.client.post("/auth/admin/login", {
        email,
        password,
      });
      if (response.data.success && response.data.data.token) {
        this.authToken = response.data.data.token;
      }
      return response.data;
    },

    // Create admin session
    createAdminSession: async (
      apiKey: string
    ): Promise<
      ApiResponse<{
        session_token: string;
        expires_at: string;
      }>
    > => {
      const response = await this.client.post("/auth/admin/session", {
        api_key: apiKey,
      });
      if (response.data.success && response.data.data.session_token) {
        this.sessionToken = response.data.data.session_token;
      }
      return response.data;
    },

    // Create project session
    createProjectSession: async (
      projectId: string,
      apiKey: string
    ): Promise<
      ApiResponse<{
        session_token: string;
        expires_at: string;
      }>
    > => {
      const response = await this.client.post(
        `/auth/project/${projectId}/session`,
        { api_key: apiKey }
      );
      if (response.data.success && response.data.data.session_token) {
        this.sessionToken = response.data.data.session_token;
      }
      return response.data;
    },

    // Get current user
    getCurrentUser: async (): Promise<
      ApiResponse<Omit<AdminUser, "password_hash">>
    > => {
      const response = await this.client.get("/auth/me");
      return response.data;
    },

    // Logout
    logout: async (): Promise<ApiResponse> => {
      const response = await this.client.post("/auth/logout");
      this.authToken = undefined;
      this.sessionToken = undefined;
      return response.data;
    },

    // Change password
    changePassword: async (
      currentPassword: string,
      newPassword: string
    ): Promise<ApiResponse> => {
      const response = await this.client.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response.data;
    },
  };

  // Admin Methods
  admin = {
    // Get all admin users
    getUsers: async (
      options?: QueryOptions
    ): Promise<PaginatedResponse<Omit<AdminUser, "password_hash">>> => {
      const response = await this.client.get("/admin/users", {
        params: options,
      });
      return response.data;
    },

    // Get admin user by ID
    getUserById: async (
      id: string
    ): Promise<ApiResponse<Omit<AdminUser, "password_hash">>> => {
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
    }): Promise<ApiResponse<Omit<AdminUser, "password_hash">>> => {
      const response = await this.client.post("/admin/users", userData);
      return response.data;
    },

    // Update admin user
    updateUser: async (
      id: string,
      updates: Partial<AdminUser>
    ): Promise<ApiResponse<Omit<AdminUser, "password_hash">>> => {
      const response = await this.client.put(`/admin/users/${id}`, updates);
      return response.data;
    },

    // Delete admin user
    deleteUser: async (id: string): Promise<ApiResponse> => {
      const response = await this.client.delete(`/admin/users/${id}`);
      return response.data;
    },
  };

  // Project Methods
  projects = {
    // Get all projects
    getAll: async (
      options?: QueryOptions
    ): Promise<PaginatedResponse<Project>> => {
      const response = await this.client.get("/projects", { params: options });
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
      const response = await this.client.post("/projects", projectData);
      return response.data;
    },

    // Update project
    update: async (
      id: string,
      updates: Partial<Project>
    ): Promise<ApiResponse<Project>> => {
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
    regenerateApiKey: async (
      id: string
    ): Promise<ApiResponse<{ api_key: string }>> => {
      const response = await this.client.post(
        `/projects/${id}/regenerate-api-key`
      );
      return response.data;
    },
  };

  // Collections Methods (formerly database)
  collections = {
    // Get all collections in a project
    getAll: async (
      projectId: string
    ): Promise<ApiResponse<Collection[]>> => {
      const response = await this.client.get(`/projects/${projectId}/collections`);
      return response.data;
    },

    // Get collection by name
    get: async (
      projectId: string,
      collectionName: string
    ): Promise<ApiResponse<Collection>> => {
      const response = await this.client.get(
        `/projects/${projectId}/collections/${collectionName}`
      );
      return response.data;
    },

    // Create collection
    create: async (
      projectId: string,
      collection: {
        name: string;
        description?: string;
        fields: CollectionField[];
        indexes?: CollectionIndex[];
      }
    ): Promise<ApiResponse<Collection>> => {
      const response = await this.client.post(
        `/projects/${projectId}/collections`,
        collection
      );
      return response.data;
    },

    // Update collection
    update: async (
      projectId: string,
      collectionName: string,
      updates: Partial<Collection>
    ): Promise<ApiResponse<Collection>> => {
      const response = await this.client.put(
        `/projects/${projectId}/collections/${collectionName}`,
        updates
      );
      return response.data;
    },

    // Delete collection
    delete: async (
      projectId: string,
      collectionName: string
    ): Promise<ApiResponse> => {
      const response = await this.client.delete(
        `/projects/${projectId}/collections/${collectionName}`
      );
      return response.data;
    },
  };

  // Documents Methods
  documents = {
    // Get documents from a collection
    getAll: async (
      projectId: string,
      collectionName: string,
      options?: QueryOptions
    ): Promise<PaginatedResponse<Document>> => {
      const response = await this.client.get(
        `/projects/${projectId}/collections/${collectionName}/documents`,
        { params: options }
      );
      return response.data;
    },

    // Get document by ID
    get: async (
      projectId: string,
      collectionName: string,
      documentId: string
    ): Promise<ApiResponse<Document>> => {
      const response = await this.client.get(
        `/projects/${projectId}/collections/${collectionName}/documents/${documentId}`
      );
      return response.data;
    },

    // Create document
    create: async (
      projectId: string,
      collectionName: string,
      data: Record<string, unknown>
    ): Promise<ApiResponse<Document>> => {
      const response = await this.client.post(
        `/projects/${projectId}/collections/${collectionName}/documents`,
        { data }
      );
      return response.data;
    },

    // Update document
    update: async (
      projectId: string,
      collectionName: string,
      documentId: string,
      data: Record<string, unknown>
    ): Promise<ApiResponse<Document>> => {
      const response = await this.client.put(
        `/projects/${projectId}/collections/${collectionName}/documents/${documentId}`,
        { data }
      );
      return response.data;
    },

    // Delete document
    delete: async (
      projectId: string,
      collectionName: string,
      documentId: string
    ): Promise<ApiResponse> => {
      const response = await this.client.delete(
        `/projects/${projectId}/collections/${collectionName}/documents/${documentId}`
      );
      return response.data;
    },
  };

  // Storage Methods
  storage = {
    // Get files in a project
    getFiles: async (projectId: string): Promise<ApiResponse<FileInfo[]>> => {
      const response = await this.client.get(`/projects/${projectId}/storage/files`);
      return response.data;
    },

    // Get file info
    getFileInfo: async (
      projectId: string,
      fileId: string
    ): Promise<ApiResponse<FileInfo>> => {
      const response = await this.client.get(
        `/projects/${projectId}/storage/files/${fileId}`
      );
      return response.data;
    },

    // Upload file
    uploadFile: async (
      projectId: string,
      file:
        | Blob
        | Buffer
        | { buffer: Buffer; originalname: string; mimetype: string },
      onProgress?: (progress: number) => void
    ): Promise<ApiResponse<FileInfo>> => {
      // Handle both browser and Node.js environments
      let formData:
        | FormData
        | Buffer
        | { buffer: Buffer; originalname: string; mimetype: string };
      if (typeof FormData !== "undefined") {
        formData = new FormData();
        (formData as FormData).append("file", file as Blob);
      } else {
        // In Node.js, the user should pass a proper form-data instance
        formData = file as
          | Buffer
          | { buffer: Buffer; originalname: string; mimetype: string };
      }

      const config: AxiosRequestConfig = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          onProgress(progress);
        };
      }

      const response = await this.client.post(
        `/projects/${projectId}/storage/files`,
        formData,
        config
      );
      return response.data;
    },

    // Download file
    downloadFile: async (
      projectId: string,
      fileId: string
    ): Promise<ApiResponse<Blob | Buffer>> => {
      const response = await this.client.get(
        `/projects/${projectId}/storage/files/${fileId}/download`,
        {
          responseType: "blob",
        }
      );
      return {
        success: true,
        data: response.data,
      };
    },

    // Delete file
    deleteFile: async (
      projectId: string,
      fileId: string
    ): Promise<ApiResponse> => {
      const response = await this.client.delete(
        `/projects/${projectId}/storage/files/${fileId}`
      );
      return response.data;
    },

    // Get storage stats
    getStats: async (projectId: string): Promise<ApiResponse<StorageStats>> => {
      const response = await this.client.get(`/projects/${projectId}/storage/stats`);
      return response.data;
    },

    // Get file URL
    getFileUrl: (projectId: string, fileId: string): string => {
      return `${this.baseURL}/krapi/k1/projects/${projectId}/storage/files/${fileId}/download`;
    },
  };

  // Project Users Methods (for project-specific users)
  users = {
    // Get users in a project
    getUsers: async (
      projectId: string,
      options?: QueryOptions
    ): Promise<PaginatedResponse<ProjectUser>> => {
      const response = await this.client.get(
        `/projects/${projectId}/collections/users/documents`,
        { params: options }
      );
      return response.data;
    },

    // Create user in project
    createUser: async (
      projectId: string,
      userData: {
        email: string;
        name?: string;
        phone?: string;
        password?: string;
        metadata?: Record<string, unknown>;
      }
    ): Promise<ApiResponse<Document>> => {
      const response = await this.client.post(
        `/projects/${projectId}/collections/users/documents`,
        { data: userData }
      );
      return response.data;
    },

    // Update user in project
    updateUser: async (
      projectId: string,
      userId: string,
      updates: Record<string, unknown>
    ): Promise<ApiResponse<Document>> => {
      const response = await this.client.put(
        `/projects/${projectId}/collections/users/documents/${userId}`,
        { data: updates }
      );
      return response.data;
    },

    // Delete user from project
    deleteUser: async (
      projectId: string,
      userId: string
    ): Promise<ApiResponse> => {
      const response = await this.client.delete(
        `/projects/${projectId}/collections/users/documents/${userId}`
      );
      return response.data;
    },
  };

  // Legacy database methods (deprecated - use collections instead)
  database = {
    getSchemas: async (projectId: string) => this.collections.getAll(projectId),
    getSchema: async (projectId: string, tableName: string) => this.collections.get(projectId, tableName),
    createSchema: async (projectId: string, schema: any) => this.collections.create(projectId, schema),
    updateSchema: async (projectId: string, tableName: string, updates: any) => this.collections.update(projectId, tableName, updates),
    deleteSchema: async (projectId: string, tableName: string) => this.collections.delete(projectId, tableName),
    getDocuments: async (projectId: string, tableName: string, options?: QueryOptions) => this.documents.getAll(projectId, tableName, options),
    getDocument: async (projectId: string, tableName: string, documentId: string) => this.documents.get(projectId, tableName, documentId),
    createDocument: async (projectId: string, tableName: string, data: Record<string, unknown>) => this.documents.create(projectId, tableName, data),
    updateDocument: async (projectId: string, tableName: string, documentId: string, data: Record<string, unknown>) => this.documents.update(projectId, tableName, documentId, data),
    deleteDocument: async (projectId: string, tableName: string, documentId: string) => this.documents.delete(projectId, tableName, documentId),
  };

  // Health check
  health = async (): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      version: string;
      timestamp: string;
      database?: {
        status: string;
        checks: Record<string, any>;
        timestamp: string;
      };
    }>
  > => {
    const response = await this.client.get("/health");
    return response.data;
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
