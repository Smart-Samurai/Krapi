// Projects and Collections
export interface Project {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  settings: Record<string, unknown>;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Collection {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  indexes: Array<{ field: string; type: string }>;
  permissions: Record<string, unknown>;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  collection_id: string;
  project_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

// Users and Auth
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "moderator" | "user";
  permissions: string[];
  status: "active" | "inactive" | "locked";
  active: boolean; // For backward compatibility
  email_verified: boolean;
  phone?: string;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  last_login: string | null;
  failed_login_attempts?: number;
  locked_until?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AuthStats {
  total_users: number;
  active_users: number;
  locked_users: number;
  unverified_users: number;
  new_users_today: number;
  users_today: number;
  login_attempts_today: number;
  logins_today: number;
  failed_logins_today: number;
  active_sessions: number;
  sessions_active: number; // Alternative naming for compatibility
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateUserData {
  username: string;
  email?: string;
  password: string;
  role: "admin" | "editor" | "viewer";
  permissions?: string[];
  active?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  role?: "admin" | "editor" | "viewer";
  permissions?: string[];
  active?: boolean;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Files
export interface FileMetadata {
  id: number;
  original_name: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  access_level: "public" | "protected" | "private";
  description?: string;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
  uploader?: User; // Populated when joined
}

export interface UploadFileData {
  file: File;
  access_level?: "public" | "protected" | "private";
  description?: string;
}

// API Responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
}

// Schema definition for dynamic forms
export interface SchemaField {
  type: "string" | "number" | "boolean" | "array" | "object" | "date";
  required?: boolean;
  description?: string;
  default?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  fields?: Record<string, SchemaField>; // For object and array types
}

export type ContentSchemaDefinition = Record<string, SchemaField>;

// Filter and search options
export interface ProjectFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DocumentFilters {
  search?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown; // Allow custom field filters
}

export interface FileFilters {
  search?: string;
  mimetype?: string;
  access_level?: "public" | "protected" | "private";
  uploaded_by?: number;
}

// Email types
export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  template_html: string;
  template_text?: string;
  variables: string[];
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: number;
  template_id?: number;
  recipient_email: string;
  sender_email: string;
  subject: string;
  status:
    | "pending"
    | "sent"
    | "delivered"
    | "failed"
    | "bounced"
    | "opened"
    | "clicked";
  error_message?: string;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  variables: Record<string, unknown>;
  message_id?: string;
  created_at: string;
}

export interface EmailConfiguration {
  host?: string;
  port?: number;
  secure?: boolean;
  from?: string;
  replyTo?: string;
  auth?: {
    user: string;
    pass: string;
  };
}

export interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  opened: number;
  clicked: number;
  bounced: number;
}

export interface NotificationPreferences {
  id?: number;
  user_id: number;
  email_notifications: boolean;
  content_updates: boolean;
  user_management: boolean;
  system_alerts: boolean;
  marketing_emails: boolean;
  created_at?: string;
  updated_at?: string;
}
