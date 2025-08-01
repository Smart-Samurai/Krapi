// Admin User Types
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
  api_key?: string; // Primary API key
  api_keys?: ApiKey[]; // All API keys for this user
}

export enum AdminRole {
  MASTER_ADMIN = "master_admin",
  ADMIN = "admin",
  PROJECT_ADMIN = "project_admin",
  LIMITED_ADMIN = "limited_admin",
}

export enum AccessLevel {
  FULL = "full",
  PROJECTS_ONLY = "projects_only",
  READ_ONLY = "read_only",
  CUSTOM = "custom",
}

// Align with SDK AdminPermission type
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
  api_key: string;
  settings: ProjectSettings;
  created_by: string;
  created_at: string;
  updated_at: string;
  active: boolean;
}

export interface ProjectSettings {
  email_config?: EmailConfig;
  storage_config?: StorageConfig;
  auth_config?: AuthConfig;
  rate_limits?: RateLimitConfig;
}

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
  from_name?: string;
}

export interface StorageConfig {
  max_file_size: number;
  allowed_types: string[];
  storage_path?: string;
}

export interface AuthConfig {
  session_duration: number;
  password_min_length: number;
  require_email_verification: boolean;
}

export interface RateLimitConfig {
  window_ms: number;
  max_requests: number;
}

// Collection Types (formerly Table/Schema Types)
export interface Collection {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  fields: CollectionField[];
  indexes: CollectionIndex[];
  created_at: string;
  updated_at: string;
}

export interface CollectionField {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  default?: string | number | boolean | null;
  description?: string;
  validation?: FieldValidation;
}

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "array"
  | "object";

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

// File Types
export interface FileRecord {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  uploaded_by?: string;
  created_at: string;
}

// Project User Types
export interface ProjectUser {
  id: string;
  project_id: string;
  username: string;
  email: string;
  password?: string; // Only used for creation/update
  password_hash?: string; // Internal use only
  phone?: string;
  is_verified: boolean;
  is_active: boolean;
  scopes: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_login?: string;
  email_verified_at?: string;
  phone_verified_at?: string;
}

// Project-level scopes (for project users)
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

// Session Types
export interface Session {
  id: string;
  token: string;
  user_id?: string;
  project_id?: string;
  type: SessionType;
  scopes: Scope[];
  metadata?: Record<string, any>;
  created_at: string;
  expires_at: string;
  last_activity?: string;
  consumed: boolean;
}

export enum SessionType {
  ADMIN = "admin",
  PROJECT = "project",
}

// Changelog Types
export interface ChangelogEntry {
  id: string;
  project_id?: string;
  entity_type: string;
  entity_id: string;
  action: ChangeAction;
  changes: Record<string, unknown>;
  performed_by: string;
  session_id?: string;
  timestamp: string;
}

export enum ChangeAction {
  CREATED = "created",
  UPDATED = "updated",
  DELETED = "deleted",
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Request Types
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    type: "admin" | "project";
    role?: AdminRole;
    project_id?: string;
    scopes: Scope[];
  };
  session?: Session;
  apiKey?: ApiKey;
}

// Query Types
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  filter?: Record<string, unknown>;
  search?: string;
  fields?: string[];
}

// Access Scopes
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
}

// API Key Types
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  type: "master" | "admin" | "project";
  owner_id: string; // admin_user_id or project_id
  scopes: Scope[];
  project_ids?: string[]; // For admin keys with limited project access
  metadata?: Record<string, any>;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  is_active: boolean;
}

// Scope validation helpers
export interface ScopeRequirement {
  scopes: Scope[];
  requireAll?: boolean; // If true, all scopes required. If false, any scope is sufficient
  projectSpecific?: boolean; // If true, scope must be for the specific project in the request
}
