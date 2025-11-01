// Shared interfaces for Krapi application
// These interfaces define the contract that both frontend SDK and backend SDK must implement

import {
  ApiResponse,
  PaginatedResponse,
  QueryOptions,
  AdminUser,
  Project,
  Collection,
  Document,
  FileInfo,
  ProjectUser,
  ApiKey,
  EmailTemplate,
  ChangelogEntry,
  CreateChangelogEntry,
  ProjectSettings,
  ProjectStats,
  StorageStats,
  EmailConfig,
  EmailSendRequest,
  ActivityLog,
  SystemInfo,
  DatabaseHealth,
  TestResult,
  SchemaValidationResult,
  SystemSettings,
} from "./types";

export interface IAuthService {
  register(registerData: {
    username: string;
    email: string;
    password: string;
    role?: string;
    access_level?: string;
    permissions?: string[];
  }): Promise<ApiResponse<{ success: boolean; user: AdminUser }>>;

  logout(sessionId?: string): Promise<ApiResponse<{ success: boolean }>>;

  adminLogin(credentials: { username: string; password: string }): Promise<
    ApiResponse<{
      user: AdminUser & { scopes: string[] };
      token: string;
      session_token: string;
      expires_at: string;
    }>
  >;

  adminApiLogin(apiKey: string): Promise<
    ApiResponse<{
      user: AdminUser & { scopes: string[] };
      token: string;
      session_token: string;
      expires_at: string;
    }>
  >;

  createAdminSession(apiKey: string): Promise<
    ApiResponse<{
      user: AdminUser & { scopes: string[] };
      token: string;
      session_token: string;
      expires_at: string;
    }>
  >;

  createProjectSession(
    projectId: string,
    credentials: { username: string; password: string }
  ): Promise<
    ApiResponse<{
      user: ProjectUser & { scopes: string[] };
      token: string;
      session_token: string;
      expires_at: string;
    }>
  >;

  validateSession(token: string): Promise<
    ApiResponse<{
      valid: boolean;
      user?: AdminUser | ProjectUser;
      scopes?: string[];
    }>
  >;

  getCurrentUser(req: unknown): Promise<ApiResponse<AdminUser | ProjectUser>>;
  logout(req: unknown): Promise<ApiResponse<void>>;
  changePassword(req: unknown): Promise<ApiResponse<void>>;
  regenerateApiKey(req: unknown): Promise<ApiResponse<{ apiKey: string }>>;
}

export interface IAdminService {
  getUsers(
    options?: QueryOptions
  ): Promise<PaginatedResponse<Omit<AdminUser, "password_hash">>>;
  getUserById(
    id: string
  ): Promise<ApiResponse<Omit<AdminUser, "password_hash">>>;
  createUser(
    userData: Partial<AdminUser>
  ): Promise<ApiResponse<Omit<AdminUser, "password_hash">>>;
  updateUser(
    id: string,
    updates: Partial<AdminUser>
  ): Promise<ApiResponse<Omit<AdminUser, "password_hash">>>;
  deleteUser(id: string): Promise<ApiResponse<void>>;
  toggleUserStatus(id: string): Promise<ApiResponse<{ active: boolean }>>;
  getUserActivity(id: string): Promise<ApiResponse<ActivityLog[]>>;
  getUserApiKeys(userId: string): Promise<ApiResponse<ApiKey[]>>;
  createUserApiKey(
    userId: string,
    keyData: Partial<ApiKey>
  ): Promise<ApiResponse<ApiKey>>;
  deleteApiKey(keyId: string): Promise<ApiResponse<void>>;
  createMasterApiKey(): Promise<ApiResponse<ApiKey>>;
  getSystemStats(): Promise<ApiResponse<SystemInfo>>;
  getActivityLogs(
    options?: QueryOptions
  ): Promise<PaginatedResponse<ActivityLog>>;
  getDatabaseHealth(): Promise<ApiResponse<DatabaseHealth>>;
  repairDatabase(): Promise<ApiResponse<{ success: boolean; message: string }>>;
  runDiagnostics(): Promise<
    ApiResponse<{
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
      tests: TestResult[];
    }>
  >;
}

