/**
 * KRAPI SDK - Main Wrapper
 *
 * A simple, unified interface that works seamlessly for both client and server applications.
 * This wrapper automatically detects the environment and provides the appropriate methods.
 *
 * @example Client App Usage:
 * ```typescript
 * import { krapi } from '@krapi/sdk';
 *
 * // Setup for client app
 * await krapi.connect({
 *   endpoint: 'https://api.myapp.com/krapi/k1',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Use seamlessly
 * const project = await krapi.projects.create({ name: 'My Project' });
 * const collection = await krapi.collections.create(project.id, { name: 'tasks', fields: [...] });
 * const document = await krapi.documents.create(project.id, 'tasks', { data: {...} });
 * ```
 *
 * @example Server App Usage:
 * ```typescript
 * import { krapi } from '@krapi/sdk';
 *
 * // Setup for server app
 * await krapi.connect({
 *   database: databaseConnection,
 *   logger: console
 * });
 *
 * // Use the exact same methods
 * const project = await krapi.projects.create({ name: 'My Project' });
 * const collection = await krapi.collections.create(project.id, { name: 'tasks', fields: [...] });
 * const document = await krapi.documents.create(project.id, 'tasks', { data: {...} });
 * ```
 */

import { AuthHttpClient } from "./http-clients/auth-http-client";
import { CollectionsHttpClient } from "./http-clients/collections-http-client";
import { ProjectsHttpClient } from "./http-clients/projects-http-client";
import { AuthService } from "./auth-service";
import { CollectionsService } from "./collections-service";
import { CollectionsSchemaManager } from "./collections-schema-manager";
import { DatabaseHealthManager } from "./database-health";
import { ProjectsService } from "./projects-service";
import { UsersService } from "./users-service";
import { KrapiSocketInterface } from "./socket-interface";
import { DatabaseConnection, Logger } from "./core";
import { StorageHttpClient } from "./http-clients/storage-http-client";
import { EmailHttpClient } from "./http-clients/email-http-client";
import { HealthHttpClient } from "./http-clients/health-http-client";
import { SystemHttpClient } from "./http-clients/system-http-client";

export interface KrapiConfig {
  // Client configuration
  endpoint?: string;
  apiKey?: string;
  sessionToken?: string;
  timeout?: number;

  // Server configuration
  database?: DatabaseConnection;
  logger?: Logger;
}

type Mode = "client" | "server" | null;

/**
 * Main KRAPI wrapper class that provides a unified interface
 * Implements the complete socket interface for perfect client/server parity
 */
class KrapiWrapper implements KrapiSocketInterface {
  private mode: Mode = null;
  private config: KrapiConfig = {};
  private logger: Logger = console;

  // HTTP clients (for client mode)
  private authHttpClient?: AuthHttpClient;
  private projectsHttpClient?: ProjectsHttpClient;
  private collectionsHttpClient?: CollectionsHttpClient;
  private storageHttpClient?: StorageHttpClient;
  private emailHttpClient?: EmailHttpClient;
  private healthHttpClient?: HealthHttpClient;
  private systemHttpClient?: SystemHttpClient;

  // Database services (for server mode)
  private authService?: AuthService;
  private projectsService?: ProjectsService;
  private collectionsService?: CollectionsService;
  private collectionsSchemaManager?: CollectionsSchemaManager;
  private usersService?: UsersService;
  private databaseHealthManager?: DatabaseHealthManager;
  // Note: storageService, emailService, healthService, testingService, adminService
  // will be implemented when their interfaces are completed
  // private storageService?: StorageService;
  // private emailService?: EmailService;
  // private healthService?: HealthService;
  // private testingService?: TestingService;
  // private adminService?: AdminService;

  /**
   * Connect to KRAPI backend (client mode) or initialize with database (server mode)
   */
  async connect(config: KrapiConfig): Promise<void> {
    this.config = config;
    this.logger = config.logger || console;

    // Determine mode based on configuration
    if (config.endpoint) {
      this.mode = "client";
      await this.initializeClientMode();
    } else if (config.database) {
      this.mode = "server";
      await this.initializeServerMode();
    } else {
      throw new Error(
        "Either endpoint (for client) or database (for server) must be provided"
      );
    }

    this.logger.info(`KRAPI SDK initialized in ${this.mode} mode`);
  }

  /**
   * Initialize HTTP clients for client mode
   */
  private async initializeClientMode(): Promise<void> {
    if (!this.config.endpoint) return;

    const httpConfig = {
      baseUrl: this.config.endpoint,
      ...(this.config.apiKey && { apiKey: this.config.apiKey }),
      ...(this.config.sessionToken && {
        sessionToken: this.config.sessionToken,
      }),
      ...(this.config.timeout && { timeout: this.config.timeout }),
    };

    this.authHttpClient = new AuthHttpClient(httpConfig);
    this.projectsHttpClient = new ProjectsHttpClient(httpConfig);
    this.collectionsHttpClient = new CollectionsHttpClient(httpConfig);
    this.storageHttpClient = new StorageHttpClient(httpConfig);
    this.emailHttpClient = new EmailHttpClient(httpConfig);
    this.healthHttpClient = new HealthHttpClient(httpConfig);
    this.systemHttpClient = new SystemHttpClient(httpConfig);
  }

