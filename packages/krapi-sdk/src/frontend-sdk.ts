/**
 * KRAPI Frontend SDK
 *
 * Frontend SDK for interacting with the KRAPI backend API.
 * Supports both session-based and API key authentication.
 *
 * @example
 * ```typescript
 * // Initialize with session token
 * const sdk = new FrontendSDK({
 *   baseUrl: 'http://localhost:3470',
 *   sessionToken: 'your-session-token'
 * });
 *
 * // Initialize with API key
 * const sdk = new FrontendSDK({
 *   baseUrl: 'http://localhost:3470',
 *   apiKey: 'your-api-key'
 * });
 * ```
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
  ApiKey,
  EmailConfig,
  EmailTemplate,
  EmailSendRequest,
  ChangelogEntry,
  CreateChangelogEntry,
  ActivityLog,
  SchemaValidationResult,
  SystemSettings,
  SystemInfo,
  DatabaseHealth,
} from "./types";

export class FrontendSDK {
  private client: AxiosInstance;
  private sessionToken: string | undefined;
  private apiKey: string | undefined;
  private _baseURL: string;

  /**
   * Creates a new instance of the KRAPI Frontend SDK
   *
   * @param config - SDK configuration object
   * @param config.baseUrl - The base URL of the KRAPI backend (e.g., 'http://localhost:3470')
   * @param config.sessionToken - Optional session token for authentication
   * @param config.authToken - Alternative name for sessionToken (for backward compatibility)
   * @param config.apiKey - Optional API key for authentication
   *
   * @throws Will throw an error if the baseUrl is not provided
   */
  constructor(config: {
    baseUrl: string;
    sessionToken?: string;
    authToken?: string; // Alternative name for sessionToken
    apiKey?: string;
  }) {
    if (!config.baseUrl) {
      throw new Error("baseUrl is required for SDK initialization");
    }

    this.sessionToken = config.sessionToken || config.authToken || undefined;
    this.apiKey = config.apiKey || undefined;
    this._baseURL = config.baseUrl;

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
      (error: AxiosError<ApiResponse>) => {
        // Enhanced error handling with detailed information
        if (error.response) {
          // Server responded with error status
          const { status, data } = error.response;

          if (status === 401) {
            // Clear tokens on authentication failure
            this.sessionToken = undefined;
            this.apiKey = undefined;
          }

          // Enhance error with API response details
          const enhancedError = {
            ...error,
            message: data?.error || data?.message || error.message,
            status,
            isApiError: true,
            originalError: error,
          };

          return Promise.reject(enhancedError);
        } else if (error.request) {
          // Request made but no response received
          const networkError = {
            ...error,
            message: "Network error: No response from server",
            isNetworkError: true,
            originalError: error,
          };
          return Promise.reject(networkError);
        } else {
          // Error in request configuration
          const configError = {
            ...error,
            message: error.message || "Request configuration error",
            isConfigError: true,
            originalError: error,
          };
          return Promise.reject(configError);
        }
      }
    );
  }

  // Set authentication tokens
  setSessionToken(token: string) {
    this.sessionToken = token;
    // Clear API key when setting session token
    this.apiKey = undefined;
  }

  setApiKey(key: string) {
    this.apiKey = key;
    // Clear session token when setting API key
    this.sessionToken = undefined;
  }

  clearAuth() {
    this.sessionToken = undefined;
    this.apiKey = undefined;
  }

  // Get base URL
  get baseURL(): string {
    return this._baseURL;
  }

  // Auth methods
  /**
   * Authentication methods for admin and project-level access
   */
  auth = {
    /**
     * Admin login with username and password
     *
     * @param credentials - Admin login credentials
     * @param credentials.username - Admin username
     * @param credentials.password - Admin password
     * @returns Promise with user data, token, and session information
     *
     * @example
     * ```typescript
     * const result = await sdk.auth.adminLogin({
     *   username: 'admin',
     *   password: 'password123'
     * });
     * ```
     */
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

    /**
     * Admin login using API key
     *
     * @param apiKey - Admin API key for authentication
     * @returns Promise with user data, token, and session information
     *
     * @example
     * ```typescript
     * const result = await sdk.auth.adminApiLogin('your-admin-api-key');
     * ```
     */
    adminApiLogin: async (
      apiKey: string
    ): Promise<
      ApiResponse<{
        user: AdminUser & { scopes: string[] };
        token: string;
        session_token: string;
        expires_at: string;
      }>
    > => {
      const response = await this.client.post("/auth/admin/api-login", {
        api_key: apiKey,
      });
      if (response.data.data?.session_token) {
        this.setSessionToken(response.data.data.session_token);
      }
      return response.data;
    },

    // Create admin session with API key
    createAdminSession: async (
      apiKey: string
    ): Promise<
      ApiResponse<{
        session_token: string;
        expires_at: string;
        scopes: string[];
      }>
    > => {
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
    ): Promise<
      ApiResponse<{
        session_token: string;
        expires_at: string;
        scopes: string[];
      }>
    > => {
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
    regenerateApiKey: async (): Promise<
      ApiResponse<{
        api_key: string;
        message: string;
      }>
    > => {
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

    // Create master API key
    createMasterApiKey: async (data: {
      name: string;
      scopes: string[];
    }): Promise<ApiResponse<ApiKey>> => {
      const response = await this.client.post("/admin/master-api-keys", data);
      return response.data;
    },

    // Get system statistics
    getSystemStats: async (): Promise<
      ApiResponse<{
        projects: { total: number; active: number };
        users: { total: number; active: number };
        sessions: { active: number };
        storage: { used_bytes: number; used_mb: number; used_gb: number };
        database: { collections: number; documents: number };
      }>
    > => {
      const response = await this.client.get("/admin/system-stats");
      return response.data;
    },

    // Get system activity logs
    getActivityLogs: async (options?: {
      limit?: number;
      offset?: number;
      entity_type?: string;
      action?: string;
      user_id?: string;
    }): Promise<ApiResponse<ActivityLog[]>> => {
      const response = await this.client.get("/admin/activity-logs", {
        params: options,
      });
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
      settings?: ProjectSettings & {
        created_by?: string;
        project_url?: string;
      };
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
    getAll: async (projectId: string): Promise<ApiResponse<Collection[]>> => {
      const response = await this.client.get(
        `/projects/${projectId}/collections`
      );
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

    // Get collection schema
    getSchema: async (
      projectId: string,
      collectionName: string
    ): Promise<ApiResponse<Collection>> => {
      const response = await this.client.get(
        `/projects/${projectId}/collections/${collectionName}/schema`
      );
      return response.data;
    },

    // Validate collection schema
    validateSchema: async (
      projectId: string,
      collectionName: string
    ): Promise<
      ApiResponse<{
        isValid: boolean;
        issues: Array<{
          type: string;
          severity: string;
          field?: string;
          description: string;
          auto_fixable: boolean;
        }>;
        warnings: string[];
        recommendations: string[];
      }>
    > => {
      const response = await this.client.post(
        `/projects/${projectId}/collections/${collectionName}/validate-schema`
      );
      return response.data;
    },

    // Auto-fix collection schema issues
    autoFixSchema: async (
      projectId: string,
      collectionName: string
    ): Promise<
      ApiResponse<{
        success: boolean;
        fixesApplied: number;
        details: string[];
      }>
    > => {
      const response = await this.client.post(
        `/projects/${projectId}/collections/${collectionName}/auto-fix-schema`
      );
      return response.data;
    },

    // Get collection type definitions
    getTypeDefinitions: async (
      projectId: string
    ): Promise<
      ApiResponse<
        Array<{
          id: string;
          name: string;
          version: string;
          fields: Array<{
            name: string;
            type: string;
            required: boolean;
            unique: boolean;
            indexed: boolean;
            postgresql_type: string;
            typescript_type: string;
          }>;
          indexes: Array<{
            name: string;
            fields: string[];
            unique: boolean;
            type: string;
          }>;
          constraints: Array<{
            name: string;
            type: string;
            fields: string[];
          }>;
          created_at: string;
          updated_at: string;
        }>
      >
    > => {
      const response = await this.client.get(
        `/projects/${projectId}/collections/types`
      );
      return response.data;
    },

    // Create collection type definition
    createTypeDefinition: async (
      projectId: string,
      typeDefinition: {
        name: string;
        version: string;
        fields: Array<{
          name: string;
          type: string;
          required: boolean;
          unique: boolean;
          indexed: boolean;
          postgresql_type: string;
          typescript_type: string;
        }>;
        indexes?: Array<{
          name: string;
          fields: string[];
          unique: boolean;
          type: string;
        }>;
        constraints?: Array<{
          name: string;
          type: string;
          fields: string[];
        }>;
      }
    ): Promise<
      ApiResponse<{
        id: string;
        name: string;
        version: string;
        created_at: string;
      }>
    > => {
      const response = await this.client.post(
        `/projects/${projectId}/collections/types`,
        typeDefinition
      );
      return response.data;
    },

    // Update collection type definition
    updateTypeDefinition: async (
      projectId: string,
      typeId: string,
      updates: Partial<{
        name: string;
        version: string;
        fields: Array<{
          name: string;
          type: string;
          required: boolean;
          unique: boolean;
          indexed: boolean;
          postgresql_type: string;
          typescript_type: string;
        }>;
        indexes: Array<{
          name: string;
          fields: string[];
          unique: boolean;
          type: string;
        }>;
        constraints: Array<{
          name: string;
          type: string;
          fields: string[];
        }>;
      }>
    ): Promise<
      ApiResponse<{
        id: string;
        name: string;
        version: string;
        updated_at: string;
      }>
    > => {
      const response = await this.client.put(
        `/projects/${projectId}/collections/types/${typeId}`,
        updates
      );
      return response.data;
    },

    // Delete collection type definition
    deleteTypeDefinition: async (
      projectId: string,
      typeId: string
    ): Promise<ApiResponse> => {
      const response = await this.client.delete(
        `/projects/${projectId}/collections/types/${typeId}`
      );
      return response.data;
    },

    // Validate collection type definition
    validateTypeDefinition: async (
      projectId: string,
      typeId: string
    ): Promise<
      ApiResponse<{
        isValid: boolean;
        issues: Array<{
          type: string;
          severity: string;
          field?: string;
          description: string;
          auto_fixable: boolean;
        }>;
        warnings: string[];
        recommendations: string[];
      }>
    > => {
      const response = await this.client.post(
        `/projects/${projectId}/collections/types/${typeId}/validate`
      );
      return response.data;
    },

    // Auto-fix collection type definition issues
    autoFixTypeDefinition: async (
      projectId: string,
      typeId: string
    ): Promise<
      ApiResponse<{
        success: boolean;
        fixesApplied: number;
        details: string[];
      }>
    > => {
      const response = await this.client.post(
        `/projects/${projectId}/collections/types/${typeId}/auto-fix`
      );
      return response.data;
    },

    // Generate TypeScript interfaces from collection type
    generateTypeScriptInterface: async (
      projectId: string,
      typeId: string
    ): Promise<
      ApiResponse<{
        interfaceCode: string;
        fileName: string;
      }>
    > => {
      const response = await this.client.get(
        `/projects/${projectId}/collections/types/${typeId}/typescript-interface`
      );
      return response.data;
    },

    // Generate all TypeScript interfaces for project
    generateAllTypeScriptInterfaces: async (
      projectId: string
    ): Promise<
      ApiResponse<{
        interfacesCode: string;
        fileName: string;
      }>
    > => {
      const response = await this.client.get(
        `/projects/${projectId}/collections/types/typescript-interfaces`
      );
      return response.data;
    },

    // NEW: Advanced schema management
    // Get collection health status
    getHealth: async (
      projectId: string,
      collectionName: string
    ): Promise<
      ApiResponse<{
        status: "healthy" | "degraded" | "unhealthy";
        schemaValid: boolean;
        dataIntegrity: {
          hasNullViolations: boolean;
          hasUniqueViolations: boolean;
          hasForeignKeyViolations: boolean;
          issues: string[];
        };
        tableStats: {
          rowCount: number;
          sizeBytes: number;
          indexSizeBytes: number;
        };
        lastValidated: string;
      }>
    > => {
      const response = await this.client.get(
        `/projects/${projectId}/collections/${collectionName}/health`
      );
      return response.data;
    },

    // Get all collections with health status
    getAllWithHealth: async (
      projectId: string
    ): Promise<
      ApiResponse<
        Array<
          Collection & {
            health: {
              status: "healthy" | "degraded" | "unhealthy";
              issues: number;
            };
          }
        >
      >
    > => {
      const response = await this.client.get(
        `/projects/${projectId}/collections/health`
      );
      return response.data;
    },

    // Create collection from template
    createFromTemplate: async (
      projectId: string,
      templateName: string,
      customizations?: {
        name?: string;
        description?: string;
        additionalFields?: Array<{
          name: string;
          type: string;
          required?: boolean;
          unique?: boolean;
          indexed?: boolean;
          description?: string;
        }>;
      }
    ): Promise<ApiResponse<Collection>> => {
      const response = await this.client.post(
        `/projects/${projectId}/collections/templates/${templateName}`,
        customizations
      );
      return response.data;
    },

    // Update collection schema
    updateSchema: async (
      projectId: string,
      collectionName: string,
      updates: {
        addFields?: Array<{
          name: string;
          type: string;
          required?: boolean;
          unique?: boolean;
          indexed?: boolean;
          default?: unknown;
          description?: string;
        }>;
        removeFields?: string[];
        modifyFields?: Array<{
          name: string;
          type?: string;
          required?: boolean;
          unique?: boolean;
          indexed?: boolean;
          default?: unknown;
          description?: string;
        }>;
        addIndexes?: Array<{
          name: string;
          fields: string[];
          unique?: boolean;
        }>;
        removeIndexes?: string[];
      }
    ): Promise<ApiResponse<Collection>> => {
      const response = await this.client.patch(
        `/projects/${projectId}/collections/${collectionName}/schema`,
        updates
      );
      return response.data;
    },
  };

  // NEW: Schema Generation and Management
  schema = {
    /**
     * Generate database schema from TypeScript interfaces
     * @param interfaces Object containing interface definitions
     * @returns Generated database schema
     */
    generateFromInterfaces: async (
      interfaces: Record<string, unknown>
    ): Promise<
      ApiResponse<{
        schema: {
          tables: Record<
            string,
            {
              fields: Record<
                string,
                {
                  type: string;
                  nullable: boolean;
                  primary?: boolean;
                  unique?: boolean;
                  default?: string;
                  length?: number;
                  precision?: number;
                  scale?: number;
                }
              >;
              indexes: Array<{
                name: string;
                fields: string[];
                unique: boolean;
                type: string;
              }>;
              constraints: Array<{
                name: string;
                type: string;
                fields: string[];
              }>;
            }
          >;
          version: string;
          checksum: string;
        };
        sql: string;
        typescript: string;
      }>
    > => {
      const response = await this.client.post("/admin/schema/generate", {
        interfaces,
      });
      return response.data;
    },

    /**
     * Load interfaces from a module file
     * @param modulePath Path to the module file
     * @returns Loaded interfaces
     */
    loadInterfacesFromModule: async (
      modulePath: string
    ): Promise<
      ApiResponse<{
        interfaces: Record<string, unknown>;
        modulePath: string;
        loadedAt: string;
      }>
    > => {
      const response = await this.client.post("/admin/schema/load-interfaces", {
        modulePath,
      });
      return response.data;
    },

    /**
     * Generate schema from a specific interface
     * @param interfaceName Name of the interface
     * @param interfaceDef Interface definition
     * @returns Generated table definition
     */
    generateFromInterface: async (
      interfaceName: string,
      interfaceDef: unknown
    ): Promise<
      ApiResponse<{
        tableName: string;
        fields: Record<
          string,
          {
            type: string;
            nullable: boolean;
            primary?: boolean;
            unique?: boolean;
            default?: string;
            length?: number;
            precision?: number;
            scale?: number;
          }
        >;
        indexes: Array<{
          name: string;
          fields: string[];
          unique: boolean;
          type: string;
        }>;
        constraints: Array<{
          name: string;
          type: string;
          fields: string[];
        }>;
      }>
    > => {
      const response = await this.client.post(
        "/admin/schema/generate-interface",
        {
          interfaceName,
          interfaceDef,
        }
      );
      return response.data;
    },

    /**
     * Get schema generation options
     * @returns Current schema generation options
     */
    getOptions: async (): Promise<
      ApiResponse<{
        defaultStringLength: number;
        defaultDecimalPrecision: number;
        defaultDecimalScale: number;
        generateIndexes: boolean;
        generateConstraints: boolean;
        generateRelations: boolean;
      }>
    > => {
      const response = await this.client.get("/admin/schema/options");
      return response.data;
    },

    /**
     * Update schema generation options
     * @param options New schema generation options
     * @returns Updated options
     */
    updateOptions: async (options: {
      defaultStringLength?: number;
      defaultDecimalPrecision?: number;
      defaultDecimalScale?: number;
      generateIndexes?: boolean;
      generateConstraints?: boolean;
      generateRelations?: boolean;
    }): Promise<
      ApiResponse<{
        defaultStringLength: number;
        defaultDecimalPrecision: number;
        defaultDecimalScale: number;
        generateIndexes: boolean;
        generateConstraints: boolean;
        generateRelations: boolean;
      }>
    > => {
      const response = await this.client.put("/admin/schema/options", options);
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

    // Get documents by collection ID (for internal use)
    getByTable: async (
      collectionId: string,
      options?: QueryOptions
    ): Promise<PaginatedResponse<Document>> => {
      const response = await this.client.get(
        `/collections/${collectionId}/documents`,
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
      const response = await this.client.get(
        `/projects/${projectId}/storage/files`
      );
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
        config.onUploadProgress = (progressEvent: {
          loaded: number;
          total?: number;
        }) => {
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
      const response = await this.client.get(
        `/projects/${projectId}/storage/stats`
      );
      return response.data;
    },

    // Get file URL
    getFileUrl: (projectId: string, fileId: string): string => {
      return `${this._baseURL}/projects/${projectId}/storage/files/${fileId}/download`;
    },
  };

  // Project Users Methods (for project-specific users)
  users = {
    // Get users in a project
    getAll: async (
      projectId: string,
      options?: QueryOptions & { active?: boolean }
    ): Promise<PaginatedResponse<ProjectUser>> => {
      const response = await this.client.get(`/projects/${projectId}/users`, {
        params: options,
      });
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
        first_name?: string;
        last_name?: string;
        phone?: string;
        access_scopes?: string[];
        custom_fields?: Record<string, unknown>;
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
        first_name: string;
        last_name: string;
        phone: string;
        is_verified: boolean;
        is_active: boolean;
        access_scopes: string[];
        custom_fields: Record<string, unknown>;
      }>
    ): Promise<ApiResponse<ProjectUser>> => {
      const response = await this.client.put(
        `/projects/${projectId}/users/${userId}`,
        updates
      );
      return response.data;
    },

    // Delete user from project
    delete: async (projectId: string, userId: string): Promise<ApiResponse> => {
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
    ): Promise<
      ApiResponse<{
        user: ProjectUser;
        session_token: string;
        expires_at: string;
      }>
    > => {
      const response = await this.client.post(
        `/projects/${projectId}/users/authenticate`,
        credentials
      );
      return response.data;
    },

    // Verify user email
    verifyEmail: async (
      projectId: string,
      userId: string,
      token: string
    ): Promise<ApiResponse<ProjectUser>> => {
      const response = await this.client.post(
        `/projects/${projectId}/users/${userId}/verify-email`,
        { token }
      );
      return response.data;
    },

    // Send password reset email
    sendPasswordReset: async (
      projectId: string,
      email: string
    ): Promise<ApiResponse> => {
      const response = await this.client.post(
        `/projects/${projectId}/users/password-reset`,
        { email }
      );
      return response.data;
    },

    // Reset password with token
    resetPassword: async (
      projectId: string,
      token: string,
      newPassword: string
    ): Promise<ApiResponse> => {
      const response = await this.client.post(
        `/projects/${projectId}/users/password-reset/confirm`,
        { token, new_password: newPassword }
      );
      return response.data;
    },
  };

  // API Keys Methods
  apiKeys = {
    // Get all API keys for a project
    getAll: async (
      projectId: string,
      options?: QueryOptions
    ): Promise<PaginatedResponse<ApiKey>> => {
      const response = await this.client.get(
        `/projects/${projectId}/api-keys`,
        {
          params: options,
        }
      );
      return response.data;
    },

    // Get a specific API key
    get: async (
      projectId: string,
      keyId: string
    ): Promise<ApiResponse<ApiKey>> => {
      const response = await this.client.get(
        `/projects/${projectId}/api-keys/${keyId}`
      );
      return response.data;
    },

    // Create API key
    create: async (
      projectId: string,
      keyData: {
        name: string;
        scopes: string[];
        expires_at?: string;
        metadata?: Record<string, unknown>;
      }
    ): Promise<ApiResponse<ApiKey>> => {
      const response = await this.client.post(
        `/projects/${projectId}/api-keys`,
        keyData
      );
      return response.data;
    },

    // Update API key
    update: async (
      projectId: string,
      keyId: string,
      updates: Partial<{
        name: string;
        scopes: string[];
        expires_at: string;
        is_active: boolean;
        metadata: Record<string, unknown>;
      }>
    ): Promise<ApiResponse<ApiKey>> => {
      const response = await this.client.put(
        `/projects/${projectId}/api-keys/${keyId}`,
        updates
      );
      return response.data;
    },

    // Delete API key
    delete: async (projectId: string, keyId: string): Promise<ApiResponse> => {
      const response = await this.client.delete(
        `/projects/${projectId}/api-keys/${keyId}`
      );
      return response.data;
    },

    // Regenerate API key
    regenerate: async (
      projectId: string,
      keyId: string
    ): Promise<ApiResponse<ApiKey>> => {
      const response = await this.client.post(
        `/projects/${projectId}/api-keys/${keyId}/regenerate`
      );
      return response.data;
    },
  };

  // Email Methods
  email = {
    // Get email configuration
    getConfig: async (projectId: string): Promise<ApiResponse<EmailConfig>> => {
      const response = await this.client.get(
        `/projects/${projectId}/email/config`
      );
      return response.data;
    },

    // Update email configuration
    updateConfig: async (
      projectId: string,
      config: EmailConfig
    ): Promise<ApiResponse<EmailConfig>> => {
      const response = await this.client.put(
        `/projects/${projectId}/email/config`,
        config
      );
      return response.data;
    },

    // Test email configuration
    testConfig: async (
      projectId: string,
      testEmail: string
    ): Promise<ApiResponse> => {
      const response = await this.client.post(
        `/projects/${projectId}/email/test`,
        { email: testEmail }
      );
      return response.data;
    },

    // Get email templates
    getTemplates: async (
      projectId: string,
      options?: QueryOptions
    ): Promise<PaginatedResponse<EmailTemplate>> => {
      const response = await this.client.get(
        `/projects/${projectId}/email/templates`,
        { params: options }
      );
      return response.data;
    },

    // Get a specific email template
    getTemplate: async (
      projectId: string,
      templateId: string
    ): Promise<ApiResponse<EmailTemplate>> => {
      const response = await this.client.get(
        `/projects/${projectId}/email/templates/${templateId}`
      );
      return response.data;
    },

    // Create email template
    createTemplate: async (
      projectId: string,
      template: {
        name: string;
        subject: string;
        body: string;
        variables: string[];
      }
    ): Promise<ApiResponse<EmailTemplate>> => {
      const response = await this.client.post(
        `/projects/${projectId}/email/templates`,
        template
      );
      return response.data;
    },

    // Update email template
    updateTemplate: async (
      projectId: string,
      templateId: string,
      updates: Partial<{
        name: string;
        subject: string;
        body: string;
        variables: string[];
      }>
    ): Promise<ApiResponse<EmailTemplate>> => {
      const response = await this.client.put(
        `/projects/${projectId}/email/templates/${templateId}`,
        updates
      );
      return response.data;
    },

    // Delete email template
    deleteTemplate: async (
      projectId: string,
      templateId: string
    ): Promise<ApiResponse> => {
      const response = await this.client.delete(
        `/projects/${projectId}/email/templates/${templateId}`
      );
      return response.data;
    },

    // Send email
    send: async (
      projectId: string,
      emailData: EmailSendRequest
    ): Promise<ApiResponse> => {
      const response = await this.client.post(
        `/projects/${projectId}/email/send`,
        emailData
      );
      return response.data;
    },
  };

  // Changelog Methods
  changelog = {
    // Create changelog entry
    create: async (
      entry: CreateChangelogEntry
    ): Promise<ApiResponse<ChangelogEntry>> => {
      const response = await this.client.post("/changelog", entry);
      return response.data;
    },

    // Get changelog entries
    getEntries: async (
      projectId: string,
      options?: QueryOptions
    ): Promise<PaginatedResponse<ChangelogEntry>> => {
      const response = await this.client.get(
        `/projects/${projectId}/changelog`,
        { params: options }
      );
      return response.data;
    },

    // Get changelog for specific resource
    getResourceChangelog: async (
      projectId: string,
      resourceType: string,
      resourceId: string,
      options?: QueryOptions
    ): Promise<PaginatedResponse<ChangelogEntry>> => {
      const response = await this.client.get(
        `/projects/${projectId}/changelog/${resourceType}/${resourceId}`,
        { params: options }
      );
      return response.data;
    },
  };

  /**
   * Public health check endpoint
   */
  public health = {
    /**
     * Check system health
     * @returns System health information
     */
    check: async (): Promise<
      ApiResponse<{
        healthy: boolean;
        message: string;
        details?: Record<string, unknown>;
        version: string;
      }>
    > => {
      const response = await this.client.get("/health");
      return response.data;
    },

    /**
     * Check database health (requires admin read scope)
     * @returns Detailed database health information
     */
    checkDatabase: async (): Promise<
      ApiResponse<{
        healthy: boolean;
        message: string;
        details?: Record<string, unknown>;
      }>
    > => {
      const response = await this.client.get("/admin/system/db-health");
      return response.data;
    },

    /**
     * Repair database issues (requires master admin scope)
     * @returns Repair results
     */
    repairDatabase: async (): Promise<
      ApiResponse<{
        success: boolean;
        message: string;
        repairs?: string[];
      }>
    > => {
      const response = await this.client.post("/admin/system/db-repair");
      return response.data;
    },

    /**
     * Run system diagnostics and tests
     * @returns Diagnostic results
     */
    runDiagnostics: async (): Promise<
      ApiResponse<{
        tests: {
          name: string;
          passed: boolean;
          message: string;
          duration: number;
        }[];
        summary: {
          total: number;
          passed: number;
          failed: number;
        };
      }>
    > => {
      const response = await this.client.post("/admin/system/diagnostics");
      return response.data;
    },

    // NEW: Advanced database health management
    /**
     * Validate database schema against expected schema
     * @returns Schema validation results
     */
    validateSchema: async (): Promise<
      ApiResponse<{
        isValid: boolean;
        mismatches: Array<{
          type: string;
          table?: string;
          field?: string;
          expected?: string;
          actual?: string;
          description: string;
          severity: "error" | "warning" | "info";
        }>;
        missingTables: string[];
        extraTables: string[];
        fieldMismatches: Array<{
          table: string;
          field: string;
          expected: string;
          actual: string;
          description: string;
        }>;
        timestamp: string;
      }>
    > => {
      const response = await this.client.post("/admin/system/validate-schema");
      return response.data;
    },

    /**
     * Auto-fix database schema issues
     * @returns Auto-fix results
     */
    autoFixSchema: async (): Promise<
      ApiResponse<{
        success: boolean;
        fixesApplied: number;
        details: string[];
        remainingIssues: number;
        duration: number;
      }>
    > => {
      const response = await this.client.post("/admin/system/auto-fix-schema");
      return response.data;
    },

    /**
     * Get database migration status
     * @returns Migration information
     */
    getMigrationStatus: async (): Promise<
      ApiResponse<{
        currentVersion: string;
        pendingMigrations: Array<{
          name: string;
          version: string;
          description: string;
        }>;
        appliedMigrations: Array<{
          name: string;
          version: string;
          appliedAt: string;
        }>;
      }>
    > => {
      const response = await this.client.get("/admin/system/migrations");
      return response.data;
    },

    /**
     * Run pending database migrations
     * @returns Migration results
     */
    runMigrations: async (): Promise<
      ApiResponse<{
        success: boolean;
        migrationsApplied: number;
        details: string[];
        duration: number;
      }>
    > => {
      const response = await this.client.post("/admin/system/migrations");
      return response.data;
    },

    /**
     * Rollback database to previous version
     * @param targetVersion Target version to rollback to
     * @returns Rollback results
     */
    rollbackDatabase: async (
      targetVersion: string
    ): Promise<
      ApiResponse<{
        success: boolean;
        rollbackVersion: string;
        message: string;
        duration: number;
      }>
    > => {
      const response = await this.client.post(
        `/admin/system/rollback/${targetVersion}`
      );
      return response.data;
    },

    /**
     * Get detailed database statistics
     * @returns Database statistics
     */
    getDatabaseStats: async (): Promise<
      ApiResponse<{
        tables: Array<{
          name: string;
          rowCount: number;
          sizeBytes: number;
          indexSizeBytes: number;
          lastAnalyzed: string;
        }>;
        totalSize: number;
        totalIndexSize: number;
        connectionCount: number;
        uptime: number;
      }>
    > => {
      const response = await this.client.get("/admin/system/db-stats");
      return response.data;
    },

    /**
     * Check table integrity
     * @param tableName Optional table name to check specific table
     * @returns Integrity check results
     */
    checkTableIntegrity: async (
      tableName?: string
    ): Promise<
      ApiResponse<{
        healthy: boolean;
        issues: Array<{
          table: string;
          type: string;
          description: string;
          severity: "error" | "warning" | "info";
          autoFixable: boolean;
        }>;
        summary: {
          totalTables: number;
          healthyTables: number;
          tablesWithIssues: number;
        };
      }>
    > => {
      const url = tableName
        ? `/admin/system/table-integrity/${tableName}`
        : "/admin/system/table-integrity";
      const response = await this.client.get(url);
      return response.data;
    },
  };

  /**
   * System management and configuration
   */
  public system = {
    /**
     * Get system settings
     * @returns System settings
     */
    getSettings: async (): Promise<ApiResponse<SystemSettings>> => {
      const response = await this.client.get("/krapi/k1/system/settings");
      return response.data;
    },

    /**
     * Update system settings
     * @param updates Settings to update
     * @returns Updated settings
     */
    updateSettings: async (updates: Partial<SystemSettings>): Promise<ApiResponse<SystemSettings>> => {
      const response = await this.client.put("/krapi/k1/system/settings", updates);
      return response.data;
    },

    /**
     * Test email configuration
     * @param config Email configuration to test
     * @returns Test results
     */
    testEmailConfig: async (config: EmailConfig): Promise<ApiResponse<{ success: boolean }>> => {
      const response = await this.client.post("/krapi/k1/system/test-email", config);
      return response.data;
    },

    /**
     * Get system information
     * @returns System information
     */
    getSystemInfo: async (): Promise<ApiResponse<SystemInfo>> => {
      const response = await this.client.get("/krapi/k1/system/info");
      return response.data;
    },

    /**
     * Get database health status
     * @returns Database health information
     */
    getDatabaseHealth: async (): Promise<ApiResponse<DatabaseHealth>> => {
      const response = await this.client.get("/krapi/k1/system/database-health");
      return response.data;
    },
  };

  /**
   * Testing utilities for development
   */
  public testing = {
    /**
     * Create test project with sample data
     * @param options Test project options
     * @returns Created test project
     */
    createTestProject: async (options?: {
      name?: string;
      withCollections?: boolean;
      withDocuments?: boolean;
      documentCount?: number;
    }): Promise<ApiResponse<Project>> => {
      const response = await this.client.post(
        "/testing/create-project",
        options
      );
      return response.data;
    },

    /**
     * Clean up test data
     * @param projectId Optional project ID to clean up, or all test data if not provided
     * @returns Cleanup results
     */
    cleanup: async (
      projectId?: string
    ): Promise<
      ApiResponse<{
        deleted: {
          projects: number;
          collections: number;
          documents: number;
        };
      }>
    > => {
      const response = await this.client.post("/testing/cleanup", {
        projectId,
      });
      return response.data;
    },

    /**
     * Run integration tests
     * @returns Test results
     */
    runIntegrationTests: async (): Promise<
      ApiResponse<{
        results: {
          suite: string;
          tests: {
            name: string;
            passed: boolean;
            error?: string;
            duration: number;
          }[];
        }[];
        summary: {
          total: number;
          passed: number;
          failed: number;
          duration: number;
        };
      }>
    > => {
      const response = await this.client.post("/testing/integration-tests");
      return response.data;
    },

    /**
     * Check database schema
     * @returns Database schema information
     */
    checkSchema: async (): Promise<ApiResponse<SchemaValidationResult>> => {
      const response = await this.client.get("/testing/check-schema");
      return response.data;
    },
  };
}
