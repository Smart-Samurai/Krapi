// Core types for the Krapi package

export interface Project {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
  created_by: string;
  settings?: ProjectSettings;
}

export interface ProjectSettings {
  auth?: {
    enabled: boolean;
    methods: string[];
    oauth_providers: string[];
    email_verification: boolean;
    phone_verification: boolean;
  };
  storage?: {
    max_file_size: number;
    allowed_types: string[];
    compression: boolean;
  };
  api?: {
    rate_limit: number;
    cors_origins: string[];
  };
  database?: {
    max_collections: number;
    max_documents_per_collection: number;
  };
}

export interface Collection {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  schema: Record<string, any>;
  indexes: string[];
  permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
  document_count: number;
}

export interface Document {
  id: string;
  collection_id: string;
  project_id: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface ProjectUser {
  id: string;
  project_id: string;
  email: string;
  username: string;
  role: "admin" | "editor" | "viewer";
  permissions: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface ProjectApiKey {
  id: string;
  project_id: string;
  name: string;
  key: string;
  permissions: string[];
  expires_at?: string;
  created_at: string;
  last_used?: string;
}

export interface ProjectStats {
  collections: number;
  documents: number;
  users: number;
  api_keys: number;
  storage_used: number;
  api_requests_today: number;
  api_requests_total: number;
}

export interface HealthStatus {
  status: string;
  uptime: number;
  version: string;
  timestamp: string;
}

export interface DatabaseStats {
  collections: number;
  documents: number;
  projects: number;
  users: number;
  api_keys: number;
}

export interface FileInfo {
  id: string;
  name: string;
  filename: string;
  mime_type: string;
  size: number;
  path: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Request/Response types for unified API
export interface UnifiedApiRequest {
  operation:
    | "admin"
    | "database"
    | "auth"
    | "storage"
    | "users"
    | "teams"
    | "functions"
    | "messaging"
    | "ai";
  resource: string;
  action: string;
  params?: Record<string, any>;
}

export interface UnifiedApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
