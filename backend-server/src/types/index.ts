// Admin User Types
export interface AdminUser {
  id: string;
  email: string;
  username: string;
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
  MASTER_ADMIN = 'master_admin',
  ADMIN = 'admin',
  PROJECT_ADMIN = 'project_admin',
  LIMITED_ADMIN = 'limited_admin'
}

export enum AccessLevel {
  FULL = 'full',
  PROJECTS_ONLY = 'projects_only',
  READ_ONLY = 'read_only',
  CUSTOM = 'custom'
}

export interface AdminPermission {
  resource: string;
  actions: string[];
}

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

// Table/Schema Types
export interface TableSchema {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  fields: TableField[];
  indexes: TableIndex[];
  created_at: string;
  updated_at: string;
}

export interface TableField {
  name: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  default?: any;
  validation?: FieldValidation;
}

export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  JSON = 'json',
  REFERENCE = 'reference',
  FILE = 'file'
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  custom?: string;
}

export interface TableIndex {
  name: string;
  fields: string[];
  unique: boolean;
}

// Document Types
export interface Document {
  id: string;
  table_id: string;
  project_id: string;
  data: Record<string, any>;
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
  email: string;
  name?: string;
  phone?: string;
  password_hash?: string;
  verified: boolean;
  active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// Session Types
export interface Session {
  id: string;
  token: string;
  type: SessionType;
  user_id?: string;
  api_key?: string;
  project_id?: string;
  permissions: string[];
  expires_at: string;
  created_at: string;
  consumed: boolean;
  consumed_at?: string;
}

export enum SessionType {
  ADMIN = 'admin',
  PROJECT = 'project'
}

// Changelog Types
export interface ChangelogEntry {
  id: string;
  project_id?: string;
  entity_type: string;
  entity_id: string;
  action: ChangeAction;
  changes: Record<string, any>;
  performed_by: string;
  session_id?: string;
  timestamp: string;
}

export enum ChangeAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Request Types
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  session?: Session;
  user?: AdminUser | ProjectUser;
  project?: Project;
}

// Query Types
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: Record<string, any>;
  search?: string;
  fields?: string[];
}