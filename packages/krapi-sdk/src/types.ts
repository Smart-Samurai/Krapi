/**
 * KRAPI Universal Type Definitions
 *
 * This file is the SINGLE SOURCE OF TRUTH for all types across:
 * - SDK (client and server modes)
 * - Frontend API routes
 * - Backend implementations
 * - Database schemas
 * - Test suites
 *
 * ALL other files must import types from here.
 * NO types should be defined elsewhere.
 */

import { FieldType } from "./core";

// Re-export FieldType for external use
export { FieldType };

// ===================================
// CORE SYSTEM TYPES
// ===================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  page?: number;
  perPage?: number;
}

export interface SearchOptions {
  search?: string;
  query?: string;
  filter?: Record<string, unknown>;
}

export interface SortOptions {
  orderBy?: string;
  order?: "asc" | "desc";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export type QueryOptions = PaginationOptions & SearchOptions & SortOptions;

// ===================================
// AUTHENTICATION & SESSIONS
// ===================================

export interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  success: boolean;
  session_token: string;
  user: User;
  expires_at: string;
}

export interface SessionToken {
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
  last_used_at?: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  last_used_at?: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  // Additional properties for backend compatibility
  type?: SessionType;
  project_id?: string;
  scopes?: Scope[];
  metadata?: Record<string, unknown>;
  consumed?: boolean;
  user_type?: "admin" | "project";
}

export interface SessionValidation {
  valid: boolean;
  user?: User;
  expires_at?: string;
  session_token?: string;
}

export interface RefreshResponse {
  success: boolean;
  session_token: string;
  expires_at: string;
}

export interface ProjectLoginRequest {
  projectId: string;
  username: string;
  password: string;
  email?: string;
}

// ===================================
// USER MANAGEMENT
// ===================================

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  profile?: UserProfile;
  project_id?: string; // For project users
  // Additional properties for backend compatibility
  permissions?: string[];
  phone?: string;
  is_verified?: boolean;
  scopes?: Scope[];
}

export interface ProjectUser {
  id: string;
  project_id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login?: string;
  // Backend-specific properties
  phone?: string;
  is_verified?: boolean;
  scopes?: string[];
  password?: string;
  permissions?: string[];
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  access_level: AccessLevel;
  permissions: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  login_count?: number;
  // Backend-specific properties
  api_key?: string;
  password_hash?: string;
}

// Aliases for backward compatibility
export type CollectionField = FieldDefinition;
export type CollectionIndex = IndexDefinition;

export interface UserProfile {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  metadata?: Record<string, unknown>;
}

export type UserRole =
  | "admin"
  | "user"
  | "viewer"
  | "editor"
  | "owner"
  | "member";
export type UserStatus = "active" | "inactive" | "suspended" | "pending";

// Legacy enum exports for backward compatibility
export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MODERATOR = "moderator",
  DEVELOPER = "developer",
  // Additional roles for backend compatibility
  MASTER_ADMIN = "master_admin",
  PROJECT_ADMIN = "project_admin",
  LIMITED_ADMIN = "limited_admin",
}

export enum AccessLevel {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
  ADMIN = "admin",
  READ_ONLY = "read_only",
  READ_WRITE = "read_write",
  FULL = "full",
}

export enum Scope {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
  ADMIN = "admin",
  // Additional scopes for backend compatibility
  MASTER = "master",
  ADMIN_READ = "admin:read",
  ADMIN_WRITE = "admin:write",
  ADMIN_DELETE = "admin:delete",
  PROJECTS_READ = "projects:read",
  PROJECTS_WRITE = "projects:write",
  PROJECTS_DELETE = "projects:delete",
  COLLECTIONS_READ = "collections:read",
  COLLECTIONS_WRITE = "collections:write",
  COLLECTIONS_DELETE = "collections:delete",
  DOCUMENTS_READ = "documents:read",
  DOCUMENTS_WRITE = "documents:write",
  DOCUMENTS_DELETE = "documents:delete",
  STORAGE_READ = "storage:read",
  STORAGE_WRITE = "storage:write",
  STORAGE_DELETE = "storage:delete",
  EMAIL_SEND = "email:send",
  EMAIL_READ = "email:read",
  FUNCTIONS_EXECUTE = "functions:execute",
  FUNCTIONS_WRITE = "functions:write",
  FUNCTIONS_DELETE = "functions:delete",
  // User management scopes
  USERS_READ = "users:read",
  USERS_WRITE = "users:write",
  USERS_DELETE = "users:delete",
  // Data management scopes
  DATA_READ = "data:read",
  DATA_WRITE = "data:write",
  DATA_DELETE = "data:delete",
  // File management scopes
  FILES_READ = "files:read",
  FILES_WRITE = "files:write",
  FILES_DELETE = "files:delete",
}

