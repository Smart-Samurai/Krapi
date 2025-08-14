/**
 * Database Types for KRAPI SDK
 * 
 * This file contains TypeScript interfaces for database query results
 * to eliminate 'any' types and provide robust type safety.
 */

// Base database row interface
export interface DatabaseRow {
  [key: string]: unknown;
}

// Common count result interface
export interface CountRow extends DatabaseRow {
  count: string;
}

// Admin service database types
export interface AdminUserRow extends DatabaseRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  access_level: string;
  permissions: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  login_count?: number;
}

export interface ApiKeyRow extends DatabaseRow {
  id: string;
  key: string;
  type: "master" | "admin" | "project";
  name: string;
  scopes: string[];
  project_id?: string;
  created_by: string;
  expires_at?: string;
  last_used_at?: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

export interface SystemStatsRow extends DatabaseRow {
  total_projects: string;
  total_users: string;
  total_collections: string;
  total_documents: string;
  total_storage: string;
  total_api_keys: string;
}

export interface ActivityLogRow extends DatabaseRow {
  id: string;
  user_id: string;
  user_type: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Auth service database types
export interface PasswordHashRow extends DatabaseRow {
  password_hash: string;
}

export interface EmailRow extends DatabaseRow {
  email: string;
}

// Projects service database types
export interface ProjectRow extends DatabaseRow {
  id: string;
  name: string;
  description: string;
  settings: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  environment: "development" | "staging" | "production";
}

export interface ProjectStatsRow extends DatabaseRow {
  total_collections: string;
  total_documents: string;
  total_users: string;
  total_storage_bytes: string;
  total_api_keys: string;
  active_sessions: string;
  daily_requests: string;
  monthly_requests: string;
}

// Users service database types
export interface UserRow extends DatabaseRow {
  id: string;
  project_id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  login_count: number;
}

export interface UserStatsRow extends DatabaseRow {
  total_users: string;
  active_users: string;
  new_users_this_month: string;
  most_active_role: string;
  avg_sessions_per_user: string;
}

// Collections service database types
export interface CollectionRow extends DatabaseRow {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow extends DatabaseRow {
  id: string;
  collection_id: string;
  project_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  is_deleted: boolean;
  deleted_at?: string;
}

// Health service database types
export interface HealthCheckRow extends DatabaseRow {
  status: string;
  message?: string;
  [key: string]: unknown;
}

// Email service database types
export interface EmailTemplateRow extends DatabaseRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface EmailLogRow extends DatabaseRow {
  id: string;
  project_id: string;
  to_email: string;
  from_email: string;
  subject: string;
  status: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

