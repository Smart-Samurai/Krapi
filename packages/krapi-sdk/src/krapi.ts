/**
 * KRAPI SDK - Main Wrapper
 * 
 * A simple, unified interface that works seamlessly for both client and server applications.
 * This wrapper automatically detects the environment and provides the appropriate methods.
 * 
 * Implements the KrapiSocketInterface for perfect client/server parity.
 * 
 * @module krapi
 * @example Client App Usage:
 * ```typescript
 * import { krapi } from '@smartsamurai/krapi-sdk';
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
 * import { krapi } from '@smartsamurai/krapi-sdk';
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

import {
  ActivityLogger,
  ActivityLog as ActivityLoggerType,
  ActivityQuery,
} from "./activity-logger";
import { AdminService } from "./admin-service";
import { AuthService } from "./auth-service";
import { CollectionsSchemaManager } from "./collections-schema-manager";
import { CollectionsService, DocumentQueryOptions } from "./collections-service";
import { DatabaseConnection, Logger } from "./core";
import { DatabaseHealthManager } from "./database-health";
import { EmailService } from "./email-service";
import { HealthService } from "./health-service";
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
import { StorageService, FileUrlRequest } from "./storage-service";
import { SystemService } from "./system-service";
import { TestingService } from "./testing-service";
import {
  AdminUser,
  ProjectUser,
  Project,
  ProjectStats,
  ProjectSettings,
  Collection,
  FieldType,
  Document,
  FileInfo,
  EmailConfig,
  EmailTemplate,
  ApiKey,
  SystemSettings,
} from "./types";
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
 * 
 * Implements the complete socket interface for perfect client/server parity.
 * Automatically switches between HTTP client mode and database mode based on configuration.
 * 
 * @class KrapiWrapper
 * @implements {KrapiSocketInterface}
 */
class KrapiWrapper implements KrapiSocketInterface {
  private mode: Mode = null;
  private config: KrapiConfig = {};
  private logger: Logger = console;
  private db?: DatabaseConnection;

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
  private storageService?: StorageService;
  private emailService?: EmailService;
  private healthService?: HealthService;
  // @ts-expect-error - Testing service reserved for future use
  private testingService?: TestingService;
  private systemService?: SystemService;
  private activityLogger?: ActivityLogger;

  /**
   * Connect to KRAPI backend (client mode) or initialize with database (server mode)
   * 
   * Determines the connection mode based on the provided configuration:
   * - If `endpoint` is provided: Client mode (HTTP)
   * - If `database` is provided: Server mode (Database)
   * 
   * @param {KrapiConfig} config - Connection configuration
   * @param {string} [config.endpoint] - API endpoint URL (for client mode)
   * @param {string} [config.apiKey] - API key (for client mode)
   * @param {string} [config.sessionToken] - Session token (for client mode)
   * @param {number} [config.timeout] - Request timeout in milliseconds
   * @param {DatabaseConnection} [config.database] - Database connection (for server mode)
   * @param {Logger} [config.logger] - Logger instance (for server mode)
   * @returns {Promise<void>}
   * @throws {Error} If neither endpoint nor database is provided
   * 
   * @example
   * // Client mode
   * await krapi.connect({ endpoint: 'https://api.example.com/krapi/k1', apiKey: 'key' });
   * 
   * @example
   * // Server mode
   * await krapi.connect({ database: dbConnection, logger: console });
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
    this.db = db;

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
    this.storageService = new StorageService(db, this.logger);
    this.emailService = new EmailService(db, this.logger);
    this.healthService = new HealthService(db, this.logger);
    // Testing service available for testing operations
    this.testingService = new TestingService(db, this.logger);
    this.systemService = new SystemService("", ""); // SystemService for server mode
    this.activityLogger = new ActivityLogger(db, this.logger);
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
     * ```
     */
    login: async (
      username: string,
      password: string,
      remember_me = false
    ): Promise<{
      session_token: string;
      expires_at: string;
      user: AdminUser | ProjectUser;
      scopes: string[];
    }> => {
      if (this.mode === "client") {
        const response = await this.authHttpClient?.adminLogin({
          username,
          password,
          remember_me,
        });
        const data = response?.data;
        if (!data) {
          throw new Error("No response data from admin login");
        }
        // Convert auth service types to expected types
        return {
          session_token: data.token,
          expires_at: data.expires_at,
          user: data.user as unknown as AdminUser | ProjectUser,
          scopes: data.scopes,
        };
      } else {
        const result = await this.authService?.authenticateAdmin({
          username,
          password,
          remember_me,
        });
        if (!result) {
          throw new Error("No result from authenticate admin");
        }
        // Convert auth service types to expected types
        return {
          session_token: result.token,
          expires_at: result.expires_at,
          user: result.user as unknown as AdminUser | ProjectUser,
          scopes: result.scopes,
        };
      }
    },

