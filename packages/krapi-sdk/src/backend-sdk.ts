/**
 * KRAPI Backend SDK
 *
 * Backend SDK for implementing KRAPI backend services.
 * This SDK provides direct database access and implements the shared interfaces.
 *
 * @example
 * ```typescript
 * import { BackendSDK } from '@krapi/sdk';
 *
 * const backendSDK = new BackendSDK({
 *   databaseService: new DatabaseService(),
 *   authService: new AuthService(),
 *   // ... other services
 * });
 *
 * // Use in controllers
 * const projects = await backendSDK.projects.getAll();
 * ```
 */

import {
  IKrapiSDK,
  IAuthService,
  IAdminService,
  IProjectService,
  ICollectionService,
  IDocumentService,
  IStorageService,
  IUserService,
  IApiKeyService,
  IEmailService,
  IChangelogService,
  IHealthService,
  ITestingService,
  ApiResponse,
  PaginatedResponse,
  QueryOptions,
  AdminUser,
  Project,
  Collection,
  Document,
  FileInfo,
  ProjectUser,
  Session,
  ApiKey,
  EmailTemplate,
  ChangelogEntry,
  CreateChangelogEntry,
  ProjectSettings,
  ProjectStats,
  StorageStats,
  EmailConfig,
  EmailSendRequest,
} from "./interfaces";

// Backend-specific service interfaces
export interface IDatabaseService {
  // Projects
  getProjects(options?: QueryOptions): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | null>;
  createProject(project: Partial<Project>): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<boolean>;
  getProjectStats(id: string): Promise<ProjectStats>;
  getProjectSettings(id: string): Promise<ProjectSettings>;
  updateProjectSettings(
    id: string,
    settings: Partial<ProjectSettings>
  ): Promise<ProjectSettings>;

  // Collections
  getCollections(projectId: string): Promise<Collection[]>;
  getCollectionById(id: string): Promise<Collection | null>;
  createCollection(collection: Partial<Collection>): Promise<Collection>;
  updateCollection(
    id: string,
    updates: Partial<Collection>
  ): Promise<Collection>;
  deleteCollection(id: string): Promise<boolean>;

  // Documents
  getDocuments(
    collectionId: string,
    options?: QueryOptions
  ): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | null>;
  createDocument(
    collectionId: string,
    data: Record<string, any>
  ): Promise<Document>;
  updateDocument(id: string, updates: Record<string, any>): Promise<Document>;
  deleteDocument(id: string): Promise<boolean>;

  // Users
  getUsers(projectId: string, options?: QueryOptions): Promise<ProjectUser[]>;
  getUserById(id: string): Promise<ProjectUser | null>;
  createUser(user: Partial<ProjectUser>): Promise<ProjectUser>;
  updateUser(id: string, updates: Partial<ProjectUser>): Promise<ProjectUser>;
  deleteUser(id: string): Promise<boolean>;

  // API Keys
  getApiKeys(projectId: string): Promise<ApiKey[]>;
  getApiKeyById(id: string): Promise<ApiKey | null>;
  createApiKey(key: Partial<ApiKey>): Promise<ApiKey>;
  updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey>;
  deleteApiKey(id: string): Promise<boolean>;

  // Admin Users
  getAdminUsers(options?: QueryOptions): Promise<AdminUser[]>;
  getAdminUserById(id: string): Promise<AdminUser | null>;
  createAdminUser(user: Partial<AdminUser>): Promise<AdminUser>;
  updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser>;
  deleteAdminUser(id: string): Promise<boolean>;

  // Changelog
  createChangelogEntry(entry: CreateChangelogEntry): Promise<ChangelogEntry>;
  getChangelogEntries(
    projectId: string,
    options?: QueryOptions
  ): Promise<ChangelogEntry[]>;
}

export interface IAuthServiceBackend {
  validateSession(token: string): Promise<{
    valid: boolean;
    user?: AdminUser | ProjectUser;
    scopes?: string[];
  }>;
  authenticateUser(credentials: {
    username: string;
    password: string;
  }): Promise<AdminUser | ProjectUser | null>;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  generateToken(user: AdminUser | ProjectUser): Promise<string>;
}

export interface IStorageServiceBackend {
  uploadFile(file: any, metadata?: any): Promise<FileInfo>;
  downloadFile(
    fileId: string
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }>;
  deleteFile(fileId: string): Promise<boolean>;
  getFileInfo(fileId: string): Promise<FileInfo>;
  getFiles(projectId: string): Promise<FileInfo[]>;
  getStorageStats(projectId: string): Promise<StorageStats>;
}

