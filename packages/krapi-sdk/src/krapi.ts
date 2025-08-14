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

import { DatabaseConnection, Logger } from "./core";

// Import HTTP clients
import { AuthHttpClient } from "./http-clients/auth-http-client";
import { ProjectsHttpClient } from "./http-clients/projects-http-client";
import { CollectionsHttpClient } from "./http-clients/collections-http-client";
// BaseHttpClient import removed - not directly used in wrapper

// Import database services
import { AuthService } from "./auth-service";
import { ProjectsService } from "./projects-service";
import { CollectionsService } from "./collections-service";
import { CollectionsSchemaManager } from "./collections-schema-manager";
import { UsersService } from "./users-service";
import { DatabaseHealthManager } from "./database-health";
// TODO: Uncomment when interfaces are completed
// import { StorageService } from "./storage-service";
// import { EmailService } from "./email-service";
// import { HealthService } from "./health-service";
// import { TestingService } from "./testing-service";
// import { AdminService } from "./admin-service";

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

import { KrapiSocketInterface } from "./socket-interface";

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
    uploadFile: async () => {
      throw new Error("Storage methods not yet implemented");
    },
    downloadFile: async () => {
      throw new Error("Storage methods not yet implemented");
    },
    getFile: async () => {
      throw new Error("Storage methods not yet implemented");
    },
    deleteFile: async () => {
      throw new Error("Storage methods not yet implemented");
    },
    getFiles: async () => {
      throw new Error("Storage methods not yet implemented");
    },
    createFolder: async () => {
      throw new Error("Storage methods not yet implemented");
    },
    getFolders: async () => {
      throw new Error("Storage methods not yet implemented");
    },
    deleteFolder: async () => {
      throw new Error("Storage methods not yet implemented");
    },
    getStatistics: async () => {
      throw new Error("Storage methods not yet implemented");
    },
    getFileUrl: async () => {
      throw new Error("Storage methods not yet implemented");
    },
  };

  /**
   * Email management
   */
  email = {
    getConfig: async () => {
      throw new Error("Email methods not yet implemented");
    },
    updateConfig: async () => {
      throw new Error("Email methods not yet implemented");
    },
    testConfig: async () => {
      throw new Error("Email methods not yet implemented");
    },
    getTemplates: async () => {
      throw new Error("Email methods not yet implemented");
    },
    getTemplate: async () => {
      throw new Error("Email methods not yet implemented");
    },
    createTemplate: async () => {
      throw new Error("Email methods not yet implemented");
    },
    updateTemplate: async () => {
      throw new Error("Email methods not yet implemented");
    },
    deleteTemplate: async () => {
      throw new Error("Email methods not yet implemented");
    },
    send: async () => {
      throw new Error("Email methods not yet implemented");
    },
    getHistory: async () => {
      throw new Error("Email methods not yet implemented");
    },
  };

  /**
   * API Keys management
   */
  apiKeys = {
    getAll: async () => {
      throw new Error("API Keys methods not yet implemented");
    },
    get: async () => {
      throw new Error("API Keys methods not yet implemented");
    },
    create: async () => {
      throw new Error("API Keys methods not yet implemented");
    },
    update: async () => {
      throw new Error("API Keys methods not yet implemented");
    },
    delete: async () => {
      throw new Error("API Keys methods not yet implemented");
    },
    regenerate: async () => {
      throw new Error("API Keys methods not yet implemented");
    },
    validateKey: async () => {
      throw new Error("API Keys methods not yet implemented");
    },
  };

  /**
   * Health management
   */
  health = {
    check: async () => {
      throw new Error("Health methods not yet implemented");
    },
    checkDatabase: async () => {
      throw new Error("Health methods not yet implemented");
    },
    runDiagnostics: async () => {
      throw new Error("Health methods not yet implemented");
    },
    validateSchema: async () => {
      throw new Error("Health methods not yet implemented");
    },
    autoFix: async () => {
      throw new Error("Health methods not yet implemented");
    },
    migrate: async () => {
      throw new Error("Health methods not yet implemented");
    },
    getStats: async () => {
      throw new Error("Health methods not yet implemented");
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
