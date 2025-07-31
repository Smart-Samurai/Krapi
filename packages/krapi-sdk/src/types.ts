// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
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
  MASTER_ADMIN = 'master_admin',
  ADMIN = 'admin',
  DEVELOPER = 'developer'
}

export enum AccessLevel {
  FULL = 'full',
  READ_WRITE = 'read_write',
  READ_ONLY = 'read_only'
}

export type AdminPermission = 
  | 'users.create' | 'users.read' | 'users.update' | 'users.delete'
  | 'projects.create' | 'projects.read' | 'projects.update' | 'projects.delete'
  | 'collections.create' | 'collections.read' | 'collections.write' | 'collections.delete'
  | 'storage.upload' | 'storage.read' | 'storage.delete'
  | 'settings.read' | 'settings.update';

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
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

// Collection Types (formerly Table/Schema)
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
  default?: any;
  description?: string;
  validation?: FieldValidation;
}

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

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
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// File/Storage Types
export interface FileInfo {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: string;
  created_by?: string;
}

export interface StorageStats {
  total_size: number;
  file_count: number;
  storage_limit: number;
  usage_percentage: number;
}

// User Types (for project users, not admin users)
export interface ProjectUser {
  id: string;
  project_id: string;
  email: string;
  name?: string;
  phone?: string;
  verified: boolean;
  active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// Query Options
export interface QueryOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
  where?: Record<string, any>;
  search?: string;
}