/**
 * Project-specific scopes for users within a project
 * 
 * NOTE: These scopes are ONLY for managing resources within a SINGLE project.
 * Global scopes like "projects:read" are reserved for main KRAPI app admin users,
 * not for project users. Projects are isolated - they cannot see or manage other projects.
 */
export enum ProjectScope {
  // User management scopes (for users within THIS project only)
  USERS_READ = "users:read",
  USERS_WRITE = "users:write",
  USERS_DELETE = "users:delete",
  // Data management scopes (collections and documents within THIS project only)
  DATA_READ = "data:read",
  DATA_WRITE = "data:write",
  DATA_DELETE = "data:delete",
  // File management scopes (files within THIS project only)
  FILES_READ = "files:read",
  FILES_WRITE = "files:write",
  FILES_DELETE = "files:delete",
  // Function execution scopes (functions within THIS project only)
  FUNCTIONS_EXECUTE = "functions:execute",
  // Email scopes (emails within THIS project only)
  EMAIL_SEND = "email:send",
  // Collection-specific scopes (within THIS project only)
  COLLECTIONS_READ = "collections:read",
  COLLECTIONS_WRITE = "collections:write",
  COLLECTIONS_DELETE = "collections:delete",
  // Document-specific scopes (within THIS project only)
  DOCUMENTS_READ = "documents:read",
  DOCUMENTS_WRITE = "documents:write",
  DOCUMENTS_DELETE = "documents:delete",
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  profile?: Partial<UserProfile>;
  metadata?: Record<string, unknown>;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  profile?: Partial<UserProfile>;
  metadata?: Record<string, unknown>;
}

export interface UserListOptions extends QueryOptions {
  role?: UserRole;
  status?: UserStatus;
}

// ===================================
// API KEYS
// ===================================

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: ApiKeyScope[];
  project_id?: string;
  user_id: string;
  status: ApiKeyStatus;
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
  usage_count: number;
  rate_limit?: number;
  metadata?: Record<string, unknown>;
  // Backend-specific properties
  project_ids?: string[];
}

export type ApiKeyScope =
  | "read"
  | "write"
  | "delete"
  | "projects:read"
  | "projects:write"
  | "projects:delete"
  | "collections:read"
  | "collections:write"
  | "collections:delete"
  | "documents:read"
  | "documents:write"
  | "documents:delete"
  | "files:read"
  | "files:write"
  | "files:delete"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "admin"
  | "*";

export type ApiKeyStatus = "active" | "inactive" | "revoked" | "expired";

export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
  project_id?: string;
  expires_at?: string;
  rate_limit?: number;
  metadata?: Record<string, unknown>;
}

export interface ApiKeyListOptions extends QueryOptions {
  type?: "admin" | "project";
  status?: ApiKeyStatus;
  project_id?: string;
}

export interface CreateSessionRequest {
  api_key: string;
}

// ===================================
// PROJECTS
// ===================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings: ProjectSettings;
  metadata?: Record<string, unknown>;
  stats?: ProjectStats;
  // Additional properties for backend compatibility
  storage_used?: number;
  allowed_origins?: string[];
  total_api_calls?: number;
  last_api_call?: string;
  // Backend-specific properties
  project_url?: string;
  active?: boolean;
  created_by?: string;
  rate_limit?: number;
  rate_limit_window?: number;
}

export type ProjectStatus = "active" | "inactive" | "suspended" | "archived";

