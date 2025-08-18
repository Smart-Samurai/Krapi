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

import { AdminService } from "./admin-service";
import { AuthService } from "./auth-service";
import { CollectionsSchemaManager } from "./collections-schema-manager";
import { CollectionsService } from "./collections-service";
import { DatabaseConnection, Logger } from "./core";
import { DatabaseHealthManager } from "./database-health";
import { AdminHttpClient } from "./http-clients/admin-http-client";
import { AuthHttpClient } from "./http-clients/auth-http-client";
import { ChangelogHttpClient } from "./http-clients/changelog-http-client";
import { CollectionsHttpClient } from "./http-clients/collections-http-client";
import { EmailHttpClient } from "./http-clients/email-http-client";
import { HealthHttpClient } from "./http-clients/health-http-client";
import { ProjectsHttpClient } from "./http-clients/projects-http-client";
import { StorageHttpClient } from "./http-clients/storage-http-client";
import { SystemHttpClient } from "./http-clients/system-http-client";
import { TestingHttpClient } from "./http-clients/testing-http-client";
import { ProjectsService } from "./projects-service";
import { KrapiSocketInterface } from "./socket-interface";
import { FileUrlRequest } from "./storage-service";
import { UsersService } from "./users-service";

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
  private testingHttpClient?: TestingHttpClient;
  private adminHttpClient?: AdminHttpClient;
  private changelogHttpClient?: ChangelogHttpClient;

  // Database services (for server mode)
  private adminService?: AdminService;
  private authService?: AuthService;
  private projectsService?: ProjectsService;
  private collectionsService?: CollectionsService;
  private collectionsSchemaManager?: CollectionsSchemaManager;
  private usersService?: UsersService;
  private databaseHealthManager?: DatabaseHealthManager;
  // Note: storageService, emailService, healthService, testingService
  // will be implemented when their interfaces are completed
  // private storageService?: StorageService;
  // private emailService?: EmailService;
  // private healthService?: HealthService;
  // private testingService?: TestingService;

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
    this.testingHttpClient = new TestingHttpClient(httpConfig);
    this.adminHttpClient = new AdminHttpClient(httpConfig);
    this.changelogHttpClient = new ChangelogHttpClient(httpConfig);
  }

  /**
   * Initialize database services for server mode
   */
  private async initializeServerMode(): Promise<void> {
    if (!this.config.database) return;

    const db = this.config.database;

    this.adminService = new AdminService(db, this.logger);
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
  }

  /**
   * Authentication methods
   *
   * Provides user authentication, session management, and API key operations.
   * All methods work identically in both client and server environments.
   */
  auth = {
    /**
     * Authenticate user with username and password
     *
     * @param username - The user's username or email
     * @param password - The user's password
     * @param remember_me - Optional: Whether to create a longer-lived session (default: false)
     * @returns Promise resolving to session details including user info and scopes
     *
     * @example
     * ```typescript
     * const session = await krapi.auth.login('user@example.com', 'password123');
     * console.log(session.user); // User information
     * console.log(session.scopes); // User's access scopes
     * ```
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
     * Create session from API key
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
        const response = await this.authHttpClient!.createSession(apiKey);
        return (
          response.data || {
            session_token: "",
            expires_at: "",
            user_type: "admin",
            scopes: [],
          }
        );
      } else {
        return this.authService!.createSessionFromApiKey(apiKey);
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
   *
   * Manage KRAPI projects including creation, updates, deletion, and configuration.
   * All methods work identically in both client and server modes.
   */
  projects = {
    /**
     * Create a new project
     *
     * @param projectData - Project configuration data
     * @param projectData.name - Required: Unique project name
     * @param projectData.description - Optional: Project description
     * @param projectData.settings - Optional: Project-specific settings and configuration
     * @returns Promise resolving to the created project object
     *
     * @example
     * ```typescript
     * const project = await krapi.projects.create({
     *   name: 'My Awesome Project',
     *   description: 'A project for managing user data',
     *   settings: { maxUsers: 1000, enableAnalytics: true }
     * });
     * console.log(project.id); // New project ID
     * ```
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
     *
     * @param projectId - The unique identifier of the project to retrieve
     * @returns Promise resolving to the project object or null if not found
     *
     * @example
     * ```typescript
     * const project = await krapi.projects.get('proj_12345');
     * if (project) {
     *   console.log(project.name); // Project name
     *   console.log(project.description); // Project description
     * }
     * ```
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
     *
     * @param projectId - The unique identifier of the project to update
     * @param updates - Object containing the fields to update
     * @returns Promise resolving to the updated project object
     *
     * @example
     * ```typescript
     * const updatedProject = await krapi.projects.update('proj_12345', {
     *   description: 'Updated project description',
     *   settings: { maxUsers: 2000, enableAnalytics: false }
     * });
     * console.log(updatedProject.description); // Updated description
     * ```
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
     *
     * @param projectId - The unique identifier of the project to delete
     * @returns Promise resolving to deletion status
     *
     * @example
     * ```typescript
     * const result = await krapi.projects.delete('proj_12345');
     * if (result.success) {
     *   console.log('Project deleted successfully');
     * }
     * ```
     *
     * @warning This action is irreversible and will delete all associated data
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
     *
     * @param options - Optional pagination and filtering parameters
     * @param options.limit - Maximum number of projects to return (default: all)
     * @param options.offset - Number of projects to skip for pagination
     * @returns Promise resolving to array of project objects
     *
     * @example
     * ```typescript
     * // Get all projects
     * const allProjects = await krapi.projects.getAll();
     *
     * // Get projects with pagination
     * const projects = await krapi.projects.getAll({ limit: 10, offset: 20 });
     * console.log(projects.length); // Maximum 10 projects
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @returns Promise resolving to project statistics including counts and metrics
     *
     * @example
     * ```typescript
     * const stats = await krapi.projects.getStatistics('proj_12345');
     * console.log(`Total collections: ${stats.total_collections}`);
     * console.log(`Total documents: ${stats.total_documents}`);
     * console.log(`Storage used: ${stats.storage_used} bytes`);
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @returns Promise resolving to project settings configuration
     *
     * @example
     * ```typescript
     * const settings = await krapi.projects.getSettings('proj_12345');
     * console.log('CORS origins:', settings.cors_origins);
     * console.log('Rate limit:', settings.rate_limit);
     * console.log('Storage config:', settings.storage);
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @param settings - Object containing the settings to update
     * @returns Promise resolving to the updated project settings
     *
     * @example
     * ```typescript
     * const updatedSettings = await krapi.projects.updateSettings('proj_12345', {
     *   cors_origins: ['https://myapp.com', 'https://admin.myapp.com'],
     *   rate_limit: { requests_per_minute: 1000 },
     *   storage: { max_file_size: 10485760 } // 10MB
     * });
     * console.log('Settings updated successfully');
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @param options - Optional filtering and pagination parameters
     * @param options.limit - Maximum number of activity entries to return
     * @param options.offset - Number of entries to skip for pagination
     * @param options.action_type - Filter by specific action type (e.g., 'create', 'update', 'delete')
     * @param options.start_date - Filter activities from this date (ISO string)
     * @param options.end_date - Filter activities until this date (ISO string)
     * @returns Promise resolving to array of activity log entries
     *
     * @example
     * ```typescript
     * // Get all recent activity
     * const activity = await krapi.projects.getActivity('proj_12345', { limit: 50 });
     *
     * // Get specific type of activity within date range
     * const updates = await krapi.projects.getActivity('proj_12345', {
     *   action_type: 'update',
     *   start_date: '2024-01-01T00:00:00Z',
     *   end_date: '2024-01-31T23:59:59Z'
     * });
     * ```
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
   *
   * Manage data collections within projects including schema definition, field configuration,
   * indexing, and validation rules. All methods work identically in both client and server modes.
   */
  collections = {
    /**
     * Create a new collection
     *
     * @param projectId - The unique identifier of the project
     * @param collectionData - Collection configuration data
     * @param collectionData.name - Required: Unique collection name within the project
     * @param collectionData.description - Optional: Collection description
     * @param collectionData.fields - Required: Array of field definitions
     * @param collectionData.fields[].name - Field name (must be unique within collection)
     * @param collectionData.fields[].type - Field data type (e.g., 'string', 'number', 'boolean', 'date', 'json')
     * @param collectionData.fields[].required - Whether the field is required (default: false)
     * @param collectionData.fields[].unique - Whether the field value must be unique (default: false)
     * @param collectionData.fields[].indexed - Whether to create a database index (default: false)
     * @param collectionData.fields[].default - Default value for the field
     * @param collectionData.fields[].validation - Field validation rules
     * @param collectionData.indexes - Optional: Custom database indexes
     * @returns Promise resolving to the created collection object
     *
     * @example
     * ```typescript
     * const collection = await krapi.collections.create('proj_12345', {
     *   name: 'users',
     *   description: 'User accounts and profiles',
     *   fields: [
     *     { name: 'email', type: 'string', required: true, unique: true, indexed: true },
     *     { name: 'username', type: 'string', required: true, unique: true },
     *     { name: 'age', type: 'number', validation: { min: 13, max: 120 } },
     *     { name: 'profile', type: 'json', required: false }
     *   ],
     *   indexes: [
     *     { name: 'idx_username_email', fields: ['username', 'email'], unique: true }
     *   ]
     * });
     * console.log(`Collection created: ${collection.name}`);
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection to retrieve
     * @returns Promise resolving to the collection object or null if not found
     *
     * @example
     * ```typescript
     * const collection = await krapi.collections.get('proj_12345', 'users');
     * if (collection) {
     *   console.log(`Collection: ${collection.name}`);
     *   console.log(`Fields: ${collection.fields.length}`);
     *   console.log(`Indexes: ${collection.indexes?.length || 0}`);
     * }
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @returns Promise resolving to array of collection objects
     *
     * @example
     * ```typescript
     * const collections = await krapi.collections.getAll('proj_12345');
     * console.log(`Project has ${collections.length} collections:`);
     * collections.forEach(collection => {
     *   console.log(`- ${collection.name}: ${collection.description || 'No description'}`);
     * });
     * ```
     */
    getAll: async (
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        search?: string;
      }
    ): Promise<any[]> => {
      if (this.mode === "client") {
        const response =
          await this.collectionsHttpClient!.getProjectCollections(
            projectId,
            options
          );
        return response.data || [];
      } else {
        const collections =
          await this.collectionsSchemaManager!.getCollections();
        return collections.filter((c) => c.project_id === projectId);
      }
    },

    /**
     * Update collection
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection to update
     * @param updates - Object containing the fields to update
     * @param updates.description - Optional: New collection description
     * @param updates.fields - Optional: Updated field definitions (replaces all fields)
     * @param updates.indexes - Optional: Updated index definitions (replaces all indexes)
     * @returns Promise resolving to the updated collection object
     *
     * @example
     * ```typescript
     * const updatedCollection = await krapi.collections.update('proj_12345', 'users', {
     *   description: 'Updated user collection with new fields',
     *   fields: [
     *     { name: 'email', type: 'string', required: true, unique: true },
     *     { name: 'username', type: 'string', required: true, unique: true },
     *     { name: 'full_name', type: 'string', required: true },
     *     { name: 'age', type: 'number', validation: { min: 13, max: 120 } },
     *     { name: 'profile', type: 'json', required: false }
     *   ]
     * });
     * console.log('Collection updated successfully');
     * ```
     *
     * @warning Updating fields will replace the entire field schema. Use with caution.
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
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection to delete
     * @returns Promise resolving to deletion status
     *
     * @example
     * ```typescript
     * const result = await krapi.collections.delete('proj_12345', 'old_users');
     * if (result.success) {
     *   console.log('Collection deleted successfully');
     * } else {
     *   console.log('Collection not found or deletion failed');
     * }
     * ```
     *
     * @warning This action is irreversible and will delete all associated documents and data
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
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection
     * @returns Promise resolving to the collection schema including fields and indexes
     *
     * @example
     * ```typescript
     * const schema = await krapi.collections.getSchema('proj_12345', 'users');
     * if (schema) {
     *   console.log('Collection fields:');
     *   schema.fields.forEach(field => {
     *     console.log(`- ${field.name}: ${field.type}${field.required ? ' (required)' : ''}`);
     *   });
     *
     *   console.log('Collection indexes:');
     *   schema.indexes?.forEach(index => {
     *     console.log(`- ${index.name}: [${index.fields.join(', ')}]${index.unique ? ' (unique)' : ''}`);
     *   });
     * }
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection to validate
     * @returns Promise resolving to validation results with any issues found
     *
     * @example
     * ```typescript
     * const validation = await krapi.collections.validateSchema('proj_12345', 'users');
     * if (validation.valid) {
     *   console.log('Schema is valid!');
     * } else {
     *   console.log('Schema validation issues found:');
     *   validation.issues.forEach(issue => {
     *     const severity = issue.severity.toUpperCase();
     *     const field = issue.field ? ` (${issue.field})` : '';
     *     console.log(`[${severity}]${field}: ${issue.message}`);
     *   });
     * }
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection
     * @returns Promise resolving to collection statistics including document count and storage usage
     *
     * @example
     * ```typescript
     * const stats = await krapi.collections.getStatistics('proj_12345', 'users');
     * console.log(`Total documents: ${stats.total_documents}`);
     * console.log(`Storage used: ${stats.storage_used} bytes`);
     * console.log(`Last updated: ${stats.last_updated}`);
     * console.log(`Field count: ${stats.field_count}`);
     * ```
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
   *
   * Manage individual data records within collections including CRUD operations,
   * field validation, and data relationships. All methods work identically in both client and server modes.
   */
  documents = {
    /**
     * Create a new document
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection to add the document to
     * @param documentData - Document data and metadata
     * @param documentData.data - Required: The actual document data (must conform to collection schema)
     * @param documentData.created_by - Optional: User ID who created the document
     * @returns Promise resolving to the created document object with generated ID
     *
     * @example
     * ```typescript
     * const newUser = await krapi.documents.create('proj_12345', 'users', {
     *   data: {
     *     email: 'john.doe@example.com',
     *     username: 'johndoe',
     *     full_name: 'John Doe',
     *     age: 30,
     *     profile: { bio: 'Software developer', location: 'San Francisco' }
     *   },
     *   created_by: 'admin_user_123'
     * });
     * console.log(`Document created with ID: ${newUser.id}`);
     * console.log(`Email: ${newUser.data.email}`);
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection containing the document
     * @param documentId - The unique identifier of the document to retrieve
     * @returns Promise resolving to the document object or null if not found
     *
     * @example
     * ```typescript
     * const user = await krapi.documents.get('proj_12345', 'users', 'doc_67890');
     * if (user) {
     *   console.log(`User: ${user.data.full_name}`);
     *   console.log(`Email: ${user.data.email}`);
     *   console.log(`Created: ${user.created_at}`);
     *   console.log(`Created by: ${user.created_by}`);
     * } else {
     *   console.log('Document not found');
     * }
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection containing the document
     * @param documentId - The unique identifier of the document to update
     * @param updateData - Updated document data and metadata
     * @param updateData.data - Required: The updated document data (must conform to collection schema)
     * @param updateData.updated_by - Optional: User ID who performed the update
     * @returns Promise resolving to the updated document object
     *
     * @example
     * ```typescript
     * const updatedUser = await krapi.documents.update('proj_12345', 'users', 'doc_67890', {
     *   data: {
     *     full_name: 'John Smith', // Updated name
     *     age: 31, // Updated age
     *     profile: { bio: 'Senior software developer', location: 'New York' } // Updated profile
     *   },
     *   updated_by: 'admin_user_123'
     * });
     * console.log(`Document updated at: ${updatedUser.updated_at}`);
     * console.log(`Updated by: ${updatedUser.updated_by}`);
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection containing the document
     * @param documentId - The unique identifier of the document to delete
     * @param deletedBy - Optional: User ID who performed the deletion
     * @returns Promise resolving to deletion status
     *
     * @example
     * ```typescript
     * const result = await krapi.documents.delete('proj_12345', 'users', 'doc_67890', 'admin_user_123');
     * if (result.success) {
     *   console.log('Document deleted successfully');
     * } else {
     *   console.log('Document not found or deletion failed');
     * }
     * ```
     *
     * @warning This action is irreversible and will permanently remove the document
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
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection
     * @param options - Optional filtering, pagination, and sorting parameters
     * @param options.filter - Optional: Filter documents by field values
     * @param options.limit - Optional: Maximum number of documents to return
     * @param options.offset - Optional: Number of documents to skip for pagination
     * @param options.orderBy - Optional: Field name to sort by
     * @param options.order - Optional: Sort order ('asc' or 'desc', default: 'asc')
     * @returns Promise resolving to array of document objects
     *
     * @example
     * ```typescript
     * // Get all documents
     * const allUsers = await krapi.documents.getAll('proj_12345', 'users');
     *
     * // Get documents with filtering and pagination
     * const activeUsers = await krapi.documents.getAll('proj_12345', 'users', {
     *   filter: { status: 'active' },
     *   limit: 50,
     *   offset: 100,
     *   orderBy: 'created_at',
     *   order: 'desc'
     * });
     *
     * console.log(`Found ${activeUsers.length} active users`);
     * ```
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
     *
     * @param projectId - The unique identifier of the project
     * @param collectionName - The name of the collection to search in
     * @param query - Search query parameters
     * @param query.text - Optional: Full-text search query
     * @param query.fields - Optional: Specific fields to search in
     * @param query.filters - Optional: Additional field-based filters
     * @param query.limit - Optional: Maximum number of results to return
     * @param query.offset - Optional: Number of results to skip for pagination
     * @returns Promise resolving to array of matching document objects
     *
     * @example
     * ```typescript
     * // Full-text search across all fields
     * const results = await krapi.documents.search('proj_12345', 'users', {
     *   text: 'software developer',
     *   limit: 20
     * });
     *
     * // Search in specific fields with filters
     * const developers = await krapi.documents.search('proj_12345', 'users', {
     *   fields: ['profile.bio', 'profile.skills'],
     *   filters: { location: 'San Francisco', status: 'active' },
     *   text: 'python javascript',
     *   limit: 50
     * });
     *
     * console.log(`Found ${results.length} matching documents`);
     * ```
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
   *
   * Manage file storage including upload, download, organization, and metadata.
   * Supports file versioning, permissions, and public/private access control.
   * All methods work identically in both client and server modes.
   */
  storage = {
    /**
     * Upload a file to project storage
     *
     * @param projectId - The unique identifier of the project
     * @param file - The file to upload (File object or Blob)
     * @param options - Optional upload configuration
     * @param options.folder_id - Optional: ID of the folder to upload to
     * @param options.tags - Optional: Array of tags to associate with the file
     * @param options.metadata - Optional: Additional metadata for the file
     * @param options.is_public - Optional: Whether the file should be publicly accessible (default: false)
     * @returns Promise resolving to the uploaded file object with storage details
     *
     * @example
     * ```typescript
     * // Basic file upload
     * const fileInput = document.getElementById('fileInput');
     * const file = fileInput.files[0];
     *
     * const uploadedFile = await krapi.storage.uploadFile('proj_12345', file, {
     *   tags: ['profile', 'avatar'],
     *   metadata: { description: 'User profile picture' },
     *   is_public: true
     * });
     *
     * console.log(`File uploaded: ${uploadedFile.filename}`);
     * console.log(`File ID: ${uploadedFile.id}`);
     * console.log(`Storage path: ${uploadedFile.storage_path}`);
     * ```
     */
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
    /**
     * Download a file from project storage
     *
     * @param projectId - The unique identifier of the project
     * @param fileId - The unique identifier of the file to download
     * @returns Promise resolving to the file data (Blob or Buffer)
     *
     * @example
     * ```typescript
     * // Download a file
     * const fileData = await krapi.storage.downloadFile('proj_12345', 'file_67890');
     *
     * // Create download link for browser
     * const url = URL.createObjectURL(fileData);
     * const a = document.createElement('a');
     * a.href = url;
     * a.download = 'downloaded_file.pdf';
     * a.click();
     * URL.revokeObjectURL(url);
     * ```
     */
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
    /**
     * Get file metadata and information
     *
     * @param projectId - The unique identifier of the project
     * @param fileId - The unique identifier of the file
     * @returns Promise resolving to file metadata object
     *
     * @example
     * ```typescript
     * const fileInfo = await krapi.storage.getFile('proj_12345', 'file_67890');
     * console.log(`File: ${fileInfo.filename}`);
     * console.log(`Size: ${fileInfo.size} bytes`);
     * console.log(`Type: ${fileInfo.mime_type}`);
     * console.log(`Uploaded: ${fileInfo.created_at}`);
     * console.log(`Tags: ${fileInfo.tags?.join(', ') || 'None'}`);
     * console.log(`Public: ${fileInfo.is_public ? 'Yes' : 'No'}`);
     * ```
     */
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
    /**
     * Delete a file from project storage
     *
     * @param projectId - The unique identifier of the project
     * @param fileId - The unique identifier of the file to delete
     * @returns Promise resolving to deletion status
     *
     * @example
     * ```typescript
     * const result = await krapi.storage.deleteFile('proj_12345', 'file_67890');
     * if (result.success) {
     *   console.log('File deleted successfully');
     * } else {
     *   console.log('File deletion failed');
     * }
     * ```
     *
     * @warning This action is irreversible and will permanently remove the file
     */
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
    /**
     * Get files from project storage with filtering and pagination
     *
     * @param projectId - The unique identifier of the project
     * @param options - Optional filtering and pagination parameters
     * @param options.folder - Optional: Folder path or ID to filter by
     * @param options.limit - Optional: Maximum number of files to return
     * @param options.offset - Optional: Number of files to skip for pagination
     * @param options.search - Optional: Search query to filter files by name or metadata
     * @param options.type - Optional: Filter by MIME type (e.g., 'image/*', 'application/pdf')
     * @returns Promise resolving to array of file objects
     *
     * @example
     * ```typescript
     * // Get all files
     * const allFiles = await krapi.storage.getFiles('proj_12345');
     *
     * // Get images with pagination
     * const images = await krapi.storage.getFiles('proj_12345', {
     *   type: 'image/*',
     *   limit: 20,
     *   offset: 40
     * });
     *
     * // Search for specific files
     * const documents = await krapi.storage.getFiles('proj_12345', {
     *   search: 'report',
     *   type: 'application/pdf'
     * });
     *
     * console.log(`Found ${images.length} image files`);
     * ```
     */
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
    /**
     * Create a new folder in project storage
     *
     * @param projectId - The unique identifier of the project
     * @param folderData - Folder configuration data
     * @param folderData.name - Required: Name of the folder to create
     * @param folderData.parent_folder_id - Optional: ID of the parent folder (creates nested structure)
     * @param folderData.metadata - Optional: Additional metadata for the folder
     * @returns Promise resolving to the created folder object
     *
     * @example
     * ```typescript
     * // Create a root-level folder
     * const imagesFolder = await krapi.storage.createFolder('proj_12345', {
     *   name: 'images',
     *   metadata: { description: 'User uploaded images' }
     * });
     *
     * // Create a nested folder
     * const avatarsFolder = await krapi.storage.createFolder('proj_12345', {
     *   name: 'avatars',
     *   parent_folder_id: imagesFolder.id,
     *   metadata: { description: 'User profile pictures' }
     * });
     *
     * console.log(`Created folder: ${imagesFolder.name}`);
     * console.log(`Nested folder: ${avatarsFolder.name}`);
     * ```
     */
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
      options?: FileUrlRequest
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
   * Admin management
   */
  admin = {
    // User Management
    getAllUsers: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.getAllUsers(options);
        return response.data || null;
      } else {
        throw new Error("Admin getAllUsers not implemented for server mode");
      }
    },
    getUser: async (userId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.getUser(userId);
        return response.data || null;
      } else {
        throw new Error("Admin getUser not implemented for server mode");
      }
    },
    createUser: async (userData: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.createUser(userData);
        return response.data || null;
      } else {
        throw new Error("Admin createUser not implemented for server mode");
      }
    },
    updateUser: async (userId: string, updates: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.updateUser(
          userId,
          updates
        );
        return response.data || null;
      } else {
        throw new Error("Admin updateUser not implemented for server mode");
      }
    },
    deleteUser: async (userId: string): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.deleteUser(userId);
        return { success: response.success };
      } else {
        throw new Error("Admin deleteUser not implemented for server mode");
      }
    },
    updateUserRole: async (userId: string, role: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.updateUserRole(
          userId,
          role
        );
        return response.data || null;
      } else {
        throw new Error("Admin updateUserRole not implemented for server mode");
      }
    },
    updateUserPermissions: async (
      userId: string,
      permissions: string[]
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.updateUserPermissions(
          userId,
          permissions
        );
        return response.data || null;
      } else {
        throw new Error(
          "Admin updateUserPermissions not implemented for server mode"
        );
      }
    },
    activateUser: async (userId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.activateUser(userId);
        return response.data || null;
      } else {
        throw new Error("Admin activateUser not implemented for server mode");
      }
    },
    deactivateUser: async (userId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.deactivateUser(userId);
        return response.data || null;
      } else {
        throw new Error("Admin deactivateUser not implemented for server mode");
      }
    },

    // API Key Management
    createApiKey: async (
      userId: string,
      keyData: {
        name: string;
        permissions: string[];
        expires_at?: string;
      }
    ): Promise<{ key: string; data: any }> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.createApiKey(
          userId,
          keyData
        );
        return response.data || { key: "", data: null };
      } else {
        return this.adminService!.createApiKey(userId, keyData);
      }
    },

    // Project Management
    getAllProjects: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.getAllProjects(options);
        return response.data || null;
      } else {
        throw new Error("Admin getAllProjects not implemented for server mode");
      }
    },
    getProject: async (projectId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.getProject(projectId);
        return response.data || null;
      } else {
        throw new Error("Admin getProject not implemented for server mode");
      }
    },
    updateProject: async (projectId: string, updates: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.updateProject(
          projectId,
          updates
        );
        return response.data || null;
      } else {
        throw new Error("Admin updateProject not implemented for server mode");
      }
    },
    deleteProject: async (projectId: string): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.deleteProject(projectId);
        return { success: response.success };
      } else {
        throw new Error("Admin deleteProject not implemented for server mode");
      }
    },
    suspendProject: async (
      projectId: string,
      reason?: string
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.suspendProject(
          projectId,
          reason
        );
        return response.data || null;
      } else {
        throw new Error("Admin suspendProject not implemented for server mode");
      }
    },
    activateProject: async (projectId: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.activateProject(projectId);
        return response.data || null;
      } else {
        throw new Error(
          "Admin activateProject not implemented for server mode"
        );
      }
    },

    // System Monitoring
    getSystemOverview: async (): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.getSystemOverview();
        return response.data || null;
      } else {
        throw new Error(
          "Admin getSystemOverview not implemented for server mode"
        );
      }
    },
    getSystemMetrics: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.getSystemMetrics(options);
        return response.data || null;
      } else {
        throw new Error(
          "Admin getSystemMetrics not implemented for server mode"
        );
      }
    },

    // Security Management
    getSecurityLogs: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.getSecurityLogs(options);
        return response.data || null;
      } else {
        throw new Error(
          "Admin getSecurityLogs not implemented for server mode"
        );
      }
    },
    getFailedLoginAttempts: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.getFailedLoginAttempts(
          options
        );
        return response.data || null;
      } else {
        throw new Error(
          "Admin getFailedLoginAttempts not implemented for server mode"
        );
      }
    },
    blockIP: async (
      ipAddress: string,
      reason: string,
      duration_hours?: number
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.blockIP(
          ipAddress,
          reason,
          duration_hours
        );
        return { success: response.success };
      } else {
        throw new Error("Admin blockIP not implemented for server mode");
      }
    },
    unblockIP: async (ipAddress: string): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.unblockIP(ipAddress);
        return { success: response.success };
      } else {
        throw new Error("Admin unblockIP not implemented for server mode");
      }
    },
    getBlockedIPs: async (): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.getBlockedIPs();
        return response.data || [];
      } else {
        throw new Error("Admin getBlockedIPs not implemented for server mode");
      }
    },

    // Maintenance Operations
    runSystemMaintenance: async (): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.runSystemMaintenance();
        return response.data || null;
      } else {
        throw new Error(
          "Admin runSystemMaintenance not implemented for server mode"
        );
      }
    },
    backupSystem: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.backupSystem(options);
        return response.data || null;
      } else {
        throw new Error("Admin backupSystem not implemented for server mode");
      }
    },
    restoreSystem: async (backupPath: string): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.restoreSystem(backupPath);
        return response.data || null;
      } else {
        throw new Error("Admin restoreSystem not implemented for server mode");
      }
    },
    clearOldLogs: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.adminHttpClient!.clearOldLogs(options);
        return response.data || null;
      } else {
        throw new Error("Admin clearOldLogs not implemented for server mode");
      }
    },
  };

  /**
   * Changelog management
   */
  changelog = {
    // Project Changelog
    getProjectChangelog: async (
      projectId: string,
      options?: any
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.changelogHttpClient!.getProjectChangelog(
          projectId,
          options
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog getProjectChangelog not implemented for server mode"
        );
      }
    },

    // Collection Changelog
    getCollectionChangelog: async (
      projectId: string,
      collectionName: string,
      options?: any
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.changelogHttpClient!.getCollectionChangelog(
          projectId,
          collectionName,
          options
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog getCollectionChangelog not implemented for server mode"
        );
      }
    },

    // Document Changelog
    getDocumentChangelog: async (
      projectId: string,
      collectionName: string,
      documentId: string,
      options?: any
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.changelogHttpClient!.getDocumentChangelog(
          projectId,
          collectionName,
          documentId,
          options
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog getDocumentChangelog not implemented for server mode"
        );
      }
    },

    // User Activity
    getUserActivity: async (
      projectId: string,
      userId: string,
      options?: any
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.changelogHttpClient!.getUserActivity(
          projectId,
          userId,
          options
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog getUserActivity not implemented for server mode"
        );
      }
    },

    // System-wide Changelog (Admin only)
    getSystemChangelog: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.changelogHttpClient!.getSystemChangelog(
          options
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog getSystemChangelog not implemented for server mode"
        );
      }
    },

    // Changelog Statistics
    getChangelogStatistics: async (
      projectId: string,
      options?: any
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.changelogHttpClient!.getChangelogStatistics(
          projectId,
          options
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog getChangelogStatistics not implemented for server mode"
        );
      }
    },

    // Export Changelog
    exportChangelog: async (projectId: string, options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.changelogHttpClient!.exportChangelog(
          projectId,
          options
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog exportChangelog not implemented for server mode"
        );
      }
    },

    // Purge Old Changelog Entries (Admin only)
    purgeOldChangelog: async (options?: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.changelogHttpClient!.purgeOldChangelog(
          options
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog purgeOldChangelog not implemented for server mode"
        );
      }
    },
  };

  /**
   * Testing utilities
   */
  testing = {
    createTestProject: async (options?: {
      name?: string;
      with_collections?: boolean;
      with_documents?: boolean;
      document_count?: number;
    }): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.createTestProject(
          options
        );
        return response.data || null;
      } else {
        throw new Error(
          "Testing createTestProject not implemented for server mode"
        );
      }
    },
    cleanup: async (
      projectId?: string
    ): Promise<{
      success: boolean;
      deleted: {
        projects: number;
        collections: number;
        documents: number;
        files: number;
        users: number;
      };
    }> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.cleanup(projectId);
        return (
          response.data || {
            success: false,
            deleted: {
              projects: 0,
              collections: 0,
              documents: 0,
              files: 0,
              users: 0,
            },
          }
        );
      } else {
        throw new Error("Testing cleanup not implemented for server mode");
      }
    },
    runTests: async (
      testSuite?: string
    ): Promise<{
      results: Array<{
        suite: string;
        tests: Array<{
          name: string;
          passed: boolean;
          error?: string;
          duration: number;
        }>;
      }>;
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
    }> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.runTests(testSuite);
        return (
          response.data || {
            results: [],
            summary: { total: 0, passed: 0, failed: 0, duration: 0 },
          }
        );
      } else {
        throw new Error("Testing runTests not implemented for server mode");
      }
    },
    seedData: async (
      projectId: string,
      seedType: string,
      options?: Record<string, unknown>
    ): Promise<{
      success: boolean;
      created: Record<string, number>;
    }> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.seedData(
          projectId,
          seedType,
          options
        );
        return response.data || { success: false, created: {} };
      } else {
        throw new Error("Testing seedData not implemented for server mode");
      }
    },
    getTestProjects: async (): Promise<any[]> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.getTestProjects();
        return response.data || [];
      } else {
        throw new Error(
          "Testing getTestProjects not implemented for server mode"
        );
      }
    },
    deleteTestProject: async (
      projectId: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.deleteTestProject(
          projectId
        );
        return { success: response.success };
      } else {
        throw new Error(
          "Testing deleteTestProject not implemented for server mode"
        );
      }
    },
    resetTestData: async (
      projectId?: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.resetTestData(projectId);
        return { success: response.success };
      } else {
        throw new Error(
          "Testing resetTestData not implemented for server mode"
        );
      }
    },
    runScenario: async (
      scenarioName: string,
      options?: Record<string, unknown>
    ): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.runScenario(
          scenarioName,
          options
        );
        return response.data || null;
      } else {
        throw new Error("Testing runScenario not implemented for server mode");
      }
    },
    getAvailableScenarios: async (): Promise<string[]> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.getAvailableScenarios();
        return response.data || [];
      } else {
        throw new Error(
          "Testing getAvailableScenarios not implemented for server mode"
        );
      }
    },
    runPerformanceTest: async (testConfig: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.runPerformanceTest(
          testConfig
        );
        return response.data || null;
      } else {
        throw new Error(
          "Testing runPerformanceTest not implemented for server mode"
        );
      }
    },
    runLoadTest: async (testConfig: any): Promise<any> => {
      if (this.mode === "client") {
        const response = await this.testingHttpClient!.runLoadTest(testConfig);
        return response.data || null;
      } else {
        throw new Error("Testing runLoadTest not implemented for server mode");
      }
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
  getConfig(): KrapiConfig & { mode: Mode } {
    return { ...this.config, mode: this.mode };
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