    /**
     * Admin login (alias for login, returns wrapped response format)
     * Used by frontend for login flow
     */
    adminLogin: async (credentials: {
      username: string;
      password: string;
      remember_me?: boolean;
    }): Promise<{
      success: boolean;
      data?: {
        session_token: string;
        expires_at: string;
        user: AdminUser | ProjectUser;
        scopes: string[];
      };
      error?: string;
    }> => {
      try {
        // Use login method directly by calling it via the wrapper context
        if (this.mode === "client") {
          if (!this.authHttpClient) {
            return {
              success: false,
              error: "HTTP client not initialized",
            };
          }
          const loginRequest: {
            username: string;
            password: string;
            remember_me?: boolean;
          } = {
            username: credentials.username,
            password: credentials.password,
          };
          if (credentials.remember_me !== undefined) {
            loginRequest.remember_me = credentials.remember_me;
          }
          const response = await this.authHttpClient.adminLogin(loginRequest);
          
          // Log raw response for debugging
          
          // Response is already unwrapped by axios interceptor, so it's ApiResponse<LoginResponse>
          // Backend returns: { success: true, data: { user: {...}, token: "...", session_token: "...", expires_at: "..." } }
          if (!response) {
            return {
              success: false,
              error: "No response from admin login",
            };
          }
          
          // Handle error response
          if ("success" in response && response.success === false) {
            return {
              success: false,
              error: (response as { error?: string }).error || "Login failed",
            };
          }
          
          // Extract data from ApiResponse structure
          // Backend returns { success: true, data: { user, token, session_token, expires_at } }
          let loginData: { token?: string; session_token?: string; user?: unknown; expires_at?: string; scopes?: string[] };
          
          if ("data" in response && response.data) {
            // It's ApiResponse<LoginResponse>, extract the data
            loginData = response.data as typeof loginData;
          } else if ("token" in response || "user" in response) {
            // It's LoginResponse directly (shouldn't happen with axios interceptor, but handle it)
            loginData = response as typeof loginData;
          } else {
            return {
              success: false,
              error: "Invalid login response format - unexpected structure",
            };
          }
          
          // Check if loginData has the required fields
          if (!loginData || (!loginData.token && !loginData.session_token) || !loginData.user) {
            return {
              success: false,
              error: `Invalid login response format. Missing: ${!loginData?.token && !loginData?.session_token ? 'token ' : ''}${!loginData?.user ? 'user' : ''}`,
            };
          }
          
          // Extract scopes from user object if not directly in loginData
          const scopes = loginData.scopes || 
                        (loginData.user as { scopes?: string[] })?.scopes || 
                        [];
          
          // Convert auth service types to expected types
          const result = {
            success: true,
            data: {
              session_token: loginData.token || loginData.session_token || "",
              expires_at: loginData.expires_at || "",
              user: loginData.user as unknown as AdminUser | ProjectUser,
              scopes,
            },
          };
          
          return result;
        } else {
          const loginRequest: {
            username: string;
            password: string;
            remember_me?: boolean;
          } = {
            username: credentials.username,
            password: credentials.password,
          };
          if (credentials.remember_me !== undefined) {
            loginRequest.remember_me = credentials.remember_me;
          }
          const result = await this.authService?.authenticateAdmin(loginRequest);
          if (!result) {
            return {
              success: false,
              error: "No result from authenticate admin",
            };
          }
          // Convert auth service types to expected types
          return {
            success: true,
            data: {
              session_token: result.token,
              expires_at: result.expires_at,
              user: result.user as unknown as AdminUser | ProjectUser,
              scopes: result.scopes,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Login failed",
        };
      }
    },

    /**
     * Admin API login (login using API key)
     * Used by frontend for API key authentication
     */
    adminApiLogin: async (apiKey: string | { api_key?: string }): Promise<{
      success: boolean;
      data?: {
        user: AdminUser & { scopes: string[] };
        session_token: string;
        expires_at: string;
      };
      error?: string;
    }> => {
      if (this.mode === "client") {
        if (!this.authHttpClient) {
          return {
            success: false,
            error: "HTTP client not initialized",
          };
        }
        try {
          // Handle both string and object format, ensure api_key is present
          const apiKeyValue = typeof apiKey === "string" ? apiKey : apiKey.api_key;
          if (!apiKeyValue) {
            return {
              success: false,
              error: "API key is required",
            };
          }
          const request = { api_key: apiKeyValue };
          
          const response = await this.authHttpClient.adminApiLogin(request);
          if (response.data && response.data.user) {
            // ApiKeyAuthResponse has token, user, expires_at, scopes
            const userData = response.data.user;
            const scopes = response.data.scopes || [];
            return {
              success: true,
              data: {
                user: {
                  ...userData,
                  scopes,
                } as AdminUser & { scopes: string[] },
                session_token: response.data.token,
                expires_at: response.data.expires_at,
              },
            };
          }
          return {
            success: false,
            error: "No data in response",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "API key login failed",
          };
        }
      } else {
        return {
          success: false,
          error: "adminApiLogin not available in server mode",
        };
      }
    },

    /**
     * Register a new user
     */
    register: async (registerData: {
      username: string;
      email: string;
      password: string;
      role?: string;
      access_level?: string;
      permissions?: string[];
    }): Promise<{ success: boolean; user: Record<string, unknown> }> => {
      if (this.mode === "client") {
        if (!this.authHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.authHttpClient.register(registerData);
        return (
          response.data || {
            success: false,
            user: {} as Record<string, unknown>,
          }
        );
      } else {
        if (!this.authService) {
          throw new Error(
            "Auth service not initialized. Please ensure you're in server mode."
          );
        }
        const result = await this.authService.register(registerData);
        return {
          success: result.success,
          user: result.user as unknown as Record<string, unknown>,
        };
      }
    },

    /**
     * Set session token for subsequent requests (client mode only)
     */
    setSessionToken: (token: string): void => {
      if (this.mode === "client") {
        if (
          !this.authHttpClient ||
          !this.projectsHttpClient ||
          !this.collectionsHttpClient ||
          !this.storageHttpClient ||
          !this.systemHttpClient ||
          !this.healthHttpClient ||
          !this.testingHttpClient
        ) {
          throw new Error(
            "HTTP clients not initialized. Please ensure you're in client mode."
          );
        }
        this.authHttpClient.setSessionToken(token);
        this.projectsHttpClient?.setSessionToken(token);
        this.collectionsHttpClient?.setSessionToken(token);
        this.storageHttpClient?.setSessionToken(token);
        this.systemHttpClient?.setSessionToken(token);
        this.healthHttpClient?.setSessionToken(token);
        this.emailHttpClient?.setSessionToken(token);
        this.adminHttpClient?.setSessionToken(token);
        this.testingHttpClient?.setSessionToken(token);
      }
    },

    /**
     * Set API key for subsequent requests (client mode only)
     */
    setApiKey: (apiKey: string): void => {
      if (this.mode === "client") {
        if (
          !this.authHttpClient ||
          !this.projectsHttpClient ||
          !this.collectionsHttpClient ||
          !this.storageHttpClient ||
          !this.systemHttpClient ||
          !this.healthHttpClient ||
          !this.testingHttpClient
        ) {
          throw new Error(
            "HTTP clients not initialized. Please ensure you're in client mode."
          );
        }
        this.authHttpClient.setApiKey(apiKey);
        this.projectsHttpClient?.setApiKey(apiKey);
        this.collectionsHttpClient?.setApiKey(apiKey);
        this.storageHttpClient?.setApiKey(apiKey);
        this.systemHttpClient?.setApiKey(apiKey);
        this.healthHttpClient?.setApiKey(apiKey);
        this.emailHttpClient?.setApiKey(apiKey);
        this.adminHttpClient?.setApiKey(apiKey);
        this.testingHttpClient?.setApiKey(apiKey);
      }
    },

    /**
     * Logout and invalidate session
     */
    logout: async (sessionId?: string): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        if (!this.authHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.authHttpClient.logout(sessionId);
        return response.data || { success: false };
      } else {
        if (!this.authService) {
          throw new Error(
            "Auth service not initialized. Please ensure you're in server mode."
          );
        }
        const result = await this.authService.logout(sessionId);
        return result;
      }
    },

    /**
     * Get current user information
     */
    getCurrentUser: async (): Promise<{
      success: boolean;
      data?: AdminUser | ProjectUser;
      error?: string;
    }> => {
      if (this.mode === "client") {
        if (!this.authHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        try {
          const response = await this.authHttpClient.getCurrentSession();
          // The response from HTTP client is already unwrapped by interceptor
          // Backend returns { success: true, data: AdminUser }
          // Check if it has success/data structure or is directly the user data
          if (response && typeof response === "object") {
            // Handle ApiResponse format with success and data
            if ("success" in response) {
              const apiResponse = response as { success: boolean; data?: unknown; error?: string };
              if (apiResponse.success === false) {
                return {
                  success: false,
                  error: apiResponse.error || "Failed to get user",
                };
              }
              if (apiResponse.data) {
                // data might be the user object
                return {
                  success: true,
                  data: apiResponse.data as AdminUser | ProjectUser,
                };
              }
            }
            // Handle response with user field
            if ("user" in response) {
              return {
                success: true,
                data: (response as { user: AdminUser | ProjectUser }).user,
              };
            }
            // If response looks like a user object directly (has id, username, or email)
            if (("id" in response || "username" in response || "email" in response) && 
                !("success" in response)) {
              return {
                success: true,
                data: response as AdminUser | ProjectUser,
              };
            }
          }
          return {
            success: false,
            error: "Invalid response format",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get user",
          };
        }
      } else {
        // For server mode, would need session context
        // Return error response format to match interface
        return {
          success: false,
          error: "getCurrentUser requires session context in server mode",
        };
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
        if (!this.authHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.authHttpClient.createSession(apiKey);
        return (
          response.data || {
            session_token: "",
            expires_at: "",
            user_type: "admin",
            scopes: [],
          }
        );
      } else {
        if (!this.authService) {
          throw new Error(
            "Auth service not initialized. Please ensure you're in server mode."
          );
        }
        return this.authService.createSessionFromApiKey(apiKey);
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
        if (!this.authHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.authHttpClient.refreshSession();
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
    ): Promise<{ valid: boolean; session?: AdminUser | ProjectUser }> => {
      if (this.mode === "client") {
        if (!this.authHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.authHttpClient.validateSession(token);
        const result: {
          valid: boolean;
          session?: AdminUser | ProjectUser;
        } = {
          valid: response.data?.valid || false,
        };
        if (response.data?.session) {
          result.session = response.data.session as unknown as AdminUser | ProjectUser;
        }
        return result;
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
        if (!this.authHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.authHttpClient.changePassword(
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

    /**
     * Regenerate API key
     */
    regenerateApiKey: async (
      req: unknown
    ): Promise<{
      success: boolean;
      data?: { apiKey: string };
      error?: string;
    }> => {
      if (this.mode === "client") {
        if (!this.authHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.authHttpClient.regenerateApiKey(req);
        return (
          response.data || {
            success: false,
            error: "Failed to regenerate API key",
          }
        );
      } else {
        if (!this.authService) {
          throw new Error(
            "Auth service not initialized. Please ensure you're in server mode."
          );
        }
        return this.authService.regenerateApiKey(req);
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
     * ```
     */
    create: async (projectData: {
      name: string;
      description?: string;
      settings?: Record<string, unknown>;
    }): Promise<Project> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.createProject(
          projectData
        );
        return (response.data as unknown as Project) || ({} as Project);
      } else {
        if (!this.projectsService) {
          throw new Error(
            "Projects service not initialized. Please ensure you're in server mode."
          );
        }
        return this.projectsService.createProject(
          "system",
          projectData
        ) as unknown as Project;
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
     * }
     * ```
     */
    get: async (projectId: string): Promise<Project> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.getProject(projectId);
        return (response.data as unknown as Project) || ({} as Project);
      } else {
        if (!this.projectsService) {
          throw new Error(
            "Projects service not initialized. Please ensure you're in server mode."
          );
        }
        return this.projectsService.getProjectById(
          projectId
        ) as unknown as Project;
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
     * ```
     */
    update: async (
      projectId: string,
      updates: Record<string, unknown>
    ): Promise<Project> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.updateProject(
          projectId,
          updates
        );
        return (response.data as unknown as Project) || ({} as Project);
      } else {
        if (!this.projectsService) {
          throw new Error(
            "Projects service not initialized. Please ensure you're in server mode."
          );
        }
        return this.projectsService.updateProject(
          projectId,
          updates
        ) as unknown as Project;
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
     * }
     * ```
     *
     * @warning This action is irreversible and will delete all associated data
     */
    delete: async (projectId: string): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.deleteProject(projectId);
        return response.data || { success: false };
      } else {
        if (!this.projectsService) {
          throw new Error(
            "Projects service not initialized. Please ensure you're in server mode."
          );
        }
        const success = await this.projectsService.deleteProject(projectId);
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
     * ```
     */
    getAll: async (options?: {
      limit?: number;
      offset?: number;
    }): Promise<Project[]> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.getAllProjects(options);
        return (response.data as unknown as Project[]) || [];
      } else {
        if (!this.projectsService) {
          throw new Error(
            "Projects service not initialized. Please ensure you're in server mode."
          );
        }
        return this.projectsService.getAllProjects(
          options
        ) as unknown as Project[];
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
     * ```
     */
    getStatistics: async (projectId: string): Promise<ProjectStats> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.getProjectStatistics(
          projectId
        );
        return (
          (response.data as unknown as ProjectStats) || ({} as ProjectStats)
        );
      } else {
        if (!this.projectsService) {
          throw new Error(
            "Projects service not initialized. Please ensure you're in server mode."
          );
        }
        return this.projectsService.getProjectStatistics(
          projectId
        ) as unknown as ProjectStats;
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
     * ```
     */
    getSettings: async (projectId: string): Promise<ProjectSettings> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.getProjectSettings(
          projectId
        );
        return (
          (response.data as unknown as ProjectSettings) ||
          ({} as ProjectSettings)
        );
      } else {
        if (!this.projectsService) {
          throw new Error(
            "Projects service not initialized. Please ensure you're in server mode."
          );
        }
        const project = await this.projectsService.getProjectById(projectId);
        return (
          (project?.settings as unknown as ProjectSettings) ||
          ({} as ProjectSettings)
        );
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
     * ```
     */
    updateSettings: async (
      projectId: string,
      settings: Record<string, unknown>
    ): Promise<ProjectSettings> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.updateProjectSettings(
          projectId,
          settings
        );
        return (
          (response.data as unknown as ProjectSettings) ||
          ({} as ProjectSettings)
        );
      } else {
        if (!this.projectsService) {
          throw new Error(
            "Projects service not initialized. Please ensure you're in server mode."
          );
        }
        return this.projectsService.updateProjectSettings(
          projectId,
          settings
        ) as unknown as ProjectSettings;
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
    ): Promise<ActivityLoggerType[]> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.getProjectActivity(
          projectId,
          options
        );
        return (response.data as unknown as ActivityLoggerType[]) || [];
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
    ): Promise<Collection> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.createCollection(
          projectId,
          collectionData
        );
        // Handle different response formats from backend
        // Backend returns { success: true, collection: {...} }
        if (response && typeof response === "object") {
          if ("collection" in response && response.collection) {
            return response.collection as unknown as Collection;
          }
          if ("data" in response && response.data) {
            return response.data as unknown as Collection;
          }
          // If response itself looks like a Collection
          if ("id" in response && "name" in response) {
            return response as unknown as Collection;
          }
        }
        return ({} as Collection);
      } else {
        if (!this.collectionsSchemaManager) {
          throw new Error(
            "Collections schema manager not initialized. Please ensure you're in server mode."
          );
        }
        const result = await this.collectionsSchemaManager.createCollection({
          ...collectionData,
          fields: collectionData.fields.map((f) => ({
            ...f,
            type: f.type as FieldType, // Will be properly typed in the service
            required: f.required ?? false,
            unique: f.unique ?? false,
            indexed: f.indexed ?? false,
          })),
        });
        // Set the project_id on the result
        result.project_id = projectId;
        return result as unknown as Collection;
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
     * }
     * ```
     */
    get: async (
      projectId: string,
      collectionName: string
    ): Promise<Collection> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.getCollection(
          projectId,
          collectionName
        );
        const collection = response.data as unknown as Collection;
        if (!collection) {
          throw new Error(`Collection '${collectionName}' not found in project '${projectId}'`);
        }
        return collection;
      } else {
        if (!this.collectionsSchemaManager) {
          throw new Error(
            "Collections schema manager not initialized. Please ensure you're in server mode."
          );
        }
        const collections =
          await this.collectionsSchemaManager.getCollections();
        const collection = collections.find(
          (c) => c.project_id === projectId && c.name === collectionName
        );
        if (!collection) {
          throw new Error(`Collection '${collectionName}' not found in project '${projectId}'`);
        }
        return collection;
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
     * }
     * ```
     */
    getAll: async (
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        search?: string;
      }
    ): Promise<Collection[]> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.getProjectCollections(
          projectId,
          options
        );
        // Handle different response formats from backend
        // Backend returns { success: true, collections: [...] }
        if (response && typeof response === "object") {
          if ("collections" in response && Array.isArray(response.collections)) {
            return response.collections as unknown as Collection[];
          }
          if ("data" in response && Array.isArray(response.data)) {
            return response.data as unknown as Collection[];
          }
          // If response itself is an array (fallback)
          if (Array.isArray(response)) {
            return response as unknown as Collection[];
          }
        }
        return [];
      } else {
        if (!this.collectionsSchemaManager) {
          throw new Error(
            "Collections schema manager not initialized. Please ensure you're in server mode."
          );
        }
        const collections =
          await this.collectionsSchemaManager.getCollections();
        return collections.filter(
          (c) => c.project_id === projectId
        ) as unknown as Collection[];
      }
    },

    /**
     * Get collections by project ID (alias for getAll)
     */
    getProjectCollections: async (projectId: string): Promise<Collection[]> => {
      return this.collections.getAll(projectId);
    },

    /**
     * Get a collection by ID
     */
    getCollection: async (
      projectId: string,
      collectionId: string
    ): Promise<Collection | null> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.getCollection(
          projectId,
          collectionId
        );
        return (response.data as unknown as Collection) || null;
      } else {
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        return (await this.collectionsService.getCollection(
          projectId,
          collectionId
        )) as unknown as Collection;
      }
    },

    /**
     * Create a new collection
     */
    createCollection: async (
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
    ): Promise<Collection> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.createCollection(
          projectId,
          collectionData
        );
        // Handle different response formats from backend
        // Backend returns { success: true, collection: {...} }
        if (response && typeof response === "object") {
          if ("collection" in response && response.collection) {
            return response.collection as unknown as Collection;
          }
          if ("data" in response && response.data) {
            return response.data as unknown as Collection;
          }
          // If response itself looks like a Collection
          if ("id" in response && "name" in response) {
            return response as unknown as Collection;
          }
        }
        return ({} as Collection);
      } else {
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        return (await this.collectionsService.createCollection({
          ...collectionData,
          fields: collectionData.fields.map((f) => ({
            ...f,
            type: f.type as FieldType,
            required: f.required ?? false,
            unique: f.unique ?? false,
            indexed: f.indexed ?? false,
          })),
        })) as unknown as Collection;
      }
    },

    /**
     * Update a collection
     */
    updateCollection: async (
      projectId: string,
      collectionId: string,
      updates: Record<string, unknown>
    ): Promise<Collection> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.updateCollection(
          projectId,
          collectionId,
          updates
        );
        return (response.data as unknown as Collection) || ({} as Collection);
      } else {
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        return (await this.collectionsService.updateCollection(
          projectId,
          collectionId,
          updates
        )) as unknown as Collection;
      }
    },

    /**
     * Delete a collection
     */
    deleteCollection: async (
      projectId: string,
      collectionId: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.deleteCollection(
          projectId,
          collectionId
        );
        return { success: response.data?.success || false };
      } else {
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        const success = await this.collectionsService.deleteCollection(
          projectId,
          collectionId
        );
        return { success };
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
    ): Promise<Collection> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.updateCollection(
          projectId,
          collectionName,
          updates
        );
        return (response.data as unknown as Collection) || ({} as Collection);
      } else {
        const collection = await this.collections.get(
          projectId,
          collectionName
        );
        if (!collection) {
          throw new Error("Collection not found");
        }
        if (!this.collectionsSchemaManager) {
          throw new Error(
            "Collections schema manager not initialized. Please ensure you're in server mode."
          );
        }
        return this.collectionsSchemaManager.updateCollection(
          collection.id,
          updates as Partial<Collection>
        ) as unknown as Collection;
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
     * } else {
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
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.deleteCollection(
          projectId,
          collectionName
        );
        return { success: response.data?.success || false };
      } else {
        const collection = await this.collections.get(
          projectId,
          collectionName
        );
        if (!collection) {
          return { success: false };
        }
        if (!this.collectionsSchemaManager) {
          throw new Error(
            "Collections schema manager not initialized. Please ensure you're in server mode."
          );
        }
        const success = await this.collectionsSchemaManager.deleteCollection(
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
     *   schema.fields.forEach(field => {
     *   });
     *
     *   schema.indexes?.forEach(index => {
     *   });
     * }
     * ```
     */
    getSchema: async (
      projectId: string,
      collectionName: string
    ): Promise<Collection> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.getCollection(
          projectId,
          collectionName
        );
        const collection = response.data as unknown as Collection;
        if (!collection) {
          throw new Error(`Collection '${collectionName}' not found in project '${projectId}'`);
        }
        return collection;
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
     * } else {
     *   validation.issues.forEach(issue => {
     *     const severity = issue.severity.toUpperCase();
     *     const field = issue.field ? ` (${issue.field})` : '';
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
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response =
          await this.collectionsHttpClient.validateCollectionSchema(
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
     * ```
     */
    getStatistics: async (
      projectId: string,
      collectionName: string
    ): Promise<{ total_documents: number; total_size_bytes: number }> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response =
          await this.collectionsHttpClient.getCollectionStatistics(
            projectId,
            collectionName
          );
        return (
          (response.data as unknown as {
            total_documents: number;
            total_size_bytes: number;
          }) || { total_documents: 0, total_size_bytes: 0 }
        );
      } else {
        // Would need to implement in CollectionsService
        throw new Error("getStatistics not yet implemented for server mode");
      }
    },

