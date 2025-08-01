/**
 * KRAPI TypeScript SDK
 *
 * A type-safe client SDK for interacting with the KRAPI backend
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";
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
  Session,
  QueryOptions,
  ProjectUser,
} from "./types";

export * from "./types";

export class KrapiSDK {
  private client: AxiosInstance;
  private sessionToken?: string;
  private apiKey?: string;
  private baseURL: string;

  constructor(config: { 
    baseUrl: string; 
    sessionToken?: string;
    authToken?: string;  // Alternative name for sessionToken
    apiKey?: string;
  }) {
    this.sessionToken = config.sessionToken || config.authToken;
    this.apiKey = config.apiKey;
    this.baseURL = config.baseUrl;
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add authentication
    this.client.interceptors.request.use((config) => {
      if (this.apiKey) {
        config.headers.Authorization = `ApiKey ${this.apiKey}`;
      } else if (this.sessionToken) {
        config.headers.Authorization = `Bearer ${this.sessionToken}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Clear tokens on authentication failure
          this.sessionToken = undefined;
          this.apiKey = undefined;
        }
        return Promise.reject(error);
      }
    );
  }

  // Set authentication tokens
  setSessionToken(token: string) {
    this.sessionToken = token;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  clearAuth() {
    this.sessionToken = undefined;
    this.apiKey = undefined;
  }

  // Auth methods
  auth = {
    // Admin login with username/password
    adminLogin: async (credentials: {
      username: string;
      password: string;
    }): Promise<
      ApiResponse<{
        user: AdminUser & { scopes: string[] };
        token: string;
        session_token: string;
        expires_at: string;
      }>
    > => {
      const response = await this.client.post("/auth/admin/login", credentials);
      if (response.data.data?.session_token) {
        this.setSessionToken(response.data.data.session_token);
      }
      return response.data;
    },

    // Admin login with API key
    adminApiLogin: async (apiKey: string): Promise<
      ApiResponse<{
        user: AdminUser & { scopes: string[] };
        token: string;
        session_token: string;
        expires_at: string;
      }>
    > => {
      const response = await this.client.post("/auth/admin/api-login", { api_key: apiKey });
      if (response.data.data?.session_token) {
        this.setSessionToken(response.data.data.session_token);
      }
      return response.data;
    },

    // Create admin session with API key
    createAdminSession: async (
      apiKey: string
    ): Promise<ApiResponse<{ 
      session_token: string; 
      expires_at: string;
      scopes: string[];
    }>> => {
      const response = await this.client.post("/auth/admin/session", {
        api_key: apiKey,
      });
      if (response.data.data?.session_token) {
        this.setSessionToken(response.data.data.session_token);
      }
      return response.data;
    },

    // Create project session
    createProjectSession: async (
      projectId: string,
      apiKey: string
    ): Promise<ApiResponse<{ 
      session_token: string; 
      expires_at: string;
      scopes: string[];
    }>> => {
      const response = await this.client.post(
        `/auth/project/${projectId}/session`,
        { api_key: apiKey }
      );
      if (response.data.data?.session_token) {
        this.setSessionToken(response.data.data.session_token);
      }
      return response.data;
    },

    // Validate session
    validateSession: async (
      token: string
    ): Promise<ApiResponse<{ valid: boolean; session?: Session }>> => {
      const response = await this.client.post("/auth/session/validate", {
        token,
      });
      return response.data;
    },

    // Get current user
    getCurrentUser: async (): Promise<ApiResponse<AdminUser>> => {
      const response = await this.client.get("/auth/me");
      return response.data;
    },

    // Logout
    logout: async (): Promise<ApiResponse> => {
      const response = await this.client.post("/auth/logout");
      this.clearAuth();
      return response.data;
    },

    // Change password
    changePassword: async (data: {
      current_password: string;
      new_password: string;
    }): Promise<ApiResponse> => {
      const response = await this.client.post("/auth/change-password", data);
      return response.data;
    },

    // Regenerate API key
    regenerateApiKey: async (): Promise<ApiResponse<{
      api_key: string;
      message: string;
    }>> => {
      const response = await this.client.post("/auth/regenerate-api-key");
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
        config.onUploadProgress = (progressEvent: any) => {
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
    getAll: async (
      projectId: string,
      options?: QueryOptions & { active?: boolean }
    ): Promise<PaginatedResponse<ProjectUser>> => {
      const response = await this.client.get(
        `/projects/${projectId}/users`,
        { params: options }
      );
      return response.data;
    },

    // Get a specific user
    get: async (
      projectId: string,
      userId: string
    ): Promise<ApiResponse<ProjectUser>> => {
      const response = await this.client.get(
        `/projects/${projectId}/users/${userId}`
      );
      return response.data;
    },

    // Create user in project
    create: async (
      projectId: string,
      userData: {
        username: string;
        email: string;
        password: string;
        phone?: string;
        scopes?: string[];
        metadata?: Record<string, unknown>;
      }
    ): Promise<ApiResponse<ProjectUser>> => {
      const response = await this.client.post(
        `/projects/${projectId}/users`,
        userData
      );
      return response.data;
    },

    // Update user in project
    update: async (
      projectId: string,
      userId: string,
      updates: Partial<{
        username: string;
        email: string;
        password: string;
        phone: string;
        is_verified: boolean;
        is_active: boolean;
        scopes: string[];
        metadata: Record<string, unknown>;
      }>
    ): Promise<ApiResponse<ProjectUser>> => {
      const response = await this.client.put(
        `/projects/${projectId}/users/${userId}`,
        updates
      );
      return response.data;
    },

    // Delete user from project
    delete: async (
      projectId: string,
      userId: string
    ): Promise<ApiResponse> => {
      const response = await this.client.delete(
        `/projects/${projectId}/users/${userId}`
      );
      return response.data;
    },

    // Update user scopes
    updateScopes: async (
      projectId: string,
      userId: string,
      scopes: string[]
    ): Promise<ApiResponse<ProjectUser>> => {
      const response = await this.client.put(
        `/projects/${projectId}/users/${userId}/scopes`,
        { scopes }
      );
      return response.data;
    },

    // Authenticate project user
    authenticate: async (
      projectId: string,
      credentials: {
        username: string;
        password: string;
      }
    ): Promise<ApiResponse<{
      user: ProjectUser;
      session_token: string;
      expires_at: string;
    }>> => {
      const response = await this.client.post(
        `/projects/${projectId}/users/authenticate`,
        credentials
      );
      return response.data;
    },
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

// Export as both names for backward compatibility
export { KrapiSDK as KrapiClient };
