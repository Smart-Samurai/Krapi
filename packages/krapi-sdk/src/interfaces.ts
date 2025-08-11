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
  AdminRole,
  AccessLevel,
  AdminPermission,
  Scope,
  CollectionField,
  CollectionIndex,
  FieldType,
  FieldValidation,
  RelationConfig,
  FileRelation,
  FileAttachment,
  FilterCondition,
} from "./types";

export interface IAuthService {
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

  getCurrentUser(req: any): Promise<ApiResponse<AdminUser | ProjectUser>>;
  logout(req: any): Promise<ApiResponse<void>>;
  changePassword(req: any): Promise<ApiResponse<void>>;
  regenerateApiKey(req: any): Promise<ApiResponse<{ apiKey: string }>>;
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
  getUserActivity(id: string): Promise<ApiResponse<any[]>>;
  getUserApiKeys(userId: string): Promise<ApiResponse<ApiKey[]>>;
  createUserApiKey(
    userId: string,
    keyData: Partial<ApiKey>
  ): Promise<ApiResponse<ApiKey>>;
  deleteApiKey(keyId: string): Promise<ApiResponse<void>>;
  createMasterApiKey(): Promise<ApiResponse<ApiKey>>;
  getSystemStats(): Promise<ApiResponse<any>>;
  getActivityLogs(options?: QueryOptions): Promise<PaginatedResponse<any>>;
  getDatabaseHealth(): Promise<ApiResponse<any>>;
  repairDatabase(): Promise<ApiResponse<any>>;
  runDiagnostics(): Promise<ApiResponse<any>>;
}

export interface IProjectService {
  getAll(options?: QueryOptions): Promise<PaginatedResponse<Project>>;
  getById(id: string): Promise<ApiResponse<Project>>;
  create(projectData: Partial<Project>): Promise<ApiResponse<Project>>;
  update(id: string, updates: Partial<Project>): Promise<ApiResponse<Project>>;
  delete(id: string): Promise<ApiResponse<void>>;
  getStats(id: string): Promise<ApiResponse<ProjectStats>>;
  getActivity(id: string): Promise<ApiResponse<any[]>>;
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
  create(
    projectId: string,
    collectionData: Partial<Collection>
  ): Promise<ApiResponse<Collection>>;
  update(
    id: string,
    updates: Partial<Collection>
  ): Promise<ApiResponse<Collection>>;
  delete(id: string): Promise<ApiResponse<void>>;
  getSchema(id: string): Promise<ApiResponse<any>>;
  validateSchema(
    schema: any
  ): Promise<ApiResponse<{ valid: boolean; errors?: string[] }>>;
}

export interface IDocumentService {
  getAll(
    collectionId: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<Document>>;
  getById(id: string): Promise<ApiResponse<Document>>;
  create(
    collectionId: string,
    documentData: Record<string, any>
  ): Promise<ApiResponse<Document>>;
  update(
    id: string,
    updates: Record<string, any>
  ): Promise<ApiResponse<Document>>;
  delete(id: string): Promise<ApiResponse<void>>;
  search(
    collectionId: string,
    query: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<Document>>;
  bulkCreate(
    collectionId: string,
    documents: Record<string, any>[]
  ): Promise<ApiResponse<Document[]>>;
  bulkUpdate(
    collectionId: string,
    updates: Record<string, any>[]
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
  uploadFile(
    projectId: string,
    file: any,
    metadata?: any
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
  validate(
    key: string
  ): Promise<ApiResponse<{ valid: boolean; scopes?: string[]; user?: any }>>;
  getByUser(userId: string): Promise<ApiResponse<ApiKey[]>>;
  getByEntity(
    entityType: string,
    entityId: string
  ): Promise<ApiResponse<ApiKey[]>>;
}

export interface IEmailService {
  sendEmail(request: EmailSendRequest): Promise<ApiResponse<void>>;
  getTemplates(projectId: string): Promise<ApiResponse<EmailTemplate[]>>;
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
    ApiResponse<{ status: string; timestamp: string; services: any }>
  >;
  getSystemInfo(): Promise<ApiResponse<any>>;
  getDatabaseStatus(): Promise<ApiResponse<any>>;
}

export interface ITestingService {
  createTestProject(): Promise<ApiResponse<Project>>;
  cleanup(): Promise<ApiResponse<void>>;
  runIntegrationTests(): Promise<ApiResponse<any>>;
  checkSchema(): Promise<ApiResponse<{ valid: boolean; errors?: string[] }>>;
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
  AdminRole,
  AccessLevel,
  AdminPermission,
  Scope,
  CollectionField,
  CollectionIndex,
  FieldType,
  FieldValidation,
  RelationConfig,
  FileRelation,
  FileAttachment,
  FilterCondition,
} from "./types";
