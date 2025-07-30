// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

// User Types
export type AdminRole = 'admin' | 'master_admin';
export type AccessLevel = 'read' | 'write' | 'admin' | 'owner';

export interface AdminPermission {
  resource: string;
  actions: string[];
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  password_hash?: string;
  role: AdminRole;
  access_level: AccessLevel;
  permissions: AdminPermission[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Project Types
export interface ProjectSettings {
  email?: EmailConfig;
  storage?: StorageConfig;
  auth?: AuthConfig;
  rate_limit?: RateLimitConfig;
}

export interface EmailConfig {
  enabled: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  from_email?: string;
  from_name?: string;
}

export interface StorageConfig {
  enabled: boolean;
  max_file_size?: number;
  allowed_types?: string[];
}

export interface AuthConfig {
  session_duration?: number;
  max_sessions?: number;
  require_2fa?: boolean;
}

export interface RateLimitConfig {
  enabled: boolean;
  window_ms?: number;
  max_requests?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  api_key: string;
  settings: ProjectSettings;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  api_calls_count: number;
  storage_used: number;
  last_activity?: string;
}

// Database Types
export type FieldType = 'string' | 'number' | 'boolean' | 'datetime' | 'json' | 'array' | 'reference';

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  required?: boolean;
}

export interface TableField {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  default?: any;
  validation?: FieldValidation;
  reference?: {
    table: string;
    field: string;
  };
}

export interface TableIndex {
  name: string;
  fields: string[];
  unique?: boolean;
}

export interface TableSchema {
  name: string;
  description?: string;
  fields: Record<string, TableField>;
  indexes?: TableIndex[];
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  [key: string]: any;
}

// Storage Types
export interface FileRecord {
  id: string;
  project_id: string;
  filename: string;
  mime_type: string;
  size: number;
  path: string;
  uploaded_by?: string;
  uploaded_at: string;
}

export interface FileInfo {
  id: string;
  name: string;
  filename?: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
  uploaded_by?: string;
}

// Session Types
export type SessionType = 'admin' | 'project' | 'user';

export interface Session {
  id: string;
  type: SessionType;
  user_id?: string;
  project_id?: string;
  token: string;
  expires_at: string;
  created_at: string;
  last_activity?: string;
}

// Project User Types
export interface ProjectUser {
  id: string;
  project_id: string;
  email: string;
  username?: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Changelog Types
export type ChangeAction = 'create' | 'update' | 'delete';

export interface ChangelogEntry {
  id: string;
  project_id: string;
  user_id?: string;
  action: ChangeAction;
  resource_type: string;
  resource_id: string;
  changes?: Record<string, any>;
  timestamp: string;
}

// Stats Types
export interface ProjectStats {
  tables: number;
  documents: number;
  users: number;
  files: number;
  storage_used: number;
}

export interface StorageStats {
  used: number;
  limit: number;
  count: number;
  total_files?: number;
  total_size?: number;
  max_file_size?: number;
  allowed_types?: string[];
}

// Error Types
export interface KrapiError {
  success: false;
  error: string;
  details?: unknown;
}