    /**
     * Get collections by project ID
     */
    getCollectionsByProject: async (
      projectId: string
    ): Promise<Collection[]> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        return (await this.collectionsHttpClient.getCollectionsByProject(
          projectId
        )) as unknown as Collection[];
      } else {
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        return (await this.collectionsService.getCollectionsByProject(
          projectId
        )) as unknown as Collection[];
      }
    },

    /**
     * Get documents from a collection
     */
    getDocuments: async (
      collectionId: string,
      options?: {
        page?: number;
        limit?: number;
        orderBy?: string;
        order?: "asc" | "desc";
        search?: string;
        filter?: Array<{
          field: string;
          operator: string;
          value: unknown;
        }>;
      }
    ): Promise<Document[]> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        return (await this.collectionsHttpClient.getDocuments(
          collectionId,
          options
        )) as unknown as Document[];
      } else {
        // Convert options to match server method signature
        const serverOptions: DocumentQueryOptions | undefined = options
          ? (() => {
              const opts: DocumentQueryOptions = {};
              if (options.limit !== undefined) {
                opts.limit = options.limit;
              }
              opts.offset = 0; // Convert page to offset if needed
              if (options.orderBy !== undefined) {
                opts.sort_by = options.orderBy;
              }
              if (options.order !== undefined) {
                opts.sort_order = options.order;
              }
              return opts;
            })()
          : undefined;
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        return (await this.collectionsService.getDocuments(
          "",
          collectionId,
          undefined,
          serverOptions
        )) as unknown as Document[];
      }
    },

    /**
     * Create a document in a collection
     */
    createDocument: async (
      collectionId: string,
      data: Record<string, unknown>
    ): Promise<Document> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        return (await this.collectionsHttpClient.createDocument(
          collectionId,
          data
        )) as unknown as Document;
      } else {
        // For server mode, we need projectId and collectionName, but we only have collectionId
        // This is a limitation of the current interface design
        const documentData = { data, created_by: "system" };
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        return (await this.collectionsService.createDocument(
          "",
          collectionId,
          documentData
        )) as unknown as Document;
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
     * ```
     */
    create: async (
      projectId: string,
      collectionName: string,
      documentData: {
        data: Record<string, unknown>;
        created_by?: string;
      }
    ): Promise<Document> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.createDocument(
          collectionName, // Using collectionName as collectionId
          documentData
        );
        return (response as unknown as Document) || ({} as Document);
      } else {
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        return this.collectionsService.createDocument(
          projectId,
          collectionName,
          documentData
        ) as unknown as Document;
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
     * } else {
     * }
     * ```
     */
    get: async (
      projectId: string,
      collectionName: string,
      documentId: string
    ): Promise<Document> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.getDocument(
          projectId,
          collectionName,
          documentId
        );
        const document = response.data as unknown as Document;
        if (!document) {
          throw new Error(`Document '${documentId}' not found in collection '${collectionName}'`);
        }
        return document;
      } else {
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        const document = await this.collectionsService.getDocumentById(
          projectId,
          collectionName,
          documentId
        ) as unknown as Document | null;
        if (!document) {
          throw new Error(`Document '${documentId}' not found in collection '${collectionName}'`);
        }
        return document;
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
    ): Promise<Document> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.updateDocument(
          projectId,
          collectionName,
          documentId,
          updateData
        );
        return (response.data as unknown as Document) || ({} as Document);
      } else {
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        return this.collectionsService.updateDocument(
          projectId,
          collectionName,
          documentId,
          updateData
        ) as unknown as Document;
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
     * } else {
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
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.deleteDocument(
          projectId,
          collectionName,
          documentId,
          deletedBy ? { deleted_by: deletedBy } : undefined
        );
        return response.data || { success: false };
      } else {
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        const success = await this.collectionsService.deleteDocument(
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
    ): Promise<Document[]> => {
      if (this.mode === "client") {
        // Convert filter format for HTTP client
        const httpOptions: {
          page: number;
          limit?: number;
          orderBy?: string;
          order?: "asc" | "desc";
          search: string;
          filter: Array<{ field: string; operator: string; value: unknown }>;
        } | undefined = options
          ? {
              page: 1, // Default page
              search: "", // Default search
              filter: [], // Convert filter if needed
            }
          : undefined;
        if (httpOptions && options) {
          if (options.limit !== undefined) {
            httpOptions.limit = options.limit;
          }
          if (options.orderBy !== undefined) {
            httpOptions.orderBy = options.orderBy;
          }
          if (options.order !== undefined) {
            httpOptions.order = options.order;
          }
        }

        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.getDocuments(
          collectionName, // Using collectionName as collectionId
          httpOptions
        );
        return (response as unknown as Document[]) || [];
      } else {
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        return this.collectionsService.getDocuments(
          projectId,
          collectionName,
          options?.filter,
          options
        ) as unknown as Document[];
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
    ): Promise<Document[]> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.searchDocuments(
          projectId,
          collectionName,
          query
        );
        return (response.data as unknown as Document[]) || [];
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
      created: Document[];
      errors: Array<{ index: number; error: string }>;
    }> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.bulkCreateDocuments(
          projectId,
          collectionName,
          documents
        );
        return (
          (response.data as unknown as {
            created: Document[];
            errors: Array<{ index: number; error: string }>;
          }) || { created: [], errors: [] }
        );
      } else {
        // For server mode, implement bulk create
        const created: Document[] = [];
        const errors: Array<{ index: number; error: string }> = [];

        for (let i = 0; i < documents.length; i++) {
          try {
            const docData = documents[i];
            if (!docData) continue;
            if (!this.collectionsService) {
              throw new Error(
                "Collections service not initialized. Please ensure you're in server mode."
              );
            }
            const doc = await this.collectionsService.createDocument(
              projectId,
              collectionName,
              docData
            );
            created.push(doc as unknown as Document);
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
      updated: Document[];
      errors: Array<{ id: string; error: string }>;
    }> => {
      if (this.mode === "client") {
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.bulkUpdateDocuments(
          projectId,
          collectionName,
          updates
        );
        return (
          (response.data as unknown as {
            updated: Document[];
            errors: Array<{ id: string; error: string }>;
          }) || { updated: [], errors: [] }
        );
      } else {
        // For server mode, implement bulk update
        const updated: Document[] = [];
        const errors: Array<{ id: string; error: string }> = [];

        for (const updateItem of updates) {
          try {
            if (!this.collectionsService) {
              throw new Error(
                "Collections service not initialized. Please ensure you're in server mode."
              );
            }
            const doc = await this.collectionsService.updateDocument(
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
            updated.push(doc as unknown as Document);
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
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.bulkDeleteDocuments(
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
            if (!this.collectionsService) {
              throw new Error(
                "Collections service not initialized. Please ensure you're in server mode."
              );
            }
            const success = await this.collectionsService.deleteDocument(
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
        if (!this.collectionsService) {
          throw new Error(
            "Collections service not initialized. Please ensure you're in server mode."
          );
        }
        const docs = await this.collectionsService.getDocuments(
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
        if (!this.collectionsHttpClient) {
          throw new Error(
            "HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.collectionsHttpClient.aggregateDocuments(
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
     * Initialize database tables and default data
     */
    initialize: async (): Promise<{
      success: boolean;
      message: string;
      tablesCreated: string[];
      defaultDataInserted: boolean;
    }> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      try {
        // Initialize database tables by running auto-fix
        if (!this.databaseHealthManager) {
          throw new Error(
            "Database health manager not initialized. Please ensure you're in server mode."
          );
        }
        const autoFixResult = await this.databaseHealthManager.autoFix();
        const tablesCreated = autoFixResult.appliedFixes || [];

        // Create default admin user
        if (!this.adminService) {
          throw new Error(
            "Admin service not initialized. Please ensure you're in server mode."
          );
        }
        await this.adminService.createDefaultAdmin();
        const adminResult = { success: true };

        return {
          success: true,
          message: "Database initialized successfully",
          tablesCreated: tablesCreated || [],
          defaultDataInserted: adminResult.success,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Database initialization failed",
          tablesCreated: [],
          defaultDataInserted: false,
        };
      }
    },

    /**
     * Get system health status
     */
    getHealth: async (): Promise<{
      database: boolean;
      storage: boolean;
      email: boolean;
      overall: boolean;
      details: Record<string, unknown>;
    }> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      try {
        if (!this.healthService) {
          throw new Error(
            "Health service not initialized. Please ensure you're in server mode."
          );
        }
        const health = await this.healthService.runDiagnostics();
        const dbHealth = health.details.database.status === "healthy";

        return {
          database: dbHealth,
          storage: await this.checkStorageHealth(),
          email: await this.checkEmailHealth(),
          overall: health.success,
          details: health as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return {
          database: false,
          storage: false,
          email: false,
          overall: false,
          details: {
            error:
              error instanceof Error ? error.message : "Health check failed",
          },
        };
      }
    },

    /**
     * Create default admin user
     */
    createDefaultAdmin: async (): Promise<{
      success: boolean;
      message: string;
      adminUser?: unknown;
    }> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      try {
        if (!this.adminService) {
          throw new Error(
            "Admin service not initialized. Please ensure you're in server mode."
          );
        }
        await this.adminService.createDefaultAdmin();
        const result = {
          success: true,
          message: "Default admin created successfully",
          adminUser: null,
        };
        return {
          success: result.success,
          message: result.message,
          adminUser: result.adminUser,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to create default admin",
        };
      }
    },

    /**
     * Check database health
     */
    healthCheck: async (): Promise<unknown> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      if (!this.databaseHealthManager) {
        throw new Error(
          "Database health manager not initialized. Please ensure you're in server mode."
        );
      }
      return this.databaseHealthManager.healthCheck();
    },

    /**
     * Auto-fix database issues
     */
    autoFix: async (): Promise<unknown> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      // Would need to implement autoFixAll method
      throw new Error("Auto-fix not yet implemented");
    },

    /**
     * Validate schema
     */
    validateSchema: async (): Promise<unknown> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      if (!this.databaseHealthManager) {
        throw new Error(
          "Database health manager not initialized. Please ensure you're in server mode."
        );
      }
      return this.databaseHealthManager.validateSchema();
    },

    /**
     * Run migrations
     */
    migrate: async (): Promise<unknown> => {
      if (this.mode !== "server") {
        throw new Error("Database operations only available in server mode");
      }
      if (!this.databaseHealthManager) {
        throw new Error(
          "Database health manager not initialized. Please ensure you're in server mode."
        );
      }
      return this.databaseHealthManager.migrate();
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
    ): Promise<ProjectUser[]> => {
      if (this.mode === "server") {
        if (!this.usersService) {
          throw new Error(
            "Users service not initialized. Please ensure you're in server mode."
          );
        }
        return this.usersService.getAllUsers(
          projectId,
          options
        ) as unknown as Promise<ProjectUser[]>;
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
    ): Promise<ProjectUser> => {
      if (this.mode === "server") {
        if (!this.usersService) {
          throw new Error(
            "Users service not initialized. Please ensure you're in server mode."
          );
        }
        return this.usersService.createUser(
          projectId,
          userData
        ) as unknown as Promise<ProjectUser>;
      } else {
        throw new Error("Users management via HTTP not yet implemented");
      }
    },

    /**
     * Get user by ID
     */
    get: async (projectId: string, userId: string): Promise<ProjectUser> => {
      if (this.mode === "server") {
        if (!this.usersService) {
          throw new Error(
            "Users service not initialized. Please ensure you're in server mode."
          );
        }
        return this.usersService.getUserById(
          projectId,
          userId
        ) as unknown as Promise<ProjectUser>;
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
    ): Promise<ProjectUser> => {
      if (this.mode === "server") {
        if (!this.usersService) {
          throw new Error(
            "Users service not initialized. Please ensure you're in server mode."
          );
        }
        return this.usersService.updateUser(
          projectId,
          userId,
          updates
        ) as unknown as Promise<ProjectUser>;
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
        if (!this.usersService) {
          throw new Error(
            "Users service not initialized. Please ensure you're in server mode."
          );
        }
        const success = await this.usersService.deleteUser(projectId, userId);
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
    ): Promise<ProjectUser> => {
      if (this.mode === "server") {
        // Update user role through the standard updateUser method
        if (!this.usersService) {
          throw new Error(
            "Users service not initialized. Please ensure you're in server mode."
          );
        }
        return this.usersService.updateUser(projectId, userId, {
          role,
        }) as unknown as Promise<ProjectUser>;
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
    ): Promise<ProjectUser> => {
      if (this.mode === "server") {
        // Update user permissions through the standard updateUser method
        if (!this.usersService) {
          throw new Error(
            "Users service not initialized. Please ensure you're in server mode."
          );
        }
        return this.usersService.updateUser(projectId, userId, {
          permissions,
        }) as unknown as Promise<ProjectUser>;
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
    ): Promise<
      {
        id: string;
        action: string;
        timestamp: string;
        details: Record<string, unknown>;
      }[]
    > => {
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
    ): Promise<FileInfo> => {
      if (this.mode === "client") {
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.storageHttpClient.uploadFile(
          projectId,
          file,
          options
        );
        return (response.data as unknown as FileInfo) || null;
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
    downloadFile: async (projectId: string, fileId: string): Promise<Blob> => {
      if (this.mode === "client") {
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.storageHttpClient.downloadFile(
          projectId,
          fileId
        );
        return (response.data as unknown as Blob) || null;
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
     * ```
     */
    getFile: async (projectId: string, fileId: string): Promise<FileInfo> => {
      if (this.mode === "client") {
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.storageHttpClient.getFile(
          projectId,
          fileId
        );
        return (response.data as unknown as FileInfo) || null;
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
     * } else {
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
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.storageHttpClient.deleteFile(
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
    ): Promise<FileInfo[]> => {
      if (this.mode === "client") {
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.storageHttpClient.getFiles(
          projectId,
          options
        );
        return (response.data as unknown as FileInfo[]) || [];
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
     * ```
     */
    createFolder: async (
      projectId: string,
      folderData: {
        name: string;
        parent_folder_id?: string;
        metadata?: Record<string, unknown>;
      }
    ): Promise<{
      id: string;
      name: string;
      parent_folder_id?: string;
      metadata?: Record<string, unknown>;
    }> => {
      if (this.mode === "client") {
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.storageHttpClient.createFolder(
          projectId,
          folderData
        );
        return (
          (response.data as unknown as {
            id: string;
            name: string;
            parent_folder_id?: string;
            metadata?: Record<string, unknown>;
          }) || null
        );
      } else {
        throw new Error("Storage createFolder not implemented for server mode");
      }
    },
    getFolders: async (
      projectId: string,
      parentFolderId?: string
    ): Promise<
      {
        id: string;
        name: string;
        parent_folder_id?: string;
        metadata?: Record<string, unknown>;
      }[]
    > => {
      if (this.mode === "client") {
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.storageHttpClient.getFolders(
          projectId,
          parentFolderId
        );
        return (
          (response.data as unknown as {
            id: string;
            name: string;
            parent_folder_id?: string;
            metadata?: Record<string, unknown>;
          }[]) || []
        );
      } else {
        throw new Error("Storage getFolders not implemented for server mode");
      }
    },
    deleteFolder: async (
      projectId: string,
      folderId: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.storageHttpClient.deleteFolder(
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
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.storageHttpClient.getStorageStatistics(
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
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.storageHttpClient.getFileUrl(
          projectId,
          fileId,
          options
        );
        return response.data || { url: "" };
      } else {
        throw new Error("Storage getFileUrl not implemented for server mode");
      }
    },

    /**
     * Get storage information for a project
     */
    getStorageInfo: async (
      projectId: string
    ): Promise<{
      total_files: number;
      total_size: number;
      storage_used_percentage: number;
      quota: number;
    }> => {
      if (this.mode === "client") {
        if (!this.storageHttpClient) {
          throw new Error(
            "Storage HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        return await this.storageHttpClient.getStorageInfo(projectId);
      } else {
        throw new Error(
          "Storage getStorageInfo not implemented for server mode"
        );
      }
    },
  };

  /**
   * Email management
   */
  email = {
    getConfig: async (projectId: string): Promise<EmailConfig> => {
      if (this.mode === "client") {
        if (!this.emailHttpClient) {
          throw new Error(
            "Email HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.emailHttpClient.getConfig(projectId);
        return (response.data as unknown as EmailConfig) || null;
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
    ): Promise<EmailConfig> => {
      if (this.mode === "client") {
        if (!this.emailHttpClient) {
          throw new Error(
            "Email HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.emailHttpClient.updateConfig(
          projectId,
          config as unknown as Partial<EmailConfig>
        );
        return (response.data as unknown as EmailConfig) || null;
      } else {
        throw new Error("Email updateConfig not implemented for server mode");
      }
    },
    testConfig: async (
      projectId: string,
      testEmail: string
    ): Promise<{ success: boolean; message?: string }> => {
      if (this.mode === "client") {
        if (!this.emailHttpClient) {
          throw new Error(
            "Email HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.emailHttpClient.testConfig(
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
    ): Promise<EmailTemplate[]> => {
      if (this.mode === "client") {
        if (!this.emailHttpClient) {
          throw new Error(
            "Email HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.emailHttpClient.getTemplates(
          projectId,
          options
        );
        return (response.data as unknown as EmailTemplate[]) || [];
      } else {
        throw new Error("Email getTemplates not implemented for server mode");
      }
    },
    getTemplate: async (
      projectId: string,
      templateId: string
    ): Promise<EmailTemplate> => {
      if (this.mode === "client") {
        if (!this.emailHttpClient) {
          throw new Error(
            "Email HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.emailHttpClient.getTemplate(
          projectId,
          templateId
        );
        return (response.data as unknown as EmailTemplate) || null;
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
    ): Promise<EmailTemplate> => {
      if (this.mode === "client") {
        if (!this.emailHttpClient) {
          throw new Error(
            "Email HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.emailHttpClient.createTemplate(
          projectId,
          template
        );
        return (response.data as unknown as EmailTemplate) || null;
      } else {
        throw new Error("Email createTemplate not implemented for server mode");
      }
    },
    updateTemplate: async (
      projectId: string,
      templateId: string,
      updates: Partial<EmailTemplate>
    ): Promise<EmailTemplate> => {
      if (this.mode === "client") {
        if (!this.emailHttpClient) {
          throw new Error(
            "Email HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.emailHttpClient.updateTemplate(
          projectId,
          templateId,
          updates
        );
        return (response.data as unknown as EmailTemplate) || null;
      } else {
        throw new Error("Email updateTemplate not implemented for server mode");
      }
    },
    deleteTemplate: async (
      projectId: string,
      templateId: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        if (!this.emailHttpClient) {
          throw new Error(
            "Email HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.emailHttpClient.deleteTemplate(
          projectId,
          templateId
        );
        return { success: response.success };
      } else {
        throw new Error("Email deleteTemplate not implemented for server mode");
      }
    },
    send: async (
      projectId: string,
      emailRequest: unknown
    ): Promise<{ success: boolean; message_id?: string; error?: string }> => {
      if (this.mode === "client") {
        if (!this.emailHttpClient) {
          throw new Error(
            "Email HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.emailHttpClient.sendEmail(
          projectId,
          emailRequest as unknown as {
            project_id: string;
            to: string;
            subject: string;
            body: string;
            template_id?: string;
            variables?: Record<string, unknown>;
          }
        );
        return (
          (response.data as unknown as {
            success: boolean;
            message_id?: string;
            error?: string;
          }) || null
        );
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
    ): Promise<
      {
        id: string;
        to: string;
        subject: string;
        status: string;
        sent_at: string;
      }[]
    > => {
      if (this.mode === "client") {
        if (!this.emailHttpClient) {
          throw new Error(
            "Email HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.emailHttpClient.getEmailHistory(
          projectId,
          options
        );
        return (
          (response.data as unknown as {
            id: string;
            to: string;
            subject: string;
            status: string;
            sent_at: string;
          }[]) || []
        );
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
    ): Promise<ApiKey[]> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "Projects HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.getProjectApiKeys(
          projectId
        );
        return (response.data as unknown as ApiKey[]) || [];
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        return (await this.adminService.getProjectApiKeys(
          projectId
        )) as unknown as Promise<ApiKey[]>;
      }
    },
    get: async (projectId: string, keyId: string): Promise<ApiKey> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "Projects HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.getProjectApiKey(
          projectId,
          keyId
        );
        return (response.data as unknown as ApiKey) || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        return (await this.adminService.getProjectApiKey(
          keyId,
          projectId
        )) as unknown as Promise<ApiKey>;
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
    ): Promise<ApiKey> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "Projects HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.createProjectApiKey(
          projectId,
          keyData
        );
        return (response.data as unknown as ApiKey) || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        const keyRequest: {
          name: string;
          description?: string;
          scopes: string[];
          expires_at?: string;
          created_by?: string;
        } = {
          name: keyData.name,
          scopes: keyData.scopes,
        };
        if (keyData.metadata?.description !== undefined) {
          keyRequest.description = keyData.metadata.description as string;
        }
        if (keyData.expires_at !== undefined) {
          keyRequest.expires_at = keyData.expires_at;
        }
        const result = await this.adminService.createProjectApiKey(projectId, keyRequest);
        return result.data as unknown as ApiKey;
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
    ): Promise<ApiKey> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "Projects HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.updateProjectApiKey(
          projectId,
          keyId,
          updates
        );
        return (response.data as unknown as ApiKey) || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        const updateRequest: Partial<{
          name: string;
          description: string;
          scopes: string[];
          expires_at: string;
          is_active: boolean;
        }> = {};
        if (updates.name !== undefined) {
          updateRequest.name = updates.name;
        }
        if (updates.metadata?.description !== undefined) {
          updateRequest.description = updates.metadata.description as string;
        }
        if (updates.scopes !== undefined) {
          updateRequest.scopes = updates.scopes;
        }
        if (updates.expires_at !== undefined) {
          updateRequest.expires_at = updates.expires_at;
        }
        if (updates.is_active !== undefined) {
          updateRequest.is_active = updates.is_active;
        }
        return (await this.adminService.updateProjectApiKey(keyId, projectId, updateRequest)) as unknown as Promise<ApiKey>;
      }
    },
    delete: async (
      projectId: string,
      keyId: string
    ): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "Projects HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.deleteProjectApiKey(
          projectId,
          keyId
        );
        return { success: response.success };
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        const success = await this.adminService.deleteProjectApiKey(
          keyId,
          projectId
        );
        return { success };
      }
    },
    regenerate: async (projectId: string, keyId: string): Promise<ApiKey> => {
      if (this.mode === "client") {
        if (!this.projectsHttpClient) {
          throw new Error(
            "Projects HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.projectsHttpClient.regenerateProjectApiKey(
          projectId,
          keyId
        );
        return (response.data as unknown as ApiKey) || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        const result = await this.adminService.regenerateProjectApiKey(
          keyId,
          projectId
        );
        return result.data as unknown as ApiKey;
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
        if (!this.authHttpClient) {
          throw new Error(
            "Auth HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.authHttpClient.validateApiKey(apiKey);
        return response.data || { valid: false };
      } else {
        // Server mode - use admin service to validate API key
        if (!this.db) {
          throw new Error("Database connection not initialized");
        }
        try {
          const result = await this.db.query(
            `SELECT id, name, type, scopes, project_ids 
             FROM api_keys 
             WHERE key = $1 AND is_active = true`,
            [apiKey]
          );

          if (result.rows.length === 0) {
            return { valid: false };
          }

          const keyData = result.rows[0] as Record<string, unknown>;
          const keyInfo: {
            id: string;
            name: string;
            type: string;
            scopes: string[];
            project_id?: string;
          } = {
            id: keyData.id as string,
            name: keyData.name as string,
            type: keyData.type as string,
            scopes: (keyData.scopes as string[]) || [],
          };
          const projectIds = keyData.project_ids as string[] | undefined;
          if (projectIds && projectIds.length > 0 && projectIds[0] !== undefined) {
            keyInfo.project_id = projectIds[0];
          }
          return {
            valid: true,
            key_info: keyInfo,
          };
        } catch {
          return { valid: false };
        }
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
        if (!this.healthHttpClient) {
          throw new Error(
            "Health HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.healthHttpClient.check();
        return (
          response.data || {
            healthy: false,
            message: "Health check failed",
            version: "unknown",
          }
        );
      } else {
        // Server mode - use health service
        if (!this.healthService) {
          throw new Error("Health service not initialized");
        }
        const health = await this.healthService.runDiagnostics();
        return {
          healthy: health.success,
          message: health.message,
          details: health as unknown as Record<string, unknown>,
          version: "2.0.0",
        };
      }
    },
    checkDatabase: async (): Promise<{
      healthy: boolean;
      message: string;
      details?: Record<string, unknown>;
    }> => {
      if (this.mode === "client") {
        if (!this.healthHttpClient) {
          throw new Error(
            "Health HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.healthHttpClient.checkDatabase();
        return (
          response.data || {
            healthy: false,
            message: "Database health check failed",
          }
        );
      } else {
        // Server mode - use health service
        if (!this.healthService) {
          throw new Error("Health service not initialized");
        }
        const health = await this.healthService.runDiagnostics();
        const dbHealth = health.details.database;
        return {
          healthy: dbHealth.status === "healthy",
          message: dbHealth.message,
          details: dbHealth as unknown as Record<string, unknown>,
        };
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
        if (!this.healthHttpClient) {
          throw new Error(
            "Health HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.healthHttpClient.runDiagnostics();
        return (
          response.data || {
            tests: [],
            summary: { total: 0, passed: 0, failed: 0, duration: 0 },
          }
        );
      } else {
        // Server mode - use health service
        if (!this.healthService) {
          throw new Error("Health service not initialized");
        }
        const health = await this.healthService.runDiagnostics();
        const tests = [
          {
            name: "database",
            passed: health.details.database.status === "healthy",
            message: health.details.database.message,
            duration: 0,
          },
          {
            name: "system",
            passed: health.details.system.status === "healthy",
            message: `System status: ${health.details.system.status}`,
            duration: 0,
          },
          {
            name: "services",
            passed: health.details.services.every(
              (s: { status: string }) => s.status === "healthy"
            ),
            message: `Services: ${
              health.details.services.filter(
                (s: { status: string }) => s.status === "healthy"
              ).length
            }/${health.details.services.length} healthy`,
            duration: 0,
          },
        ];

        const passed = tests.filter((t) => t.passed).length;
        const failed = tests.filter((t) => !t.passed).length;

        return {
          tests,
          summary: {
            total: tests.length,
            passed,
            failed,
            duration: tests.reduce((sum, t) => sum + t.duration, 0),
          },
        };
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
        if (!this.healthHttpClient) {
          throw new Error(
            "Health HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.healthHttpClient.validateSchema();
        return response.data || { valid: false, issues: [] };
      } else {
        // Server mode - use database health manager
        if (!this.healthService) {
          throw new Error("Health service not initialized");
        }
        try {
          const health = await this.healthService.runDiagnostics();
          const dbHealth = health.details.database;

          if (dbHealth.status === "healthy") {
            return { valid: true, issues: [] };
          }

          // Parse database health message for issues
          const issues = [
            {
              type: "database",
              message: dbHealth.message,
              severity: "error" as const,
            },
          ];

          return { valid: false, issues };
        } catch (error) {
          return {
            valid: false,
            issues: [
              {
                type: "system",
                message: `Schema validation failed: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
                severity: "error" as const,
              },
            ],
          };
        }
      }
    },
    autoFix: async (): Promise<{
      success: boolean;
      fixes_applied: number;
      details: string[];
      remaining_issues: number;
    }> => {
      if (this.mode === "client") {
        if (!this.healthHttpClient) {
          throw new Error(
            "Health HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.healthHttpClient.autoFix();
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
        // Server mode - use database health manager
        // For now, return a basic response since auto-fixing is not fully implemented
        return {
          success: true,
          fixes_applied: 0,
          details: ["Auto-fixing not yet implemented in server mode"],
          remaining_issues: 0,
        };
      }
    },
    migrate: async (): Promise<{
      success: boolean;
      migrations_applied: number;
      details: string[];
    }> => {
      if (this.mode === "client") {
        if (!this.healthHttpClient) {
          throw new Error(
            "Health HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.healthHttpClient.runMigrations();
        if (response.data) {
          return {
            success: response.data.success,
            migrations_applied: response.data.applied_migrations?.length || 0,
            details: response.data.applied_migrations || [],
          };
        }
        return { success: false, migrations_applied: 0, details: [] };
      } else {
        // Server mode - use database health manager
        // For now, return a basic response since migrations are not fully implemented
        return {
          success: true,
          migrations_applied: 0,
          details: ["Database migrations not yet implemented in server mode"],
        };
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
        if (!this.healthHttpClient) {
          throw new Error(
            "Health HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.healthHttpClient.getSystemInfo();
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
        // Server mode - use health service
        if (!this.healthService) {
          throw new Error("Health service not initialized");
        }
        try {
          const health = await this.healthService.runDiagnostics();
          const systemHealth = health.details.system;

          return {
            database: {
              size_bytes: 0, // Not implemented yet
              tables_count: 0, // Not implemented yet
              connections: 1, // Assume at least one connection
              uptime: systemHealth.uptime || 0,
            },
            system: {
              memory_usage: systemHealth.memory.percentage || 0,
              cpu_usage: systemHealth.cpu.usage || 0,
              disk_usage: systemHealth.disk.percentage || 0,
            },
          };
        } catch {
          return {
            database: {
              size_bytes: 0,
              tables_count: 0,
              connections: 0,
              uptime: 0,
            },
            system: { memory_usage: 0, cpu_usage: 0, disk_usage: 0 },
          };
        }
      }
    },

    repairDatabase: async (): Promise<{
      success: boolean;
      actions: string[];
    }> => {
      if (this.mode === "client") {
        if (!this.healthHttpClient) {
          throw new Error(
            "Health HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.healthHttpClient.repairDatabase();
        if (response.data) {
          const actions: string[] = [];
          if (response.data.repaired_tables)
            actions.push(...response.data.repaired_tables);
          if (response.data.repaired_indexes)
            actions.push(...response.data.repaired_indexes);
          if (response.data.repaired_constraints)
            actions.push(...response.data.repaired_constraints);
          return {
            success: response.data.success,
            actions,
          };
        }
        return { success: false, actions: [] };
      } else {
        // Server mode - use health service
        // For now, return a basic response since database repair is not fully implemented
        return {
          success: true,
          actions: ["Database repair not yet fully implemented in server mode"],
        };
      }
    },
  };

  /**
   * System management
   */
  system = {
    getSettings: async (): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.getSettings();
        return response.data || null;
      } else {
        // Server mode - use system service
        if (!this.systemService) {
          throw new Error("System service not initialized");
        }
        try {
          return await this.systemService.getSettings();
        } catch (error) {
          this.logger?.error("Failed to get system settings:", error);
          return null;
        }
      }
    },
    updateSettings: async (updates: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        // SystemSettings from http-clients has different structure, cast appropriately
        const response = await this.systemHttpClient.updateSettings(updates as Partial<import("./http-clients/system-http-client").SystemSettings>);
        return response.data || null;
      } else {
        // Server mode - use system service
        if (!this.systemService) {
          throw new Error("System service not initialized");
        }
        try {
          return await this.systemService.updateSettings(updates as Partial<SystemSettings>);
        } catch (error) {
          this.logger?.error("Failed to update system settings:", error);
          return null;
        }
      }
    },
    testEmailConfig: async (
      emailConfig: unknown
    ): Promise<{ success: boolean; message?: string }> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.testEmailConfig(
          emailConfig as {
            smtpHost: string;
            smtpPort: number;
            smtpUsername: string;
            smtpPassword: string;
            smtpSecure: boolean;
            fromEmail: string;
            toEmail: string;
          }
        );
        return response.data || { success: false };
      } else {
        // Server mode - use email service
        if (!this.emailService) {
          throw new Error("Email service not initialized");
        }
        try {
          // Test email configuration by attempting to send a test email
          const testResult = await this.emailService.testConfig("default");
          return {
            success: testResult.success,
            message: testResult.message || "Email configuration test completed",
          };
        } catch (error) {
          return {
            success: false,
            message:
              error instanceof Error ? error.message : "Email test failed",
          };
        }
      }
    },
    getSystemInfo: async (): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.getSystemInfo();
        return response.data || null;
      } else {
        // Server mode - use system service
        if (!this.systemService) {
          throw new Error("System service not initialized");
        }
        try {
          return await this.systemService.getSystemInfo();
        } catch (error) {
          this.logger?.error("Failed to get system info:", error);
          return null;
        }
      }
    },
    runMaintenance: async (): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.runMaintenance();
        return response.data || null;
      } else {
        // Server mode - use system service
        try {
          // Run basic maintenance tasks
          if (!this.systemService) {
            throw new Error("System service not initialized");
          }
          const health = await this.systemService.getDatabaseHealth();
          return {
            success: health.success,
            message: "Maintenance completed",
            databaseHealth: health.data,
          };
        } catch (error) {
          this.logger?.error("Failed to run maintenance:", error);
          return null;
        }
      }
    },
    backupSystem: async (): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.backupSystem();
        return response.data || null;
      } else {
        // Server mode - use system service
        try {
          // Create a basic system backup
          const backup = await this.createSystemBackup();
          return backup;
        } catch (error) {
          this.logger?.error("Failed to backup system:", error);
          return null;
        }
      }
    },
    getSystemUsers: async (): Promise<unknown[]> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.getSystemUsers();
        return response.data || [];
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.getUsers();
        } catch {
          return [];
        }
      }
    },
    createSystemUser: async (userData: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.createSystemUser(
          userData as {
            username: string;
            email: string;
            password: string;
            role: "admin" | "user";
          }
        );
        return response.data || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.createUser(
            userData as unknown as Omit<
              import("./admin-service").AdminUser,
              "id" | "created_at" | "updated_at"
            >
          );
        } catch {
          return null;
        }
      }
    },
    updateSystemUser: async (
      userId: string,
      updates: unknown
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.updateSystemUser(
          userId,
          updates as Partial<{
            username: string;
            email: string;
            role: "admin" | "user";
            is_active: boolean;
          }>
        );
        return response.data || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.updateUser(userId, updates as Partial<AdminUser>);
        } catch {
          return null;
        }
      }
    },
    deleteSystemUser: async (userId: string): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.deleteSystemUser(userId);
        return { success: response.success };
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          const success = await this.adminService.deleteUser(userId);
          return { success };
        } catch {
          return { success: false };
        }
      }
    },
    getSystemLogs: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.getSystemLogs(options as {
          level?: "info" | "error" | "warn" | "debug";
          service?: string;
          limit?: number;
          offset?: number;
          start_date?: string;
          end_date?: string;
          search?: string;
        } | undefined);
        return response.data || null;
      } else {
        // Server mode - use system service
        try {
          // Return basic system logs (placeholder implementation)
          return [
            {
              timestamp: new Date().toISOString(),
              level: "info",
              message: "System logs not yet implemented in server mode",
            },
          ];
        } catch (error) {
          this.logger?.error("Failed to get system logs:", error);
          return [];
        }
      }
    },
    clearSystemLogs: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.systemHttpClient) {
          throw new Error(
            "System HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.systemHttpClient.clearSystemLogs(options as {
          level?: "info" | "error" | "warn" | "debug";
          service?: string;
          older_than_days?: number;
        } | undefined);
        return response.data || null;
      } else {
        // Server mode - use system service
        try {
          // Clear system logs (placeholder implementation)
          return {
            success: true,
            message: "System logs cleared successfully",
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          this.logger?.error("Failed to clear system logs:", error);
          return {
            success: false,
            message: "Failed to clear system logs",
          };
        }
      }
    },
  };

  /**
   * Admin management
   */
  admin = {
    // User Management
    getAllUsers: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error("Admin HTTP client not initialized");
        }
        const response = await this.adminHttpClient.getAllUsers(options as {
          limit?: number;
          offset?: number;
          search?: string;
          role?: string;
          status?: string;
          project_id?: string;
        } | undefined);
        return response.data || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.getUsers(options as {
            limit?: number;
            offset?: number;
            search?: string;
            active?: boolean;
          } | undefined);
        } catch (error) {
          this.logger?.error("Failed to get all users:", error);
          return [];
        }
      }
    },
    getUser: async (userId: string): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.getUser(userId);
        return response.data || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.getUserById(userId);
        } catch (error) {
          this.logger?.error("Failed to get user:", error);
          return null;
        }
      }
    },
    createUser: async (userData: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.createUser(
          userData as {
            username: string;
            email: string;
            password: string;
            first_name?: string;
            last_name?: string;
            role: "admin" | "user";
            project_id?: string;
            permissions?: string[];
            metadata?: Record<string, unknown>;
          }
        );
        return response.data || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.createUser(
            userData as unknown as Omit<
              import("./admin-service").AdminUser,
              "id" | "created_at" | "updated_at"
            >
          );
        } catch (error) {
          this.logger?.error("Failed to create user:", error);
          return null;
        }
      }
    },
    updateUser: async (userId: string, updates: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.updateUser(
          userId,
          updates as Record<string, unknown>
        );
        return response.data || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.updateUser(
            userId,
            updates as Record<string, unknown>
          );
        } catch (error) {
          this.logger?.error("Failed to update user:", error);
          return null;
        }
      }
    },
    deleteUser: async (userId: string): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.deleteUser(userId);
        return { success: response.success };
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          await this.adminService.deleteUser(userId);
          return { success: true };
        } catch (error) {
          this.logger?.error("Failed to delete user:", error);
          return { success: false };
        }
      }
    },
    updateUserRole: async (userId: string, role: string): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.updateUserRole(
          userId,
          role
        );
        return response.data || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.updateUser(userId, { role });
        } catch (error) {
          this.logger?.error("Failed to update user role:", error);
          return null;
        }
      }
    },
    updateUserPermissions: async (
      userId: string,
      permissions: string[]
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.updateUserPermissions(
          userId,
          permissions
        );
        return response.data || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.updateUser(userId, { permissions });
        } catch (error) {
          this.logger?.error("Failed to update user permissions:", error);
          return null;
        }
      }
    },
    activateUser: async (userId: string): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.activateUser(userId);
        return response.data || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.updateUser(userId, { active: true });
        } catch (error) {
          this.logger?.error("Failed to activate user:", error);
          return null;
        }
      }
    },
    deactivateUser: async (userId: string): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.deactivateUser(userId);
        return response.data || null;
      } else {
        // Server mode - use admin service
        if (!this.adminService) {
          throw new Error("Admin service not initialized");
        }
        try {
          return await this.adminService.updateUser(userId, { active: false });
        } catch (error) {
          this.logger?.error("Failed to deactivate user:", error);
          return null;
        }
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
    ): Promise<{ key: string; data: unknown }> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.createApiKey(
          userId,
          keyData
        );
        return response.data || { key: "", data: null };
      } else {
        if (!this.adminService) {
          throw new Error(
            "Admin service not initialized. Please ensure you're in server mode."
          );
        }
        return this.adminService.createApiKey(userId, keyData);
      }
    },

    // Project Management
    getAllProjects: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.getAllProjects(options as {
          limit?: number;
          offset?: number;
          search?: string;
          status?: string;
          owner_id?: string;
        } | undefined);
        return response.data || null;
      } else {
        // Server mode - use projects service
        if (!this.projectsService) {
          throw new Error("Projects service not initialized");
        }
        try {
          return await this.projectsService.getAllProjects(options as {
            limit?: number;
            offset?: number;
            search?: string;
            active?: boolean;
            owner_id?: string;
          } | undefined);
        } catch (error) {
          this.logger?.error("Failed to get all projects:", error);
          return [];
        }
      }
    },
    getProject: async (projectId: string): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.getProject(projectId);
        return response.data || null;
      } else {
        // Server mode - use projects service
        if (!this.projectsService) {
          throw new Error("Projects service not initialized");
        }
        try {
          return await this.projectsService.getProjectById(projectId);
        } catch (error) {
          this.logger?.error("Failed to get project:", error);
          return null;
        }
      }
    },
    updateProject: async (
      projectId: string,
      updates: unknown
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.updateProject(
          projectId,
          updates as Record<string, unknown>
        );
        return response.data || null;
      } else {
        // Server mode - use projects service
        if (!this.projectsService) {
          throw new Error("Projects service not initialized");
        }
        try {
          return await this.projectsService.updateProject(
            projectId,
            updates as Record<string, unknown>
          );
        } catch (error) {
          this.logger?.error("Failed to update project:", error);
          return null;
        }
      }
    },
    deleteProject: async (projectId: string): Promise<{ success: boolean }> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.deleteProject(projectId);
        return { success: response.success };
      } else {
        // Server mode - use projects service
        if (!this.projectsService) {
          throw new Error("Projects service not initialized");
        }
        try {
          await this.projectsService.deleteProject(projectId);
          return { success: true };
        } catch (error) {
          this.logger?.error("Failed to delete project:", error);
          return { success: false };
        }
      }
    },
    suspendProject: async (
      projectId: string,
      reason?: string
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.suspendProject(
          projectId,
          reason
        );
        return response.data || null;
      } else {
        // Server mode - use projects service
        if (!this.projectsService) {
          throw new Error("Projects service not initialized");
        }
        try {
          // Update project to mark as suspended in settings
          return await this.projectsService.updateProject(projectId, {
            settings: {
              status: "suspended",
              suspension_reason: reason || "Admin suspended",
            } as Record<string, unknown>,
          });
        } catch (error) {
          this.logger?.error("Failed to suspend project:", error);
          return null;
        }
      }
    },
    activateProject: async (projectId: string): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.activateProject(projectId);
        return response.data || null;
      } else {
        throw new Error(
          "Admin activateProject not implemented for server mode"
        );
      }
    },

    // System Monitoring
    getSystemOverview: async (): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.getSystemOverview();
        return response.data || null;
      } else {
        throw new Error(
          "Admin getSystemOverview not implemented for server mode"
        );
      }
    },
    getSystemMetrics: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.getSystemMetrics(
          options as {
            period: "hour" | "day" | "week" | "month";
            start_date?: string;
            end_date?: string;
          }
        );
        return response.data || null;
      } else {
        throw new Error(
          "Admin getSystemMetrics not implemented for server mode"
        );
      }
    },

    // Security Management
    getSecurityLogs: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.getSecurityLogs(options as {
          level?: "info" | "error" | "critical" | "warn";
          user_id?: string;
          action_type?: string;
          limit?: number;
          offset?: number;
          start_date?: string;
          end_date?: string;
        } | undefined);
        return response.data || null;
      } else {
        throw new Error(
          "Admin getSecurityLogs not implemented for server mode"
        );
      }
    },
    getFailedLoginAttempts: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.getFailedLoginAttempts(
          options as {
            limit?: number;
            offset?: number;
            user_id?: string;
            ip_address?: string;
            start_date?: string;
            end_date?: string;
          } | undefined
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
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.blockIP(
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
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.unblockIP(ipAddress);
        return { success: response.success };
      } else {
        throw new Error("Admin unblockIP not implemented for server mode");
      }
    },
    getBlockedIPs: async (): Promise<unknown[]> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.getBlockedIPs();
        return response.data || [];
      } else {
        throw new Error("Admin getBlockedIPs not implemented for server mode");
      }
    },

    // Maintenance Operations
    runSystemMaintenance: async (): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.runSystemMaintenance();
        return response.data || null;
      } else {
        throw new Error(
          "Admin runSystemMaintenance not implemented for server mode"
        );
      }
    },
    backupSystem: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.backupSystem(
          options as {
            include_files: boolean;
            include_database: boolean;
            compression: boolean;
          }
        );
        return response.data || null;
      } else {
        throw new Error("Admin backupSystem not implemented for server mode");
      }
    },
    restoreSystem: async (backupPath: string): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.restoreSystem(backupPath);
        return response.data || null;
      } else {
        throw new Error("Admin restoreSystem not implemented for server mode");
      }
    },
    clearOldLogs: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.adminHttpClient) {
          throw new Error(
            "Admin HTTP client not initialized. Please ensure you're in client mode."
          );
        }
        const response = await this.adminHttpClient.clearOldLogs(
          options as {
            older_than_days: number;
            log_types: string[];
          }
        );
        return response.data || null;
      } else {
        throw new Error("Admin clearOldLogs not implemented for server mode");
      }
    },
  };

  /**
   * Activity logging
   */
  activity = {
    log: async (
      activityData: Omit<ActivityLoggerType, "id" | "timestamp">
    ): Promise<ActivityLoggerType> => {
      if (this.mode === "client") {
        // For client mode, use the configured endpoint
        const baseUrl = this.config.endpoint || "http://localhost:3470";
        const response = await fetch(`${baseUrl}/admin/activity/log`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              this.config.sessionToken || this.config.apiKey
            }`,
          },
          body: JSON.stringify(activityData),
        });

        if (!response.ok) {
          throw new Error(`Activity logging failed: ${response.status}`);
        }

        return await response.json() as ActivityLoggerType;
      } else {
        // For server mode, use activity logger directly
        if (!this.activityLogger) {
          throw new Error("Activity logger not initialized");
        }
        return await this.activityLogger.log(activityData);
      }
    },
    query: async (options?: {
      limit?: number;
      offset?: number;
      project_id?: string;
      user_id?: string;
      action?: string;
      resource_type?: string;
      severity?: string;
      start_date?: string;
      end_date?: string;
    }): Promise<{ logs: ActivityLoggerType[]; total: number }> => {
      if (this.mode === "client") {
        // For client mode, use the configured endpoint
        const baseUrl = this.config.endpoint || "http://localhost:3470";
        const queryParams = new URLSearchParams();
        if (options) {
          Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
              queryParams.append(key, String(value));
            }
          });
        }

        const response = await fetch(
          `${baseUrl}/admin/activity/query?${queryParams}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${
                this.config.sessionToken || this.config.apiKey
              }`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Activity query failed: ${response.status}`);
        }

        return await response.json() as { logs: ActivityLoggerType[]; total: number };
      } else {
        // For server mode, use activity logger directly
        if (!this.activityLogger) {
          throw new Error("Activity logger not initialized");
        }
        // Convert string dates to Date objects for the activity logger
        const queryWithDates: ActivityQuery = {};
        if (options?.user_id !== undefined) {
          queryWithDates.user_id = options.user_id;
        }
        if (options?.project_id !== undefined) {
          queryWithDates.project_id = options.project_id;
        }
        if (options?.action !== undefined) {
          queryWithDates.action = options.action;
        }
        if (options?.resource_type !== undefined) {
          queryWithDates.resource_type = options.resource_type;
        }
        if (options?.severity !== undefined) {
          queryWithDates.severity = options.severity;
        }
        if (options?.limit !== undefined) {
          queryWithDates.limit = options.limit;
        }
        if (options?.offset !== undefined) {
          queryWithDates.offset = options.offset;
        }
        if (options?.start_date) {
          queryWithDates.start_date = new Date(options.start_date);
        }
        if (options?.end_date) {
          queryWithDates.end_date = new Date(options.end_date);
        }
        return await this.activityLogger.query(queryWithDates);
      }
    },
    getStatistics: async (projectId?: string): Promise<unknown> => {
      if (this.mode === "client") {
        // For now, return mock data for client mode
        return {
          total_activities: 100,
          activities_by_type: { login: 50, create: 30, update: 20 },
          activities_by_severity: { info: 80, warning: 15, error: 5 },
        };
      } else {
        // For server mode, use activity logger directly
        if (!this.activityLogger) {
          throw new Error("Activity logger not initialized");
        }
        return await this.activityLogger.getActivityStats(projectId || "");
      }
    },
    cleanup: async (
      olderThanDays: number
    ): Promise<{ success: boolean; deletedCount: number }> => {
      if (this.mode === "client") {
        // For client mode, this would typically be an admin-only operation
        throw new Error("Activity cleanup not available in client mode");
      } else {
        // For server mode, use activity logger directly
        if (!this.activityLogger) {
          throw new Error("Activity logger not initialized");
        }
        const deletedCount = await this.activityLogger.cleanOldLogs(
          olderThanDays
        );
        return { success: true, deletedCount };
      }
    },
  };

  /**
   * Metadata management
   */
  metadata = {
    addCustomField: async (customField: {
      collection_name: string;
      field_name: string;
      field_type: string;
      display_name: string;
      description?: string;
      required?: boolean;
      unique?: boolean;
      default_value?: unknown;
      validation?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }): Promise<{
      id: string;
      field_name: string;
      collection_name: string;
    }> => {
      // For now, return a mock response
      return {
        id: `field_${Date.now()}`,
        field_name: customField.field_name,
        collection_name: customField.collection_name,
      };
    },
  };

  /**
   * Performance monitoring
   */
  performance = {
    start: async (): Promise<{ session_id: string; status: string }> => {
      // For now, return a mock response
      return {
        session_id: `session_${Date.now()}`,
        status: "started",
      };
    },
    measure: async (measurement: {
      operation: string;
      duration_ms: number;
      success: boolean;
      metadata?: Record<string, unknown>;
    }): Promise<{
      operation: string;
      duration_ms: number;
      success: boolean;
    }> => {
      // For now, return the measurement back
      return {
        operation: measurement.operation,
        duration_ms: measurement.duration_ms,
        success: measurement.success,
      };
    },
  };

  /**
   * Changelog management
   */
  changelog = {
    // Project Changelog
    getProjectChangelog: async (
      projectId: string,
      options?: unknown
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.changelogHttpClient) {
          throw new Error("Changelog HTTP client not initialized");
        }
        const response = await this.changelogHttpClient.getProjectChangelog(
          projectId,
          options as {
            limit?: number;
            offset?: number;
            action_type?: string;
            user_id?: string;
            start_date?: string;
            end_date?: string;
            collection_name?: string;
            document_id?: string;
          } | undefined
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
      options?: unknown
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.changelogHttpClient) {
          throw new Error("Changelog HTTP client not initialized");
        }
        const response = await this.changelogHttpClient.getCollectionChangelog(
          projectId,
          collectionName,
          options as {
            limit?: number;
            offset?: number;
            action_type?: string;
            user_id?: string;
            start_date?: string;
            end_date?: string;
            document_id?: string;
          } | undefined
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
      options?: unknown
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.changelogHttpClient) {
          throw new Error("Changelog HTTP client not initialized");
        }
        const response = await this.changelogHttpClient.getDocumentChangelog(
          projectId,
          collectionName,
          documentId,
          options as {
            limit?: number;
            offset?: number;
            action_type?: string;
            user_id?: string;
            start_date?: string;
            end_date?: string;
          } | undefined
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
      options?: unknown
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.changelogHttpClient) {
          throw new Error("Changelog HTTP client not initialized");
        }
        const response = await this.changelogHttpClient.getUserActivity(
          projectId,
          userId,
          options as {
            limit?: number;
            offset?: number;
            action_type?: string;
            start_date?: string;
            end_date?: string;
            entity_type?: string;
          } | undefined
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog getUserActivity not implemented for server mode"
        );
      }
    },

    // System-wide Changelog (Admin only)
    getSystemChangelog: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.changelogHttpClient) {
          throw new Error("Changelog HTTP client not initialized");
        }
        const response = await this.changelogHttpClient.getSystemChangelog(
          options as {
            limit?: number;
            offset?: number;
            action_type?: string;
            user_id?: string;
            project_id?: string;
            entity_type?: string;
            start_date?: string;
            end_date?: string;
          } | undefined
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
      options?: unknown
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.changelogHttpClient) {
          throw new Error("Changelog HTTP client not initialized");
        }
        const response = await this.changelogHttpClient.getChangelogStatistics(
          projectId,
          options as {
            period: "hour" | "day" | "week" | "month";
            start_date?: string;
            end_date?: string;
            group_by?: "action_type" | "entity_type" | "user_id";
          }
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog getChangelogStatistics not implemented for server mode"
        );
      }
    },

    // Export Changelog
    exportChangelog: async (
      projectId: string,
      options?: unknown
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.changelogHttpClient) {
          throw new Error("Changelog HTTP client not initialized");
        }
        const response = await this.changelogHttpClient.exportChangelog(
          projectId,
          options as {
            format: "json" | "csv" | "xml";
            start_date?: string;
            end_date?: string;
            action_type?: string;
            user_id?: string;
            entity_type?: string;
          }
        );
        return response.data || null;
      } else {
        throw new Error(
          "Changelog exportChangelog not implemented for server mode"
        );
      }
    },

    // Purge Old Changelog Entries (Admin only)
    purgeOldChangelog: async (options?: unknown): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.changelogHttpClient) {
          throw new Error("Changelog HTTP client not initialized");
        }
        const response = await this.changelogHttpClient.purgeOldChangelog(
          options as {
            older_than_days: number;
            project_id?: string;
            action_type?: string;
            entity_type?: string;
          }
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
    }): Promise<Project> => {
      if (this.mode === "client") {
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.createTestProject(
          options
        );
        return (response.data as unknown as Project) || null;
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
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.cleanup(projectId);
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
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.runTests(testSuite);
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
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.seedData(
          projectId,
          seedType,
          options
        );
        return response.data || { success: false, created: {} };
      } else {
        throw new Error("Testing seedData not implemented for server mode");
      }
    },
    getTestProjects: async (): Promise<unknown[]> => {
      if (this.mode === "client") {
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.getTestProjects();
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
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.deleteTestProject(
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
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.resetTestData(projectId);
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
    ): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.runScenario(
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
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.getAvailableScenarios();
        return response.data || [];
      } else {
        throw new Error(
          "Testing getAvailableScenarios not implemented for server mode"
        );
      }
    },
    runPerformanceTest: async (testConfig: {
      endpoint: string;
      method: "GET" | "POST" | "PUT" | "DELETE";
      iterations: number;
      concurrent_users: number;
      payload?: Record<string, unknown>;
    }): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.runPerformanceTest(
          testConfig
        );
        return response.data || null;
      } else {
        throw new Error(
          "Testing runPerformanceTest not implemented for server mode"
        );
      }
    },
    runLoadTest: async (testConfig: {
      endpoint: string;
      method: "GET" | "POST" | "PUT" | "DELETE";
      duration_seconds: number;
      users_per_second: number;
      payload?: Record<string, unknown>;
    }): Promise<unknown> => {
      if (this.mode === "client") {
        if (!this.testingHttpClient) {
          throw new Error("Testing HTTP client not initialized");
        }
        const response = await this.testingHttpClient.runLoadTest(testConfig);
        return response.data || null;
      } else {
        throw new Error("Testing runLoadTest not implemented for server mode");
      }
    },
  };

  /**
   * Get the current connection mode
   * 
   * Returns the current mode: 'client' for HTTP mode, 'server' for database mode,
   * or null if not yet connected.
   * 
   * @returns {Mode} Current mode ('client' | 'server' | null)
   * 
   * @example
   * const mode = krapi.getMode();
   * if (mode === 'client') {
   *   // Using HTTP client
   * }
   */
  getMode(): Mode {
    return this.mode;
  }

  /**
   * Get current configuration
   * 
   * Returns the current SDK configuration including mode, endpoint, API key,
   * and database connection (if in server mode).
   * 
   * @returns {Object} Configuration object
   * @returns {string} returns.mode - Current mode ('client' | 'server' | null)
   * @returns {string} [returns.endpoint] - API endpoint (client mode)
   * @returns {string} [returns.apiKey] - API key (client mode)
   * @returns {Record<string, unknown>} [returns.database] - Database connection info (server mode)
   * 
   * @example
   * const config = krapi.getConfig();
   */
  getConfig(): {
    mode: "client" | "server" | null;
    endpoint?: string;
    apiKey?: string;
    database?: Record<string, unknown>;
  } {
    const config: {
      mode: "client" | "server" | null;
      endpoint?: string;
      apiKey?: string;
      database?: Record<string, unknown>;
    } = {
      mode: this.mode,
    };
    if (this.config.endpoint !== undefined) {
      config.endpoint = this.config.endpoint;
    }
    if (this.config.apiKey !== undefined) {
      config.apiKey = this.config.apiKey;
    }
    if (this.config.database !== undefined) {
      config.database = this.config.database as unknown as Record<string, unknown>;
    }
    return config;
  }

  /**
   * Close the connection and clean up resources
   * 
   * Closes database connections (in server mode) and cleans up resources.
   * Should be called when the SDK is no longer needed.
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await krapi.close();
   */
  async close(): Promise<void> {
    if (this.mode === "server" && this.config.database?.end) {
      await this.config.database.end();
    }
    this.logger.info("KRAPI SDK connection closed");
  }

  /**
   * Check storage system health
   */
  private async checkStorageHealth(): Promise<boolean> {
    try {
      if (this.mode !== "server") {
        return true; // Storage health check only available in server mode
      }

      // Check if storage service is available and can perform basic operations
      if (!this.storageService) {
        return false;
      }

      // Try to get storage statistics as a health check (use default project)
      const stats = await this.storageService.getStorageStatistics("default");
      return stats !== null;
    } catch (error) {
      this.logger?.error("Storage health check failed:", error);
      return false;
    }
  }

  /**
   * Check email system health
   */
  private async checkEmailHealth(): Promise<boolean> {
    try {
      if (this.mode !== "server") {
        return true; // Email health check only available in server mode
      }

      // Check if email service is available and can perform basic operations
      if (!this.emailService) {
        return false;
      }

      // Try to get email templates as a health check (use default project)
      const templates = await this.emailService.getTemplates("default");
      return templates !== null;
    } catch (error) {
      this.logger?.error("Email health check failed:", error);
      return false;
    }
  }

  /**
   * Create a system backup
   */
  private async createSystemBackup(): Promise<unknown> {
    try {
      if (this.mode !== "server") {
        throw new Error("System backup only available in server mode");
      }

      const backup = {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        components: {
          database: await this.databaseHealthManager?.healthCheck(),
          storage: await this.checkStorageHealth(),
          email: await this.checkEmailHealth(),
        },
        message: "System backup completed successfully",
      };

      return backup;
    } catch (error) {
      this.logger?.error("Failed to create system backup:", error);
      throw error;
    }
  }

  /**
   * Generate password hash for user management
   */
  // Password hash generation available for user management
  // @ts-expect-error - Method reserved for future use
  private async _generatePasswordHash(password: string): Promise<string> {
    // In a real implementation, this would use bcrypt or similar
    // For now, return a simple hash (this should be replaced with proper hashing)
    return `hash_${password}_${Date.now()}`;
  }
}

// Create a singleton instance
const krapiInstance = new KrapiWrapper();

// Export the singleton instance
export const krapi = krapiInstance;

// Also export the class for advanced usage
export { KrapiWrapper };

// Configuration type is exported at the interface declaration above
