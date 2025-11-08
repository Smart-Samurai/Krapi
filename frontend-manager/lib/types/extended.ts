/**
 * Extended Types
 * 
 * Extended type definitions for frontend use.
 * Adds additional properties to SDK types for frontend-specific needs.
 * 
 * @module lib/types/extended
 * @example
 * import { ExtendedAdminUser } from '@/lib/types/extended';
 * const user: ExtendedAdminUser = { ... };
 */
import { AdminUser, Collection } from "@/lib/krapi";

/**
 * Extended Admin User Interface
 * 
 * Admin user type with additional frontend-specific properties.
 * 
 * @interface ExtendedAdminUser
 * @extends {Omit<AdminUser, 'password_hash'>}
 * @property {number} [login_count] - Number of times user has logged in
 * @property {string[]} [project_ids] - Array of project IDs user has access to
 * @property {string} [api_key] - User's API key
 * @property {string[]} [scopes] - User's scopes/permissions
 * @property {string} [firstName] - User's first name
 * @property {string} [lastName] - User's last name
 * @property {'active' | 'inactive'} [status] - User status
 */
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

/**
 * Extended Collection Interface
 * 
 * Collection type with additional frontend-specific properties.
 * 
 * @interface ExtendedCollection
 * @extends {Collection}
 * @property {number} [document_count] - Number of documents in the collection
 */
// Extended Collection type with additional properties
export interface ExtendedCollection extends Collection {
  document_count?: number;
}

/**
 * Log Entry Interface
 * 
 * Type for application log entries.
 * 
 * @interface LogEntry
 * @property {string} id - Log entry ID
 * @property {string} timestamp - Log timestamp
 * @property {"info" | "warn" | "error" | "debug"} level - Log level
 * @property {string} message - Log message
 * @property {Record<string, unknown>} [metadata] - Additional metadata
 * @property {string} [source] - Log source
 */
// Type for log entries
export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  metadata?: Record<string, unknown>;
  source?: string;
}

/**
 * User Form Data Interface
 * 
 * Type for user form data in StreamlinedUserDialog component.
 * 
 * @interface UserFormData
 * @property {string} username - Username
 * @property {string} email - Email address
 * @property {string} [password] - Password (optional for updates)
 * @property {string} role - User role
 * @property {string} access_level - Access level
 * @property {string[]} scopes - User scopes/permissions
 * @property {string[]} [project_ids] - Project IDs user has access to
 */
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

/**
 * Database Admin User Interface
 * 
 * Type for admin user data as returned from the database.
 * 
 * @interface DatabaseAdminUser
 * @property {number} id - User ID
 * @property {string} email - Email address
 * @property {string} [username] - Username
 * @property {string} role - User role
 * @property {string[]} [permissions] - User permissions
 * @property {boolean} active - Whether user is active
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Update timestamp
 * @property {string} [last_login] - Last login timestamp
 */
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