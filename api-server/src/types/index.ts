export interface ContentItem {
  id?: number;
  uuid?: string;
  key: string;
  data: unknown;
  description?: string;
  schema?: Record<string, unknown>;
  route_path: string;
  parent_route_id?: number;
  content_type: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContentRoute {
  id?: number;
  uuid?: string;
  path: string;
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
  parent_id?: number;
  access_level: "public" | "protected" | "private";
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id?: number;
  uuid?: string;
  username: string;
  password: string;
  email?: string;
  role: "admin" | "editor" | "viewer";
  permissions: string[];
  active: boolean;
  created_at?: string;
}

export interface Role {
  id?: number;
  uuid?: string;
  name: string;
  permissions: string[];
  description?: string;
}

export interface FileUpload {
  id?: number;
  uuid?: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  uploaded_by: number;
  access_level: "public" | "protected" | "private";
  created_at?: string;
}

export interface ContentSchema {
  id: number;
  uuid?: string;
  name: string;
  description?: string;
  schema: Record<string, unknown>; // JSON Schema object
  version: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSchemaRequest {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  version?: string;
}

export interface CreateRouteRequest {
  path: string;
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
  parent_id?: number;
  access_level?: "public" | "protected" | "private";
}

export interface CreateContentRequest {
  key: string;
  data: unknown;
  description?: string;
  route_path: string;
  content_type: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: Omit<User, "password">;
  error?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  role?: "admin" | "editor" | "viewer";
  permissions?: string[];
  active?: boolean;
}

// User update types
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: "admin" | "editor" | "viewer";
  permissions?: string[];
  active?: boolean;
  password?: string;
}

// Auth payload type
export interface AuthPayload {
  id: number;
  userId: number;
  uuid: string;
  username: string;
  role: "admin" | "editor" | "viewer";
  permissions: string[];
}

// Email-related types
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

export interface EmailSettings {
  id: number;
  key: string;
  value: string;
  description?: string;
  category: string;
  encrypted: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: number;
  user_id: number;
  email_notifications: boolean;
  content_updates: boolean;
  user_management: boolean;
  system_alerts: boolean;
  marketing_emails: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailSendRequest {
  template_name?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  variables?: Record<string, unknown>;
  from?: string;
  reply_to?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface CreateEmailTemplateRequest {
  name: string;
  subject: string;
  template_html: string;
  template_text?: string;
  variables?: string[];
  description?: string;
  active?: boolean;
}

// API Management types
export interface ApiKey {
  id?: number;
  uuid?: string;
  name: string;
  key: string;
  permissions: string[];
  rate_limit: number;
  active: boolean;
  expires_at?: string;
  last_used?: string;
  usage_count: number;
  created_at?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  rate_limit?: number;
  active?: boolean;
  expires_at?: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  permissions?: string[];
  rate_limit?: number;
  active?: boolean;
  expires_at?: string;
  key?: string;
  usage_count?: number;
}

export interface ApiEndpoint {
  id?: number;
  uuid?: string;
  method: string;
  path: string;
  handler: string;
  description?: string;
  auth_required: boolean;
  permissions: string[];
  rate_limit: number;
  active: boolean;
  request_count: number;
  avg_response_time: number;
  created_at?: string;
}

export interface CreateApiEndpointRequest {
  method: string;
  path: string;
  handler: string;
  description?: string;
  auth_required?: boolean;
  permissions?: string[];
  rate_limit?: number;
  active?: boolean;
  request_count?: number;
  avg_response_time?: number;
}

export interface UpdateApiEndpointRequest {
  method?: string;
  path?: string;
  handler?: string;
  description?: string;
  auth_required?: boolean;
  permissions?: string[];
  rate_limit?: number;
  active?: boolean;
}

export interface RateLimit {
  id?: number;
  uuid?: string;
  name: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  applies_to: string;
  active: boolean;
  created_at?: string;
}

export interface CreateRateLimitRequest {
  name: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  applies_to: string;
  active?: boolean;
}

export interface UpdateRateLimitRequest {
  name?: string;
  requests_per_minute?: number;
  requests_per_hour?: number;
  requests_per_day?: number;
  applies_to?: string;
  active?: boolean;
}

export interface ApiStats {
  total_requests: number;
  requests_today: number;
  avg_response_time: number;
  error_rate: number;
  active_keys: number;
  blocked_requests: number;
  bandwidth_used: string;
  top_endpoints: Array<{
    path: string;
    method: string;
    requests: number;
  }>;
}

export interface DatabaseApiKeyRow {
  id: number;
  uuid: string;
  name: string;
  key: string;
  permissions: string;
  rate_limit: number;
  active: number;
  expires_at?: string;
  last_used?: string;
  usage_count: number;
  created_at: string;
}

export interface DatabaseApiEndpointRow {
  id: number;
  uuid: string;
  method: string;
  path: string;
  handler: string;
  description?: string;
  auth_required: number;
  permissions: string;
  rate_limit: number;
  active: number;
  request_count: number;
  avg_response_time: number;
  created_at: string;
}

export interface DatabaseRateLimitRow {
  id: number;
  uuid: string;
  name: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  applies_to: string;
  active: number;
  created_at: string;
}

// Import new project-based types
export * from "./projects";
