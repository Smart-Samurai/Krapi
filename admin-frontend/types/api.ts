/**
 * API Type Definitions
 */

// Base Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  permissions?: string[];
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: string;
  permissions?: string[];
}

export interface UpdateUserData {
  email?: string;
  role?: string;
  active?: boolean;
  permissions?: string[];
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Content Types
export interface ContentItem {
  id: number;
  key: string;
  data: unknown;
  content_type: string;
  route_path?: string;
  schema_id?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContentData {
  key: string;
  data: unknown;
  content_type: string;
  route_path?: string;
  schema_id?: number;
  description?: string;
}

export interface UpdateContentData {
  data?: unknown;
  content_type?: string;
  route_path?: string;
  schema_id?: number;
  description?: string;
}

// Route Types
export interface Route {
  id: number;
  path: string;
  name: string;
  description?: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRouteData {
  path: string;
  name: string;
  description?: string;
  parent_id?: number;
}

export interface UpdateRouteData {
  name?: string;
  description?: string;
  parent_id?: number;
}

// Schema Types
export interface Schema {
  id: number;
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateSchemaData {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
}

export interface UpdateSchemaData {
  name?: string;
  description?: string;
  schema?: Record<string, unknown>;
}

// File Types
export interface FileItem {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}

// Email Types
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

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

export interface CreateEmailTemplateData {
  name: string;
  subject: string;
  template_html: string;
  template_text?: string;
  variables?: string[];
  description?: string;
  active?: boolean;
}

export interface UpdateEmailTemplateData {
  subject?: string;
  template_html?: string;
  template_text?: string;
  variables?: string[];
  description?: string;
  active?: boolean;
}

export interface SendEmailData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template_id?: number;
  variables?: Record<string, unknown>;
}

// API Key Types
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  rate_limit: number;
  created_at: string;
  last_used: string | null;
  usage_count: number;
  active: boolean;
  expires_at?: string;
}

export interface CreateApiKeyData {
  name: string;
  permissions: string[];
  rate_limit: number;
  expires_at?: string;
}

export interface UpdateApiKeyData {
  name?: string;
  permissions?: string[];
  rate_limit?: number;
  active?: boolean;
  expires_at?: string;
}

// API Endpoint Types
export interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
  handler: string;
  description: string;
  auth_required: boolean;
  permissions: string[];
  rate_limit: number;
  requests_today: number;
  avg_response_time: number;
  created_at: string;
  active: boolean;
}

export interface UpdateApiEndpointData {
  description?: string;
  auth_required?: boolean;
  permissions?: string[];
  rate_limit?: number;
  active?: boolean;
}

// Rate Limit Types
export interface RateLimit {
  id: string;
  name: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  applies_to: "global" | "key" | "endpoint";
  created_at: string;
  active: boolean;
}

export interface UpdateRateLimitData {
  requests_per_minute?: number;
  requests_per_hour?: number;
  requests_per_day?: number;
  active?: boolean;
}

// API Analytics Types
export interface ApiAnalytics {
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

// Health Check Types
export interface HealthStatus {
  status: "OK" | "ERROR";
  version: string;
  uptime: number;
  database: boolean;
  timestamp: string;
}

// MCP Types
export interface McpInfo {
  server: {
    name: string;
    description: string;
    version: string;
  };
  enabled: boolean;
  ollama: {
    baseUrl: string;
    defaultModel: string;
    healthy: boolean;
  };
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface OllamaModel {
  models: string[];
  defaultModel: string;
  baseUrl: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  model?: string;
  tools?: boolean;
  temperature?: number;
  max_tokens?: number;
}

// Database Types
export interface DatabaseStats {
  tables: Array<{
    name: string;
    row_count: number;
    size: string;
  }>;
  total_size: string;
  version: string;
}

export interface BackupInfo {
  filename: string;
  size: number;
  created_at: string;
}

// Security Settings Types
export interface SecuritySettings {
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special: boolean;
  session_timeout: number;
  max_login_attempts: number;
  lockout_duration: number;
  two_factor_enabled: boolean;
  allowed_origins: string[];
}

// Session Types
export interface Session {
  id: string;
  user_id: number;
  username: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
}