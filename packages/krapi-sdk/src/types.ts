// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Admin Types
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  access_level: AccessLevel;
  permissions: AdminPermission[];
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export enum AdminRole {
  MASTER_ADMIN = "master_admin",
  ADMIN = "admin",
  DEVELOPER = "developer",
}

export enum AccessLevel {
  FULL = "full",
  READ_WRITE = "read_write",
  READ_ONLY = "read_only",
}

export type AdminPermission =
  | "users.create"
  | "users.read"
  | "users.update"
  | "users.delete"
  | "projects.create"
  | "projects.read"
  | "projects.update"
  | "projects.delete"
  | "collections.create"
  | "collections.read"
  | "collections.write"
  | "collections.delete"
  | "storage.upload"
  | "storage.read"
  | "storage.delete"
  | "settings.read"
  | "settings.update";

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  project_url?: string; // For domain validation
  api_key: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  cors_origins?: string[];
  rate_limit?: RateLimitConfig;
  auth?: AuthConfig;
  storage?: StorageConfig;
  email?: EmailConfig;
  isTestProject?: boolean;
}

export interface StorageConfig {
  max_file_size: number;
  allowed_mime_types: string[];
  storage_limit: number;
}

export interface AuthConfig {
  session_duration: number;
  password_min_length: number;
  require_email_verification: boolean;
}

export interface SystemSettings {
  general: {
    siteName: string;
    siteUrl: string;
    adminEmail: string;
    timezone: string;
    defaultLanguage: string;
  };
  security: {
    requireTwoFactor: boolean;
    sessionTimeout: number;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
    maxLoginAttempts: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
  };
  database: {
    connectionPoolSize: number;
    queryTimeout: number;
    enableQueryLogging: boolean;
    backupSchedule: string;
    backupRetentionDays: number;
  };
}

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_secure: boolean;
  from_email: string;
  from_name: string;
}

export interface RateLimitConfig {
  window_ms: number;
  max_requests: number;
}

export interface ProjectStats {
  storage_used: number;
  api_calls_count: number;
  last_api_call?: string;
  collections_count: number;
  documents_count: number;
  users_count: number;
}

// Collection Types
export interface Collection {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  fields: CollectionField[];
  indexes?: CollectionIndex[];
  created_at: string;
  updated_at: string;
}

export interface CollectionField {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  default?: unknown;
  description?: string;
  validation?: FieldValidation;
  // Additional field types for relations
  relation?: RelationConfig;
}

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "array"
  | "object"
  | "uniqueID"
  | "relation"
  | "json"
  | "text";

export interface FieldValidation {
  // String validations
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Number validations
  min?: number;
  max?: number;

  // Array validations
  minItems?: number;
  maxItems?: number;

  // General validations
  enum?: Array<string | number | boolean>;
  custom?: string;
}

export interface RelationConfig {
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  target_collection: string;
  target_field?: string;
  cascade_delete?: boolean;
}

export interface CollectionIndex {
  name: string;
  fields: string[];
  unique?: boolean;
}

// Document Types
export interface Document {
  id: string;
  collection_id: string;
  project_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// File Storage Types
export interface FileInfo {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  uploaded_by?: string;
  relations?: FileRelation[];
  created_at: string;
  updated_at: string;
}

export interface FileRelation {
  type: "user_avatar" | "document_attachment" | "custom";
  target_id: string;
  target_type: string;
  metadata?: Record<string, unknown>;
}

export interface StorageStats {
  total_size: number;
  file_count: number;
  storage_limit: number;
  usage_percentage: number;
}

// Project User Types (as specified in requirements)
export interface ProjectUser {
  id: string;
  project_id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  is_verified: boolean;
  is_active: boolean;
  access_scopes: string[];
  register_date: string;
  updated_at: string;
  last_login?: string;
  email_verified_at?: string;
  phone_verified_at?: string;
  // Custom fields support
  custom_fields?: Record<string, unknown>;
}

export enum ProjectScope {
  // User management (for project admins)
  USERS_READ = "users:read",
  USERS_WRITE = "users:write",
  USERS_DELETE = "users:delete",