export interface ProjectSettings {
  public: boolean;
  allow_registration: boolean;
  require_email_verification: boolean;
  max_users?: number;
  max_collections?: number;
  max_documents_per_collection?: number;
  max_file_size?: number;
  allowed_file_types?: string[];
  cors_origins?: string[];
  webhook_urls?: string[];
  rate_limits?: {
    requests_per_minute?: number;
    requests_per_hour?: number;
    requests_per_day?: number;
  };
  custom_domain?: string;
  timezone?: string;
  locale?: string;
  email_config?: {
    smtp_host: string;
    smtp_port: number;
    smtp_secure: boolean;
    smtp_username: string;
    smtp_password: string;
    from_email: string;
    from_name: string;
  };
  // Backend-specific properties
  authentication_required?: boolean;
  cors_enabled?: boolean;
  rate_limiting_enabled?: boolean;
  logging_enabled?: boolean;
  encryption_enabled?: boolean;
  backup_enabled?: boolean;
  backup_automation?: {
    enabled: boolean;
    frequency: "hourly" | "daily" | "weekly" | "monthly";
    time?: string; // Time of day for daily/weekly/monthly backups (HH:mm format)
    day_of_week?: number; // 0-6 for weekly backups (0 = Sunday)
    day_of_month?: number; // 1-31 for monthly backups
    retention_days?: number; // How many days to keep backups (default: 30)
    max_backups?: number; // Maximum number of backups to keep (default: 10)
    include_files?: boolean; // Whether to include files in backup
    description_template?: string; // Template for backup description (e.g., "Automated backup - {date}")
  };
  custom_headers?: Record<string, string>;
  environment?: "development" | "staging" | "production";
}

export interface ProjectStats {
  total_users: number;
  total_collections: number;
  total_documents: number;
  total_files: number;
  storage_used: number;
  api_requests_today: number;
  api_requests_month: number;
  // Additional properties for backend compatibility
  api_calls_count?: number;
  last_api_call?: string;
  collections_count?: number;
  documents_count?: number;
  users_count?: number;
}

// Backward compatibility alias
export type ProjectStatistics = ProjectStats;

export interface CreateProjectRequest {
  name: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
  metadata?: Record<string, unknown>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  settings?: Partial<ProjectSettings>;
  metadata?: Record<string, unknown>;
}

export interface ProjectListOptions extends QueryOptions {
  status?: ProjectStatus;
  owner_id?: string;
  page?: number;
}

// ===================================
// COLLECTIONS
// ===================================

export interface Collection {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  project_id: string;
  schema: CollectionSchema;
  settings: CollectionSettings;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  stats?: CollectionStats;
  // Backward compatibility - direct access to schema properties
  fields?: FieldDefinition[];
  indexes?: IndexDefinition[];
  // Backend-specific properties
  collection_id?: string;
}

export interface CollectionSchema {
  fields: FieldDefinition[];
  indexes?: IndexDefinition[];
  validations?: ValidationRule[];
  relationships?: RelationshipDefinition[];
}

export interface FieldDefinition {
  name: string;
  type: FieldType;
  display_name?: string;
  description?: string;
  required: boolean;
  unique: boolean;
  default_value?: unknown;
  validation?: FieldValidation;
  options?: FieldOptions;
  metadata?: Record<string, unknown>;
  // Backward compatibility properties
  indexed?: boolean;
  default?: unknown;
  relation?: Record<string, unknown>;
  // Additional properties for specific field types
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
  primary?: boolean;
}

// FieldType is now imported from core.ts to avoid duplication
// import { FieldType } from "./core";

export interface FieldValidation {
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  allowed_values?: unknown[];
  custom_validator?: string;
  // Alternative naming for backward compatibility
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  // Additional properties for backward compatibility
  min?: number;
  max?: number;
}

export interface FieldOptions {
  enum_values?: string[];
  reference_collection?: string;
  reference_field?: string;
  file_types?: string[];
  max_file_size?: number;
  multiple?: boolean;
  placeholder?: string;
  help_text?: string;
}

export interface IndexDefinition {
  name: string;
  fields: string[];
  unique?: boolean; // Made optional for backward compatibility
  type?: "btree" | "hash" | "gin" | "gist";
}

export interface ValidationRule {
  name: string;
  type: "required" | "unique" | "custom";
  fields: string[];
  message?: string;
  validator?: string;
}

export interface RelationshipDefinition {
  name: string;
  type: "one_to_one" | "one_to_many" | "many_to_many";
  target_collection: string;
  foreign_key?: string;
  reference_key?: string;
  cascade_delete?: boolean;
}

// Backward compatibility alias
export type RelationConfig = RelationshipDefinition;

export interface CollectionSettings {
  read_permissions: Permission[];
  write_permissions: Permission[];
  delete_permissions: Permission[];
  enable_audit_log: boolean;
  enable_soft_delete: boolean;
  enable_versioning: boolean;
  cache_ttl?: number;
  max_documents?: number;
}