export interface IEmailServiceBackend {
  sendEmail(request: EmailSendRequest): Promise<boolean>;
  getTemplates(projectId: string): Promise<EmailTemplate[]>;
  getTemplate(id: string): Promise<EmailTemplate | null>;
  createTemplate(template: Partial<EmailTemplate>): Promise<EmailTemplate>;
  updateTemplate(
    id: string,
    updates: Partial<EmailTemplate>
  ): Promise<EmailTemplate>;
  deleteTemplate(id: string): Promise<boolean>;
  testConfig(projectId: string): Promise<{ success: boolean; message: string }>;
  getConfig(projectId: string): Promise<EmailConfig>;
  updateConfig(
    projectId: string,
    config: Partial<EmailConfig>
  ): Promise<EmailConfig>;
}

export interface BackendSDKConfig {
  databaseService: IDatabaseService;
  authService: IAuthServiceBackend;
  storageService: IStorageServiceBackend;
  emailService: IEmailServiceBackend;
}

/**
 * Backend SDK implementation
 *
 * This SDK is designed for backend developers to implement KRAPI services.
 * It provides direct access to database operations and implements the shared interfaces.
 */
export class BackendSDK implements IKrapiSDK {
  private _db: IDatabaseService;
  private _auth: IAuthServiceBackend;
  private _storage: IStorageServiceBackend;
  private _email: IEmailServiceBackend;

  constructor(config: BackendSDKConfig) {
    this._db = config.databaseService;
    this._auth = config.authService;
    this._storage = config.storageService;
    this._email = config.emailService;
  }

  // Utility methods
  setSessionToken(token: string): void {
    // Not applicable for backend SDK
  }

  setApiKey(key: string): void {
    // Not applicable for backend SDK
  }

  clearAuth(): void {
    // Not applicable for backend SDK
  }

  get baseURL(): string {
    return "backend://localhost"; // Not applicable for backend SDK
  }