  // Data access
  DATA_READ = "data:read",
  DATA_WRITE = "data:write",
  DATA_DELETE = "data:delete",

  // File access
  FILES_READ = "files:read",
  FILES_WRITE = "files:write",
  FILES_DELETE = "files:delete",

  // Function execution
  FUNCTIONS_EXECUTE = "functions:execute",

  // Email sending
  EMAIL_SEND = "email:send",
}

// Query and Filter Types
export interface QueryOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: "asc" | "desc";
  where?: Record<string, unknown>;
  search?: string;
  filter?: FilterCondition[];
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
    | "ilike";
  value: unknown;
}

// Session Types
export interface Session {
  id: string;
  token: string;
  user_id?: string;
  project_id?: string;
  type: "admin" | "project";
  scopes: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  expires_at: string;
  last_activity?: string;
  consumed: boolean;
  consumed_at?: string;
}

// Scope Types
export enum Scope {
  // Master scope - full access to everything
  MASTER = "master",

  // Admin scopes
  ADMIN_READ = "admin:read",
  ADMIN_WRITE = "admin:write",
  ADMIN_DELETE = "admin:delete",

  // Project scopes
  PROJECTS_READ = "projects:read",
  PROJECTS_WRITE = "projects:write",
  PROJECTS_DELETE = "projects:delete",

  // Collection scopes (per project)
  COLLECTIONS_READ = "collections:read",
  COLLECTIONS_WRITE = "collections:write",
  COLLECTIONS_DELETE = "collections:delete",

  // Document scopes (per project)
  DOCUMENTS_READ = "documents:read",
  DOCUMENTS_WRITE = "documents:write",
  DOCUMENTS_DELETE = "documents:delete",

  // Storage scopes (per project)
  STORAGE_READ = "storage:read",
  STORAGE_WRITE = "storage:write",
  STORAGE_DELETE = "storage:delete",

  // Email scopes (per project)
  EMAIL_SEND = "email:send",
  EMAIL_READ = "email:read",

  // Function scopes (per project)
  FUNCTIONS_EXECUTE = "functions:execute",
  FUNCTIONS_WRITE = "functions:write",
  FUNCTIONS_DELETE = "functions:delete",

  // User scopes (per project)
  USERS_READ = "users:read",
  USERS_WRITE = "users:write",
  USERS_DELETE = "users:delete",
}

// API Key Types
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  type: "master" | "admin" | "project";
  owner_id: string;
  scopes: string[];
  project_ids?: string[];
  metadata?: Record<string, unknown>;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
}