export interface IProjectService {
  getAll(options?: QueryOptions): Promise<PaginatedResponse<Project>>;
  getById(id: string): Promise<ApiResponse<Project>>;
  create(projectData: Partial<Project>): Promise<ApiResponse<Project>>;
  update(id: string, updates: Partial<Project>): Promise<ApiResponse<Project>>;
  delete(id: string): Promise<ApiResponse<void>>;
  getStats(id: string): Promise<ApiResponse<ProjectStats>>;
  getActivity(id: string): Promise<ApiResponse<ActivityLog[]>>;
  getSettings(id: string): Promise<ApiResponse<ProjectSettings>>;
  updateSettings(
    id: string,
    settings: Partial<ProjectSettings>
  ): Promise<ApiResponse<ProjectSettings>>;
  createApiKey(
    id: string,
    keyData: Partial<ApiKey>
  ): Promise<ApiResponse<ApiKey>>;
  getApiKeys(id: string): Promise<ApiResponse<ApiKey[]>>;
  deleteApiKey(id: string, keyId: string): Promise<ApiResponse<void>>;
  regenerateApiKey(id: string): Promise<ApiResponse<{ apiKey: string }>>;
}

export interface ICollectionService {
  getAll(
    projectId: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<Collection>>;
  getById(id: string): Promise<ApiResponse<Collection>>;

  getCollectionsByProject(projectId: string): Promise<Collection[]>;

  getDocuments(
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
  ): Promise<Document[]>;

  createDocument(
    collectionId: string,
    data: Record<string, unknown>
  ): Promise<Document>;

  create(
    projectId: string,
    collectionData: Partial<Collection>
  ): Promise<ApiResponse<Collection>>;
  update(
    id: string,
    updates: Partial<Collection>
  ): Promise<ApiResponse<Collection>>;
  delete(id: string): Promise<ApiResponse<void>>;
  getSchema(id: string): Promise<ApiResponse<Collection>>;
  validateSchema(
    schema: Collection
  ): Promise<ApiResponse<SchemaValidationResult>>;

  // NEW: Advanced collections functionality
  getHealth(collectionId: string): Promise<
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
  >;

  getAllWithHealth(projectId: string): Promise<
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
  >;

  createFromTemplate(
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
  ): Promise<ApiResponse<Collection>>;

  updateSchema(
    collectionId: string,
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
  ): Promise<ApiResponse<Collection>>;

  autoFixSchema(collectionId: string): Promise<
    ApiResponse<{
      success: boolean;
      fixesApplied: number;
      details: string[];
      remainingIssues: number;
    }>
  >;

  generateTypeScriptInterface(collectionId: string): Promise<
    ApiResponse<{
      interfaceCode: string;
      fileName: string;
    }>
  >;

  generateAllTypeScriptInterfaces(): Promise<
    ApiResponse<{
      interfacesCode: string;
      fileName: string;
    }>
  >;
}

export interface IDocumentService {
  getAll(
    collectionId: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<Document>>;
  getById(id: string): Promise<ApiResponse<Document>>;
  create(
    collectionId: string,
    documentData: Record<string, unknown>
  ): Promise<ApiResponse<Document>>;
  update(
    id: string,
    updates: Record<string, unknown>
  ): Promise<ApiResponse<Document>>;
  delete(id: string): Promise<ApiResponse<void>>;
  search(
    collectionId: string,
    query: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<Document>>;
  bulkCreate(
    collectionId: string,
    documents: Record<string, unknown>[]
  ): Promise<ApiResponse<Document[]>>;
  bulkUpdate(
    collectionId: string,
    updates: Record<string, unknown>[]
  ): Promise<ApiResponse<Document[]>>;
  bulkDelete(
    collectionId: string,
    documentIds: string[]
  ): Promise<ApiResponse<void>>;
  getByTable(
    projectId: string,
    tableName: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<Document>>;
}

export interface IStorageService {
  getStorageInfo(projectId: string): Promise<{
    total_files: number;
    total_size: number;
    storage_used_percentage: number;
    quota: number;
  }>;

  uploadFile(
    projectId: string,
    file: File | Buffer,
    metadata?: Record<string, unknown>
  ): Promise<ApiResponse<FileInfo>>;
  downloadFile(
    fileId: string
  ): Promise<
    ApiResponse<{ buffer: Buffer; filename: string; mimeType: string }>
  >;
  deleteFile(fileId: string): Promise<ApiResponse<void>>;
  getFileInfo(fileId: string): Promise<ApiResponse<FileInfo>>;
  getFiles(
    projectId: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<FileInfo>>;
  getStorageStats(projectId: string): Promise<ApiResponse<StorageStats>>;
  getFileBuffer(fileId: string): Promise<ApiResponse<Buffer>>;
}

export interface IUserService {
  getAll(
    projectId: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<ProjectUser>>;
  getById(id: string): Promise<ApiResponse<ProjectUser>>;
  create(
    projectId: string,
    userData: Partial<ProjectUser>
  ): Promise<ApiResponse<ProjectUser>>;
  update(
    id: string,
    updates: Partial<ProjectUser>
  ): Promise<ApiResponse<ProjectUser>>;
  delete(id: string): Promise<ApiResponse<void>>;
  authenticate(
    projectId: string,
    credentials: { username: string; password: string }
  ): Promise<ApiResponse<ProjectUser>>;
  verifyEmail(
    userId: string,
    token: string
  ): Promise<ApiResponse<{ verified: boolean }>>;
  sendPasswordReset(email: string): Promise<ApiResponse<void>>;
  resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>>;
}

export interface IApiKeyService {
  getAll(options?: QueryOptions): Promise<PaginatedResponse<ApiKey>>;
  getById(id: string): Promise<ApiResponse<ApiKey>>;
  create(keyData: Partial<ApiKey>): Promise<ApiResponse<ApiKey>>;
  update(id: string, updates: Partial<ApiKey>): Promise<ApiResponse<ApiKey>>;
  delete(id: string): Promise<ApiResponse<void>>;
  validate(key: string): Promise<
    ApiResponse<{
      valid: boolean;
      scopes?: string[];
      user?: AdminUser | ProjectUser;
    }>
  >;
  getByUser(userId: string): Promise<ApiResponse<ApiKey[]>>;
  getByEntity(
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<ApiKey[]>>;
}

export interface IEmailService {
  sendEmail(request: EmailSendRequest): Promise<ApiResponse<void>>;
  getTemplates(projectId: string): Promise<ApiResponse<EmailTemplate>>;
  getTemplate(id: string): Promise<ApiResponse<EmailTemplate>>;
  createTemplate(
    templateData: Partial<EmailTemplate>
  ): Promise<ApiResponse<EmailTemplate>>;
  updateTemplate(
    id: string,
    updates: Partial<EmailTemplate>
  ): Promise<ApiResponse<EmailTemplate>>;
  deleteTemplate(id: string): Promise<ApiResponse<void>>;
  testConfig(
    projectId: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>>;
  getConfig(projectId: string): Promise<ApiResponse<EmailConfig>>;
  updateConfig(
    projectId: string,
    config: Partial<EmailConfig>
  ): Promise<ApiResponse<EmailConfig>>;
}

export interface ISystemService {
  getSettings(): Promise<ApiResponse<SystemSettings>>;
  updateSettings(
    updates: Partial<SystemSettings>
  ): Promise<ApiResponse<SystemSettings>>;
  testEmailConfig(
    config: EmailConfig
  ): Promise<ApiResponse<{ success: boolean }>>;
  getSystemInfo(): Promise<ApiResponse<SystemInfo>>;
  getDatabaseHealth(): Promise<ApiResponse<DatabaseHealth>>;
}

export interface IChangelogService {
  getEntries(
    projectId: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<ChangelogEntry>>;
  getByEntity(
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<ChangelogEntry[]>>;
  create(entry: CreateChangelogEntry): Promise<ApiResponse<ChangelogEntry>>;
}

export interface IHealthService {
  check(): Promise<
    ApiResponse<{
      status: string;
      timestamp: string;
      services: Record<string, { status: string; message: string }>;
    }>
  >;
  getSystemInfo(): Promise<ApiResponse<SystemInfo>>;
  getDatabaseStatus(): Promise<ApiResponse<DatabaseHealth>>;

  // NEW: Advanced database health management
  validateSchema(): Promise<
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
  >;

  autoFixSchema(): Promise<
    ApiResponse<{
      success: boolean;
      fixesApplied: number;
      details: string[];
      remainingIssues: number;
      duration: number;
    }>
  >;

  getMigrationStatus(): Promise<
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
  >;

  runMigrations(): Promise<
    ApiResponse<{
      success: boolean;
      migrationsApplied: number;
      details: string[];
      duration: number;
    }>
  >;

  rollbackDatabase(targetVersion: string): Promise<
    ApiResponse<{
      success: boolean;
      rollbackVersion: string;
      message: string;
      duration: number;
    }>
  >;

  getDatabaseStats(): Promise<
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
  >;

  checkTableIntegrity(tableName?: string): Promise<
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
  >;

  repairDatabase(): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      repairs?: string[];
    }>
  >;
}

export interface ITestingService {
  createTestProject(): Promise<ApiResponse<Project>>;
  cleanup(): Promise<ApiResponse<void>>;
  runIntegrationTests(): Promise<
    ApiResponse<{
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
      tests: TestResult[];
    }>
  >;
  checkSchema(): Promise<ApiResponse<SchemaValidationResult>>;
}

// Main SDK interface that combines all services
export interface IKrapiSDK {
  auth: IAuthService;
  admin: IAdminService;
  projects: IProjectService;
  collections: ICollectionService;
  documents: IDocumentService;
  storage: IStorageService;
  users: IUserService;
  apiKeys: IApiKeyService;
  email: IEmailService;
  system: ISystemService;
  changelog: IChangelogService;
  health: IHealthService;
  testing: ITestingService;

  // Utility methods
  setSessionToken(token: string): void;
  setApiKey(key: string): void;
  clearAuth(): void;
  get baseURL(): string;
}

// Re-export types for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  QueryOptions,
  AdminUser,
  Project,
  Collection,
  Document,
  FileInfo,
  ProjectUser,
  Session as _Session,
  ApiKey as _ApiKey,
  EmailTemplate as _EmailTemplate,
  ChangelogEntry as _ChangelogEntry,
  CreateChangelogEntry as _CreateChangelogEntry,
  ProjectSettings as _ProjectSettings,
  ProjectStats as _ProjectStats,
  StorageStats as _StorageStats,
  EmailConfig as _EmailConfig,
  EmailSendRequest as _EmailSendRequest,
  SystemSettings as _SystemSettings,
  AdminRole as _AdminRole,
  AccessLevel as _AccessLevel,
  AdminPermission as _AdminPermission,
  Scope as _Scope,
  CollectionField as _CollectionField,
  CollectionIndex as _CollectionIndex,
  FieldType as _FieldType,
  FieldValidation as _FieldValidation,
  RelationConfig as _RelationConfig,
  FileRelation as _FileRelation,
  FileAttachment as _FileAttachment,
  FilterCondition as _FilterCondition,
  ActivityLog,
  SystemInfo,
  DatabaseHealth,
  TestResult,
  SchemaValidationResult,
} from "./types";
