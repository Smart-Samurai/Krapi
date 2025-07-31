// Type definitions for KRAPI application

export interface Project {
  id: string;
  name: string;
  description?: string;
  api_key: string;
  settings: {
    email?: {
      enabled: boolean;
      smtp_host?: string;
      smtp_port?: number;
      smtp_user?: string;
      smtp_pass?: string;
      from_email?: string;
      from_name?: string;
    };
    storage?: {
      enabled: boolean;
      max_file_size?: number;
      allowed_types?: string[];
    };
    auth?: {
      session_duration?: number;
      max_sessions?: number;
      require_2fa?: boolean;
    };
    rate_limit?: {
      enabled: boolean;
      window_ms?: number;
      max_requests?: number;
    };
  };
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  api_calls_count: number;
  storage_used: number;
  last_activity?: string;
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface StorageStats {
  used: number;
  limit: number;
  count: number;
}