// Email Types
export interface EmailTemplate {
  id: string;
  project_id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface EmailSendRequest {
  to: string | string[];
  template_id?: string;
  subject?: string;
  body?: string;
  variables?: Record<string, unknown>;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  filename: string;
  content: string; // base64 encoded
  mime_type: string;
}

// Changelog Types
export interface ChangelogEntry {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes?: Record<string, unknown>;
  created_at: string;
}

export interface CreateChangelogEntry {
  project_id?: string; // Optional for admin operations
  entity_type: string;
  entity_id: string;
  action: string;
  changes?: Record<string, unknown>;
  performed_by: string;
  session_id?: string;
}

// Additional types for better type safety
export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes?: Record<string, unknown>;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

export interface SystemInfo {
  version: string;
  uptime: number;
  memory_usage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu_usage: number;
  disk_usage: {
    used: number;
    total: number;
    percentage: number;
  };
  active_connections: number;
  last_backup?: string;
}

export interface DatabaseHealth {
  status: "healthy" | "unhealthy" | "degraded";
  message: string;
  timestamp: string;
  connection_pool: {
    total: number;
    active: number;
    idle: number;
  };
  response_time: number;
  last_check: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

// Database Health Management Types
export interface DatabaseHealthStatus {
  isHealthy: boolean;
  issues: DatabaseIssue[];
  warnings: string[];
  recommendations: string[];
  checkDuration: number;
  timestamp: string;
  schemaVersion: string;
}

export interface SchemaValidationResult {
  isValid: boolean;
  mismatches: SchemaMismatch[];
  missingTables: string[];
  extraTables: string[];
  fieldMismatches: FieldMismatch[];
  timestamp: string;
}

export interface MigrationResult {
  success: boolean;
  migrationsApplied: number;
  duration: number;
  details: string;
  appliedMigrations?: string[];
}

export interface AutoFixResult {
  success: boolean;
  fixesApplied: number;
  duration: number;
  details: string;
  appliedFixes?: string[];
}

export interface DatabaseIssue {
  type: string;
  severity: "error" | "warning" | "info";
  description: string;
  table?: string;
  field?: string;
  suggestion?: string;
}

export interface SchemaMismatch {
  table: string;
  field?: string;
  expected: string;
  actual: string;
  type: "missing_field" | "wrong_type" | "missing_index" | "missing_constraint";
}

export interface FieldMismatch {
  table: string;
  field: string;
  expected: FieldDefinition;
  actual: FieldDefinition;
  differences: string[];
}

export interface FieldDefinition {
  type: string;
  nullable: boolean;
  primary?: boolean;
  unique?: boolean;
  default?: string;
  length?: number;
  precision?: number;
  scale?: number;
}

export interface Migration {
  name: string;
  version: string;
  up: string;
  down: string;
  checksum: string;
  dependencies?: string[];
}

export interface MigrationRecord {
  id: number;
  name: string;
  version: string;
  appliedAt: Date;
  checksum: string;
  executionTimeMs: number;
  status: string;
}

export interface ExpectedSchema {
  tables: Record<string, TableDefinition>;
  version: string;
  checksum: string;
}

export interface TableDefinition {
  fields: Record<string, FieldDefinition>;
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  relations?: RelationDefinition[];
}

export interface IndexDefinition {
  name: string;
  fields: string[];
  unique: boolean;
  type?: "btree" | "hash" | "gin" | "gist";
}

export interface ConstraintDefinition {
  name: string;
  type: "primary_key" | "foreign_key" | "unique" | "check" | "not_null";
  fields: string[];
  reference?: {
    table: string;
    field: string;
    onDelete?: "cascade" | "set_null" | "restrict";
    onUpdate?: "cascade" | "set_null" | "restrict";
  };
  expression?: string;
}

export interface RelationDefinition {
  name: string;
  type: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
  targetTable: string;
  sourceField: string;
  targetField: string;
  cascadeDelete: boolean;
  cascadeUpdate: boolean;
}

export interface FieldConstraint {
  name: string;
  type: "not_null" | "unique" | "check" | "default" | "foreign_key";
  expression?: string;
  reference?: {
    table: string;
    field: string;
    onDelete?: "cascade" | "set_null" | "restrict";
    onUpdate?: "cascade" | "set_null" | "restrict";
  };
}

// Collections Type Management Types
export interface CollectionTypeDefinition {
  id: string;
  name: string;
  version: string;
  fields: CollectionFieldType[];
  indexes: CollectionIndexType[];
  constraints: CollectionConstraintType[];
  relations: CollectionRelationType[];
  metadata: CollectionMetadata;
  created_at: string;
  updated_at: string;
  created_by: string;
  project_id: string;
}

export interface CollectionFieldType {
  name: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  default?: unknown;
  description?: string;
  validation?: FieldValidation;
  relation?: RelationConfig;
  postgresql_type: string;
  typescript_type: string;
  constraints: FieldConstraint[];
}

export interface CollectionIndexType {
  name: string;
  fields: string[];
  unique: boolean;
  type: "btree" | "hash" | "gin" | "gist";
  partial?: string;
}

export interface CollectionConstraintType {
  name: string;
  type: "primary_key" | "foreign_key" | "unique" | "check" | "not_null";
  fields: string[];
  reference?: {
    table: string;
    field: string;
    onDelete?: "cascade" | "set_null" | "restrict";
    onUpdate?: "cascade" | "set_null" | "restrict";
  };
  expression?: string;
}

export interface CollectionRelationType {
  name: string;
  type: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
  target_collection: string;
  source_field: string;
  target_field: string;
  cascade_delete: boolean;
  cascade_update: boolean;
}

export interface CollectionMetadata {
  description?: string;
  tags?: string[];
  category?: string;
  is_system?: boolean;
  is_deprecated?: boolean;
  migration_history?: MigrationRecord[];
}

export interface CollectionTypeRegistry {
  types: Map<string, CollectionTypeDefinition>;
  version: string;
  last_sync: string;
  auto_fix_enabled: boolean;
  validation_strict: boolean;
}

export interface CollectionTypeValidationResult {
  isValid: boolean;
  issues: CollectionTypeIssue[];
  warnings: string[];
  recommendations: string[];
  validation_duration: number;
  timestamp: string;
}

export interface CollectionTypeIssue {
  type:
    | "missing_field"
    | "wrong_type"
    | "missing_index"
    | "missing_constraint"
    | "extra_field"
    | "type_mismatch"
    | "constraint_violation";
  severity: "error" | "warning" | "info";
  field?: string;
  expected?: string;
  actual?: string;
  description: string;
  suggestion?: string;
  auto_fixable: boolean;
}

export interface CollectionTypeAutoFixResult {
  success: boolean;
  fixes_applied: number;
  duration: number;
  details: string[];
  applied_fixes: CollectionTypeFix[];
  failed_fixes: CollectionTypeFix[];
  timestamp: string;
}

export interface CollectionTypeFix {
  type:
    | "add_field"
    | "modify_field"
    | "add_index"
    | "add_constraint"
    | "remove_field"
    | "modify_constraint";
  field?: string;
  description: string;
  sql: string;
  success: boolean;
  error?: string;
  execution_time: number;
}

export interface CollectionTypeSyncResult {
  success: boolean;
  synced_types: number;
  new_types: number;
  updated_types: number;
  deleted_types: number;
  errors: string[];
  duration: number;
  timestamp: string;
}

export interface CollectionTypeMigration {
  id: string;
  collection_type_id: string;
  from_version: string;
  to_version: string;
  changes: CollectionTypeChange[];
  sql_up: string[];
  sql_down: string[];
  executed_at?: string;
  executed_by?: string;
  status: "pending" | "executed" | "failed" | "rolled_back";
  error?: string;
}

export interface CollectionTypeChange {
  type:
    | "field_added"
    | "field_removed"
    | "field_modified"
    | "index_added"
    | "index_removed"
    | "constraint_added"
    | "constraint_removed"
    | "relation_added"
    | "relation_removed";
  field?: string;
  description: string;
  details: Record<string, unknown>;
}

// Enhanced Database Health Types
export interface EnhancedDatabaseHealthStatus {
  isHealthy: boolean;
  issues: DatabaseIssue[];
  warnings: string[];
  recommendations: string[];
  checkDuration: number;
  timestamp: string;
  schemaVersion: string;
  collections_health: CollectionsHealthStatus;
  system_tables_health: SystemTablesHealthStatus;
}

export interface CollectionsHealthStatus {
  total_collections: number;
  healthy_collections: number;
  problematic_collections: number;
  collections_with_issues: CollectionHealthStatus[];
  overall_status: "healthy" | "degraded" | "unhealthy";
}

export interface CollectionHealthStatus {
  collection_id: string;
  collection_name: string;
  status: "healthy" | "degraded" | "unhealthy";
  issues: CollectionTypeIssue[];
  last_validated: string;
  auto_fix_available: boolean;
}

export interface SystemTablesHealthStatus {
  total_tables: number;
  healthy_tables: number;
  problematic_tables: number;
  missing_tables: string[];
  orphaned_tables: string[];
  table_issues: TableHealthIssue[];
}

export interface TableHealthIssue {
  table_name: string;
  issue_type:
    | "missing"
    | "orphaned"
    | "schema_mismatch"
    | "constraint_violation"
    | "index_issue";
  description: string;
  severity: "error" | "warning" | "info";
  auto_fixable: boolean;
  suggestion?: string;
}
