// Re-export all types from the SDK to maintain compatibility
export * from "@krapi/sdk";

// Import specific types for proper extension
import type {
  SessionType,
  FieldDefinition,
  IndexDefinition,
  AdminPermission,
  ApiKeyScope,
  ApiKeyStatus,
  QueryOptions,
  ProjectStatus,
  UserRole,
} from "@krapi/sdk";
import type { Request as ExpressRequest } from "express";

// Backend-specific session interface - completely separate from SDK Session
export interface BackendSession {
  id: string;
  token: string;
  type: SessionType;
  user_id: string;
  project_id?: string;
  scopes: string[];
  metadata?: Record<string, unknown>;
  expires_at: string;
  created_at: string;
  last_used_at?: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  consumed?: boolean;
  user_type?: "admin" | "project" | "project_user";
}

// Backend-specific project interface - completely separate from SDK Project
export interface BackendProject {
  id: string;
  name: string;
  description?: string;
  project_url?: string;
  active?: boolean;
  created_by?: string;
  owner_id?: string;
  api_key?: string;
  settings: BackendProjectSettings;
  created_at: string;
  updated_at: string;
  storage_used: number;
  allowed_origins: string[];
  total_api_calls: number;
  last_api_call?: string;
  // Additional properties that the backend expects
  is_active?: boolean;
  rate_limit?: number;
  rate_limit_window?: number;
}

// Backend-specific collection interface - completely separate from SDK Collection
export interface BackendCollection {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  fields: FieldDefinition[];
  indexes: IndexDefinition[];
  schema?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Backend-specific document interface - completely separate from SDK Document
export interface BackendDocument {
  id: string;
  project_id: string;
  collection_id: string;
  data: Record<string, unknown>;
  version?: number;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

// Backend-specific file record interface - completely separate from SDK FileRecord
export interface BackendFileRecord {
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

// Backend-specific project user interface - completely separate from SDK ProjectUser
export interface BackendProjectUser {
  id: string;
  project_id: string;
  username: string;
  email: string;
  phone?: string;
  is_verified?: boolean;
  scopes?: string[];
  password?: string;
  permissions?: string[];
  created_at: string;
  updated_at: string;
  last_login?: string;
  status: "active" | "inactive" | "suspended";
  // Additional properties that the backend expects
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  // Additional properties for SDK compatibility
  role?: UserRole;
  login_count?: number;
}

// Backend-specific admin user interface - completely separate from SDK AdminUser
export interface BackendAdminUser {
  id: string;
  username: string;
  email: string;
  role: "master_admin" | "admin" | "developer";
  access_level: "full" | "read_write" | "read_only";
  permissions: AdminPermission[];
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  api_key?: string;
  // Additional properties that the backend expects
  password_hash?: string;
}

// Backend-specific API key interface - completely separate from SDK ApiKey
export interface BackendApiKey {
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
}

// Backend-specific changelog entry interface - completely separate from SDK ChangelogEntry
export interface BackendChangelogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  created_at: string;
  metadata?: Record<string, unknown>;
  // Additional properties that the backend expects
  project_id?: string;
  entity_type?: string;
  entity_id?: string;
  performed_by?: string;
  session_id?: string;
}

// Backend-specific project settings interface - completely separate from SDK ProjectSettings
export interface BackendProjectSettings {
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
  isTestProject?: boolean;
  // Additional properties that the backend expects
  authentication_required?: boolean;
  cors_enabled?: boolean;
  rate_limiting_enabled?: boolean;
  logging_enabled?: boolean;
  encryption_enabled?: boolean;
  backup_enabled?: boolean;
  custom_headers?: Record<string, string>;
  environment?: "development" | "staging" | "production";
}

// Backend-specific project stats interface - completely separate from SDK ProjectStats
export interface BackendProjectStats {
  total_users: number;
  total_collections: number;
  total_documents: number;
  total_files: number;
  storage_used: number;
  api_requests_today: number;
  api_requests_month: number;
  api_calls_count?: number;
  last_api_call?: string;
  collections_count?: number;
  documents_count?: number;
  users_count?: number;
}

// Backend-specific project list options interface - completely separate from SDK ProjectListOptions
export interface BackendProjectListOptions extends QueryOptions {
  status?: ProjectStatus;
  owner_id?: string;
  settings?: Partial<BackendProjectSettings>;
}

// Backend-specific create project request interface - completely separate from SDK CreateProjectRequest
export interface BackendCreateProjectRequest {
  name: string;
  description?: string;
  settings?: Partial<BackendProjectSettings>;
  metadata?: Record<string, unknown>;
  project_url?: string;
  active?: boolean;
  created_by?: string;
  owner_id?: string;
  storage_used?: number;
  allowed_origins?: string[];
  total_api_calls?: number;
  last_api_call?: string;
  rate_limit?: number;
  rate_limit_window?: number;
}

// Backend-specific update project request interface - completely separate from SDK UpdateProjectRequest
export interface BackendUpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  settings?: Partial<BackendProjectSettings>;
  metadata?: Record<string, unknown>;
  project_url?: string;
  active?: boolean;
  storage_used?: number;
  allowed_origins?: string[];
  total_api_calls?: number;
  last_api_call?: string;
  rate_limit?: number;
  rate_limit_window?: number;
}

// Backend-specific create changelog entry request interface - completely separate from SDK ChangelogEntry
export interface CreateBackendChangelogEntry {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  // Additional properties that the backend expects
  project_id?: string;
  entity_type?: string;
  entity_id?: string;
  performed_by?: string;
  session_id?: string;
}

// Backend-specific API response interface
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Backend-specific authenticated request interface
// Intersection type ensures all Express Request properties are available
// Explicitly include Express Request properties for better IDE recognition
export type AuthenticatedRequest = ExpressRequest & {
  // Explicitly redeclare inherited properties for IDE/linter recognition
  params: ExpressRequest["params"];
  body: ExpressRequest["body"];
  query: ExpressRequest["query"];
  originalUrl: ExpressRequest["originalUrl"];
  app: ExpressRequest["app"];
  headers: ExpressRequest["headers"];
  method: ExpressRequest["method"];
  url: ExpressRequest["url"];
  // Custom properties
  user: {
    id: string;
    project_id: string;
    scopes?: string[];
  };
  project?: unknown;
  scope?: string;
  apiKey?: BackendApiKey;
  session?: BackendSession;
}

// Backend-specific scope requirement interface
export interface ScopeRequirement {
  scopes: string[];
  resource?: string;
  action?: string;
  requireAll?: boolean;
  projectSpecific?: boolean;
}

// Backend-specific change action interface
export interface ChangeAction {
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  timestamp: string;
  user_id: string;
}

// Backend-specific system settings interface
export interface SystemSettings {
  debug_mode: boolean;
  log_level: "error" | "warn" | "info" | "debug";
  rate_limiting: {
    enabled: boolean;
    requests_per_minute: number;
    requests_per_hour: number;
  };
  general: {
    siteName: string;
    siteUrl: string;
    adminEmail: string;
    timezone: string;
    defaultLanguage: string;
  };
  security: {
    jwt_secret: string;
    session_timeout: number;
    max_login_attempts: number;
    requireTwoFactor: boolean;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
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
    connection_string: string;
    max_connections: number;
    backupRetentionDays: number;
    connectionPoolSize: number;
    queryTimeout: number;
    enableQueryLogging: boolean;
    backupSchedule: string;
  };
}