  /**
   * Initialize database services for server mode
   */
  private async initializeServerMode(): Promise<void> {
    if (!this.config.database) return;

    const db = this.config.database;

    this.authService = new AuthService(db, this.logger);
    this.projectsService = new ProjectsService(db, this.logger);
    this.collectionsService = new CollectionsService(db, console);
    this.collectionsSchemaManager = new CollectionsSchemaManager(
      db,
      console // Use console directly instead of casting Logger
    );
    this.usersService = new UsersService(db, this.logger);
    this.databaseHealthManager = new DatabaseHealthManager(
      db,
      console // Use console directly
    );
    // TODO: Initialize additional services when their interfaces are completed
    // this.storageService = new StorageService(db, this.logger);
    // this.emailService = new EmailService(db, this.logger);
    // this.healthService = new HealthService(db, this.logger);
    // this.testingService = new TestingService(db, this.logger);
    // this.adminService = new AdminService(db, this.logger);
  }

  /**
   * Authentication methods
   */
  auth = {
    /**
     * Create session with API key
     */
    createSession: async (
      apiKey: string
    ): Promise<{
      session_token: string;
      expires_at: string;
      user_type: "admin" | "project";
      scopes: string[];
    }> => {
      if (this.mode === "client") {
        try {
          const response = await this.authHttpClient!.adminApiLogin({
            api_key: apiKey,
          });
          return {
            session_token: response.data?.token || "",
            expires_at: response.data?.expires_at || "",
            user_type: "admin",
            scopes: response.data?.scopes || [],
          };
        } catch (error) {
          throw new Error(`Authentication failed: ${error}`);
        }
      } else {
        const session = await this.authService!.authenticateAdminWithApiKey({
          api_key: apiKey,
        });
        return {
          session_token: session.token,
          expires_at: session.expires_at,
          user_type: "admin" as const,
          scopes: session.scopes,
        };
      }
    },

    /**
     * Login with username/password
     */
    login: async (
      username: string,
      password: string,
      remember_me = false
    ): Promise<{
      session_token: string;
      expires_at: string;
      user: any;
      scopes: string[];
    }> => {
      if (this.mode === "client") {
        const response = await this.authHttpClient!.adminLogin({
          username,
          password,
          remember_me,
        });
        const data = response.data!;
        return {
          session_token: data.token,
          expires_at: data.expires_at,
          user: data.user,
          scopes: data.scopes,
        };
      } else {
        const result = await this.authService!.authenticateAdmin({
          username,
          password,
          remember_me,
        });
        return {
          session_token: result.token,
          expires_at: result.expires_at,
          user: result.user,
          scopes: result.scopes,
        };
      }
    },

    /**
     * Set session token for subsequent requests (client mode only)
     */
    setSessionToken: (token: string): void => {
      if (this.mode === "client") {
        this.authHttpClient!.setSessionToken(token);
        this.projectsHttpClient!.setSessionToken(token);
        this.collectionsHttpClient!.setSessionToken(token);
      }
    },

    /**
     * Logout and invalidate session
     */
    logout: async (): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.authHttpClient!.logout();
        return response.data || { success: false };
      } else {
        return { success: true };
      }
    },

    /**
     * Get current user information
     */
    getCurrentUser: async (): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.authHttpClient!.getCurrentSession();
        return response.data || null;
      } else {
        // For server mode, would need session context
        throw new Error(
          "getCurrentUser requires session context in server mode"
        );
      }
    },

    /**
     * Refresh session token
     */
    refreshSession: async (): Promise<{
      session_token: string;
      expires_at: string;
    }> => {
      if (this.mode === "client") {
        const response = await this.authHttpClient!.refreshSession();
        return response.data || { session_token: "", expires_at: "" };
      } else {
        throw new Error("refreshSession not implemented for server mode");
      }
    },

    /**
     * Validate session token
     */
    validateSession: async (
      token: string
    ): Promise<{ valid: boolean; session?: any }> => {
      if (this.mode === "client") {
        const response = await this.authHttpClient!.validateSession(token);
        return response.data || { valid: false };
      } else {
        // Would use AuthService to validate session
        throw new Error("validateSession not implemented for server mode");
      }
    },

    /**
     * Change password
     */
    changePassword: async (
      oldPassword: string,
      newPassword: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.authHttpClient!.changePassword(
          "current-user",
          "admin",
          {
            current_password: oldPassword,
            new_password: newPassword,
          }
        );
        return response.data || { success: false };
      } else {
        throw new Error("changePassword not implemented for server mode");
      }
    },
  };

  /**
   * Projects management
   */
  projects = {
    /**
     * Create a new project
     */
    create: async (projectData: {
      name: string;
      description?: string;
      settings?: Record<string, unknown>;
    }): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.createProject(
          projectData
        );
        return response.data || { success: false };
      } else {
        return this.projectsService!.createProject("system", projectData);
      }
    },

    /**
     * Get project by ID
     */
    get: async (projectId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.getProject(projectId);
        return response.data || { success: false };
      } else {
        return this.projectsService!.getProjectById(projectId);
      }
    },

    /**
     * Update project
     */
    update: async (
      projectId: string,
      updates: Record<string, unknown>
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.updateProject(
          projectId,
          updates
        );
        return response.data || { success: false };
      } else {
        return this.projectsService!.updateProject(projectId, updates);
      }
    },

    /**
     * Delete project
     */
    delete: async (projectId: string): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.deleteProject(
          projectId
        );
        return response.data || { success: false };
      } else {
        const success = await this.projectsService!.deleteProject(projectId);
        return { success };
      }
    },

    /**
     * Get all projects
     */
    getAll: async (options?: {
      limit?: number;
      offset?: number;
    }): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.getAllProjects(options);
        return response.data || [];
      } else {
        return this.projectsService!.getAllProjects(options);
      }
    },

    /**
     * Get project statistics
     */
    getStatistics: async (projectId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.getProjectStatistics(
          projectId
        );
        return response.data || { success: false };
      } else {
        return this.projectsService!.getProjectStatistics(projectId);
      }
    },

    /**
     * Get project settings
     */
    getSettings: async (projectId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.getProjectSettings(
          projectId
        );
        return response.data || { success: false };
      } else {
        const project = await this.projectsService!.getProjectById(projectId);
        return project?.settings || {};
      }
    },

    /**
     * Update project settings
     */
    updateSettings: async (
      projectId: string,
      settings: Record<string, unknown>
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.updateProjectSettings(
          projectId,
          settings
        );
        return response.data || { success: false };
      } else {
        return this.projectsService!.updateProjectSettings(projectId, settings);
      }
    },

    /**
     * Get project activity
     */
    getActivity: async (
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        action_type?: string;
        start_date?: string;
        end_date?: string;
      }
    ): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.getProjectActivity(
          projectId,
          options
        );
        return response.data || [];
      } else {
        // Would need to implement in ProjectsService
        throw new Error("getActivity not yet implemented for server mode");
      }
    },
  };

  /**
   * Collections management
   */
  collections = {
    /**
     * Create a new collection
     */
    create: async (
      projectId: string,
      collectionData: {
        name: string;
        description?: string;
        fields: Array<{
          name: string;
          type: string;
          required?: boolean;
          unique?: boolean;
          indexed?: boolean;
          default?: unknown;
          validation?: Record<string, unknown>;
        }>;
        indexes?: Array<{
          name: string;
          fields: string[];
          unique?: boolean;
        }>;
      }
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.createCollection(
          projectId,
          collectionData
        );
        return response.data || { success: false };
      } else {
        const result = await this.collectionsSchemaManager!.createCollection({
          ...collectionData,
          fields: collectionData.fields.map((f) => ({
            ...f,
            type: f.type as any, // Will be properly typed in the service
            required: f.required ?? false,
            unique: f.unique ?? false,
            indexed: f.indexed ?? false,
          })),
        });
        // Set the project_id on the result
        result.project_id = projectId;
        return result;
      }
    },

    /**
     * Get collection by name
     */
    get: async (projectId: string, collectionName: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.getCollection(
          projectId,
          collectionName
        );
        return response.data || { success: false };
      } else {
        const collections =
          await this.collectionsSchemaManager!.getCollections();
        return (
          collections.find(
            (c) => c.project_id === projectId && c.name === collectionName
          ) || null
        );
      }
    },

    /**
     * Get all collections in a project
     */
    getAll: async (projectId: string): Promise<any[]> => {
      if (this.mode === "client") {
        const response =
          await this.collectionsHttpClient!.getProjectCollections(projectId);
        return response.data || [];
      } else {
        const collections =
          await this.collectionsSchemaManager!.getCollections();
        return collections.filter((c) => c.project_id === projectId);
      }
    },

    /**
     * Update collection
     */
    update: async (
      projectId: string,
      collectionName: string,
      updates: {
        description?: string;
        fields?: Array<{
          name: string;
          type: string;
          required?: boolean;
          unique?: boolean;
          indexed?: boolean;
          default?: unknown;
          validation?: Record<string, unknown>;
        }>;
        indexes?: Array<{
          name: string;
          fields: string[];
          unique?: boolean;
        }>;
      }
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.updateCollection(
          projectId,
          collectionName,
          updates
        );
        return response.data || { success: false };
      } else {
        const collection = await this.collections.get(
          projectId,
          collectionName
        );
        if (!collection) {
          throw new Error("Collection not found");
        }
        return this.collectionsSchemaManager!.updateCollection(
          collection.id,
          updates as any // Type conversion for compatibility
        );
      }
    },

    /**
     * Delete collection
     */
    delete: async (
      projectId: string,
      collectionName: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.deleteCollection(
          projectId,
          collectionName
        );
        return response.data || { success: false };
      } else {
        const collection = await this.collections.get(
          projectId,
          collectionName
        );
        if (!collection) {
          return { success: false };
        }
        const success = await this.collectionsSchemaManager!.deleteCollection(
          collection.id
        );
        return { success };
      }
    },

    /**
     * Get collection schema
     */
    getSchema: async (
      projectId: string,
      collectionName: string
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.getCollection(
          projectId,
          collectionName
        );
        return response.data || { success: false };
      } else {
        return this.collections.get(projectId, collectionName);
      }
    },

    /**
     * Validate collection schema
     */
    validateSchema: async (
      projectId: string,
      collectionName: string
    ): Promise<{
      valid: boolean;
      issues: Array<{
        type: string;
        field?: string;
        message: string;
        severity: "error" | "warning" | "info";
      }>;
    }> => {
      if (this.mode === "client") {
        const response =
          await this.collectionsHttpClient!.validateCollectionSchema(
            projectId,
            collectionName
          );
        return response.data || { valid: false, issues: [] };
      } else {
        // Would need to implement in CollectionsSchemaManager
        throw new Error("validateSchema not yet implemented for server mode");
      }
    },

    /**
     * Get collection statistics
     */
    getStatistics: async (
      projectId: string,
      collectionName: string
    ): Promise<any> => {
      if (this.mode === "client") {
        const response =
          await this.collectionsHttpClient!.getCollectionStatistics(
            projectId,
            collectionName
          );
        return response.data || { success: false };
      } else {
        // Would need to implement in CollectionsService
        throw new Error("getStatistics not yet implemented for server mode");
      }
    },
  };

  /**
   * Documents management within collections
   */
  documents = {
    /**
     * Create a new document
     */
    create: async (
      projectId: string,
      collectionName: string,
      documentData: {
        data: Record<string, unknown>;
        created_by?: string;
      }
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.createDocument(
          projectId,
          collectionName,
          documentData
        );
        return response.data || { success: false };
      } else {
        return this.collectionsService!.createDocument(
          projectId,
          collectionName,
          documentData
        );
      }
    },

    /**
     * Get document by ID
     */
    get: async (
      projectId: string,
      collectionName: string,
      documentId: string
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.getDocument(
          projectId,
          collectionName,
          documentId
        );
        return response.data || { success: false };
      } else {
        return this.collectionsService!.getDocumentById(
          projectId,
          collectionName,
          documentId
        );
      }
    },

    /**
     * Update document
     */
    update: async (
      projectId: string,
      collectionName: string,
      documentId: string,
      updateData: {
        data: Record<string, unknown>;
        updated_by?: string;
      }
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.updateDocument(
          projectId,
          collectionName,
          documentId,
          updateData
        );
        return response.data || { success: false };
      } else {
        return this.collectionsService!.updateDocument(
          projectId,
          collectionName,
          documentId,
          updateData
        );
      }
    },

    /**
     * Delete document
     */
    delete: async (
      projectId: string,
      collectionName: string,
      documentId: string,
      deletedBy?: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.deleteDocument(
          projectId,
          collectionName,
          documentId,
          deletedBy ? { deleted_by: deletedBy } : undefined
        );
        return response.data || { success: false };
      } else {
        const success = await this.collectionsService!.deleteDocument(
          projectId,
          collectionName,
          documentId,
          deletedBy
        );
        return { success };
      }
    },

    /**
     * Get all documents in a collection
     */
    getAll: async (
      projectId: string,
      collectionName: string,
      options?: {
        filter?: Record<string, unknown>;
        limit?: number;
        offset?: number;
        orderBy?: string;
        order?: "asc" | "desc";
      }
    ): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.getDocuments(
          projectId,
          collectionName,
          options?.filter,
          options
        );
        return response.data || [];
      } else {
        return this.collectionsService!.getDocuments(
          projectId,
          collectionName,
          options?.filter,
          options
        );
      }
    },

    /**
     * Search documents
     */
    search: async (
      projectId: string,
      collectionName: string,
      query: {
        text?: string;
        fields?: string[];
        filters?: Record<string, unknown>;
        limit?: number;
        offset?: number;
      }
    ): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.searchDocuments(
          projectId,
          collectionName,
          query
        );
        return response.data || [];
      } else {
        // For server mode, would need to implement search in CollectionsService
        throw new Error("Document search not yet implemented for server mode");
      }
    },

    /**
     * Bulk create documents
     */
    bulkCreate: async (
      projectId: string,
      collectionName: string,
      documents: Array<{
        data: Record<string, unknown>;
        created_by?: string;
      }>
    ): Promise<{
      created: any[];
      errors: Array<{ index: number; error: string }>;
    }> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.bulkCreateDocuments(
          projectId,
          collectionName,
          documents
        );
        return response.data || { created: [], errors: [] };
      } else {
        // For server mode, implement bulk create
        const created: any[] = [];
        const errors: Array<{ index: number; error: string }> = [];

        for (let i = 0; i < documents.length; i++) {
          try {
            const docData = documents[i];
            if (!docData) continue;
            const doc = await this.collectionsService!.createDocument(
              projectId,
              collectionName,
              docData
            );
            created.push(doc);
          } catch (error) {
            errors.push({ index: i, error: String(error) });
          }
        }

        return { created, errors };
      }
    },

    /**
     * Bulk update documents
     */
    bulkUpdate: async (
      projectId: string,
      collectionName: string,
      updates: Array<{
        id: string;
        data: Record<string, unknown>;
        updated_by?: string;
      }>
    ): Promise<{
      updated: any[];
      errors: Array<{ id: string; error: string }>;
    }> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.bulkUpdateDocuments(
          projectId,
          collectionName,
          updates
        );
        return response.data || { updated: [], errors: [] };
      } else {
        // For server mode, implement bulk update
        const updated: any[] = [];
        const errors: Array<{ id: string; error: string }> = [];

        for (const updateItem of updates) {
          try {
            const doc = await this.collectionsService!.updateDocument(
              projectId,
              collectionName,
              updateItem.id,
              {
                data: updateItem.data,
                ...(updateItem.updated_by && {
                  updated_by: updateItem.updated_by,
                }),
              }
            );
            updated.push(doc);
          } catch (error) {
            errors.push({ id: updateItem.id, error: String(error) });
          }
        }

        return { updated, errors };
      }
    },

    /**
     * Bulk delete documents
     */
    bulkDelete: async (
      projectId: string,
      collectionName: string,
      documentIds: string[],
      deletedBy?: string
    ): Promise<{
      deleted_count: number;
      errors: Array<{ id: string; error: string }>;
    }> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.bulkDeleteDocuments(
          projectId,
          collectionName,
          documentIds,
          deletedBy ? { deleted_by: deletedBy } : undefined
        );
        return response.data || { deleted_count: 0, errors: [] };
      } else {
        // For server mode, implement bulk delete
        let deleted_count = 0;
        const errors: Array<{ id: string; error: string }> = [];

        for (const id of documentIds) {
          try {
            const success = await this.collectionsService!.deleteDocument(
              projectId,
              collectionName,
              id,
              deletedBy
            );
            if (success) deleted_count++;
          } catch (error) {
            errors.push({ id, error: String(error) });
          }
        }

        return { deleted_count, errors };
      }
    },

    /**
     * Count documents in collection
     */
    count: async (
      projectId: string,
      collectionName: string,
      filter?: Record<string, unknown>
    ): Promise<{ count: number }> => {
      if (this.mode === "client") {
        // HTTP client count method needs to be implemented
        throw new Error("Document count via HTTP not yet implemented");
      } else {
        // For server mode, implement count
        const docs = await this.collectionsService!.getDocuments(
          projectId,
          collectionName,
          filter
        );
        return { count: docs.length };
      }
    },

    /**
     * Aggregate documents
     */
    aggregate: async (
      projectId: string,
      collectionName: string,
      aggregation: {
        group_by?: string[];
        aggregations: Record<
          string,
          {
            type: "count" | "sum" | "avg" | "min" | "max";
            field?: string;
          }
        >;
        filters?: Record<string, unknown>;
      }
    ): Promise<{
      groups: Record<string, Record<string, number>>;
      total_groups: number;
    }> => {
      if (this.mode === "client") {
        const response = await this.collectionsHttpClient!.aggregateDocuments(
          projectId,
          collectionName,
          aggregation
        );
        return response.data || { groups: {}, total_groups: 0 };
      } else {
        // For server mode, implement basic aggregation
        throw new Error(
          "Document aggregation not yet implemented for server mode"
        );
      }
    },
  };

  /**
   * Database health and maintenance (server mode only)
   */
  database = {
    /**
     * Check database health
     */
    healthCheck: async (): Promise<any> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      return this.databaseHealthManager!.healthCheck();
    },

    /**
     * Auto-fix database issues
     */
    autoFix: async (): Promise<any> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      // Would need to implement autoFixAll method
      throw new Error("Auto-fix not yet implemented");
    },

    /**
     * Validate schema
     */
    validateSchema: async (): Promise<any> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      return this.databaseHealthManager!.validateSchema();
    },

    /**
     * Run migrations
     */
    migrate: async (): Promise<any> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      return this.databaseHealthManager!.migrate();
    },
  };

  /**
   * Users management (available in both modes)
   */
  users = {
    /**
     * Get all users in a project
     */
    getAll: async (
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        search?: string;
        role?: string;
        status?: string;
      }
    ): Promise<any[]> => {
      if (this.mode === "server") {
        return this.usersService!.getAllUsers(projectId, options);
      } else {
        throw new Error("Users management via HTTP not yet implemented");
      }
    },

    /**
     * Create user in project
     */
    create: async (
      projectId: string,
      userData: {
        username: string;
        email: string;
        password: string;
        role?: string;
        permissions?: string[];
      }
    ): Promise<any> => {
      if (this.mode === "server") {
        return this.usersService!.createUser(projectId, userData);
      } else {
        throw new Error("Users management via HTTP not yet implemented");
      }
    },

    /**
     * Get user by ID
     */
    get: async (projectId: string, userId: string): Promise<any> => {
      if (this.mode === "server") {
        return this.usersService!.getUserById(projectId, userId);
      } else {
        throw new Error("Users management via HTTP not yet implemented");
      }
    },

    /**
     * Update user
     */
    update: async (
      projectId: string,
      userId: string,
      updates: {
        username?: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        permissions?: string[];
        is_active?: boolean;
        metadata?: Record<string, unknown>;
      }
    ): Promise<any> => {
      if (this.mode === "server") {
        return this.usersService!.updateUser(projectId, userId, updates);
      } else {
        throw new Error("Users management via HTTP not yet implemented");
      }
    },

    /**
     * Delete user
     */
    delete: async (
      projectId: string,
      userId: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "server") {
        const success = await this.usersService!.deleteUser(projectId, userId);
        return { success };
      } else {
        throw new Error("Users management via HTTP not yet implemented");
      }
    },

    /**
     * Update user role
     */
    updateRole: async (
      projectId: string,
      userId: string,
      role: string
    ): Promise<any> => {
      if (this.mode === "server") {
        // Update user role through the standard updateUser method
        return this.usersService!.updateUser(projectId, userId, { role });
      } else {
        throw new Error("Users management via HTTP not yet implemented");
      }
    },

    /**
     * Update user permissions
     */
    updatePermissions: async (
      projectId: string,
      userId: string,
      permissions: string[]
    ): Promise<any> => {
      if (this.mode === "server") {
        // Update user permissions through the standard updateUser method
        return this.usersService!.updateUser(projectId, userId, {
          permissions,
        });
      } else {
        throw new Error("Users management via HTTP not yet implemented");
      }
    },

    /**
     * Get user activity
     */
    getActivity: async (
      projectId: string,
      userId: string,
      options?: {
        limit?: number;
        offset?: number;
        start_date?: string;
        end_date?: string;
      }
    ): Promise<any[]> => {
      if (this.mode === "server") {
        // User activity functionality needs to be implemented
        throw new Error(
          `User activity tracking not yet implemented for user ${userId} in project ${projectId}${
            options ? ` with options ${JSON.stringify(options)}` : ""
          }`
        );
      } else {
        throw new Error("Users management via HTTP not yet implemented");
      }
    },

    /**
     * Get user statistics
     */
    getStatistics: async (
      projectId: string
    ): Promise<{
      total_users: number;
      active_users: number;
      users_by_role: Record<string, number>;
      recent_logins: number;
    }> => {
      if (this.mode === "server") {
        // User statistics functionality needs to be implemented
        throw new Error(
          `User statistics not yet implemented for project ${projectId}`
        );
      } else {
        throw new Error("Users management via HTTP not yet implemented");
      }
    },
  };

  /**
   * Storage management
   */
  storage = {
    uploadFile: async (
      projectId: string,
      file: File,
      options?: {
        folder_id?: string;
        tags?: string[];
        metadata?: Record<string, unknown>;
        is_public?: boolean;
      }
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.storageHttpClient!.uploadFile(
          projectId,
          file,
          options
        );
        return response.data || null;
      } else {
        // For server mode, we need to implement this
        throw new Error("Storage uploadFile not implemented for server mode");
      }
    },
    downloadFile: async (projectId: string, fileId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.storageHttpClient!.downloadFile(
          projectId,
          fileId
        );
        return response.data || null;
      } else {
        throw new Error("Storage downloadFile not implemented for server mode");
      }
    },
    getFile: async (projectId: string, fileId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.storageHttpClient!.getFile(
          projectId,
          fileId
        );
        return response.data || null;
      } else {
        throw new Error("Storage getFile not implemented for server mode");
      }
    },
    deleteFile: async (
      projectId: string,
      fileId: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.storageHttpClient!.deleteFile(
          projectId,
          fileId
        );
        return { success: response.success };
      } else {
        throw new Error("Storage deleteFile not implemented for server mode");
      }
    },
    getFiles: async (
      projectId: string,
      options?: {
        folder?: string;
        limit?: number;
        offset?: number;
        search?: string;
        type?: string;
      }
    ): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.storageHttpClient!.getFiles(
          projectId,
          options
        );
        return response.data || [];
      } else {
        throw new Error("Storage getFiles not implemented for server mode");
      }
    },
    createFolder: async (
      projectId: string,
      folderData: {
        name: string;
        parent_folder_id?: string;
        metadata?: Record<string, unknown>;
      }
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.storageHttpClient!.createFolder(
          projectId,
          folderData
        );
        return response.data || null;
      } else {
        throw new Error("Storage createFolder not implemented for server mode");
      }
    },
    getFolders: async (
      projectId: string,
      parentFolderId?: string
    ): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.storageHttpClient!.getFolders(
          projectId,
          parentFolderId
        );
        return response.data || [];
      } else {
        throw new Error("Storage getFolders not implemented for server mode");
      }
    },
    deleteFolder: async (
      projectId: string,
      folderId: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.storageHttpClient!.deleteFolder(
          projectId,
          folderId
        );
        return { success: response.success };
      } else {
        throw new Error("Storage deleteFolder not implemented for server mode");
      }
    },
    getStatistics: async (
      projectId: string
    ): Promise<{
      total_files: number;
      total_size_bytes: number;
      files_by_type: Record<string, number>;
      storage_quota: {
        used: number;
        limit: number;
        percentage: number;
      };
    }> => {
      if (this.mode === "client") {
        const response = await this.storageHttpClient!.getStorageStatistics(
          projectId
        );
        if (response.data) {
          // Convert the actual StorageStatistics to the expected format
          const filesByType: Record<string, number> = {};
          Object.entries(response.data.files_by_type || {}).forEach(
            ([type, stats]) => {
              filesByType[type] = stats.count;
            }
          );

          return {
            total_files: response.data.total_files || 0,
            total_size_bytes: response.data.total_size || 0,
            files_by_type: filesByType,
            storage_quota: {
              used: response.data.total_size || 0,
              limit: 1024 * 1024 * 1024, // Default 1GB limit
              percentage: response.data.storage_used_percentage || 0,
            },
          };
        }
        return {
          total_files: 0,
          total_size_bytes: 0,
          files_by_type: {},
          storage_quota: { used: 0, limit: 1024 * 1024 * 1024, percentage: 0 },
        };
      } else {
        throw new Error(
          "Storage getStatistics not implemented for server mode"
        );
      }
    },
    getFileUrl: async (
      projectId: string,
      fileId: string,
      options?: {
        expires_in?: number;
        download?: boolean;
      }
    ): Promise<{ url: string; expires_at?: string }> => {
      if (this.mode === "client") {
        const response = await this.storageHttpClient!.getFileUrl(
          projectId,
          fileId,
          options
        );
        return response.data || { url: "" };
      } else {
        throw new Error("Storage getFileUrl not implemented for server mode");
      }
    },
  };

  /**
   * Email management
   */
  email = {
    getConfig: async (projectId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.emailHttpClient!.getConfig(projectId);
        return response.data || null;
      } else {
        throw new Error("Email getConfig not implemented for server mode");
      }
    },
    updateConfig: async (
      projectId: string,
      config: {
        provider: string;
        settings: Record<string, unknown>;
      }
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.emailHttpClient!.updateConfig(
          projectId,
          config as any
        );
        return response.data || null;
      } else {
        throw new Error("Email updateConfig not implemented for server mode");
      }
    },
    testConfig: async (
      projectId: string,
      testEmail: string
    ): Promise<{ success: boolean; message?: string }> => {
      if (this.mode === "client") {
        const response = await this.emailHttpClient!.testConfig(
          projectId,
          testEmail
        );
        return response.data || { success: false };
      } else {
        throw new Error("Email testConfig not implemented for server mode");
      }
    },
    getTemplates: async (
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        search?: string;
      }
    ): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.emailHttpClient!.getTemplates(
          projectId,
          options
        );
        return response.data || [];
      } else {
        throw new Error("Email getTemplates not implemented for server mode");
      }
    },
    getTemplate: async (
      projectId: string,
      templateId: string
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.emailHttpClient!.getTemplate(
          projectId,
          templateId
        );
        return response.data || null;
      } else {
        throw new Error("Email getTemplate not implemented for server mode");
      }
    },
    createTemplate: async (
      projectId: string,
      template: {
        name: string;
        subject: string;
        body: string;
        variables: string[];
        type?: string;
        description?: string;
        is_active?: boolean;
      }
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.emailHttpClient!.createTemplate(
          projectId,
          template
        );
        return response.data || null;
      } else {
        throw new Error("Email createTemplate not implemented for server mode");
      }
    },
    updateTemplate: async (
      projectId: string,
      templateId: string,
      updates: Partial<any>
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.emailHttpClient!.updateTemplate(
          projectId,
          templateId,
          updates
        );
        return response.data || null;
      } else {
        throw new Error("Email updateTemplate not implemented for server mode");
      }
    },
    deleteTemplate: async (
      projectId: string,
      templateId: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.emailHttpClient!.deleteTemplate(
          projectId,
          templateId
        );
        return { success: response.success };
      } else {
        throw new Error("Email deleteTemplate not implemented for server mode");
      }
    },
    send: async (projectId: string, emailRequest: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.emailHttpClient!.sendEmail(
          projectId,
          emailRequest
        );
        return response.data || null;
      } else {
        throw new Error("Email send not implemented for server mode");
      }
    },
    getHistory: async (
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        status?: "sent" | "failed" | "bounced" | "delivered";
        recipient?: string;
        template_id?: string;
        sent_after?: string;
        sent_before?: string;
      }
    ): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.emailHttpClient!.getEmailHistory(
          projectId,
          options
        );
        return response.data || [];
      } else {
        throw new Error("Email getHistory not implemented for server mode");
      }
    },
  };

  /**
   * API Keys management
   */
  apiKeys = {
    getAll: async (
      projectId: string,
      _options?: {
        limit?: number;
        offset?: number;
        type?: string;
        status?: string;
      }
    ): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.getProjectApiKeys(
          projectId
        );
        return response.data || [];
      } else {
        // For server mode, we need to implement this
        throw new Error("API Keys getAll not implemented for server mode");
      }
    },
    get: async (projectId: string, keyId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.getProjectApiKey(
          projectId,
          keyId
        );
        return response.data || null;
      } else {
        throw new Error("API Keys get not implemented for server mode");
      }
    },
    create: async (
      projectId: string,
      keyData: {
        name: string;
        scopes: string[];
        expires_at?: string;
        rate_limit?: number;
        metadata?: Record<string, unknown>;
      }
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.createProjectApiKey(
          projectId,
          keyData
        );
        return response.data || null;
      } else {
        throw new Error("API Keys create not implemented for server mode");
      }
    },
    update: async (
      projectId: string,
      keyId: string,
      updates: {
        name?: string;
        scopes?: string[];
        expires_at?: string;
        is_active?: boolean;
        rate_limit?: number;
        metadata?: Record<string, unknown>;
      }
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.updateProjectApiKey(
          projectId,
          keyId,
          updates
        );
        return response.data || null;
      } else {
        throw new Error("API Keys update not implemented for server mode");
      }
    },
    delete: async (
      projectId: string,
      keyId: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.deleteProjectApiKey(
          projectId,
          keyId
        );
        return { success: response.success };
      } else {
        throw new Error("API Keys delete not implemented for server mode");
      }
    },
    regenerate: async (projectId: string, keyId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.projectsHttpClient!.regenerateProjectApiKey(
          projectId,
          keyId
        );
        return response.data || null;
      } else {
        throw new Error("API Keys regenerate not implemented for server mode");
      }
    },
    validateKey: async (
      apiKey: string
    ): Promise<{
      valid: boolean;
      key_info?: {
        id: string;
        name: string;
        type: string;
        scopes: string[];
        project_id?: string;
      };
    }> => {
      if (this.mode === "client") {
        const response = await this.authHttpClient!.validateApiKey(apiKey);
        return response.data || { valid: false };
      } else {
        throw new Error("API Keys validateKey not implemented for server mode");
      }
    },
  };

  /**
   * Health and diagnostics
   */
  health = {
    check: async (): Promise<{
      healthy: boolean;
      message: string;
      details?: Record<string, unknown>;
      version: string;
    }> => {
      if (this.mode === "client") {
        const response = await this.healthHttpClient!.check();
        return (
          response.data || {
            healthy: false,
            message: "Health check failed",
            version: "unknown",
          }
        );
      } else {
        throw new Error("Health check not implemented for server mode");
      }
    },
    checkDatabase: async (): Promise<{
      healthy: boolean;
      message: string;
      details?: Record<string, unknown>;
    }> => {
      if (this.mode === "client") {
        const response = await this.healthHttpClient!.checkDatabase();
        return (
          response.data || {
            healthy: false,
            message: "Database health check failed",
          }
        );
      } else {
        throw new Error("Health checkDatabase not implemented for server mode");
      }
    },
    runDiagnostics: async (): Promise<{
      tests: Array<{
        name: string;
        passed: boolean;
        message: string;
        duration: number;
      }>;
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
    }> => {
      if (this.mode === "client") {
        const response = await this.healthHttpClient!.runDiagnostics();
        return (
          response.data || {
            tests: [],
            summary: { total: 0, passed: 0, failed: 0, duration: 0 },
          }
        );
      } else {
        throw new Error(
          "Health runDiagnostics not implemented for server mode"
        );
      }
    },
    validateSchema: async (): Promise<{
      valid: boolean;
      issues: Array<{
        type: string;
        table?: string;
        field?: string;
        message: string;
        severity: "error" | "warning" | "info";
      }>;
    }> => {
      if (this.mode === "client") {
        const response = await this.healthHttpClient!.validateSchema();
        return response.data || { valid: false, issues: [] };
      } else {
        throw new Error(
          "Health validateSchema not implemented for server mode"
        );
      }
    },
    autoFix: async (): Promise<{
      success: boolean;
      fixes_applied: number;
      details: string[];
      remaining_issues: number;
    }> => {
      if (this.mode === "client") {
        const response = await this.healthHttpClient!.autoFix();
        if (response.data) {
          return {
            success: response.data.success,
            fixes_applied: response.data.fixed_issues?.length || 0,
            details: response.data.fixed_issues || [],
            remaining_issues: 0, // We don't have this info from the HTTP client
          };
        }
        return {
          success: false,
          fixes_applied: 0,
          details: [],
          remaining_issues: 0,
        };
      } else {
        throw new Error("Health autoFix not implemented for server mode");
      }
    },
    migrate: async (): Promise<{
      success: boolean;
      migrations_applied: number;
      details: string[];
    }> => {
      if (this.mode === "client") {
        const response = await this.healthHttpClient!.runMigrations();
        if (response.data) {
          return {
            success: response.data.success,
            migrations_applied: response.data.applied_migrations?.length || 0,
            details: response.data.applied_migrations || [],
          };
        }
        return { success: false, migrations_applied: 0, details: [] };
      } else {
        throw new Error("Health migrate not implemented for server mode");
      }
    },
    getStats: async (): Promise<{
      database: {
        size_bytes: number;
        tables_count: number;
        connections: number;
        uptime: number;
      };
      system: {
        memory_usage: number;
        cpu_usage: number;
        disk_usage: number;
      };
    }> => {
      if (this.mode === "client") {
        const response = await this.healthHttpClient!.getSystemInfo();
        if (response.data) {
          return {
            database: {
              size_bytes: 0, // We don't have this info from system info
              tables_count: 0, // We don't have this info from system info
              connections: response.data.network?.connections || 0,
              uptime: response.data.uptime || 0,
            },
            system: {
              memory_usage: response.data.memory?.percentage || 0,
              cpu_usage: response.data.cpu?.usage || 0,
              disk_usage: response.data.disk?.percentage || 0,
            },
          };
        }
        return {
          database: {
            size_bytes: 0,
            tables_count: 0,
            connections: 0,
            uptime: 0,
          },
          system: { memory_usage: 0, cpu_usage: 0, disk_usage: 0 },
        };
      } else {
        throw new Error("Health getStats not implemented for server mode");
      }
    },
  };

  /**
   * System management
   */
  system = {
    getSettings: async (): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.getSettings();
        return response.data || null;
      } else {
        throw new Error("System getSettings not implemented for server mode");
      }
    },
    updateSettings: async (updates: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.updateSettings(updates);
        return response.data || null;
      } else {
        throw new Error(
          "System updateSettings not implemented for server mode"
        );
      }
    },
    testEmailConfig: async (
      emailConfig: any
    ): Promise<{ success: boolean; message?: string }> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.testEmailConfig(
          emailConfig
        );
        return response.data || { success: false };
      } else {
        throw new Error(
          "System testEmailConfig not implemented for server mode"
        );
      }
    },
    getSystemInfo: async (): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.getSystemInfo();
        return response.data || null;
      } else {
        throw new Error("System getSystemInfo not implemented for server mode");
      }
    },
    runMaintenance: async (): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.runMaintenance();
        return response.data || null;
      } else {
        throw new Error(
          "System runMaintenance not implemented for server mode"
        );
      }
    },
    backupSystem: async (): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.backupSystem();
        return response.data || null;
      } else {
        throw new Error("System backupSystem not implemented for server mode");
      }
    },
    getSystemUsers: async (): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.getSystemUsers();
        return response.data || [];
      } else {
        throw new Error(
          "System getSystemUsers not implemented for server mode"
        );
      }
    },
    createSystemUser: async (userData: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.createSystemUser(
          userData
        );
        return response.data || null;
      } else {
        throw new Error(
          "System createSystemUser not implemented for server mode"
        );
      }
    },
    updateSystemUser: async (userId: string, updates: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.updateSystemUser(
          userId,
          updates
        );
        return response.data || null;
      } else {
        throw new Error(
          "System updateSystemUser not implemented for server mode"
        );
      }
    },
    deleteSystemUser: async (userId: string): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.deleteSystemUser(userId);
        return { success: response.success };
      } else {
        throw new Error(
          "System deleteSystemUser not implemented for server mode"
        );
      }
    },
    getSystemLogs: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.getSystemLogs(options);
        return response.data || null;
      } else {
        throw new Error("System getSystemLogs not implemented for server mode");
      }
    },
    clearSystemLogs: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.systemHttpClient!.clearSystemLogs(options);
        return response.data || null;
      } else {
        throw new Error(
          "System clearSystemLogs not implemented for server mode"
        );
      }
    },
  };

  /**
   * Testing utilities
   */
  testing = {
    createTestProject: async () => {
      throw new Error("Testing methods not yet implemented");
    },
    cleanup: async () => {
      throw new Error("Testing methods not yet implemented");
    },
    runTests: async () => {
      throw new Error("Testing methods not yet implemented");
    },
    seedData: async () => {
      throw new Error("Testing methods not yet implemented");
    },
  };

  /**
   * Get the current mode
   */
  getMode(): Mode {
    return this.mode;
  }

  /**
   * Get configuration
   */
  getConfig(): KrapiConfig {
    return this.config;
  }

  /**
   * Close the connection and clean up resources
   */
  async close(): Promise<void> {
    if (this.mode === "server" && this.config.database?.end) {
      await this.config.database.end();
    }
    this.logger.info("KRAPI SDK connection closed");
  }
}

// Create a singleton instance
const krapiInstance = new KrapiWrapper();

// Export the singleton instance
export const krapi = krapiInstance;

// Also export the class for advanced usage
export { KrapiWrapper };

// Configuration type is exported at the interface declaration above
