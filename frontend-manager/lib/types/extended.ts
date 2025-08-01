import { AdminUser, Collection } from "@/lib/krapi";

// Extended AdminUser type with additional properties from the database
export interface ExtendedAdminUser extends Omit<AdminUser, 'password_hash'> {
  login_count?: number;
  project_ids?: string[];
  api_key?: string;
  scopes?: string[];
  firstName?: string;
  lastName?: string;
  status?: 'active' | 'inactive';
}

// Extended Collection type with additional properties
export interface ExtendedCollection extends Collection {
  document_count?: number;
}

// Type for log entries
export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  metadata?: Record<string, unknown>;
  source?: string;
}

// Type for form data in StreamlinedUserDialog
export interface UserFormData {
  username: string;
  email: string;
  password?: string;
  role: string;
  access_level: string;
  scopes: string[];
  project_ids?: string[];
}

// Type for database admin user response
export interface DatabaseAdminUser {
  id: number;
  email: string;
  username?: string;
  role: string;
  permissions?: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}