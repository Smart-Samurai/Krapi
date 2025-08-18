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

// ===================================
// CORE SYSTEM TYPES
// ===================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
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
  filter?: Record<string, any>;
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
}

// Aliases for backward compatibility
export type AdminUser = User;
export type ProjectUser = User;
export type CollectionField = FieldDefinition;
export type CollectionIndex = IndexDefinition;

export interface UserProfile {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  metadata?: Record<string, any>;
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
}

export enum AccessLevel {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
  ADMIN = "admin",
}

export enum Scope {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
  ADMIN = "admin",
}

export enum ProjectScope {
  READ = "projects:read",
  WRITE = "projects:write",
  DELETE = "projects:delete",
  ADMIN = "projects:admin",
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  profile?: Partial<UserProfile>;
  metadata?: Record<string, any>;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  profile?: Partial<UserProfile>;
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
  stats?: ProjectStats;
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
}

export interface ProjectStats {
  total_users: number;
  total_collections: number;
  total_documents: number;
  total_files: number;
  storage_used: number;
  api_requests_today: number;
  api_requests_month: number;
}

// Backward compatibility alias
export type ProjectStatistics = ProjectStats;

export interface CreateProjectRequest {
  name: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
  metadata?: Record<string, any>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  settings?: Partial<ProjectSettings>;
  metadata?: Record<string, any>;
}

export interface ProjectListOptions extends QueryOptions {
  status?: ProjectStatus;
  owner_id?: string;
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
  metadata?: Record<string, any>;
  stats?: CollectionStats;
  // Backward compatibility - direct access to schema properties
  fields?: FieldDefinition[];
  indexes?: IndexDefinition[];
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
  default_value?: any;
  validation?: FieldValidation;
  options?: FieldOptions;
  metadata?: Record<string, any>;
  // Backward compatibility properties
  indexed?: boolean;
  default?: any;
  relation?: any;
}

export type FieldType =
  | "string"
  | "text"
  | "number"
  | "integer"
  | "float"
  | "boolean"
  | "date"
  | "datetime"
  | "time"
  | "timestamp"
  | "email"
  | "url"
  | "phone"
  | "uuid"
  | "uniqueID"
  | "json"
  | "array"
  | "object"
  | "file"
  | "image"
  | "video"
  | "audio"
  | "reference"
  | "relation"
  | "enum"
  | "password"
  | "encrypted";

export interface FieldValidation {
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  allowed_values?: any[];
  custom_validator?: string;
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
  conditions?: Record<string, any>;
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
  metadata?: Record<string, any>;
}

export interface UpdateCollectionRequest {
  name?: string;
  display_name?: string;
  description?: string;
  schema?: Partial<CollectionSchema>;
  settings?: Partial<CollectionSettings>;
  metadata?: Record<string, any>;
}

export interface CollectionListOptions extends QueryOptions {
  project_id?: string;
}

// ===================================
// DOCUMENTS
// ===================================

export interface Document {
  id: string;
  collection_name: string;
  project_id: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  version?: number;
  status?: DocumentStatus;
  metadata?: Record<string, any>;
}

export type DocumentStatus = "draft" | "published" | "archived" | "deleted";

export interface CreateDocumentRequest {
  data: Record<string, any>;
  status?: DocumentStatus;
  metadata?: Record<string, any>;
}

export interface UpdateDocumentRequest {
  data?: Record<string, any>;
  status?: DocumentStatus;
  metadata?: Record<string, any>;
}

export interface DocumentListOptions extends QueryOptions {
  status?: DocumentStatus;
  created_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface DocumentSearchRequest {
  text?: string;
  filters?: Record<string, any>;
  collections?: string[];
  limit?: number;
  offset?: number;
}

export interface BulkDocumentRequest {
  operation: "create" | "update" | "delete";
  documents: any[];
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
    filters?: Record<string, any>;
  }>;
}

export interface AggregationResponse {
  results: Array<{
    type: string;
    field?: string;
    value: any;
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
  path: string;
  url: string;
  mime_type: string;
  size: number;
  project_id: string;
  uploaded_by?: string;
  created_at: string;
  metadata?: FileMetadata;
  public: boolean;
  folder?: string;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_url?: string;
  alt_text?: string;
  caption?: string;
  tags?: string[];
  custom?: Record<string, any>;
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
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
}

export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  body?: string;
  template_id?: string;
  variables?: Record<string, any>;
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
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
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
}

export interface MigrationResult {
  success: boolean;
  migrations_applied: number;
  migrationsApplied?: number; // Backward compatibility
  errors: string[];
  duration: number;
  details?: string; // Backward compatibility
}

export interface SchemaMismatch {
  table: string;
  type: "missing" | "extra" | "field_mismatch";
  details: string;
}

export interface FieldMismatch {
  table: string;
  field: string;
  expected_type: string;
  actual_type: string;
  nullable_mismatch?: boolean;
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
    details?: any;
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
  details?: any;
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
// EXPORTS
// ===================================

// All types are exported above - no need for re-export