  // Auth service implementation
  auth: IAuthService = {
    adminLogin: async (credentials: { username: string; password: string }) => {
      const user = await this._auth.authenticateUser(credentials);
      if (!user) {
        throw new Error("Invalid credentials");
      }

      const token = await this._auth.generateToken(user);
      const scopes = this.getUserScopes(user);

      return {
        success: true,
        data: {
          user: user as AdminUser & { scopes: string[] },
          token,
          session_token: token,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };
    },

    adminApiLogin: async (apiKey: string) => {
      // Implementation for API key login
      throw new Error("Not implemented yet");
    },

    createAdminSession: async (apiKey: string) => {
      // Implementation for creating admin session
      throw new Error("Not implemented yet");
    },

    createProjectSession: async (
      projectId: string,
      credentials: { username: string; password: string }
    ) => {
      // Implementation for creating project session
      throw new Error("Not implemented yet");
    },

    validateSession: async (token: string) => {
      const result = await this._auth.validateSession(token);
      return { success: true, data: result };
    },

    getCurrentUser: async (req: any) => {
      // Implementation for getting current user from request
      throw new Error("Not implemented yet");
    },

    logout: async (req: any) => {
      // Implementation for logout
      throw new Error("Not implemented yet");
    },

    changePassword: async (req: any) => {
      // Implementation for changing password
      throw new Error("Not implemented yet");
    },

    regenerateApiKey: async (req: any) => {
      // Implementation for regenerating API key
      throw new Error("Not implemented yet");
    },
  };

  // Admin service implementation
  admin: IAdminService = {
    getUsers: async (options?: QueryOptions) => {
      const users = await this._db.getAdminUsers(options);
      return {
        success: true,
        pagination: {
          data: users,
          total: users.length,
          page: 1,
          limit: users.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    },

    getUserById: async (id: string) => {
      const user = await this._db.getAdminUserById(id);
      if (!user) {
        throw new Error("User not found");
      }
      return { success: true, data: user };
    },

    createUser: async (userData: Partial<AdminUser>) => {
      const user = await this._db.createAdminUser(userData);
      return { success: true, data: user };
    },

    updateUser: async (id: string, updates: Partial<AdminUser>) => {
      const user = await this._db.updateAdminUser(id, updates);
      return { success: true, data: user };
    },

    deleteUser: async (id: string) => {
      await this._db.deleteAdminUser(id);
      return { success: true };
    },

    toggleUserStatus: async (id: string) => {
      // Implementation for toggling user status
      throw new Error("Not implemented yet");
    },

    getUserActivity: async (id: string) => {
      // Implementation for getting user activity
      throw new Error("Not implemented yet");
    },

    getUserApiKeys: async (userId: string) => {
      // Implementation for getting user API keys
      throw new Error("Not implemented yet");
    },

    createUserApiKey: async (userId: string, keyData: Partial<ApiKey>) => {
      // Implementation for creating user API key
      throw new Error("Not implemented yet");
    },

    deleteApiKey: async (keyId: string) => {
      // Implementation for deleting API key
      throw new Error("Not implemented yet");
    },

    createMasterApiKey: async () => {
      // Implementation for creating master API key
      throw new Error("Not implemented yet");
    },

    getSystemStats: async () => {
      // Implementation for getting system stats
      throw new Error("Not implemented yet");
    },

    getActivityLogs: async (options?: QueryOptions) => {
      // Implementation for getting activity logs
      throw new Error("Not implemented yet");
    },

    getDatabaseHealth: async () => {
      // Implementation for getting database health
      throw new Error("Not implemented yet");
    },

    repairDatabase: async () => {
      // Implementation for repairing database
      throw new Error("Not implemented yet");
    },

    runDiagnostics: async () => {
      // Implementation for running diagnostics
      throw new Error("Not implemented yet");
    },
  };

  // Project service implementation
  projects: IProjectService = {
    getAll: async (options?: QueryOptions) => {
      const projects = await this._db.getProjects(options);
      return {
        success: true,
        pagination: {
          data: projects,
          total: projects.length,
          page: 1,
          limit: projects.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    },

    getById: async (id: string) => {
      const project = await this._db.getProjectById(id);
      if (!project) {
        throw new Error("Project not found");
      }
      return { success: true, data: project };
    },

    create: async (projectData: Partial<Project>) => {
      const project = await this._db.createProject(projectData);
      return { success: true, data: project };
    },

    update: async (id: string, updates: Partial<Project>) => {
      const project = await this._db.updateProject(id, updates);
      return { success: true, data: project };
    },

    delete: async (id: string) => {
      await this._db.deleteProject(id);
      return { success: true };
    },

    getStats: async (id: string) => {
      const stats = await this._db.getProjectStats(id);
      return { success: true, data: stats };
    },

    getActivity: async (id: string) => {
      // Implementation for getting project activity
      throw new Error("Not implemented yet");
    },

    getSettings: async (id: string) => {
      const settings = await this._db.getProjectSettings(id);
      return { success: true, data: settings };
    },

    updateSettings: async (id: string, settings: Partial<ProjectSettings>) => {
      const updatedSettings = await this._db.updateProjectSettings(
        id,
        settings
      );
      return { success: true, data: updatedSettings };
    },

    createApiKey: async (id: string, keyData: Partial<ApiKey>) => {
      const apiKey = await this._db.createApiKey(keyData);
      return { success: true, data: apiKey };
    },

    getApiKeys: async (id: string) => {
      const apiKeys = await this._db.getApiKeys(id);
      return { success: true, data: apiKeys };
    },

    deleteApiKey: async (id: string, keyId: string) => {
      await this._db.deleteApiKey(keyId);
      return { success: true };
    },

    regenerateApiKey: async (id: string) => {
      // Implementation for regenerating API key
      throw new Error("Not implemented yet");
    },
  };

  // Collection service implementation
  collections: ICollectionService = {
    getAll: async (projectId: string, options?: QueryOptions) => {
      const collections = await this._db.getCollections(projectId);
      return {
        success: true,
        pagination: {
          data: collections,
          total: collections.length,
          page: 1,
          limit: collections.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    },

    getById: async (id: string) => {
      const collection = await this._db.getCollectionById(id);
      if (!collection) {
        throw new Error("Collection not found");
      }
      return { success: true, data: collection };
    },

    create: async (projectId: string, collectionData: Partial<Collection>) => {
      const collection = await this._db.createCollection(collectionData);
      return { success: true, data: collection };
    },

    update: async (id: string, updates: Partial<Collection>) => {
      const collection = await this._db.updateCollection(id, updates);
      return { success: true, data: collection };
    },

    delete: async (id: string) => {
      await this._db.deleteCollection(id);
      return { success: true };
    },

    getSchema: async (id: string) => {
      // Implementation for getting collection schema
      throw new Error("Not implemented yet");
    },

    validateSchema: async (schema: any) => {
      // Implementation for validating schema
      throw new Error("Not implemented yet");
    },
  };

  // Document service implementation
  documents: IDocumentService = {
    getAll: async (collectionId: string, options?: QueryOptions) => {
      const documents = await this._db.getDocuments(collectionId, options);
      return {
        success: true,
        pagination: {
          data: documents,
          total: documents.length,
          page: 1,
          limit: documents.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    },

    getById: async (id: string) => {
      const document = await this._db.getDocumentById(id);
      if (!document) {
        throw new Error("Document not found");
      }
      return { success: true, data: document };
    },

    create: async (collectionId: string, documentData: Record<string, any>) => {
      const document = await this._db.createDocument(
        collectionId,
        documentData
      );
      return { success: true, data: document };
    },

    update: async (id: string, updates: Record<string, any>) => {
      const document = await this._db.updateDocument(id, updates);
      return { success: true, data: document };
    },

    delete: async (id: string) => {
      await this._db.deleteDocument(id);
      return { success: true };
    },

    search: async (
      collectionId: string,
      query: string,
      options?: QueryOptions
    ) => {
      // Implementation for searching documents
      throw new Error("Not implemented yet");
    },

    bulkCreate: async (
      collectionId: string,
      documents: Record<string, any>[]
    ) => {
      // Implementation for bulk creating documents
      throw new Error("Not implemented yet");
    },

    bulkUpdate: async (
      collectionId: string,
      updates: Record<string, any>[]
    ) => {
      // Implementation for bulk updating documents
      throw new Error("Not implemented yet");
    },

    bulkDelete: async (collectionId: string, documentIds: string[]) => {
      // Implementation for bulk deleting documents
      throw new Error("Not implemented yet");
    },

    getByTable: async (
      projectId: string,
      tableName: string,
      options?: QueryOptions
    ) => {
      // Implementation for getting documents by table
      throw new Error("Not implemented yet");
    },
  };

  // Storage service implementation
  storage: IStorageService = {
    uploadFile: async (projectId: string, file: any, metadata?: any) => {
      const fileInfo = await this._storage.uploadFile(file, metadata);
      return { success: true, data: fileInfo };
    },

    downloadFile: async (fileId: string) => {
      const fileData = await this._storage.downloadFile(fileId);
      return { success: true, data: fileData };
    },

    deleteFile: async (fileId: string) => {
      await this._storage.deleteFile(fileId);
      return { success: true };
    },

    getFileInfo: async (fileId: string) => {
      const fileInfo = await this._storage.getFileInfo(fileId);
      return { success: true, data: fileInfo };
    },

    getFiles: async (projectId: string, options?: QueryOptions) => {
      const files = await this._storage.getFiles(projectId);
      return {
        success: true,
        pagination: {
          data: files,
          total: files.length,
          page: 1,
          limit: files.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    },

    getStorageStats: async (projectId: string) => {
      const stats = await this._storage.getStorageStats(projectId);
      return { success: true, data: stats };
    },

    getFileBuffer: async (fileId: string) => {
      const fileData = await this._storage.downloadFile(fileId);
      return { success: true, data: fileData.buffer };
    },
  };

  // User service implementation
  users: IUserService = {
    getAll: async (projectId: string, options?: QueryOptions) => {
      const users = await this._db.getUsers(projectId, options);
      return {
        success: true,
        pagination: {
          data: users,
          total: users.length,
          page: 1,
          limit: users.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    },

    getById: async (id: string) => {
      const user = await this._db.getUserById(id);
      if (!user) {
        throw new Error("User not found");
      }
      return { success: true, data: user };
    },

    create: async (projectId: string, userData: Partial<ProjectUser>) => {
      const user = await this._db.createUser(userData);
      return { success: true, data: user };
    },

    update: async (id: string, updates: Partial<ProjectUser>) => {
      const user = await this._db.updateUser(id, updates);
      return { success: true, data: user };
    },

    delete: async (id: string) => {
      await this._db.deleteUser(id);
      return { success: true };
    },

    authenticate: async (
      projectId: string,
      credentials: { username: string; password: string }
    ) => {
      // Implementation for authenticating user
      throw new Error("Not implemented yet");
    },

    verifyEmail: async (userId: string, token: string) => {
      // Implementation for verifying email
      throw new Error("Not implemented yet");
    },

    sendPasswordReset: async (email: string) => {
      // Implementation for sending password reset
      throw new Error("Not implemented yet");
    },

    resetPassword: async (token: string, newPassword: string) => {
      // Implementation for resetting password
      throw new Error("Not implemented yet");
    },
  };

  // API Key service implementation
  apiKeys: IApiKeyService = {
    getAll: async (options?: QueryOptions) => {
      // Implementation for getting all API keys
      throw new Error("Not implemented yet");
    },

    getById: async (id: string) => {
      const apiKey = await this._db.getApiKeyById(id);
      if (!apiKey) {
        throw new Error("API key not found");
      }
      return { success: true, data: apiKey };
    },

    create: async (keyData: Partial<ApiKey>) => {
      const apiKey = await this._db.createApiKey(keyData);
      return { success: true, data: apiKey };
    },

    update: async (id: string, updates: Partial<ApiKey>) => {
      const apiKey = await this._db.updateApiKey(id, updates);
      return { success: true, data: apiKey };
    },

    delete: async (id: string) => {
      await this._db.deleteApiKey(id);
      return { success: true };
    },

    validate: async (key: string) => {
      // Implementation for validating API key
      throw new Error("Not implemented yet");
    },

    getByUser: async (userId: string) => {
      // Implementation for getting API keys by user
      throw new Error("Not implemented yet");
    },

    getByEntity: async (entityType: string, entityId: string) => {
      // Implementation for getting API keys by entity
      throw new Error("Not implemented yet");
    },
  };

  // Email service implementation
  email: IEmailService = {
    sendEmail: async (request: EmailSendRequest) => {
      const success = await this._email.sendEmail(request);
      return { success: true, data: undefined };
    },

    getTemplates: async (projectId: string) => {
      const templates = await this._email.getTemplates(projectId);
      return { success: true, data: templates };
    },

    getTemplate: async (id: string) => {
      const template = await this._email.getTemplate(id);
      if (!template) {
        throw new Error("Template not found");
      }
      return { success: true, data: template };
    },

    createTemplate: async (templateData: Partial<EmailTemplate>) => {
      const template = await this._email.createTemplate(templateData);
      return { success: true, data: template };
    },

    updateTemplate: async (id: string, updates: Partial<EmailTemplate>) => {
      const template = await this._email.updateTemplate(id, updates);
      return { success: true, data: template };
    },

    deleteTemplate: async (id: string) => {
      await this._email.deleteTemplate(id);
      return { success: true };
    },

    testConfig: async (projectId: string) => {
      const result = await this._email.testConfig(projectId);
      return { success: true, data: result };
    },

    getConfig: async (projectId: string) => {
      // Get email config from project settings using DatabaseService
      const project = await this._db.getProjectById(projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      const emailConfig = project.settings?.email;
      if (!emailConfig) {
        return { success: false, error: "Email configuration not found" };
      }

      return { success: true, data: emailConfig };
    },

    updateConfig: async (projectId: string, config: Partial<EmailConfig>) => {
      // Update email config in project settings using DatabaseService
      const updatedSettings = await this._db.updateProjectSettings(projectId, {
        email: config as EmailConfig,
      });

      const emailConfig = updatedSettings.email;
      if (!emailConfig) {
        return {
          success: false,
          error: "Failed to update email configuration",
        };
      }

      return { success: true, data: emailConfig };
    },
  };

  // Changelog service implementation
  changelog: IChangelogService = {
    getEntries: async (projectId: string, options?: QueryOptions) => {
      const entries = await this._db.getChangelogEntries(projectId, options);
      return {
        success: true,
        pagination: {
          data: entries,
          total: entries.length,
          page: 1,
          limit: entries.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    },

    getByEntity: async (entityType: string, entityId: string) => {
      // Implementation for getting changelog by entity
      throw new Error("Not implemented yet");
    },

    create: async (entry: CreateChangelogEntry) => {
      const changelogEntry = await this._db.createChangelogEntry(entry);
      return { success: true, data: changelogEntry };
    },
  };

  // Health service implementation
  health: IHealthService = {
    check: async () => {
      // Implementation for health check
      throw new Error("Not implemented yet");
    },

    getSystemInfo: async () => {
      // Implementation for getting system info
      throw new Error("Not implemented yet");
    },

    getDatabaseStatus: async () => {
      // Implementation for getting database status
      throw new Error("Not implemented yet");
    },
  };

  // Testing service implementation
  testing: ITestingService = {
    createTestProject: async () => {
      // Implementation for creating test project
      throw new Error("Not implemented yet");
    },

    cleanup: async () => {
      // Implementation for cleanup
      throw new Error("Not implemented yet");
    },

    runIntegrationTests: async () => {
      // Implementation for running integration tests
      throw new Error("Not implemented yet");
    },

    checkSchema: async () => {
      // Implementation for checking schema
      throw new Error("Not implemented yet");
    },
  };

  // Helper methods
  private getUserScopes(user: AdminUser | ProjectUser): string[] {
    // Implementation for getting user scopes
    return [];
  }
}