export interface Permission {
  role: UserRole;
  conditions?: Record<string, unknown>;
}

export interface CollectionStats {
  total_documents: number;
  total_size: number;
  last_updated: string;
  avg_document_size: number;
}

export interface CreateCollectionRequest {
  name: string;
  display_name?: string;
  description?: string;
  schema: Partial<CollectionSchema>;
  settings?: Partial<CollectionSettings>;
  metadata?: Record<string, unknown>;
}

export interface UpdateCollectionRequest {
  name?: string;
  display_name?: string;
  description?: string;
  schema?: Partial<CollectionSchema>;
  settings?: Partial<CollectionSettings>;
  metadata?: Record<string, unknown>;
}

export interface CollectionListOptions extends QueryOptions {
  project_id?: string;
}

// ===================================
// DOCUMENTS
// ===================================

export interface Document {
  id: string;
  collection_id: string;
  project_id: string;
  data: Record<string, unknown>;
  version: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  metadata?: Record<string, unknown>;
}

export type DocumentStatus = "draft" | "published" | "archived" | "deleted";

export interface CreateDocumentRequest {
  data: Record<string, unknown>;
  status?: DocumentStatus;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export interface UpdateDocumentRequest {
  data?: Record<string, unknown>;
  status?: DocumentStatus;
  metadata?: Record<string, unknown>;
}

export interface DocumentListOptions extends QueryOptions {
  status?: DocumentStatus;
  created_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface DocumentSearchRequest {
  text?: string;
  filters?: Record<string, unknown>;
  collections?: string[];
  limit?: number;
  offset?: number;
}

export interface BulkDocumentRequest {
  operation: "create" | "update" | "delete";
  documents: Record<string, unknown>[];
}

export interface BulkDocumentResponse {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

export interface AggregationRequest {
  aggregations: Array<{
    type: "count" | "sum" | "avg" | "min" | "max" | "group";
    field?: string;
    group_by?: string;
    filters?: Record<string, unknown>;
  }>;
}

export interface AggregationResponse {
  results: Array<{
    type: string;
    field?: string;
    value: unknown;
    group?: string;
  }>;
}

// ===================================
// FILE STORAGE
// ===================================

export interface FileInfo {
  id: string;
  name: string;
  original_name: string;
  filename: string; // Alias for name for backward compatibility
  path: string;
  url: string;
  mime_type: string;
  size: number;
  project_id: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string; // For tracking modifications
  metadata?: FileMetadata;
  public: boolean;
  folder?: string;
  relations?: Array<{
    id: string;
    type: string;
    target_id: string;
    target_type: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_url?: string;
  alt_text?: string;
  caption?: string;
  tags?: string[];
  custom?: Record<string, unknown>;
}

export interface UploadFileOptions {
  folder?: string;
  filename?: string;
  public?: boolean;
  metadata?: Partial<FileMetadata>;
}

export interface FileListOptions extends QueryOptions {
  folder?: string;
  mime_type?: string;
  public?: boolean;
  uploaded_by?: string;
}

// ===================================
// EMAIL SYSTEM
// ===================================

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: EmailTemplateType;
  project_id: string;
  variables?: string[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  from_email: string;
  from_name: string;
  reply_to?: string;
  rate_limit?: number;
  enabled: boolean;
}

export type EmailTemplateType =
  | "welcome"
  | "verification"
  | "reset_password"
  | "notification"
  | "custom";

export interface CreateEmailTemplateRequest {
  name: string;
  subject: string;
  body: string;
  type: EmailTemplateType;
  variables?: string[];
  metadata?: Record<string, unknown>;
}

export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  body?: string;
  template_id?: string;
  variables?: Record<string, unknown>;
  from?: string;
  reply_to?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    content_type?: string;
  }>;
}

export interface EmailResponse {
  success: boolean;
  message_id?: string;
  error?: string;
}

export interface EmailListOptions extends QueryOptions {
  type?: EmailTemplateType;
}

// ===================================
// ACTIVITY & LOGGING
// ===================================

export interface ActivityLog {
  id: string;
  user_id?: string;
  project_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  severity: "info" | "warning" | "error" | "critical";
  metadata?: Record<string, unknown>;
}

// ===================================
// HEALTH & DIAGNOSTICS
// ===================================

export interface HealthStatus {
  healthy: boolean;
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  database: DatabaseHealth;
  storage: StorageHealth;
  cache?: CacheHealth;
  external_services?: ExternalServiceHealth[];
}

export interface DatabaseIssue {
  type: string;
  description: string;
  severity:
    | "info"
    | "warning"
    | "error"
    | "low"
    | "medium"
    | "high"
    | "critical";
  table?: string;
  field?: string;
}

export interface DatabaseHealth {
  connected: boolean;
  response_time?: number;
  total_tables?: number;
  total_records?: number;
  last_backup?: string;
  issues?: DatabaseIssue[];
  checkDuration?: number;
  isHealthy?: boolean;
  warnings?: DatabaseIssue[]; // Alternative naming
}

// Backward compatibility alias
export type DatabaseHealthStatus = DatabaseHealth;

export interface SchemaValidationResult {
  valid: boolean;
  isValid?: boolean; // Backward compatibility
  errors: string[];
  warnings: string[];
  missing_tables: string[];
  extra_tables: string[];
  field_mismatches: FieldMismatch[];
  mismatches?: SchemaMismatch[]; // Backward compatibility
  missingTables?: string[]; // Alternative naming
  extraTables?: string[]; // Alternative naming
  fieldMismatches?: FieldMismatch[]; // Alternative naming
  timestamp?: string; // For tracking when validation was performed
}

export interface MigrationResult {
  success: boolean;
  migrations_applied: number;
  migrationsApplied?: number; // Backward compatibility
  errors: string[];
  duration: number;
  details?: string; // Backward compatibility
  appliedMigrations?: number; // Alternative naming
}

export interface SchemaMismatch {
  table: string;
  type:
    | "missing"
    | "extra"
    | "field_mismatch"
    | "missing_field"
    | "missing_index"
    | "missing_constraint";
  details: string;
  field?: string; // For field-specific mismatches
}

export interface FieldMismatch {
  table: string;
  field: string;
  expected_type: string;
  actual_type: string;
  nullable_mismatch?: boolean;
  expected: FieldDefinition; // The expected field definition
}

export interface StorageHealth {
  available: boolean;
  free_space?: number;
  total_space?: number;
  used_space?: number;
  issues?: string[];
}

export interface CacheHealth {
  connected: boolean;
  hit_rate?: number;
  memory_usage?: number;
  issues?: string[];
}

export interface ExternalServiceHealth {
  name: string;
  status: "up" | "down" | "degraded";
  response_time?: number;
  last_check: string;
}

export interface AutoFixResult {
  success: boolean;
  message?: string;
  actions?: {
    repairs: string[];
    migrations: string[];
    optimizations: string[];
  };
  fixesApplied?: number;
  appliedFixes?: string[];
  duration: number;
  details?: string;
}

export interface DiagnosticResult {
  success: boolean;
  tests: Array<{
    name: string;
    status: "pass" | "fail" | "warning";
    message: string;
    details?: Record<string, unknown>;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

// ===================================
// NEXT.JS ROUTE TYPES
// ===================================

// Next.js 15 async params pattern
export type RouteParams<T = Record<string, string>> = Promise<T>;

export interface RouteContext<T = Record<string, string>> {
  params: RouteParams<T>;
}

// Common route parameter types
export interface ProjectRouteParams {
  projectId: string;
}

export interface CollectionRouteParams extends ProjectRouteParams {
  collectionName: string;
}

export interface DocumentRouteParams extends CollectionRouteParams {
  documentId: string;
}

export interface UserRouteParams extends ProjectRouteParams {
  userId: string;
}

export interface FileRouteParams extends ProjectRouteParams {
  fileId: string;
}

// Route handler types
export type RouteHandler = (
  request: Request,
  context: RouteContext
) => Promise<Response>;

export type ProjectRouteHandler = (
  request: Request,
  context: RouteContext<ProjectRouteParams>
) => Promise<Response>;

export type CollectionRouteHandler = (
  request: Request,
  context: RouteContext<CollectionRouteParams>
) => Promise<Response>;

export type DocumentRouteHandler = (
  request: Request,
  context: RouteContext<DocumentRouteParams>
) => Promise<Response>;

// ===================================
// SDK CONNECTION TYPES
// ===================================

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
  };
}

export interface HttpConnection {
  endpoint: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export type KrapiConnection = DatabaseConnection | HttpConnection;

export interface KrapiConfig {
  mode?: "client" | "server";
  connection: KrapiConnection;
  debug?: boolean;
  cache?: boolean;
  retries?: number;
}

// ===================================
// ERROR TYPES
// ===================================

export interface KrapiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  request_id?: string;
}

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "INVALID_API_KEY"
  | "EXPIRED_SESSION"
  | "INSUFFICIENT_PERMISSIONS"
  | "RESOURCE_EXISTS"
  | "QUOTA_EXCEEDED"
  | "INVALID_REQUEST";

// ===================================
// UTILITY TYPES
// ===================================

// Note: Using built-in TypeScript utility types instead of redefining them
// export type Partial<T> = {
//   [P in keyof T]?: T[P];
// };

// export type Required<T> = {
//   [P in keyof T]-?: T[P];
// };

// export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ===================================
// COLLECTION TYPE MANAGEMENT TYPES
// ===================================

export interface CollectionTypeDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  schema: CollectionTypeSchema;
  validation_rules: CollectionTypeValidationRule[];
  auto_fix_rules: CollectionTypeAutoFixRule[];
  created_at: string;
  updated_at: string;
  created_by: string;
  project_id: string;
  // Direct access properties for backward compatibility
  fields: CollectionTypeField[];
  indexes: CollectionTypeIndex[];
  constraints: CollectionTypeConstraint[];
  relations: CollectionTypeRelation[];
  metadata?: Record<string, unknown>;
}

export interface CollectionTypeSchema {
  fields: CollectionTypeField[];
  indexes: CollectionTypeIndex[];
  constraints: CollectionTypeConstraint[];
  relations: CollectionTypeRelation[];
}

export interface CollectionTypeField {
  name: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  default?: unknown;
  description?: string;
  validation?: FieldValidation;
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
  primary?: boolean;
  postgresql_type?: string; // For PostgreSQL-specific type mapping
  typescript_type?: string; // For TypeScript type mapping
  relation?: Record<string, unknown>; // For relation fields
}

export interface CollectionTypeIndex {
  name: string;
  fields: string[];
  unique: boolean;
  type?: "btree" | "hash" | "gin" | "gist";
}

export interface CollectionTypeConstraint {
  name: string;
  type: "primary_key" | "foreign_key" | "unique" | "check" | "not_null";
  fields: string[];
  reference_table?: string;
  reference_fields?: string[];
  cascade_delete?: boolean;
  check_expression?: string;
  // Additional properties for backward compatibility
  reference?: {
    table: string;
    field: string;
    onDelete?: string;
    onUpdate?: string;
  };
  expression?: string; // Alternative to check_expression
}

export interface CollectionTypeRelation {
  name: string;
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  target_collection: string;
  source_field: string;
  target_field: string;
  cascade_delete: boolean;
}

export interface CollectionTypeValidationRule {
  id: string;
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
  condition: string;
  message: string;
}

export interface CollectionTypeAutoFixRule {
  id: string;
  name: string;
  description: string;
  action:
    | "add_field"
    | "modify_field"
    | "add_index"
    | "add_constraint"
    | "drop_field";
  parameters: Record<string, unknown>;
  priority: number;
}

export interface CollectionTypeValidationResult {
  isValid: boolean;
  issues: CollectionTypeIssue[];
  warnings: CollectionTypeIssue[];
  suggestions: CollectionTypeIssue[];
}

export interface CollectionTypeIssue {
  id?: string; // Made optional since it's generated
  type:
    | "error"
    | "warning"
    | "info"
    | "suggestion"
    | "missing_field"
    | "wrong_type"
    | "missing_index"
    | "missing_constraint"
    | "type_mismatch"
    | "extra_field";
  severity:
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "info"
    | "error"
    | "warning";
  category?: "schema" | "validation" | "performance" | "security"; // Made optional with default
  description: string;
  field?: string;
  table?: string;
  suggestion?: string;
  auto_fixable: boolean;
  expected?: string; // For type mismatches
  actual?: string; // For type mismatches
}

export interface CollectionTypeAutoFixResult {
  success: boolean;
  fixes_applied: CollectionTypeFix[];
  fixes_failed: CollectionTypeFix[];
  total_fixes: number;
  duration: number;
  details: string;
  // Alternative naming for backward compatibility
  fixesApplied?: CollectionTypeFix[];
  fixesFailed?: CollectionTypeFix[];
  totalFixes?: number;
  detailsArray?: string[]; // For when details is passed as array
  // Alternative types for backward compatibility
  fixes_applied_count?: number; // When fixes_applied is passed as count
  details_array?: string[]; // When details is passed as array
}

export interface CollectionTypeFix {
  id?: string; // Made optional since it's generated
  type:
    | "add_field"
    | "modify_field"
    | "add_index"
    | "add_constraint"
    | "drop_field";
  table?: string; // Made optional for some use cases
  field?: string;
  description: string;
  sql: string;
  parameters?: Record<string, unknown>; // Made optional
  applied?: boolean; // Made optional
  error?: string;
  success?: boolean; // For backward compatibility
  execution_time?: number; // For performance tracking
}

export interface CollectionTypeRegistry {
  types: Map<string, CollectionTypeDefinition>;
  version: string;
  last_sync: string;
  auto_fix_enabled: boolean;
  validation_strict: boolean;
}

// ===================================
// SYSTEM & ADMINISTRATION TYPES
// ===================================

export interface ChangelogEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  version: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  created_at: string;
  metadata?: Record<string, unknown>;
  // Backend-specific properties
  project_id?: string;
  entity_type?: string;
  entity_id?: string;
  performed_by?: string;
  session_id?: string;
}

export interface CreateChangelogEntry {
  type: "feature" | "bugfix" | "breaking" | "deprecation" | "security";
  title: string;
  description: string;
  version: string;
  author: string;
  breaking_changes?: string[];
  migration_guide?: string;
}

export interface StorageStats {
  total_size: number;
  file_count: number;
  collections_count: number;
  projects_count: number;
  last_updated: string;
}

export interface EmailSendRequest {
  to: string | string[];
  subject: string;
  body: string;
  html?: boolean;
  attachments?: EmailAttachment[];
  template_id?: string;
  variables?: Record<string, unknown>;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  content_type: string;
}

export interface SystemInfo {
  version: string;
  build_date: string;
  node_version: string;
  platform: string;
  arch: string;
  uptime: number;
  memory_usage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export interface TestResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SystemSettings {
  debug_mode: boolean;
  log_level: "error" | "warn" | "info" | "debug";
  rate_limiting: {
    enabled: boolean;
    window_ms: number;
    max_requests: number;
  };
  security: {
    cors_enabled: boolean;
    allowed_origins: string[];
    session_timeout: number;
    password_min_length: number;
  };
  database: {
    connection_pool_size: number;
    query_timeout: number;
    max_connections: number;
  };
}

export interface AdminPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: "create" | "read" | "update" | "delete" | "manage";
  scope: "global" | "project" | "collection" | "user";
}

export interface FileRelation {
  id: string;
  file_id: string;
  related_file_id: string;
  relation_type: "parent" | "child" | "sibling" | "version";
  metadata?: Record<string, unknown>;
}

export interface FileAttachment {
  id: string;
  file_id: string;
  attached_to_type: "document" | "email" | "project";
  attached_to_id: string;
  attachment_type: "inline" | "attachment";
  metadata?: Record<string, unknown>;
}

export interface FilterCondition {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "nin"
    | "like"
    | "ilike"
    | "regex"
    | "exists";
  value: unknown;
  case_sensitive?: boolean;
}

// ===================================
// SCHEMA MANAGEMENT TYPES
// ===================================

export interface ExpectedSchema {
  tables: TableDefinition[];
  version: string;
  description?: string;
}

export interface TableDefinition {
  name: string;
  fields: FieldDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  relations: RelationDefinition[];
}

// This interface is now defined above - removing duplicate

// This interface is now defined above - removing duplicate

export interface ConstraintDefinition {
  name: string;
  type: "primary_key" | "foreign_key" | "unique" | "check" | "not_null";
  fields: string[];
  reference_table?: string;
  reference_fields?: string[];
  cascade_delete?: boolean;
  check_expression?: string;
  // Additional properties for backward compatibility
  reference?: {
    table: string;
    field: string;
    onDelete?: string;
    onUpdate?: string;
  };
  expression?: string; // Alternative to check_expression
}

export interface RelationDefinition {
  name: string;
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  target_table: string;
  source_field: string;
  target_field: string;
  cascade_delete: boolean;
}

// ===================================
// EXPORTS
// ===================================

// All types are exported above - no need for re-export

// ===================================
// ADDITIONAL TYPES FOR BACKEND COMPATIBILITY
// ===================================

export enum SessionType {
  ADMIN = "admin",
  PROJECT = "project",
  USER = "user",
}

export interface FileRecord {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  url: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}
